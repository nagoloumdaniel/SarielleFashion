'use client';

import { Archive, Eye, EyeOff, RotateCcw } from 'lucide-react';
import type { ServiceStatus } from '@prisma/client';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { adminArchiveService, adminSetServiceStatus } from '@/modules/catalogue/actions';
import { formDataOf, useRunAction } from './catalogue-ui';

/* ============================================================
 * Actions rapides d'une carte prestation (hors lien de la carte) :
 * publier / dépublier / rétablir, et archiver (P4.1, P4.6).
 * ============================================================ */

export function ServiceActionsRow({
  service,
}: {
  service: { id: string; name: string; status: ServiceStatus };
}) {
  const confirm = useConfirm();
  const statusAction = useRunAction();
  const archiveAction = useRunAction();

  const isPublished = service.status === 'PUBLISHED';
  const isArchived = service.status === 'ARCHIVED';
  const next: ServiceStatus = isPublished || isArchived ? 'DRAFT' : 'PUBLISHED';
  const label = isArchived ? 'Rétablir en brouillon' : isPublished ? 'Dépublier' : 'Publier';

  async function onToggleStatus() {
    if (isPublished) {
      const ok = await confirm({
        title: 'Dépublier cette prestation ?',
        message: `« ${service.name} » ne sera plus visible sur le site ni réservable. Vous pourrez la republier à tout moment.`,
        confirmLabel: 'Dépublier',
        tone: 'primary',
      });
      if (!ok) return;
    }
    statusAction.run(() => adminSetServiceStatus({}, formDataOf({ id: service.id, status: next })));
  }

  async function onArchive() {
    const ok = await confirm({
      title: 'Archiver cette prestation ?',
      message: `« ${service.name} » disparaîtra du site public, son historique est conservé.`,
      confirmLabel: 'Archiver',
      tone: 'primary',
    });
    if (!ok) return;
    archiveAction.run(() => adminArchiveService({}, formDataOf({ id: service.id })));
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        iconOnly
        icon={isArchived ? RotateCcw : isPublished ? EyeOff : Eye}
        loading={statusAction.pending}
        onClick={onToggleStatus}
        aria-label={`${label} : ${service.name}`}
        title={label}
      >
        {label}
      </Button>
      {isArchived ? null : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          iconOnly
          icon={Archive}
          loading={archiveAction.pending}
          onClick={onArchive}
          aria-label={`Archiver : ${service.name}`}
          title="Archiver"
        >
          Archiver
        </Button>
      )}
    </div>
  );
}
