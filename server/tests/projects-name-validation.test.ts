import request from 'supertest';
import { app, auth, registerUser } from './helpers';

/**
 * Hallazgo bonus (módulo Proyectos, fuera del alcance principal del taller
 * de Tareas — ciclo de vida, pero encontrado explorando el contrato del
 * mismo endpoint /projects). Ver BUG_REPORT.md — HALLAZGO #5.
 *
 * projects.controller.ts valida en `update` que el nombre tenga entre 3 y
 * 100 caracteres, pero en `create` solo valida el máximo (100). El mensaje
 * de error de `create` ("name must be between 3 and 100 characters")
 * promete la misma regla que en `update`, pero el código no la aplica.
 */
describe('POST /api/projects — validación de name (partición de equivalencia)', () => {
  it('rechaza un proyecto de 201 caracteres (sobre el límite, coherente con update)', async () => {
    const { token } = await registerUser('projname-long@test.com');

    const res = await request(app)
      .post('/api/projects')
      .set(auth(token))
      .send({ name: 'a'.repeat(101) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it(
    'HALLAZGO #5 — name de 2 caracteres debería rechazarse (la propia especificación ' +
      'dice "name must be between 3 and 100 characters" y así lo aplica PATCH /projects/:id), ' +
      'pero POST /projects no valida el mínimo y crea el proyecto igual',
    async () => {
      const { token } = await registerUser('projname-short@test.com');

      const res = await request(app)
        .post('/api/projects')
        .set(auth(token))
        .send({ name: 'ab' });

      // Comportamiento esperado según la especificación:
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    },
  );

  it(
    'HALLAZGO #5 (bis) — name vacío ("") debería rechazarse por la misma regla, ' +
      'pero POST /projects lo acepta y crea un proyecto sin nombre',
    async () => {
      const { token } = await registerUser('projname-empty@test.com');

      const res = await request(app)
        .post('/api/projects')
        .set(auth(token))
        .send({ name: '' });

      // Comportamiento esperado según la especificación:
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    },
  );
});
