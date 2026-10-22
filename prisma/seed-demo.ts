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
 * En production, le catalogue réel doit être saisi par Patricia depuis le
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

const DEMO_SERVICES: DemoService[] = [
  {
    name: 'Tresses BOX',
    slug: 'tresses-box',
    categorySlug: 'tresses',
    description:
      'Tresses collées au cuir chevelu, réalisées mèche par mèche. Tenue longue durée et finition soignée, adaptée à toutes les occasions.',
    priceFromCents: 2000000,
    priceToCents: 3500000,
    durationMinutes: 180,
    order: 1,
    options: [
      { name: 'Soin profond avant pose', priceCents: 250000, durationMinutes: 15 },
      { name: 'Perles et accessoires', priceCents: 125000, durationMinutes: 10 },
    ],
  },
  {
    name: 'Tresses collées',
    slug: 'tresses-collees',
    categorySlug: 'tresses',
    description:
      'Tresses plaquées près du crâne, idéales pour un rendu net et durable. Plusieurs épaisseurs disponibles selon votre envie.',
    priceFromCents: 1125000,
    priceToCents: 1625000,
    durationMinutes: 120,
    order: 2,
  },
  {
    name: 'Tresses avec mèches',
    slug: 'tresses-avec-meches',
    categorySlug: 'tresses',
    description:
      'Tresses longues réalisées avec des mèches pour un volume et une longueur sur mesure. Prévoir une photo de référence.',
    priceFromCents: 2250000,
    priceToCents: null,
    durationMinutes: 210,
    order: 3,
    options: [{ name: 'Mèches fournies', priceCents: 875000, durationMinutes: 0 }],
  },
  {
    name: 'Vanilles légères',
    slug: 'vanilles-legeres',
    categorySlug: 'vanilles',
    description:
      'Vanilles souples et régulières, réalisées sur cheveux propres et démêlés. Un classique protecteur qui convient au quotidien.',
    priceFromCents: 1500000,
    priceToCents: 1500000,
    durationMinutes: 150,
    order: 4,
  },
  {
    name: 'Vanilles sur cheveux naturels',
    slug: 'vanilles-sur-cheveux-naturels',
    categorySlug: 'vanilles',
    description:
      'Vanilles réalisées sur cheveux naturels, sans extension. Le tarif dépend de la longueur et de la densité de votre chevelure.',
    priceFromCents: 1250000,
    priceToCents: 1875000,
    durationMinutes: 120,
    order: 5,
  },
  {
    name: 'Twists moyens',
    slug: 'twists-moyens',
    categorySlug: 'vanilles',
    description:
      'Twists deux mèches au rendu volumineux et souple, parfaits pour laisser respirer le cuir chevelu.',
    priceFromCents: 1750000,
    priceToCents: null,
    durationMinutes: 180,
    order: 6,
  },
  {
    name: 'Rétissage de locs',
    slug: 'retissage-de-locs',
    categorySlug: 'locs',
    description:
      'Entretien et reprise des racines de vos locs, avec nettoyage du cuir chevelu et finition soignée.',
    priceFromCents: 2500000,
    priceToCents: null,
    durationMinutes: 120,
    order: 7,
    options: [
      { name: 'Soin hydratant locs', priceCents: 375000, durationMinutes: 20 },
      { name: 'Mise en forme finale', priceCents: 250000, durationMinutes: 15 },
    ],
  },
  {
    name: 'Entretien de locs',
    slug: 'entretien-de-locs',
    categorySlug: 'locs',
    description:
      'Nettoyage, resserrage et hydratation de vos locs pour préserver leur santé entre deux rétissages.',
    priceFromCents: 1125000,
    priceToCents: 1125000,
    durationMinutes: 90,
    order: 8,
  },
  {
    name: 'Départ de locs',
    slug: 'depart-de-locs',
    categorySlug: 'depart-de-locs',
    description:
      'Création des premières locs, avec choix de la taille et de la méthode. Une évaluation préalable est nécessaire pour confirmer la faisabilité et le tarif.',
    priceFromCents: null,
    priceToCents: null,
    priceOnRequest: true,
    durationMinutes: 90,
    order: 9,
    options: [{ name: 'Kit de démarrage locs', priceCents: 625000, durationMinutes: 0 }],
  },
  {
    name: 'Coiffure protectrice complète',
    slug: 'coiffure-protectrice-complete',
    categorySlug: 'protectrices',
    description:
      'Pose protectrice complète avec préparation du cheveu, soin et finition. Convient aux cheveux fragilisés ou en transition.',
    priceFromCents: 3000000,
    priceToCents: null,
    durationMinutes: 240,
    order: 10,
    options: [{ name: 'Soin réparateur', priceCents: 450000, durationMinutes: 20 }],
  },
  {
    name: 'Coupe et brushing',
    slug: 'coupe-et-brushing',
    categorySlug: 'coupes',
    description:
      'Coupe personnalisée suivie d’un brushing soigné, avec conseils d’entretien adaptés à votre chevelure.',
    priceFromCents: 875000,
    priceToCents: 875000,
    durationMinutes: 60,
    order: 11,
  },
  {
    name: 'Coupe enfant',
    slug: 'coupe-enfant',
    categorySlug: 'coupes',
    description:
      'Coupe douce et rapide pour les enfants, dans une ambiance rassurante et adaptée à leur âge.',
    priceFromCents: 500000,
    priceToCents: 500000,
    durationMinutes: 45,
    order: 12,
  },
];

const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

/**
 * Galerie de démonstration par catégorie. Les `key` contiennent ici des URLs
 * publiques (photos libres Pexels) : en production, `ServiceImage.key` contient
 * une clé S3 privée et l'URL signée est résolue côté serveur (P4.4).
 */
const DEMO_GALLERY: Record<string, { key: string; alt: string }[]> = {
  tresses: [
    {
      key: pexels(36441633),
      alt: 'Tresses africaines réalisées en salon (photo de démonstration)',
    },
    {
      key: pexels(33664383),
      alt: 'Coiffure tressée élégante vue de profil (photo de démonstration)',
    },
    {
      key: pexels(31801412),
      alt: 'Portrait d’une femme aux cheveux tressés (photo de démonstration)',
    },
  ],
  vanilles: [
    {
      key: pexels(37547660),
      alt: 'Femmes aux cheveux tressés en vanilles (photo de démonstration)',
    },
    {
      key: pexels(33475847),
      alt: 'Portrait d’une femme aux cheveux tressés (photo de démonstration)',
    },
  ],
  locs: [
    { key: pexels(30152002), alt: 'Femme portant des locs (photo de démonstration)' },
    { key: pexels(14778613), alt: 'Cheveux naturels bouclés en close-up (photo de démonstration)' },
  ],
  'depart-de-locs': [
    {
      key: pexels(31801412),
      alt: 'Portrait d’une femme aux cheveux tressés (photo de démonstration)',
    },
    { key: pexels(30152002), alt: 'Femme portant des locs (photo de démonstration)' },
  ],
  protectrices: [
    {
      key: pexels(16563139),
      alt: 'Mains d’une coiffeuse réalisant une coiffure (photo de démonstration)',
    },
    { key: pexels(11269055), alt: 'Femme aux cheveux courts et soignés (photo de démonstration)' },
  ],
  coupes: [
    { key: pexels(11269055), alt: 'Femme aux cheveux courts et soignés (photo de démonstration)' },
    {
      key: pexels(10825829),
      alt: 'Portrait de démonstration d’une femme coiffée (photo de démonstration)',
    },
    { key: pexels(10810251), alt: 'Cheveux courts colorés et coiffés (photo de démonstration)' },
  ],
};

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
