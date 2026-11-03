# Contract testing con Pact

`TaskFlowWeb` (consumer) declara qué pide y qué espera. `TaskFlowAPI` (provider)
repite ese contrato contra la API real. El contrato queda en
`server/pacts/TaskFlowWeb-TaskFlowAPI.json` y viaja por el repo, sin Pact Broker.

```bash
npm run test:contract
```

Corre primero el consumer, que genera el contrato, y después el provider. No hace
falta levantar la API: el test del provider la arranca en un puerto libre, con una
base SQLite temporal. `npm test` no corre estos tests.

| Interacción | Estado (`given`) | Respuesta |
|---|---|---|
| `GET /api/projects` | `ana tiene un proyecto` | 200 |
| `GET /api/projects` sin token | ninguno | 401 |
| `POST /api/auth/login` | `ana está registrada` | 200 |
| `GET /api/tasks/task-1/comments` | `la tarea task-1 tiene comentarios` | 200 |

## Evidencia de la ruptura

Con `name: p.name` cambiado a `title: p.name` en `serialize()`, la verificación
falla con `$[0] -> Actual map is missing the following keys: name`. La salida está
en `docs/evidencia/pact-contrato-roto.txt`. Al revertir, vuelve a pasar.

## Para discutir: ¿quién se habría enterado sin Pact?

Con ese cambio, la suite original de `npm test` sigue igual: ningún test de la base
ni de la Clase 5 mira el campo `name` en la respuesta. Solo fallan los dos tests de
US-09 que agregamos en la Clase 7 y comparan el cuerpo de la respuesta.

En esa corrida también falló una vez un test de transiciones de
`tasks-lifecycle.test.ts`. No depende de `name` y no se repitió en 3 corridas más
con el contrato roto; no encontramos la causa.

Sin Pact ni esos tests, el quiebre recién aparece en los E2E o cuando alguien abre
la lista de proyectos.
