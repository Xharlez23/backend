import { Router } from 'express'
import { z } from 'zod'
import { firestore } from 'firebase-admin'
import { auth, db } from '../config/firebase'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import { ApiError } from '../middleware/error.middleware'

export const authRouter = Router()

// Devuelve el perfil del usuario autenticado (ya resuelto por el middleware)
authRouter.get('/me', requireAuth, (req, res) => {
  res.json(req.perfil)
})

// Mecanicos activos (para asignar en ordenes). Accesible a cualquier usuario autenticado.
authRouter.get('/mecanicos', requireAuth, async (_req, res, next) => {
  try {
    const snap = await db.collection('perfiles').where('rol', '==', 'mecanico').where('activo', '==', true).get()
    res.json(snap.docs.map((d: firestore.QueryDocumentSnapshot) => ({ id: d.id, nombre: d.data().nombre })))
  } catch (err) {
    next(err)
  }
})

// --- Gestion de usuarios (solo admin) -------------------------------------

const crearUsuarioSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  rol: z.enum(['admin', 'mecanico', 'recepcionista']),
})

authRouter.post('/usuarios', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = crearUsuarioSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(', '))
    }
    const { nombre, email, password, rol } = parsed.data

    const userRecord = await auth.createUser({ email, password, displayName: nombre })
    const now = new Date().toISOString()
    const perfil = { nombre, email, rol, activo: true, created_at: now, updated_at: now }
    await db.collection('perfiles').doc(userRecord.uid).set(perfil)

    res.status(201).json({ id: userRecord.uid, ...perfil })
  } catch (err: any) {
    if (err?.code === 'auth/email-already-exists') {
      return next(new ApiError(409, 'Ya existe un usuario con ese correo'))
    }
    next(err)
  }
})

authRouter.get('/usuarios', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const snap = await db.collection('perfiles').orderBy('nombre').get()
    res.json(snap.docs.map((d: firestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() })))
  } catch (err) {
    next(err)
  }
})

authRouter.put('/usuarios/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const schema = z.object({
      nombre: z.string().min(1).optional(),
      rol: z.enum(['admin', 'mecanico', 'recepcionista']).optional(),
      activo: z.boolean().optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(', '))
    }
    const ref = db.collection('perfiles').doc(req.params.id)
    await ref.update({ ...parsed.data, updated_at: new Date().toISOString() })
    const doc = await ref.get()
    res.json({ id: doc.id, ...doc.data() })
  } catch (err) {
    next(err)
  }
})
