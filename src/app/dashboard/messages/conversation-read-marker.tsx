'use client';

import { useEffect, useRef } from 'react';
import { adminMarkConversationRead } from '@/modules/messagerie/actions';

/* À l'ouverture : marque les messages de la cliente comme lus (une seule fois, seulement s'il y en a)
   et place la vue sur le dernier message, comme dans une messagerie. */
export function ConversationReadMarker({
  conversationId,
  unreadCount,
  messageCount,
}: {
  conversationId: string;
  unreadCount: number;
  messageCount: number;
}) {
  const marked = useRef(false);
  const scrolled = useRef(false);

  useEffect(() => {
    if (unreadCount === 0 || marked.current) return;
    marked.current = true;
    const data = new FormData();
    data.set('conversationId', conversationId);
    // La revalidation côté serveur met à jour la page et les badges du bandeau.
    void adminMarkConversationRead(data).catch(() => undefined);
  }, [conversationId, unreadCount]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: scrolled.current && !reduce ? 'smooth' : 'auto',
    });
    scrolled.current = true;
  }, [messageCount]);

  return null;
}
