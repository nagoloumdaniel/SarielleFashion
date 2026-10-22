'use client';

import { Trash2 } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useT } from '@/i18n/client';
import { Button } from './Button';
import { Modal } from './Modal';

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` (défaut) pour suppression / action irréversible, `primary` sinon. */
  tone?: 'danger' | 'primary';
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/* Remplace window.confirm : `if (!(await confirm({ title: '…' }))) return;`
   Modale accessible (fond flouté, fermeture, Échap), résolue en true / false. */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm doit être utilisé dans <ConfirmProvider>.');
  return confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOptions(next);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  const t = useT();
  const tone = options?.tone ?? 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={options !== null}
        onClose={() => settle(false)}
        title={options?.title ?? ''}
        size="sm"
      >
        {options?.message ? <p className="text-sm text-muted">{options.message}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => settle(false)}>
            {options?.cancelLabel ?? t('common.ui.confirm.cancel')}
          </Button>
          <Button
            type="button"
            variant={tone}
            icon={tone === 'danger' ? Trash2 : undefined}
            onClick={() => settle(true)}
          >
            {options?.confirmLabel ??
              (tone === 'danger' ? t('common.ui.confirm.delete') : t('common.ui.confirm.confirm'))}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
