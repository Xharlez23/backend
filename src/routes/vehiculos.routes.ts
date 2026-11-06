import { z } from 'zod'
import { createCrudRouter } from '../utils/crudFactory'

const createSchema = z.object({
  cliente_id: z.string().nullable().optional(),
  placa: z.string().min(1, 'La placa es obligatoria'),
  marca: z.string().min(1, 'La marca es obligatoria'),
  modelo: z.string().nullable().optional(),
  anio: z.number().int().nullable().optional(),
  color: z.string().nullable().optional(),
  kilometraje: z.number().nullable().optional(),
  vin: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
  activo: z.boolean().default(true),
})

const updateSchema = createSchema.partial()

export const vehiculosRouter = createCrudRouter({
  collection: 'vehiculos',
  createSchema,
  updateSchema,
  writeRoles: ['admin', 'recepcionista'],
  orderBy: 'placa',
  orderDir: 'asc',
})
