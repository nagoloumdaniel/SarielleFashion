'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

/* Retour à la page précédente ; `fallbackHref` si l'accès est direct ou externe. */
export function BackButton({
  fallbackHref,
  label = 'Retour',
}: {
  fallbackHref: string;
  label?: string;
}) {
  const router = useRouter();

  /* router.back() seulement si la page précédente est de ce site (sinon on quitterait le site). */
  function goBack() {
    let sameOrigin = false;
    try {
      sameOrigin =
        document.referrer !== '' && new URL(document.referrer).origin === window.location.origin;
    } catch {
      sameOrigin = false;
    }
    if (sameOrigin && window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return (
    <Button type="button" variant="secondary" size="sm" icon={ArrowLeft} onClick={goBack}>
      {label}
    </Button>
  );
}
