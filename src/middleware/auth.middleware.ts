import { NextFunction, Request, Response } from 'express'
import { auth, db } from '../config/firebase'
import { Perfil, Rol } from '../types'

/**
 * Verifica el ID token de Firebase enviado en el header Authorization: Bearer <token>.
 * Adjunta req.uid y req.perfil (documento de la coleccion "perfiles") si es valido.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Falta token de autenticacion' })
    }

    const token = header.slice('Bearer '.length)
    const decoded = await auth.verifyIdToken(token)
    req.uid = decoded.uid

    const perfilSnap = await db.collection('perfiles').doc(decoded.uid).get()
    if (!perfilSnap.exists) {
      return res.status(403).json({ error: 'El usuario no tiene un perfil asociado' })
    }

    const perfil = { id: perfilSnap.id, ...perfilSnap.data() } as Perfil
    if (!perfil.activo) {
      return res.status(403).json({ error: 'Usuario inactivo' })
    }

    req.perfil = perfil
    next()
  } catch (err) {
    console.error('Error verificando token:', err)
    return res.status(401).json({ error: 'Token invalido o expirado' })
  }
}

/**
 * Restringe el acceso a los roles indicados. Debe usarse despues de requireAuth.
 */
export function requireRole(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.perfil) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    if (!roles.includes(req.perfil.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta accion' })
    }
    next()
  }
}
