import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Catégories de base §4.2 (P1.6) — l administratrice peut tout
// modifier ensuite depuis le dashboard.
const CATEGORIES = [
  { name: 'Coiffure femme', slug: 'coiffure-femme', order: 0 },
  { name: 'Coiffure homme', slug: 'coiffure-homme', order: 1 },
  { name: 'Coiffure enfant', slug: 'coiffure-enfant', order: 2 },
  { name: 'Make-up', slug: 'make-up', order: 3 },
  { name: 'Pose de lace', slug: 'pose-de-lace', order: 4 },
  { name: 'Cils', slug: 'cils', order: 5 },
  { name: 'Événements', slug: 'evenements', order: 6 },
] as const;

async function main(): Promise<void> {
  // Catégories idempotents (re-seed sans doublon)
  for (const category of CATEGORIES) {
    await db.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, order: category.order },
      create: { ...category, active: true },
    });
  }

  // Settings du singleton (P1.6)
  await db.salonSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      contactEmail: process.env.ADMIN_EMAIL ?? null,
    },
  });

  // Compte admin initial (P1.7)
  const adminEmail = process.env.AUTH_ADMIN_EMAIL;
  const adminPassword = process.env.AUTH_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const email = adminEmail.toLowerCase();
    await db.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Sarielle',
        passwordHash: await hash(adminPassword, 12),
        role: 'ADMIN',
      },
    });
    console.log(`Admin seed : ${email}`);
  } else {
    console.warn('AUTH_ADMIN_EMAIL / AUTH_ADMIN_PASSWORD absents : admin non créé.');
  }

  // Disponibilités par défaut (P6.1) : du lundi au samedi, 9h-18h.
  // Sarielle peut tout modifier depuis /dashboard/disponibilites.
  const availabilityCount = await db.availabilityRule.count();
  if (availabilityCount === 0) {
    await db.availabilityRule.createMany({
      data: [0, 1, 2, 3, 4, 5].map((weekday) => ({
        kind: 'WEEKLY' as const,
        weekday,
        startMinute: 9 * 60,
        endMinute: 18 * 60,
        active: true,
      })),
    });
    console.log('Disponibilités par défaut créées (lundi au samedi, 9h-18h).');
  }

  console.log(`Seed OK : ${CATEGORIES.length} catégories.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
