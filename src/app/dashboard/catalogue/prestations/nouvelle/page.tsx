import { Plus, Scissors } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import { listCategoryOptions } from '@/lib/catalogue-admin';
import { adminCreateService } from '@/modules/catalogue/actions';
import { getStorageConfigurationHint, isStorageConfigured } from '@/modules/fichiers/storage';
import { PageHeader } from '@/components/layout/PageHeader';
import { BackButton } from '@/components/shared/BackButton';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ServiceForm } from '../../service-form';

export const metadata: Metadata = { title: 'Nouvelle prestation - Tableau de bord' };

export default async function NewServicePage() {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/catalogue/prestations/nouvelle');

  const categories = await listCategoryOptions();

  return (
    <div>
      <PageHeader
        icon={Plus}
        title="Nouvelle prestation"
        back={<BackButton fallbackHref="/dashboard/catalogue" />}
      />

      {categories.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Scissors aria-hidden="true" className="size-8 text-accent" />
          <div>
            <p className="font-semibold">Créez d&apos;abord une catégorie</p>
            <p className="mt-1 text-sm text-muted">Toute prestation appartient à une catégorie.</p>
          </div>
          <ButtonLink href="/dashboard/catalogue" icon={Scissors}>
            Gérer les catégories
          </ButtonLink>
        </Card>
      ) : (
        <Card>
          <ServiceForm
            action={adminCreateService}
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
              active: category.active,
            }))}
            submitLabel="Créer la prestation"
            storageReady={isStorageConfigured()}
            storageHint={getStorageConfigurationHint()}
          />
        </Card>
      )}
    </div>
  );
}
