/**
 * Script de arranque: crea (o actualiza) el primer usuario administrador.
 *
 * Uso:
 *   ADMIN_EMAIL=admin@puntorenault.com ADMIN_PASSWORD=CambiaEsto123 ADMIN_NOMBRE="Administrador" npm run seed
 */
import dotenv from 'dotenv'
dotenv.config()

import { auth, db } from '../config/firebase'

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const nombre = process.env.ADMIN_NOMBRE ?? 'Administrador'

  if (!email || !password) {
    console.error('Debes definir ADMIN_EMAIL y ADMIN_PASSWORD como variables de entorno.')
    process.exit(1)
  }

  let uid: string
  try {
    const existente = await auth.getUserByEmail(email)
    uid = existente.uid
    console.log(`El usuario ${email} ya existe en Firebase Auth (uid: ${uid}). Se actualizara el perfil.`)
  } catch {
    const creado = await auth.createUser({ email, password, displayName: nombre })
    uid = creado.uid
    console.log(`Usuario creado en Firebase Auth: ${email} (uid: ${uid})`)
  }

  const now = new Date().toISOString()
  await db.collection('perfiles').doc(uid).set(
    {
      nombre,
      email,
      rol: 'admin',
      activo: true,
      created_at: now,
      updated_at: now,
    },
    { merge: true }
  )

  console.log('Perfil de administrador listo en Firestore. Ya puedes iniciar sesion en el frontend.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Error creando el usuario administrador:', err)
  process.exit(1)
})
