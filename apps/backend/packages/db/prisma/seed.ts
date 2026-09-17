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

  // --- Dev admin user ----------------------------------------------------
  const adminEmail = 'admin@careerlens.dev';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await argon2.hash('ChangeMe123!');
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Seeded admin user: ${adminEmail} / ChangeMe123! (dev only, rotate immediately)`);
  }

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
