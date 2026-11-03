import request from 'supertest';
import { db } from '../src/lib/db';
import { parsePublicId } from '../src/lib/ids';
import { app, registerUser } from './helpers';

/**
 * US-17: el cliente no tiene pantalla de recuperación, así que los criterios se
 * verifican en la capa de integración. El token se lee de la base porque es lo
 * que recibiría el usuario por email; la respuesta HTTP no debería exponerlo.
 */
const NEW_PASSWORD = 'NuevaClave1';

async function requestToken(email: string): Promise<string> {
  await request(app).post('/api/auth/forgot-password').send({ email });
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const record = await db.passwordResetToken.findFirstOrThrow({
    where: { userId: user.id },
    orderBy: { id: 'desc' },
  });
  return record.token;
}

function reset(token: string, newPassword = NEW_PASSWORD) {
  return request(app).post('/api/auth/reset-password').send({ token, newPassword });
}

function login(email: string, password: string) {
  return request(app).post('/api/auth/login').send({ email, password });
}

describe('POST /api/auth/forgot-password — US-17', () => {
  it('c2 · un email registrado responde 200 y genera un token', async () => {
    const { id } = await registerUser('forgot-ok@test.com');

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'forgot-ok@test.com' });

    expect(res.status).toBe(200);
    const tokens = await db.passwordResetToken.count({
      where: { userId: parsePublicId(id, 'user') as number },
    });
    expect(tokens).toBe(1);
  });

  it('c2 · un email inexistente responde 200, igual que uno registrado', async () => {
    await registerUser('forgot-known@test.com');

    const known = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'forgot-known@test.com' });
    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nadie@test.com' });

    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
  });

  it('c4 · el token expira a los 60 minutos de generado', async () => {
    await registerUser('forgot-ttl@test.com');
    const before = Date.now();

    const token = await requestToken('forgot-ttl@test.com');

    const record = await db.passwordResetToken.findUniqueOrThrow({ where: { token } });
    const ttlMinutes = (record.expiresAt.getTime() - before) / 60_000;
    expect(ttlMinutes).toBeGreaterThan(59);
    expect(ttlMinutes).toBeLessThanOrEqual(61);
  });
});

describe('POST /api/auth/reset-password — US-17', () => {
  it('c1 · un token válido cambia la contraseña', async () => {
    await registerUser('reset-ok@test.com');
    const token = await requestToken('reset-ok@test.com');

    const res = await reset(token);

    expect(res.status).toBe(200);
    expect((await login('reset-ok@test.com', NEW_PASSWORD)).status).toBe(200);
    expect((await login('reset-ok@test.com', 'Password1')).status).toBe(401);
  });

  it('c5 · un token inexistente devuelve 400', async () => {
    const res = await reset('token-que-no-existe');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('c3/c5 · un token ya utilizado no se puede reutilizar', async () => {
    await registerUser('reset-reuse@test.com');
    const token = await requestToken('reset-reuse@test.com');
    await reset(token);

    const res = await reset(token, 'OtraClave22');

    expect(res.status).toBe(400);
    expect((await login('reset-reuse@test.com', 'OtraClave22')).status).toBe(401);
  });

  it('c5 · un token vencido devuelve 400', async () => {
    await registerUser('reset-expired@test.com');
    const token = await requestToken('reset-expired@test.com');
    // Arrange por base: esperar 61 minutos de verdad no es práctico.
    await db.passwordResetToken.update({
      where: { token },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const res = await reset(token);

    expect(res.status).toBe(400);
    expect((await login('reset-expired@test.com', NEW_PASSWORD)).status).toBe(401);
  });

  it('c6 · generar un token nuevo invalida el anterior', async () => {
    await registerUser('reset-rotate@test.com');
    const first = await requestToken('reset-rotate@test.com');
    const second = await requestToken('reset-rotate@test.com');

    const withFirst = await reset(first);
    const withSecond = await reset(second);

    expect(withFirst.status).toBe(400);
    expect(withSecond.status).toBe(200);
  });

  it.each([
    ['7 caracteres (último largo inválido)', 'Clave12'],
    ['sin número', 'ClaveSinNumero'],
    ['sin mayúscula', 'clave1234'],
  ])('c7 · rechaza una contraseña con %s', async (caso, password) => {
    const email = `reset-rule-${caso.length}@test.com`;
    await registerUser(email);
    const token = await requestToken(email);

    const res = await reset(token, password);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('c7 · acepta una contraseña de exactamente 8 caracteres', async () => {
    await registerUser('reset-min@test.com');
    const token = await requestToken('reset-min@test.com');

    const res = await reset(token, 'Clave123');

    expect(res.status).toBe(200);
  });

  it('c8 · un reseteo exitoso desbloquea la cuenta y reinicia los intentos', async () => {
    await registerUser('reset-lock@test.com');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login('reset-lock@test.com', 'Incorrecta1');
    }
    expect((await login('reset-lock@test.com', 'Password1')).status).toBe(401);
    const token = await requestToken('reset-lock@test.com');

    await reset(token);

    expect((await login('reset-lock@test.com', NEW_PASSWORD)).status).toBe(200);
    const user = await db.user.findUniqueOrThrow({ where: { email: 'reset-lock@test.com' } });
    expect(user.failedAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();
  });
});
