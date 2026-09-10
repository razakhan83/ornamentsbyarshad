import { connection } from 'next/server';
import { Geist_Mono } from 'next/font/google';
import './admin.css';
import AdminLayoutShell from './AdminLayoutShell';
import { getAdminSession } from '@/lib/requireAdmin';

// Geist Mono: admin-only font for code, tables, JSON display
// Excluded from root layout to avoid loading on store pages
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false, // Only load when admin pages are visited
});

export const instant = false;

export default async function AdminLayout({ children }) {
  await connection();
  const session = await getAdminSession();
  const sessionUser = session?.user?.isAdmin ? session.user : null;

  return (
    <div className={geistMono.variable}>
      <AdminLayoutShell sessionUser={sessionUser}>{children}</AdminLayoutShell>
    </div>
  );
}
