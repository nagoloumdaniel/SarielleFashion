'use client';

import { Archive, Eye, EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import type { AdminServiceDetail } from '@/lib/catalogue-admin';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import {
  adminArchiveService,
  adminDeleteService,
  adminSetServiceStatus,
} from '@/modules/catalogue/actions';
import { formDataOf, useRunAction } from '../../catalogue-ui';

/* ============================================================
 * P4.6 - Publication, dépublication et archivage d'une
 * prestation. La suppression est refusée si des réservations
 * historiques existent (contrôle aussi côté serveur).
 * ============================================================ */

export function ServiceHeaderActions({
  service,
  canDelete,
}: {
  service: Pick<AdminServiceDetail, 'id' | 'name' | 'status'>;
  canDelete: boolean;
}) {
  const confirm = useConfirm();
  const publish = useRunAction();
  const archive = useRunAction();
  const remove = useRunAction();

  const isPublished = service.status === 'PUBLISHED';
  const isArchived = service.status === 'ARCHIVED';
  const nextStatus = isPublished || isArchived ? 'DRAFT' : 'PUBLISHED';
  const statusLabel = isArchived ? 'Rétablir' : isPublished ? 'Dépublier' : 'Publier';

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
    publish.run(() =>
      adminSetServiceStatus({}, formDataOf({ id: service.id, status: nextStatus })),
    );
  }

  async function onArchive() {
    const ok = await confirm({
      title: 'Archiver cette prestation ?',
      message: 'Elle disparaîtra du site public et restera dans l’historique.',
      confirmLabel: 'Archiver',
      tone: 'primary',
    });
    if (!ok) return;
    archive.run(() => adminArchiveService({}, formDataOf({ id: service.id })));
  }

  async function onDelete() {
    const ok = await confirm({
      title: 'Supprimer cette prestation ?',
      message: `« ${service.name} » sera supprimée définitivement avec ses photos. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    remove.run(() => adminDeleteService({}, formDataOf({ id: service.id })));
  }

  return (
    <>
      <Button
        type="button"
        variant={isPublished || isArchived ? 'secondary' : 'primary'}
        icon={isArchived ? RotateCcw : isPublished ? EyeOff : Eye}
        iconOnly="mobile"
        loading={publish.pending}
        onClick={onToggleStatus}
      >
        {statusLabel}
      </Button>
      {isArchived ? null : (
        <Button
          type="button"
          variant="secondary"
          icon={Archive}
          iconOnly="mobile"
          loading={archive.pending}
          onClick={onArchive}
        >
          Archiver
        </Button>
      )}
      {canDelete ? (
        <Button
          type="button"
          variant="danger"
          icon={Trash2}
          iconOnly="mobile"
          loading={remove.pending}
          onClick={onDelete}
        >
          Supprimer
        </Button>
      ) : null}
    </>
  );
}
