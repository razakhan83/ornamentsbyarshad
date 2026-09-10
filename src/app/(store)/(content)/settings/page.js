import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SettingsClient from './SettingsClient';
import { connection } from 'next/server';

export const metadata = {
  title: 'User Settings | Ornaments by Arshad',
  description: 'Manage your profile and delivery preferences.',
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <SettingsContent />
      </Suspense>
    </main>
  );
}

async function SettingsContent() {
  await connection();
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/');
  }

  return <SettingsClient />;
}
