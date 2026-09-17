/**
 * Deterministic seed data:
 *  - A small skill graph matching the examples in the master prompt
 *    (PostgreSQL -> Transactions/Indexing/Query Optimization,
 *     System Design -> Caching/Redis/Distributed Systems)
 *  - An admin user (dev only — never run this seed against production)
 */
import { PrismaClient, Role, SkillSource } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function upsertSkill(name: string, category: string) {
  return prisma.skill.upsert({
    where: { name },
    update: {},
    create: { name, category },
  });
}

async function dependsOn(skillId: string, prerequisiteSkillId: string) {
  await prisma.skillDependency.upsert({
    where: { skillId_prerequisiteSkillId: { skillId, prerequisiteSkillId } },
    update: {},
    create: { skillId, prerequisiteSkillId },
  });
}

async function main() {
  // --- Skill graph -----------------------------------------------------
  const postgres = await upsertSkill('PostgreSQL', 'database');
  const transactions = await upsertSkill('Transactions', 'database');
  const indexing = await upsertSkill('Indexing', 'database');
  const queryOptimization = await upsertSkill('Query Optimization', 'database');

  const systemDesign = await upsertSkill('System Design', 'architecture');
  const caching = await upsertSkill('Caching', 'architecture');
  const redis = await upsertSkill('Redis', 'architecture');
  const distributedSystems = await upsertSkill('Distributed Systems', 'architecture');

  await dependsOn(postgres.id, transactions.id);
  await dependsOn(transactions.id, indexing.id);
  await dependsOn(indexing.id, queryOptimization.id);

  await dependsOn(systemDesign.id, caching.id);
  await dependsOn(caching.id, redis.id);
  await dependsOn(redis.id, distributedSystems.id);

  // Additional skills
  const ts = await upsertSkill('TypeScript', 'language');
  const react = await upsertSkill('React', 'frontend');
  const nextjs = await upsertSkill('Next.js', 'frontend');
  const nodejs = await upsertSkill('Node.js', 'backend');
  const docker = await upsertSkill('Docker', 'devops');
  const cloud = await upsertSkill('Cloud Architecture', 'architecture');
  const python = await upsertSkill('Python', 'language');

  await dependsOn(nextjs.id, react.id);
  await dependsOn(react.id, ts.id);
  await dependsOn(nodejs.id, ts.id);
  await dependsOn(cloud.id, docker.id);

  // --- Dev admin user ----------------------------------------------------
  const adminEmail = 'admin@careerlens.dev';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await argon2.hash('ChangeMe123!');
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            fullName: 'CareerLens Admin',
            headline: 'System Administrator',
            experienceYears: 10,
            learningPaceHoursPerWeek: 15,
          },
        },
      },
    });
    console.log(`Seeded admin user: ${adminEmail} / ChangeMe123!`);
  }

  // --- Test demo user ----------------------------------------------------
  const testEmail = 'alex.morgan@careerlens.dev';
  const existingTestUser = await prisma.user.findUnique({ where: { email: testEmail } });
  if (!existingTestUser) {
    const testPasswordHash = await argon2.hash('Password123!');
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: testPasswordHash,
        role: Role.USER,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            fullName: 'Alex Morgan',
            headline: 'Software Engineer',
            experienceYears: 4,
            learningPaceHoursPerWeek: 8,
          },
        },
      },
    });

    // Seed test user skills
    await prisma.userSkill.createMany({
      data: [
        { userId: user.id, skillId: ts.id, proficiency: 3, source: SkillSource.SELF_REPORTED },
        { userId: user.id, skillId: react.id, proficiency: 3, source: SkillSource.SELF_REPORTED },
        { userId: user.id, skillId: postgres.id, proficiency: 2, source: SkillSource.SELF_REPORTED },
      ],
    });

    console.log(`Seeded test user: ${testEmail} / Password123!`);
  }

  // --- Seed Sample Jobs for Search & Matching -----------------------------
  const sampleJobs = [
    {
      source: 'careerlens-seed',
      externalId: 'job-101',
      title: 'Senior Backend Engineer',
      company: 'Stripe',
      location: 'San Francisco, CA (Hybrid)',
      seniority: 'senior',
      description:
        'Join our core payments engineering team building ultra-reliable distributed systems. You will design, implement, and operate fault-tolerant APIs in Node.js/TypeScript and PostgreSQL handling millions of transactions per day.',
      requiredSkills: ['PostgreSQL', 'TypeScript', 'Transactions', 'System Design', 'Redis'],
      optionalSkills: ['Distributed Systems', 'Docker', 'Query Optimization'],
    },
    {
      source: 'careerlens-seed',
      externalId: 'job-102',
      title: 'Full Stack Engineer',
      company: 'Vercel',
      location: 'Remote',
      seniority: 'mid',
      description:
        'Help build the next generation of web infrastructure. Looking for full-stack engineers experienced with React, Next.js, TypeScript, and modern relational databases to ship customer-facing developer tools.',
      requiredSkills: ['React', 'Next.js', 'TypeScript', 'Node.js'],
      optionalSkills: ['PostgreSQL', 'Docker', 'System Design'],
    },
    {
      source: 'careerlens-seed',
      externalId: 'job-103',
      title: 'Systems & Infrastructure Engineer',
      company: 'Datadog',
      location: 'New York, NY',
      seniority: 'senior',
      description:
        'Scale our time-series ingestion and observability pipeline. Experience in distributed systems, high-throughput caching with Redis, and container orchestration.',
      requiredSkills: ['Distributed Systems', 'Redis', 'Caching', 'Docker', 'System Design'],
      optionalSkills: ['PostgreSQL', 'Python'],
    },
  ];

  for (const job of sampleJobs) {
    await prisma.job.upsert({
      where: { source_externalId: { source: job.source, externalId: job.externalId } },
      update: {},
      create: {
        ...job,
        postedAt: new Date(),
      },
    });
  }

  console.log(`Seeded ${sampleJobs.length} sample jobs.`);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
