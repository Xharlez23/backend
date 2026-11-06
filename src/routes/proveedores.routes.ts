import { z } from 'zod'
import { createCrudRouter } from '../utils/crudFactory'

const createSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  nit: z.string().nullable().optional(),
  contacto: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  ciudad: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
  activo: z.boolean().default(true),
})

const updateSchema = createSchema.partial()

export const proveedoresRouter = createCrudRouter({
  collection: 'proveedores',
  createSchema,
  updateSchema,
  writeRoles: ['admin', 'recepcionista'],
  orderBy: 'nombre',
  orderDir: 'asc',
})
