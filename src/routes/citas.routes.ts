import { z } from 'zod'
import { createCrudRouter } from '../utils/crudFactory'

const createSchema = z.object({
  cliente_id: z.string().nullable().optional(),
  vehiculo_id: z.string().nullable().optional(),
  mecanico_id: z.string().nullable().optional(),
  fecha_hora: z.string().min(1, 'La fecha y hora son obligatorias'),
  duracion_min: z.number().default(30),
  motivo: z.string().min(1, 'El motivo es obligatorio'),
  estado: z.enum(['programada', 'confirmada', 'completada', 'cancelada']).default('programada'),
  notas: z.string().nullable().optional(),
})

const updateSchema = createSchema.partial()

export const citasRouter = createCrudRouter({
  collection: 'citas',
  createSchema,
  updateSchema,
  writeRoles: ['admin', 'recepcionista', 'mecanico'],
  orderBy: 'fecha_hora',
  orderDir: 'asc',
})
