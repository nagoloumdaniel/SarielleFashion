'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/i18n/client';
import { useScrollLock } from './useScrollLock';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* Pile des modales ouvertes : seule celle du dessus réagit à Échap / Tab. */
const stack: symbol[] = [];

/* Modale accessible : portail, fond flouté, bouton de fermeture, Échap, clic extérieur,
   piège à focus, page verrouillée (pas de défilement derrière), retour du focus à la fermeture.
   Mobile : feuille ancrée en bas ; ≥ sm : boîte centrée. */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Capturé au rendu d'ouverture : les enfants (champ autoFocus) volent le focus avant nos effets.
  if (open && !triggerRef.current && typeof document !== 'undefined') {
    triggerRef.current = document.activeElement as HTMLElement | null;
  }
  const titleId = useId();
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const returnTo = triggerRef.current;
    const id = Symbol('modal');
    stack.push(id);
    const panel = panelRef.current;
    panel?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        // Un menu déroulant / calendrier ouvert dans la modale traite Échap lui-même.
        if (panel?.querySelector('[aria-haspopup][aria-expanded="true"]')) return;
        e.stopImmediatePropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      stack.splice(stack.indexOf(id), 1);
      triggerRef.current = null;
      returnTo?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const width = size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg';

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-[var(--radius-lg)] bg-card shadow-lift outline-none sm:rounded-[var(--radius-lg)] ${width}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 id={titleId} className="min-w-0 truncate font-heading text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.ui.modal.close')}
            title={t('common.ui.modal.close')}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-accent-soft hover:text-fg"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
