# Informe de estado · TaskFlow

**Para:** quien decide si se libera · **Equipo:** Erik Hernández e Ignacio Tachini · **Fecha:** 2026-11-24
**Fuente:** pipeline de GitHub Actions del commit `0dbbed9` ([run 45474481488](https://github.com/erikhernandez9/taskflow_2026_s2_erik_ignacio/actions/runs/45474481488)), lcov, reporte de Playwright y GitHub Issues.

**Resumen.** El pipeline corre en cada push y PR, en 2 min 33 s, y deja **2 de 6 etapas en verde**. Ningún rojo es de configuración: todos son bugs reales con su issue, más 3 hallazgos de lint. Hay 4 defectos altos abiertos, uno de ellos permite tomar cualquier cuenta. **Recomendación: no liberar.**

## Estado contra los criterios de salida

| Criterio de salida | Objetivo | Resultado | |
|---|---|---|---|
| Build del servidor y del cliente | compila | compila | ✅ |
| Lint (ESLint) | 0 errores | 3 errores en `comments.service.ts` (`any`, variable sin usar) | ❌ |
| Tests de API (Jest + Supertest) | 100 % en verde | 130 de 196 (66 rojos, todos con issue) | ❌ |
| Cobertura de código | ≥ 80 % de líneas y ≥ 40 % de ramas | 85,87 % de líneas y 67,41 % de ramas | ✅\* |
| E2E (Playwright) | 100 % en verde | 63 de 70 (7 rojos: issues #4, #10 y #11) | ❌ |
| Defectos altos o críticos abiertos | 0 | 4 | ❌ |

\* El umbral se cumple. El job sale rojo solo porque ejecuta los mismos tests que fallan.

## Métricas elegidas (3) y descartada (1)

1. **Defectos abiertos por severidad: 13** (4 altos, 7 medios, 2 bajos). Es la que decide: con altos abiertos no se libera.
2. **Criterios de aceptación con test: 81,4 %** (92 de 113), y **61,1 % en verde** (69). Dice qué parte de la spec está verificada, no cuántas líneas se ejecutaron. Los 21 criterios sin test están en `docs/trazabilidad.md`.
3. **Cobertura de ramas: 67,41 %** (era 55,35 %). Los bugs de permisos viven en ramas (`if` de membresía), así que es más informativa que la de líneas.

**Descartada: cantidad de tests** (pasó de 81 a 196). Es vanity: subió 2,4 veces y la decisión no cambia. Además, perseguirla empuja a escribir tests que no prueban nada, como los 6 que descartamos en el ejercicio de IA (ley de Goodhart).

## Defectos abiertos

| Severidad | Issues |
|---|---|
| **Alta (4)** | #1 y #2: cualquier usuario edita o borra tareas de proyectos ajenos (IDOR, CVSS 8,3). #6: `forgot-password` devuelve el token de reseteo, así que se puede tomar cualquier cuenta (CVSS 9,1). #7: `reset-password` acepta tokens usados o vencidos |
| Media (7) | #3 TODO→DONE sin pasar por IN_PROGRESS · #4 la fecha de vencimiento vuelve un día antes en UTC-3 · #5 proyectos con nombre vacío · #8 contraseñas de 7 caracteres · #9 borrar un proyecto deja datos huérfanos · #11 etiquetas duplicadas · #12 el listado ignora la paginación (5.000 tareas por respuesta) |
| Baja (2) | #10 etiquetas sin normalizar · #14 se acepta el 30 de febrero y se guarda como 2 de marzo |

## Riesgos sin mitigar

- **Seguridad:** toma de cuenta (#6) y modificación de datos ajenos (#1, #2). Si se despliega sin `JWT_SECRET`, el secreto queda público en el código y cualquiera puede falsificar sesiones (SEC-03, CVSS 9,8).
- **Datos incorrectos para todos los usuarios de Uruguay:** con el servidor en UTC-3, cada fecha de vencimiento se muestra un día antes (#4).
- **Zonas sin verificar:** comentarios (US-08, 4 criterios sin test), etiquetas (US-15, 4) y login (US-02, 4). La spec dice que una tarea con fecha pasada "se considera vencida" (US-16 c7), pero ningún campo de la API lo expone, así que no se puede verificar.

## Recomendación: **no liberar**

Los 4 defectos altos comprometen cuentas y datos de otros usuarios, y #4 muestra mal un dato a todos los usuarios de la zona horaria del equipo. Pasaríamos a **"liberar con riesgos"** cuando se cumplan tres condiciones: estén cerrados #1, #2, #6, #7 y #4; el arranque exija `JWT_SECRET`; y el lint quede en 0. Los defectos medios y bajos restantes quedarían como riesgo aceptado, con fecha de corrección.
