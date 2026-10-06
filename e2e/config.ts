/** Configuración compartida por el framework de E2E. */

export const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:5173';
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';
/** Base del APIRequestContext: host sin path (ver ApiClient.url()). */
export const API_BASE = API_URL;

/** Contraseña válida según assertPassword(): 7+ caracteres, un número y una mayúscula. */
export const DEFAULT_PASSWORD = 'Password1';

export const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export type TaskStatus = (typeof STATUSES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type TaskPriority = (typeof PRIORITIES)[number];
