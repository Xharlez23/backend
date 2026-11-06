import { z } from 'zod'
import { createCrudRouter } from '../utils/crudFactory'

const createSchema = z.object({
  tipo: z.enum(['cobrar', 'pagar']),
  cliente_id: z.string().nullable().optional(),
  proveedor_id: z.string().nullable().optional(),
  reparacion_id: z.string().nullable().optional(),
  descripcion: z.string().min(1, 'La descripcion es obligatoria'),
  monto_total: z.number().positive('El monto debe ser mayor a 0'),
  monto_pagado: z.number().default(0),
  monto_pendiente: z.number().optional(),
  fecha_vence: z.string().nullable().optional(),
  estado: z.enum(['pendiente', 'parcial', 'pagado', 'anulado']).default('pendiente'),
  notas: z.string().nullable().optional(),
})

const updateSchema = createSchema.partial()

export const deudasRouter = createCrudRouter({
  collection: 'deudas',
  createSchema,
  updateSchema,
  writeRoles: ['admin', 'recepcionista'],
  orderBy: 'fecha_vence',
  orderDir: 'asc',
})
