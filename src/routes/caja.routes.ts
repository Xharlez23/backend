import { z } from 'zod'
import { createCrudRouter } from '../utils/crudFactory'

const createSchema = z.object({
  reparacion_id: z.string().nullable().optional(),
  tipo: z.enum(['ingreso', 'egreso']),
  categoria: z.enum([
    'servicio',
    'repuesto',
    'salario',
    'arriendo',
    'servicios_publicos',
    'compra_inventario',
    'otro',
  ]),
  descripcion: z.string().min(1, 'La descripcion es obligatoria'),
  valor: z.number().positive('El valor debe ser mayor a 0'),
  tipo_pago: z.enum(['efectivo', 'transferencia', 'tarjeta', 'credito']).nullable().optional(),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  registrado_por: z.string().nullable().optional(),
})

const updateSchema = createSchema.partial()

export const cajaRouter = createCrudRouter({
  collection: 'caja',
  createSchema,
  updateSchema,
  writeRoles: ['admin', 'recepcionista'],
  orderBy: 'fecha',
  orderDir: 'desc',
})
