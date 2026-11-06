import { NextFunction, Request, Response } from 'express'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err instanceof ApiError ? err.status : 500
  const message = err?.message || 'Error interno del servidor'
  if (status >= 500) console.error(err)
  res.status(status).json({ error: message })
}
