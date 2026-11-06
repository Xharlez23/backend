export type Rol = 'admin' | 'mecanico' | 'recepcionista'

export type EstadoReparacion =
  | 'recibido'
  | 'diagnostico'
  | 'en_proceso'
  | 'esperando_repuesto'
  | 'listo'
  | 'entregado'
  | 'cancelado'

export interface Perfil {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: string
  identificacion: string | null
  nombre: string
  telefono: string | null
  email: string | null
  direccion: string | null
  ciudad: string | null
  tipo: 'natural' | 'empresa'
  notas: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Vehiculo {
  id: string
  cliente_id: string | null
  placa: string
  marca: string
  modelo: string | null
  anio: number | null
  color: string | null
  kilometraje: number | null
  vin: string | null
  notas: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Reparacion {
  id: string
  vehiculo_id: string
  mecanico_id: string | null
  tecnico_nombre: string | null
  numero_orden: number
  estado: EstadoReparacion
  fecha_ingreso: string
  fecha_estimada: string | null
  fecha_entrega: string | null
  kilometraje: number | null
  descripcion: string
  observaciones: string | null
  subtotal: number
  descuento: number
  total: number
  created_at: string
  updated_at: string
}

export interface ReparacionServicio {
  id: string
  reparacion_id: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  created_at: string
}

export interface ReparacionRepuesto {
  id: string
  reparacion_id: string
  inventario_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  created_at: string
}

export interface Inventario {
  id: string
  categoria_id: string | null
  proveedor_id: string | null
  codigo: string | null
  nombre: string
  descripcion: string | null
  unidad: string
  cantidad: number
  cantidad_minima: number
  precio_compra: number
  precio_venta: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface MovimientoCaja {
  id: string
  reparacion_id: string | null
  tipo: 'ingreso' | 'egreso'
  categoria:
    | 'servicio'
    | 'repuesto'
    | 'salario'
    | 'arriendo'
    | 'servicios_publicos'
    | 'compra_inventario'
    | 'otro'
  descripcion: string
  valor: number
  tipo_pago: 'efectivo' | 'transferencia' | 'tarjeta' | 'credito' | null
  fecha: string
  registrado_por: string | null
  created_at: string
}

export interface Deuda {
  id: string
  tipo: 'cobrar' | 'pagar'
  cliente_id: string | null
  proveedor_id: string | null
  reparacion_id: string | null
  descripcion: string
  monto_total: number
  monto_pagado: number
  monto_pendiente: number
  fecha_vence: string | null
  estado: 'pendiente' | 'parcial' | 'pagado' | 'anulado'
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Proveedor {
  id: string
  nombre: string
  nit: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
  ciudad: string | null
  direccion: string | null
  notas: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Cita {
  id: string
  cliente_id: string | null
  vehiculo_id: string | null
  mecanico_id: string | null
  fecha_hora: string
  duracion_min: number
  motivo: string
  estado: 'programada' | 'confirmada' | 'completada' | 'cancelada'
  notas: string | null
  created_at: string
  updated_at: string
}

// Extiende Express.Request para adjuntar el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      uid?: string
      perfil?: Perfil
    }
  }
}
