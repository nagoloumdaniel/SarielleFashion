'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<{ notify: (message: string, tone?: ToastTone) => void }>({
  notify: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const TONES: Record<ToastTone, string> = {
  success: 'bg-success-soft text-success border border-success',
  error: 'bg-alert-soft text-alert border border-alert',
  info: 'bg-accent-soft text-fg border border-accent',
};

/* P2.4 : toasts sans dependance (sonner evite pour rester lean, zero dependance).
   Region aria-live pour annonce aux lecteurs d'ecran. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    // Rendus urgents espacés : une transition du routeur restée suspendue (revalidation d'une server
    // action) n'est reprise par React qu'au rendu suivant ; sans eux la liste resterait périmée
    // jusqu'à la disparition du toast.
    for (const delay of [250, 700, 1400, 2400]) {
      window.setTimeout(() => setToasts((prev) => [...prev]), delay);
    }
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-20 right-3 z-[70] flex max-w-sm lg:bottom-4 lg:right-4 flex-col gap-2"
      >
        {toasts.map((t) => (
          <p
            key={t.id}
            role="status"
            className={`rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium shadow-lift ${TONES[t.tone]}`}
          >
            {t.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
