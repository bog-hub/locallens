// app/admin/layout.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Double-check role server-side — middleware also protects this

  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 flex-shrink-0 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</p>
          <p className="text-white font-bold mt-0.5">LocalLens</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { href: '/admin',            label: '📊 Overview'    },
            { href: '/admin/businesses', label: '🏢 Businesses'  },
            { href: '/admin/users',      label: '👥 Users'       },
            { href: '/admin/reviews',    label: '⭐ Reviews'     },
            { href: '/admin/claims', label: '🔐 Claims' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400
                         hover:bg-gray-800 hover:text-white transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-gray-800">
          <a href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Back to site
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}