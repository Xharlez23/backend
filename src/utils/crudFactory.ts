import { Router } from 'express'
import { ZodSchema } from 'zod'
import { firestore } from 'firebase-admin'
import { db } from '../config/firebase'
import { ApiError } from '../middleware/error.middleware'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import { Rol } from '../types'

interface CrudOptions {
  collection: string
  /** Schema de validacion para crear (campos requeridos) */
  createSchema: ZodSchema<any>
  /** Schema de validacion para actualizar (campos parciales) */
  updateSchema: ZodSchema<any>
  /** Roles permitidos para escribir (crear/editar/eliminar). Lectura siempre requiere estar autenticado. */
  writeRoles?: Rol[]
  /** Campo por el que se ordena por defecto */
  orderBy?: string
  orderDir?: firestore.OrderByDirection
  /** Hook para transformar los datos antes de crear */
  beforeCreate?: (data: any) => Promise<any>
  /** Hook para transformar los datos antes de actualizar (recibe el documento actual) */
  beforeUpdate?: (id: string, data: any, current: any) => Promise<any>
}

/**
 * Crea un router Express con operaciones GET (lista + detalle), POST, PUT y DELETE
 * sobre una coleccion de Firestore. Todas las rutas requieren autenticacion.
 * Se agregan automaticamente created_at / updated_at.
 */
export function createCrudRouter(opts: CrudOptions): Router {
  const router = Router()
  const col = () => db.collection(opts.collection)
  const writeGuard = opts.writeRoles ? [requireAuth, requireRole(...opts.writeRoles)] : [requireAuth]

  // Listar (soporta ?activo=true y ?q= busqueda simple por prefijo en "nombre")
  router.get('/', requireAuth, async (req, res, next) => {
    try {
      let query: firestore.Query = col()
      if (opts.orderBy) query = query.orderBy(opts.orderBy, opts.orderDir ?? 'desc')
      if (req.query.activo === 'true') query = query.where('activo', '==', true)
      if (req.query.activo === 'false') query = query.where('activo', '==', false)

      const snap = await query.get()
      let items = snap.docs.map((d: firestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }))

      const q = (req.query.q as string | undefined)?.toLowerCase().trim()
      if (q) {
        items = items.filter((it: any) =>
          JSON.stringify(it).toLowerCase().includes(q)
        )
      }
      res.json(items)
    } catch (err) {
      next(err)
    }
  })

  // Detalle
  router.get('/:id', requireAuth, async (req, res, next) => {
    try {
      const doc = await col().doc(req.params.id).get()
      if (!doc.exists) throw new ApiError(404, 'Registro no encontrado')
      res.json({ id: doc.id, ...doc.data() })
    } catch (err) {
      next(err)
    }
  })

  // Crear
  router.post('/', ...writeGuard, async (req, res, next) => {
    try {
      const parsed = opts.createSchema.safeParse(req.body)
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(', '))
      }
      const now = new Date().toISOString()
      let data: any = { ...parsed.data, created_at: now, updated_at: now }
      if (opts.beforeCreate) data = await opts.beforeCreate(data)
      const ref = await col().add(data)
      res.status(201).json({ id: ref.id, ...data })
    } catch (err) {
      next(err)
    }
  })

  // Actualizar
  router.put('/:id', ...writeGuard, async (req, res, next) => {
    try {
      const parsed = opts.updateSchema.safeParse(req.body)
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(', '))
      }
      const ref = col().doc(req.params.id)
      const doc = await ref.get()
      if (!doc.exists) throw new ApiError(404, 'Registro no encontrado')

      let data: any = { ...parsed.data, updated_at: new Date().toISOString() }
      if (opts.beforeUpdate) data = await opts.beforeUpdate(req.params.id, data, doc.data())
      await ref.update(data)
      res.json({ id: ref.id, ...doc.data(), ...data })
    } catch (err) {
      next(err)
    }
  })

  // Eliminar (borrado logico si el recurso tiene "activo", si no, borrado real)
  router.delete('/:id', ...writeGuard, async (req, res, next) => {
    try {
      const ref = col().doc(req.params.id)
      const doc = await ref.get()
      if (!doc.exists) throw new ApiError(404, 'Registro no encontrado')

      if (Object.prototype.hasOwnProperty.call(doc.data(), 'activo')) {
        await ref.update({ activo: false, updated_at: new Date().toISOString() })
      } else {
        await ref.delete()
      }
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })

  return router
}
