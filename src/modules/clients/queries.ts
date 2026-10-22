import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

/* ============================================================
 * P8.3 : fiches clientes, historique et accès restreint au dashboard.
 * La minimisation reste appliquée : pas de données capillaires sur Customer.
 * ============================================================ */

export interface CustomerListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
  appointmentCount: number;
  assessmentCount: number;
  customRequestCount: number;
  conversationCount: number;
}

export async function listCustomers(options?: { search?: string; page?: number }): Promise<{
  items: CustomerListItem[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = 20;
  const search = options?.search?.trim() ?? '';
  const where: Prisma.CustomerWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }
    : {};
  const [total, rows] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true,
            assessments: true,
            customRequests: true,
            conversations: true,
          },
        },
      },
    }),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      createdAt: row.createdAt,
      appointmentCount: row._count.appointments,
      assessmentCount: row._count.assessments,
      customRequestCount: row._count.customRequests,
      conversationCount: row._count.conversations,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/* Nombre max. d'éléments liés affichés par rubrique sur la fiche (les totaux restent exacts). */
const DETAIL_LIMIT = 30;

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
  counts: {
    appointments: number;
    assessments: number;
    customRequests: number;
    conversations: number;
  };
}

/* Entête de la fiche : 1 requête (identité + 4 compteurs). Les listes liées se chargent à part
   (une requête indexée par rubrique, en parallèle et streamées via Suspense dans la page). */
export async function getCustomerSummary(id: string): Promise<CustomerSummary | null> {
  const row = await db.customer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      _count: {
        select: {
          appointments: true,
          assessments: true,
          customRequests: true,
          conversations: true,
        },
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    createdAt: row.createdAt,
    counts: {
      appointments: row._count.appointments,
      assessments: row._count.assessments,
      customRequests: row._count.customRequests,
      conversations: row._count.conversations,
    },
  };
}

export async function listCustomerAppointments(customerId: string) {
  const rows = await db.appointment.findMany({
    where: { customerId },
    orderBy: { startsAt: 'desc' },
    take: DETAIL_LIMIT,
    select: {
      id: true,
      startsAt: true,
      status: true,
      priceCents: true,
      service: { select: { name: true } },
    },
  });
  return rows.map((appointment) => ({
    id: appointment.id,
    startsAt: appointment.startsAt,
    status: appointment.status,
    serviceName: appointment.service.name,
    priceCents: appointment.priceCents,
  }));
}

export async function listCustomerAssessments(customerId: string) {
  const rows = await db.hairAssessment.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: DETAIL_LIMIT,
    select: { id: true, createdAt: true, status: true, service: { select: { name: true } } },
  });
  return rows.map((assessment) => ({
    id: assessment.id,
    createdAt: assessment.createdAt,
    status: assessment.status,
    serviceName: assessment.service.name,
  }));
}

export async function listCustomerRequests(customerId: string) {
  const rows = await db.customRequest.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: DETAIL_LIMIT,
    select: { id: true, createdAt: true, status: true, description: true },
  });
  return rows.map((request) => ({
    id: request.id,
    createdAt: request.createdAt,
    status: request.status,
    description: request.description.slice(0, 120),
  }));
}

export async function listCustomerConversations(customerId: string) {
  const rows = await db.conversation.findMany({
    where: { customerId },
    orderBy: { lastMessageAt: 'desc' },
    take: DETAIL_LIMIT,
    select: {
      id: true,
      subject: true,
      status: true,
      lastMessageAt: true,
      _count: {
        select: {
          messages: { where: { author: 'CUSTOMER', isInternal: false, readAt: null } },
        },
      },
    },
  });
  return rows.map((conversation) => ({
    id: conversation.id,
    subject: conversation.subject,
    status: conversation.status,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: conversation._count.messages,
  }));
}
