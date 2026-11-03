# [API auth] Se aceptan contraseñas de 7 caracteres

**Criterio violado:** US-01 c3: "La contraseña debe tener mínimo 8 caracteres, al menos 1 número y 1 mayúscula" · US-17 c7

**Entorno:** macOS 27.2 · API Node 24 (Express + SQLite) · zona horaria del servidor UTC-3 · commit 206cefc

**Datos / precondiciones:** usuario registrado con un token de reseteo válido.

**Pasos:** 1. Enviar `POST /api/auth/reset-password` con `newPassword: "Clave12"` (7 caracteres).

**Esperado:** HTTP 400 `VALIDATION_ERROR`.

**Obtenido:** HTTP 200 y la contraseña cambia.

**Reproducibilidad:** 3 de 3 corridas de `npm test`, en macOS.

**Evidencia:** Respuesta HTTP en la salida del test. `assertPassword` compara `length >= 7`, aunque su mensaje dice 8. También la usa el registro.

**Test que lo reproduce:** `server/tests/password-reset.test.ts` › c7 · rechaza una contraseña con 7 caracteres

**Severidad:** media
