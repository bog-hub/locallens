// app/dashboard/layout.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Settings, ArrowLeft } from 'lucide-react';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) redirect('/login?callbackUrl=/dashboard');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dashboard</p>
          <p className="text-gray-900 font-bold mt-0.5 truncate">{session.user.name}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { href: '/dashboard', label: 'My Businesses', icon: LayoutDashboard },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-500
                         hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <Icon className="w-4 h-4" /> {label}
            </Link>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          <Link href="/profile/settings" className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <Settings className="w-3.5 h-3.5" /> Settings
          </Link>
          <Link href="/" className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to site
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}