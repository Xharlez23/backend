import { z } from 'zod'
import { createCrudRouter } from '../utils/crudFactory'

const createSchema = z.object({
  categoria_id: z.string().nullable().optional(),
  proveedor_id: z.string().nullable().optional(),
  codigo: z.string().nullable().optional(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().nullable().optional(),
  unidad: z.string().default('unidad'),
  cantidad: z.number().default(0),
  cantidad_minima: z.number().default(0),
  precio_compra: z.number().default(0),
  precio_venta: z.number().default(0),
  activo: z.boolean().default(true),
})

const updateSchema = createSchema.partial()

export const inventarioRouter = createCrudRouter({
  collection: 'inventario',
  createSchema,
  updateSchema,
  writeRoles: ['admin', 'recepcionista'],
  orderBy: 'nombre',
  orderDir: 'asc',
})
