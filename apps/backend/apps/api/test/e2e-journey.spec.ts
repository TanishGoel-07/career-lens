import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CareerLens AI — Full End-to-End User Journey', () => {
  let app: INestApplication;
  const testEmail = `e2e_journey_${Date.now()}@careerlens.dev`;
  const testPassword = 'StrongPassword123!';
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let targetRoleId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('Step 1: Health & Readiness check', async () => {
    const healthRes = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect(healthRes.body.status).toBe('ok');

    const readinessRes = await request(app.getHttpServer())
      .get('/api/v1/readiness')
      .expect(200);
    expect(readinessRes.body.ready).toBe(true);
    expect(readinessRes.body.checks.database).toBe(true);
    expect(readinessRes.body.checks.redis).toBe(true);
  });

  it('Step 2: Register a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: testPassword })
      .expect(201);

    expect(res.body.userId).toBeDefined();
    userId = res.body.userId;
  });

  it('Step 3: Login with registered credentials to receive tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.expiresIn).toBeGreaterThan(0);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('Step 4: Authenticated user fetches their profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(userId);
    expect(res.body.email).toBe(testEmail);
    expect(res.body.role).toBe('USER');
  });

  it('Step 5: User updates their profile details', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/users/me/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'E2E Test Engineer',
        headline: 'Senior Full Stack Specialist',
        experienceYears: 5,
        learningPaceHoursPerWeek: 12,
      })
      .expect(200);

    expect(res.body.fullName).toBe('E2E Test Engineer');
    expect(res.body.experienceYears).toBe(5);
  });

  it('Step 6: User searches seeded jobs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/jobs?q=Engineer')
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].requiredSkills).toBeDefined();
  });

  it('Step 7: User adds a verified skill to their inventory', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/skills/mine')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ skillName: 'TypeScript' })
      .expect(201);

    expect(res.body.skillId).toBeDefined();
    expect(res.body.skill.name).toBe('TypeScript');
  });

  it('Step 8: User creates a target role', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/target-roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Senior Cloud Platform Engineer',
        skills: [
          { name: 'TypeScript', importance: 'REQUIRED', minProficiency: 4 },
          { name: 'Docker', importance: 'REQUIRED', minProficiency: 3 },
          { name: 'Kubernetes', importance: 'REQUIRED', minProficiency: 3 },
          { name: 'Redis', importance: 'OPTIONAL', minProficiency: 2 },
        ],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Senior Cloud Platform Engineer');
    targetRoleId = res.body.id;
  });

  it('Step 9: User computes skill gaps for their target role', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/target-roles/${targetRoleId}/skill-gaps`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // TypeScript is owned, so missing are Docker, Kubernetes, Redis
    expect(res.body.length).toBe(3);
    expect(res.body[0].priority).toBeDefined();
  });

  it('Step 10: User generates an automatic career roadmap', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/target-roles/${targetRoleId}/roadmap`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ hoursPerWeek: 12 })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(Array.isArray(res.body.modules)).toBe(true);
    expect(res.body.modules.length).toBeGreaterThan(0);
  });

  it('Step 11: User starts an interview session & practices questions', async () => {
    const sessionRes = await request(app.getHttpServer())
      .post('/api/v1/interview/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'TECHNICAL' })
      .expect(201);

    expect(sessionRes.body.id).toBeDefined();
    const sessionId = sessionRes.body.id;

    // Fetch next practice question
    const qRes = await request(app.getHttpServer())
      .post(`/api/v1/interview/sessions/${sessionId}/next-question`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ topic: 'Two Sum', questionType: 'CODING' })
      .expect(201);

    expect(qRes.body.id).toBeDefined();
    expect(qRes.body.promptText).toBeDefined();
  });

  it('Step 12: User chats with AI Career Coach', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/coach/message')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sessionId: 'e2e-coach-session',
        message: 'How do I bridge my Kubernetes gap to reach senior level?',
      })
      .expect(201);

    expect(res.body.reply).toBeDefined();
    expect(res.body.reply.text).toBeDefined();
  });

  it('Step 13: Refresh token rotation issues a new token pair', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(refreshToken);

    // Old token should be revoked (replay attack triggers 401)
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    refreshToken = res.body.refreshToken;
  });

  it('Step 14: Logout revokes session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(201);

    // Using the revoked token again fails
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
