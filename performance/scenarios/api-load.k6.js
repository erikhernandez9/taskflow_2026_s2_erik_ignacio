import { check, sleep } from 'k6';
import http from 'k6/http';

/**
 * Misma prueba con seed chica y grande: login una sola vez y, por cada usuario
 * virtual, el flujo de abrir el tablero de un proyecto.
 *
 *   k6 run -e VUS=1 -e DURATION=30s performance/scenarios/api-load.k6.js
 *   k6 run -e VUS=20 -e DURATION=1m performance/scenarios/api-load.k6.js
 */
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
const THINK_TIME_SECONDS = 1;
const LOAD_PROJECT = 'Carga 001';

export const options = {
  vus: Number(__ENV.VUS || 1),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    // Criterio de rendimiento de la especificación: p95 del listado <= 500 ms.
    'http_req_duration{name:listado_tareas}': ['p(95)<500'],
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

// Va en setup() y no en cada iteración: la cuenta se bloquea tras varios intentos fallidos.
export function setup() {
  const login = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'ana@test.com', password: 'Password1' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(login, { 'login 200': (r) => r.status === 200 });
  const token = login.json('token');

  const projects = http.get(`${BASE_URL}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = projects.json();
  const project = list.find((p) => p.name === LOAD_PROJECT) || list[0];

  return { token, projectId: project.id };
}

export default function ({ token, projectId }) {
  const params = (name) => ({ headers: { Authorization: `Bearer ${token}` }, tags: { name } });

  const projects = http.get(`${BASE_URL}/projects`, params('listado_proyectos'));
  check(projects, { 'proyectos 200': (r) => r.status === 200 });

  const tasks = http.get(`${BASE_URL}/projects/${projectId}/tasks`, params('listado_tareas'));
  check(tasks, { 'tareas 200': (r) => r.status === 200 });

  const items = tasks.status === 200 ? tasks.json('items') : [];
  if (items.length > 0) {
    const task = items[__ITER % items.length];
    const detail = http.get(`${BASE_URL}/tasks/${task.id}`, params('detalle_tarea'));
    check(detail, { 'detalle 200': (r) => r.status === 200 });

    const comments = http.get(`${BASE_URL}/tasks/${task.id}/comments`, params('comentarios'));
    check(comments, { 'comentarios 200': (r) => r.status === 200 });
  }

  sleep(THINK_TIME_SECONDS);
}
