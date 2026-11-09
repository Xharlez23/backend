import { z } from 'zod'
import { db } from '../config/firebase'
import { createCrudRouter } from '../utils/crudFactory'
import { ApiError } from '../middleware/error.middleware'

const createSchema = z.object({
  cliente_id: z.string().nullable().optional(),
  placa: z.string().min(1, 'La placa es obligatoria'),
  marca: z.string().min(1, 'La marca es obligatoria'),
  modelo: z.string().nullable().optional(),
  anio: z.number().int().nullable().optional(),
  color: z.string().nullable().optional(),
  kilometraje: z.number().nonnegative().nullable().optional(),
  vin: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
  activo: z.boolean().default(true),
})

const updateSchema = createSchema.partial()

const normalizarPlaca = (placa: string) => placa.trim().toUpperCase().replace(/[\s-]/g, '')

/** La placa debe ser unica entre todos los vehiculos */
async function validarPlacaUnica(placa: string, excluirId?: string) {
  const snap = await db.collection('vehiculos').where('placa', '==', placa).get()
  if (snap.docs.some((d) => d.id !== excluirId)) {
    throw new ApiError(409, `Ya existe un vehiculo con la placa ${placa}`)
  }
}

export const vehiculosRouter = createCrudRouter({
  collection: 'vehiculos',
  createSchema,
  updateSchema,
  writeRoles: ['admin', 'recepcionista'],
  orderBy: 'placa',
  orderDir: 'asc',
  beforeCreate: async (data) => {
    data.placa = normalizarPlaca(data.placa)
    await validarPlacaUnica(data.placa)
    return data
  },
  beforeUpdate: async (id, data) => {
    if (data.placa) {
      data.placa = normalizarPlaca(data.placa)
      await validarPlacaUnica(data.placa, id)
    }
    return data
  },
})