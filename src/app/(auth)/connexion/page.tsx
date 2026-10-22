import type { Metadata } from 'next';
import { Title } from '@/components/ui/Title';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Connexion | Sarielle Fashion',
  robots: { index: false, follow: false },
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-lg">
        <Title as="h1" size="display" className="">
          Espace administrateur
        </Title>
        <div className="mt-6">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </main>
  );
}
