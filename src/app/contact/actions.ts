'use server';

import type { z } from 'zod';
import { flushEmailsSoon } from '@/modules/notifications/flush';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { parseInput } from '@/lib/errors';
import { getClientIp } from '@/lib/client-ip';
import { rateLimit } from '@/lib/rate-limit';
import { adminNotificationRecipient } from '@/modules/notifications/service';
import { getLocale } from '@/i18n/server';
import { contactSchema } from './schema';

type ContactInput = z.infer<typeof contactSchema>;

export async function createConversation(
  _state: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ip = await getClientIp();
  const locale = await getLocale();

  // Rate limit : 5 envois par IP par fenêtre de 60 secondes.
  const limit = await rateLimit(`contact:${ip}`, { max: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    return { ok: false, error: 'Trop de requêtes, réessayez dans une minute.' };
  }

  const raw: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    raw[key] = value;
  });

  let input: ContactInput;
  try {
    input = parseInput(contactSchema, raw);
  } catch {
    return { ok: false, error: 'Données invalides.' };
  }

  // Honeypot : si rempli, c'est un bot -> succès silencieux, rien n'est enregistré.
  if (input.website.trim().length > 0) {
    return { ok: true };
  }

  try {
    const adminEmail = adminNotificationRecipient();

    await db.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { email: input.email.toLowerCase() },
        update: { name: input.name, phone: input.phone || '' },
        create: {
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone || '',
        },
      });

      const conversation = await tx.conversation.create({
        data: {
          customerId: customer.id,
          subject: input.subject,
          source: 'CONTACT',
          status: 'NEW',
          lastMessageAt: new Date(),
          locale,
          messages: {
            create: {
              author: 'CUSTOMER',
              content: input.message,
            },
          },
        },
      });

      const payload = {
        kind: 'conversation',
        conversationId: conversation.id,
        customerName: input.name,
        customerEmail: input.email,
        subject: input.subject,
        message: input.message,
        adminLink: `/dashboard/messages/${conversation.id}`,
      } as const;

      await tx.notification.createMany({
        data: [
          {
            idempotencyKey: `conversation:${conversation.id}:contact:admin:email`,
            recipient: adminEmail,
            templateKey: 'admin_contact_message',
            payload,
          },
          {
            idempotencyKey: `conversation:${conversation.id}:contact:admin:inapp`,
            recipient: adminEmail,
            channel: 'IN_APP',
            templateKey: 'admin_contact_message',
            link: `/dashboard/messages/${conversation.id}`,
            payload,
          },
          {
            idempotencyKey: `conversation:${conversation.id}:contact:client`,
            recipient: customer.email,
            templateKey: 'contact_received',
            // Langue du client : les e-mails qui lui sont destinés sont rédigés dans cette langue.
            payload: { ...payload, locale },
          },
        ],
        skipDuplicates: true,
      });
    });
    revalidatePath('/dashboard', 'layout');
    flushEmailsSoon();
    return { ok: true };
  } catch {
    return { ok: false, error: "Échec de l'enregistrement du message, réessayez." };
  }
}
