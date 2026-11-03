# Reporte de performance: seed chica y seed grande

Práctico de k6 sobre TaskFlow. La salida completa de cada corrida está en
`performance/results/`.

> **Scripts propios.** `server/prisma/seed-large.ts` y
> `performance/scenarios/api-load.k6.js` no son los del kit de la cátedra: no
> estaban disponibles al correr el práctico y se escribieron siguiendo
> `Instrucciones practico K6.docx`. Si se reemplazan por los oficiales, hay que
> volver a correr las pruebas y actualizar esta tabla.

## Entorno

macOS 27.2 · k6 v2.3.0 · API con `npm run dev:server` y SQLite, misma máquina para
las dos corridas · 2026-11-03.

## Resultados

| Anotá | Seed chica (1 VU, 30 s) | Seed grande (20 VUs, 1 min) |
|---|---|---|
| p95 (`http_req_duration`) | 5,01 ms | 314,31 ms |
| p95 del listado de tareas | 5,21 ms | 415,3 ms |
| Error rate (`http_req_failed`) | 0,00 % | 0,00 % |
| Iteraciones por segundo | 0,98 | 14,60 |
| Datos recibidos por segundo | 3,4 kB/s | 26 MB/s |

La consigna cambia datos y usuarios a la vez, así que estas corridas no aíslan el
efecto de cada uno. La seed grande tiene 200 proyectos de carga, 5.000 tareas y
20.000 comentarios.

## Lectura

1. **Errores:** ninguno, y todos los checks pasan.
2. **Tiempos:** se cumple el SLO de la especificación (p95 del listado de hasta
   500 ms), con 85 ms de margen en esta máquina. El número depende del hardware:
   hay que compararlo contra una línea base propia, no entre equipos.
3. **Throughput:** por usuario virtual baja de 0,98 a 0,73 iteraciones por segundo.

## Hipótesis: qué crece con los datos

El tamaño de la respuesta del listado de tareas. `GET /projects/:id/tasks` ignora
`limit` y `offset`: con `?limit=20` responde igual que sin él, con las 5.000 tareas
y 1.744.856 bytes. Por eso el costo crece en línea recta con la cantidad de tareas,
y eso incumple el primer criterio de rendimiento de la especificación aunque el
p95 todavía cumpla el segundo.

No parece un problema de N+1: `loadTaskExtras` resuelve asignados y conteo de
comentarios en lote, así que la cantidad de consultas no depende de los resultados.
Esto sale de leer el código; no se contaron las consultas por request.

Reporte para cargar: `docs/issues/12-listado-sin-paginacion.md`. Lo reproduce
`server/tests/listing-pagination.test.ts`.
