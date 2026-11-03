# [API auth] reset-password acepta tokens usados, vencidos o reemplazados

**Criterio violado:** US-17 c5: "Un token vencido, inexistente o ya utilizado devuelve HTTP 400" · c3: "token de un solo uso" · c6: "Al generarse un token nuevo, los tokens anteriores del mismo usuario quedan invalidados"

**Entorno:** macOS 27.2 · API Node 24 (Express + SQLite) · zona horaria del servidor UTC-3 · commit 206cefc

**Datos / precondiciones:** usuario registrado con un token de `forgot-password`.

**Pasos:** 1. Usar el token en `POST /api/auth/reset-password`. 2. Volver a usar el mismo token con otra contraseña. 3. Repetir con un token vencido y con uno anterior a un token más nuevo.

**Esperado:** HTTP 400 en los tres casos y la contraseña sin cambios.

**Obtenido:** HTTP 200 y la contraseña cambia.

**Reproducibilidad:** 3 de 3 corridas de `npm test`, en macOS.

**Evidencia:** Respuesta HTTP en la salida de los tests. `resetPassword` no revisa `usedAt` ni `expiresAt`, y no marca el token como usado.

**Test que lo reproduce:** `server/tests/password-reset.test.ts` › c3/c5, c5 (vencido) y c6

**Severidad:** alta
