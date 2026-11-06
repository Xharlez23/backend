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
  numero_orden: z.number().int().optional(),
  estado: z.enum(ESTADOS).default('recibido'),
  fecha_ingreso: z.string().min(1, 'La fecha de ingreso es obligatoria'),
  fecha_estimada: z.string().nullable().optional(),
  fecha_entrega: z.string().nullable().optional(),
  kilometraje: z.number().nullable().optional(),
  descripcion: z.string().min(1, 'La descripcion es obligatoria'),
  observaciones: z.string().nullable().optional(),
  subtotal: z.number().default(0),
  descuento: z.number().default(0),
  total: z.number().default(0),
})

const updateSchema = createSchema.partial()

export const reparacionesRouter = createCrudRouter({
  collection: 'reparaciones',
  createSchema,
  updateSchema,
  writeRoles: ['admin', 'recepcionista', 'mecanico'],
  orderBy: 'fecha_ingreso',
  orderDir: 'desc',
})

// --- Subcolecciones: servicios y repuestos de una reparacion -------------

const itemSchema = z.object({
  descripcion: z.string().min(1),
  cantidad: z.number().positive(),
  precio_unitario: z.number().nonnegative(),
  inventario_id: z.string().nullable().optional(), // solo repuestos
})

function itemsRouter(subcollection: 'servicios' | 'repuestos') {
  const router = Router({ mergeParams: true })

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const snap = await db
        .collection('reparaciones')
        .doc(req.params.reparacionId)
        .collection(subcollection)
        .get()
      res.json(snap.docs.map((d: firestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      next(err)
    }
  })

  router.post('/', requireAuth, requireRole('admin', 'recepcionista', 'mecanico'), async (req, res, next) => {
    try {
      const parsed = itemSchema.safeParse(req.body)
      if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(', '))

      const subtotal = parsed.data.cantidad * parsed.data.precio_unitario
      const data = {
        ...parsed.data,
        reparacion_id: req.params.reparacionId,
        subtotal,
        created_at: new Date().toISOString(),
      }
      const ref = await db
        .collection('reparaciones')
        .doc(req.params.reparacionId)
        .collection(subcollection)
        .add(data)
      res.status(201).json({ id: ref.id, ...data })
    } catch (err) {
      next(err)
    }
  })

  router.delete('/:itemId', requireAuth, requireRole('admin', 'recepcionista', 'mecanico'), async (req, res, next) => {
    try {
      await db
        .collection('reparaciones')
        .doc(req.params.reparacionId)
        .collection(subcollection)
        .doc(req.params.itemId)
        .delete()
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })

  return router
}

reparacionesRouter.use('/:reparacionId/servicios', itemsRouter('servicios'))
reparacionesRouter.use('/:reparacionId/repuestos', itemsRouter('repuestos'))
