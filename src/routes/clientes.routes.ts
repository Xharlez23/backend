import { z } from 'zod'
import { createCrudRouter } from '../utils/crudFactory'

const createSchema = z.object({
  identificacion: z.string().nullable().optional(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  telefono: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  direccion: z.string().nullable().optional(),
  ciudad: z.string().nullable().optional(),
  tipo: z.enum(['natural', 'empresa']).default('natural'),
  notas: z.string().nullable().optional(),
  activo: z.boolean().default(true),
})

const updateSchema = createSchema.partial()

export const clientesRouter = createCrudRouter({
  collection: 'clientes',
  createSchema,
  updateSchema,
  writeRoles: ['admin', 'recepcionista'],
  orderBy: 'nombre',
  orderDir: 'asc',
})
