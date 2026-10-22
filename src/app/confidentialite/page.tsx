import type { Metadata } from 'next';
import { Mail, Scissors } from 'lucide-react';
import { getCachedSalonSettings } from '@/lib/public-cache';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { ButtonLink } from '@/components/ui/Button';
import { Title } from '@/components/ui/Title';
import { pageMetadata } from '@/i18n/metadata';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getI18n();
  return pageMetadata({
    locale,
    path: '/confidentialite',
    title: messages.legal.privacy.meta.title,
    description: messages.legal.privacy.meta.description,
  });
}

export const dynamic = 'force-dynamic';

export default async function ConfidentialitePage() {
  const { t, messages } = await getI18n();
  const p = messages.legal.privacy;
  const settings = await getCachedSalonSettings();
  const contactEmail =
    settings.contactEmail?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.AUTH_ADMIN_EMAIL?.trim() ||
    'sarielletalla@gmail.com';
  const mail = (
    <a href={`mailto:${contactEmail}`} className="text-cacao underline">
      {contactEmail}
    </a>
  );
  return (
    <main className="page-main space-y-12">
      <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: p.breadcrumb }]} />

      <header className="max-w-3xl">
        <Title as="h1" size="display" className="">
          {p.title}
        </Title>
      </header>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          {p.controller.title}
        </Title>
        <p className="text-muted leading-relaxed">
          {p.controller.text} {mail}.
        </p>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          {p.collected.title}
        </Title>
        <ul className="list-disc list-inside space-y-2 text-muted leading-relaxed">
          {p.collected.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          {p.purposes.title}
        </Title>
        <table className="w-full text-left border-collapse text-muted">
          <thead>
            <tr className="border-b border-line">
              <th className="pb-2 font-medium text-fg">{p.purposes.purpose}</th>
              <th className="pb-2 font-medium text-fg">{p.purposes.basis}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {p.purposes.rows.map(([purpose, basis]) => (
              <tr key={purpose}>
                <td className="py-3">{purpose}</td>
                <td className="py-3">{basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          {p.retention.title}
        </Title>
        <ul className="list-disc list-inside space-y-2 text-muted leading-relaxed">
          <li>{p.retention.messages}</li>
          <li>
            {t('legal.privacy.retention.customers', { months: settings.dataRetentionMonths })}
          </li>
          <li>{p.retention.booking}</li>
          <li>{t('legal.privacy.retention.photos', { days: settings.photoRetentionDays })}</li>
          <li>{p.retention.ip}</li>
        </ul>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          {p.recipients.title}
        </Title>
        <p className="text-muted leading-relaxed">{p.recipients.text}</p>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          {p.rights.title}
        </Title>
        <p className="text-muted leading-relaxed">{p.rights.intro}</p>
        <ul className="list-disc list-inside space-y-2 text-muted leading-relaxed">
          {p.rights.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-muted leading-relaxed mt-4">
          {p.rights.before} {mail}
          {p.rights.after}
        </p>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          {p.cookies.title}
        </Title>
        <p className="text-muted leading-relaxed">{p.cookies.text}</p>
      </section>

      <section className="max-w-3xl space-y-8">
        <Title as="h2" className="">
          {p.security.title}
        </Title>
        <p className="text-muted leading-relaxed">{p.security.text}</p>
      </section>

      <section className="max-w-3xl rounded-2xl border border-line bg-page p-8 text-center md:p-10">
        <Title as="h2" className="">
          {p.exercise}
        </Title>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/contact" icon={Mail}>
            {t('legal.actions.contactUs')}
          </ButtonLink>
          <ButtonLink href="/coiffures" variant="secondary" icon={Scissors}>
            {t('legal.actions.catalogue')}
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
