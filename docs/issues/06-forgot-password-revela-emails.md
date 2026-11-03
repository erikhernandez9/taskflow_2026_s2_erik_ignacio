# [API auth] forgot-password revela si un email está registrado

**Criterio violado:** US-17 c2: "La respuesta es idéntica exista o no un usuario con ese email (HTTP 200 y el mismo mensaje genérico), para no revelar qué direcciones están registradas"

**Entorno:** macOS 27.2 · API Node 24 (Express + SQLite) · zona horaria del servidor UTC-3 · commit 206cefc

**Datos / precondiciones:** `ana@test.com` registrada; `nadie@test.com` no existe.

**Pasos:** 1. Enviar `POST /api/auth/forgot-password` con `nadie@test.com`. 2. Repetir con `ana@test.com` y comparar.

**Esperado:** HTTP 200 con el mismo cuerpo en los dos casos.

**Obtenido:** `nadie@test.com`: HTTP 404 `No account found for that email`. `ana@test.com`: HTTP 200 con `message` y `token`.

**Reproducibilidad:** 3 de 3 corridas de `npm test`, en macOS.

**Evidencia:** `{"error":{"code":"NOT_FOUND","message":"No account found for that email","details":[]}}` frente a `{"message":"Password reset requested","token":"<token>"}`. Además, la respuesta expone el token de reseteo.

**Test que lo reproduce:** `server/tests/password-reset.test.ts` › c2 · un email inexistente responde 200

**Severidad:** alta
