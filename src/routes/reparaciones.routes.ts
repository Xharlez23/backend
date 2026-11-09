import { Router } from 'express'
import { z } from 'zod'
import { firestore } from 'firebase-admin'
import { db } from '../config/firebase'
import { createCrudRouter } from '../utils/crudFactory'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import { ApiError } from '../middleware/error.middleware'

const ESTADOS = [
  'recibido',
  'diagnostico',
  'en_proceso',
  'esperando_repuesto',
  'listo',
  'entregado',
  'cancelado',
] as const

const createSchema = z.object({
  vehiculo_id: z.string().min(1, 'El vehiculo es obligatorio'),
  mecanico_id: z.string().nullable().optional(),
  tecnico_nombre: z.string().nullable().optional(),
  estado: z.enum(ESTADOS).default('recibido'),
  fecha_ingreso: z.string().min(1, 'La fecha de ingreso es obligatoria'),
  fecha_estimada: z.string().nullable().optional(),
  fecha_entrega: z.string().nullable().optional(),
  kilometraje: z.number().nullable().optional(),
  descripcion: z.string().min(1, 'La descripcion es obligatoria'),
  observaciones: z.string().nullable().optional(),
  descuento: z.number().nonnegative().default(0),
})

const updateSchema = createSchema.partial()

/** Numero de orden consecutivo (contador atomico en Firestore) */
async function siguienteNumeroOrden(): Promise<number> {
  const ref = db.collection('contadores').doc('reparaciones')
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const siguiente = (snap.exists ? Number(snap.data()!.valor) : 0) + 1
    tx.set(ref, { valor: siguiente })
    return siguiente
  })
}

/** Recalcula subtotal y total de la orden a partir de sus servicios y repuestos */
async function recalcular(reparacionId: string) {
  const ref = db.collection('reparaciones').doc(reparacionId)
  const [servicios, repuestos, doc] = await Promise.all([
    ref.collection('servicios').get(),
    ref.collection('repuestos').get(),
    ref.get(),
  ])
  const suma = (snap: firestore.QuerySnapshot) =>
    snap.docs.reduce((acc: number, d: firestore.QueryDocumentSnapshot) => acc + Number(d.data().subtotal ?? 0), 0)

  const subtotal = suma(servicios) + suma(repuestos)
  const descuento = Number(doc.data()?.descuento ?? 0)
  const total = Math.max(0, subtotal - descuento)
  await ref.update({ subtotal, total, updated_at: new Date().toISOString() })
}

export const reparacionesRouter = createCrudRouter({
  collection: 'reparaciones',
  createSchema,
  updateSchema,
  writeRoles: ['admin', 'recepcionista', 'mecanico'],
  orderBy: 'fecha_ingreso',
  orderDir: 'desc',
  beforeCreate: async (data) => {
    data.numero_orden = await siguienteNumeroOrden()
    data.subtotal = 0
    data.total = 0
    return data
  },
  beforeUpdate: async (_id, data, current) => {
    // Estos campos nunca se editan directamente: los calcula el servidor
    delete data.numero_orden
    delete data.subtotal
    delete data.total

    if (data.estado === 'entregado' && !(data.fecha_entrega ?? current.fecha_entrega)) {
      data.fecha_entrega = new Date().toISOString().slice(0, 10)
    }
    if (data.descuento !== undefined) {
      data.total = Math.max(0, Number(current.subtotal ?? 0) - Number(data.descuento))
    }
    return data
  },
})

// --- Subcolecciones: servicios y repuestos -------------------------------

const itemSchema = z.object({
  descripcion: z.string().min(1, 'La descripcion es obligatoria'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z.number().nonnegative(),
  inventario_id: z.string().nullable().optional(), // solo repuestos
})

function itemsRouter(subcollection: 'servicios' | 'repuestos') {
  const router = Router({ mergeParams: true })
  const itemsCol = (reparacionId: string) =>
    db.collection('reparaciones').doc(reparacionId).collection(subcollection)
  const roles = requireRole('admin', 'recepcionista', 'mecanico')

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const snap = await itemsCol(req.params.reparacionId).get()
      res.json(snap.docs.map((d: firestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      next(err)
    }
  })

  router.post('/', requireAuth, roles, async (req, res, next) => {
    try {
      const parsed = itemSchema.safeParse(req.body)
      if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(', '))

      const reparacionId = req.params.reparacionId
      const repRef = db.collection('reparaciones').doc(reparacionId)
      if (!(await repRef.get()).exists) throw new ApiError(404, 'Orden no encontrada')

      const { cantidad, precio_unitario } = parsed.data
      const itemRef = itemsCol(reparacionId).doc()
      const data: Record<string, any> = {
        descripcion: parsed.data.descripcion,
        cantidad,
        precio_unitario,
        reparacion_id: reparacionId,
        subtotal: cantidad * precio_unitario,
        created_at: new Date().toISOString(),
      }
      if (subcollection === 'repuestos') data.inventario_id = parsed.data.inventario_id ?? null

      await db.runTransaction(async (tx) => {
        if (subcollection === 'repuestos' && parsed.data.inventario_id) {
          const invRef = db.collection('inventario').doc(parsed.data.inventario_id)
          const inv = await tx.get(invRef)
          if (!inv.exists) throw new ApiError(404, 'El repuesto no existe en inventario')
          const disponible = Number(inv.data()!.cantidad ?? 0)
          if (disponible < cantidad) {
            throw new ApiError(400, `Stock insuficiente (disponible: ${disponible})`)
          }
          tx.update(invRef, { cantidad: disponible - cantidad, updated_at: new Date().toISOString() })
        }
        tx.set(itemRef, data)
      })

      await recalcular(reparacionId)
      res.status(201).json({ id: itemRef.id, ...data })
    } catch (err) {
      next(err)
    }
  })

  router.delete('/:itemId', requireAuth, roles, async (req, res, next) => {
    try {
      const reparacionId = req.params.reparacionId
      const itemRef = itemsCol(reparacionId).doc(req.params.itemId)

      await db.runTransaction(async (tx) => {
        const item = await tx.get(itemRef)
        if (!item.exists) throw new ApiError(404, 'Item no encontrado')
        const { inventario_id, cantidad } = item.data()!

        // Devuelve el stock al inventario si el repuesto salio de ahi
        if (subcollection === 'repuestos' && inventario_id) {
          const invRef = db.collection('inventario').doc(inventario_id)
          const inv = await tx.get(invRef)
          if (inv.exists) {
            tx.update(invRef, {
              cantidad: Number(inv.data()!.cantidad ?? 0) + Number(cantidad ?? 0),
              updated_at: new Date().toISOString(),
            })
          }
        }
        tx.delete(itemRef)
      })

      await recalcular(reparacionId)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })

  return router
}

reparacionesRouter.use('/:reparacionId/servicios', itemsRouter('servicios'))
reparacionesRouter.use('/:reparacionId/repuestos', itemsRouter('repuestos'))
