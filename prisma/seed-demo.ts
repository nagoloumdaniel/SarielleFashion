/**
 * Jeu de données de DÉMONSTRATION pour les pages publiques (développement).
 *
 * Ce script ne fait pas partie du seed de production : il ajoute des
 * prestations d'exemple dans la base courante pour pouvoir vérifier le
 * catalogue (P3.2), la fiche prestation (P3.3) et les parcours suivants.
 *
 * À lancer après `npm run db:seed` (catégories requises) :
 *   npm run db:seed:demo
 *
 * Idempotent : les prestations sont identifiées par leur `slug` et mises à jour.
 * En production, le catalogue réel doit être saisi par Sarielle depuis le
 * dashboard (Phase 4) ; ne pas lancer ce script sur la base de production.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

type DemoService = {
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  priceFromCents: number | null;
  priceToCents: number | null;
  priceOnRequest?: boolean;
  durationMinutes: number;
  order: number;
  options?: { name: string; priceCents: number; durationMinutes: number }[];
};

// Données de DÉMONSTRATION : prix et durées fictifs, à remplacer par les vrais tarifs de Sarielle.
const DEMO_SERVICES: DemoService[] = [
  {
    name: 'Coiffure femme',
    slug: 'coiffure-femme',
    categorySlug: 'coiffure-femme',
    description:
      'Coiffure adaptée à ta nature de cheveux et à tes envies : tresses, coiffures protectrices, brushing ou coupe.',
    priceFromCents: 4000,
    priceToCents: 9000,
    durationMinutes: 120,
    order: 1,
    options: [{ name: 'Soin avant coiffure', priceCents: 1000, durationMinutes: 15 }],
  },
  {
    name: 'Coiffure homme',
    slug: 'coiffure-homme',
    categorySlug: 'coiffure-homme',
    description: 'Coupe, tresses ou coiffure soignée pour hommes, avec une finition nette.',
    priceFromCents: 1500,
    priceToCents: 4000,
    durationMinutes: 60,
    order: 2,
  },
  {
    name: 'Coiffure enfant',
    slug: 'coiffure-enfant',
    categorySlug: 'coiffure-enfant',
    description: 'Coiffure douce et confortable pour les enfants, réalisée sans les brusquer.',
    priceFromCents: 1500,
    priceToCents: 4000,
    durationMinutes: 60,
    order: 3,
  },
  {
    name: 'Make-up',
    slug: 'make-up',
    categorySlug: 'make-up',
    description: 'Maquillage naturel ou glamour, pensé pour révéler tes traits.',
    priceFromCents: 3500,
    priceToCents: 7000,
    durationMinutes: 60,
    order: 4,
  },
  {
    name: 'Pose de lace',
    slug: 'pose-de-lace',
    categorySlug: 'pose-de-lace',
    description: 'Pose de lace soignée, discrète et naturelle, avec une tenue qui dure.',
    priceFromCents: 6000,
    priceToCents: 12000,
    durationMinutes: 150,
    order: 5,
  },
  {
    name: 'Pose de cils',
    slug: 'pose-de-cils',
    categorySlug: 'cils',
    description: 'Pose de cils précise et confortable pour un regard sublimé.',
    priceFromCents: 4000,
    priceToCents: 8000,
    durationMinutes: 90,
    order: 6,
  },
  {
    name: 'Événement (coiffure et make-up)',
    slug: 'evenement',
    categorySlug: 'evenements',
    description:
      'Coiffure et make-up pour ton événement : mariage, soirée, shooting. Déplacement possible.',
    priceFromCents: null,
    priceToCents: null,
    priceOnRequest: true,
    durationMinutes: 180,
    order: 7,
  },
];

const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

// Photos de démonstration génériques (à remplacer par les vraies photos de Sarielle).
const DEMO_PHOTOS = [
  { key: pexels(10825829), alt: 'Portrait d’une femme coiffée (photo de démonstration)' },
  { key: pexels(11269055), alt: 'Femme aux cheveux courts et soignés (photo de démonstration)' },
];
const DEMO_GALLERY: Record<string, typeof DEMO_PHOTOS> = Object.fromEntries(
  DEMO_SERVICES.map((service) => [service.categorySlug, DEMO_PHOTOS]),
);

async function main(): Promise<void> {
  const categories = await db.category.findMany({ select: { slug: true } });
  const known = new Set(categories.map((category) => category.slug));

  for (const demo of DEMO_SERVICES) {
    if (!known.has(demo.categorySlug)) {
      throw new Error(
        `Catégorie « ${demo.categorySlug} » absente. Lancez d'abord « npm run db:seed ».`,
      );
    }

    const service = await db.service.upsert({
      where: { slug: demo.slug },
      update: {
        name: demo.name,
        description: demo.description,
        category: { connect: { slug: demo.categorySlug } },
        priceFromCents: demo.priceFromCents,
        priceToCents: demo.priceToCents,
        priceOnRequest: demo.priceOnRequest ?? false,
        durationMinutes: demo.durationMinutes,
        order: demo.order,
        status: 'PUBLISHED',
      },
      create: {
        name: demo.name,
        slug: demo.slug,
        description: demo.description,
        category: { connect: { slug: demo.categorySlug } },
        priceFromCents: demo.priceFromCents,
        priceToCents: demo.priceToCents,
        priceOnRequest: demo.priceOnRequest ?? false,
        durationMinutes: demo.durationMinutes,
        order: demo.order,
        status: 'PUBLISHED',
      },
    });

    // Options recréées pour rester idempotent sans identifiant stable.
    await db.serviceOption.deleteMany({ where: { serviceId: service.id } });
    if (demo.options?.length) {
      await db.serviceOption.createMany({
        data: demo.options.map((option) => ({ ...option, serviceId: service.id })),
      });
    }

    // Galerie de démonstration recréée (la première photo est la couverture).
    const gallery = DEMO_GALLERY[demo.categorySlug] ?? [];
    await db.serviceImage.deleteMany({ where: { serviceId: service.id } });
    if (gallery.length > 0) {
      await db.serviceImage.createMany({
        data: gallery.map((image, index) => ({
          ...image,
          serviceId: service.id,
          order: index,
          isPrimary: index === 0,
        })),
      });
    }
  }

  console.log(`Seed démo OK : ${DEMO_SERVICES.length} prestations publiées avec galeries.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
