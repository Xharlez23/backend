import { Router } from 'express'
import { firestore } from 'firebase-admin'
import { db } from '../config/firebase'
import { requireAuth } from '../middleware/auth.middleware'

export const reportesRouter = Router()

// Resumen para el Dashboard: conteos y totales rapidos
reportesRouter.get('/dashboard', requireAuth, async (_req, res, next) => {
  try {
    const [clientesSnap, vehiculosSnap, reparacionesSnap, deudasSnap, inventarioSnap] = await Promise.all([
      db.collection('clientes').where('activo', '==', true).get(),
      db.collection('vehiculos').where('activo', '==', true).get(),
      db.collection('reparaciones').get(),
      db.collection('deudas').where('estado', 'in', ['pendiente', 'parcial']).get(),
      db.collection('inventario').where('activo', '==', true).get(),
    ])

    const reparacionesPorEstado: Record<string, number> = {}
    let reparacionesActivas = 0
    reparacionesSnap.docs.forEach((d: firestore.QueryDocumentSnapshot) => {
      const estado = d.data().estado as string
      reparacionesPorEstado[estado] = (reparacionesPorEstado[estado] ?? 0) + 1
      if (!['entregado', 'cancelado'].includes(estado)) reparacionesActivas++
    })

    let deudasPendientesTotal = 0
    deudasSnap.docs.forEach((d: firestore.QueryDocumentSnapshot) => {
      deudasPendientesTotal += Number(d.data().monto_pendiente ?? 0)
    })

    const inventarioBajo = inventarioSnap.docs.filter((d: firestore.QueryDocumentSnapshot) => {
      const data = d.data()
      return Number(data.cantidad ?? 0) <= Number(data.cantidad_minima ?? 0)
    }).length

    res.json({
      total_clientes: clientesSnap.size,
      total_vehiculos: vehiculosSnap.size,
      reparaciones_activas: reparacionesActivas,
      reparaciones_por_estado: reparacionesPorEstado,
      deudas_pendientes_total: deudasPendientesTotal,
      inventario_bajo_stock: inventarioBajo,
    })
  } catch (err) {
    next(err)
  }
})

// Reporte de caja: totales de ingresos/egresos en un rango de fechas (YYYY-MM-DD)
reportesRouter.get('/caja', requireAuth, async (req, res, next) => {
  try {
    const { desde, hasta } = req.query as { desde?: string; hasta?: string }
    let query: firestore.Query = db.collection('caja')
    if (desde) query = query.where('fecha', '>=', desde)
    if (hasta) query = query.where('fecha', '<=', hasta)

    const snap = await query.get()
    let ingresos = 0
    let egresos = 0
    const porCategoria: Record<string, number> = {}

    snap.docs.forEach((d: firestore.QueryDocumentSnapshot) => {
      const data = d.data()
      const valor = Number(data.valor ?? 0)
      if (data.tipo === 'ingreso') ingresos += valor
      else egresos += valor
      porCategoria[data.categoria] = (porCategoria[data.categoria] ?? 0) + valor
    })

    res.json({ ingresos, egresos, balance: ingresos - egresos, por_categoria: porCategoria })
  } catch (err) {
    next(err)
  }
})
