import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'

import { authRouter } from './routes/auth.routes'
import { clientesRouter } from './routes/clientes.routes'
import { vehiculosRouter } from './routes/vehiculos.routes'
import { reparacionesRouter } from './routes/reparaciones.routes'
import { inventarioRouter } from './routes/inventario.routes'
import { cajaRouter } from './routes/caja.routes'
import { deudasRouter } from './routes/deudas.routes'
import { proveedoresRouter } from './routes/proveedores.routes'
import { citasRouter } from './routes/citas.routes'
import { reportesRouter } from './routes/reportes.routes'
import { errorHandler, notFoundHandler } from './middleware/error.middleware'

dotenv.config()

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200' }))
app.use(express.json())
app.use(morgan('dev'))

app.get('/health', (_req, res) => res.json({ ok: true, servicio: 'punto-renault-api' }))

app.use('/api/auth', authRouter)
app.use('/api/clientes', clientesRouter)
app.use('/api/vehiculos', vehiculosRouter)
app.use('/api/reparaciones', reparacionesRouter)
app.use('/api/inventario', inventarioRouter)
app.use('/api/caja', cajaRouter)
app.use('/api/deudas', deudasRouter)
app.use('/api/proveedores', proveedoresRouter)
app.use('/api/citas', citasRouter)
app.use('/api/reportes', reportesRouter)

app.use(notFoundHandler)
app.use(errorHandler)

const PORT = process.env.PORT ?? 4000
app.listen(PORT, () => {
  console.log(`Punto Renault API escuchando en http://localhost:${PORT}`)
})
