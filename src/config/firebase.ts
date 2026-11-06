import admin from 'firebase-admin'
import dotenv from 'dotenv'

dotenv.config()

// Inicializa Firebase Admin usando variables de entorno (cuenta de servicio).
// En produccion tambien puedes usar GOOGLE_APPLICATION_CREDENTIALS apuntando al json.
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  })
}

export const auth = admin.auth()
export const db = admin.firestore()
export default admin
