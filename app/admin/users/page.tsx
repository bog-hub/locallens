// app/admin/users/page.tsx
import { connectDB } from '@/lib/Mongodb';
import { User } from '@/lib/models/User';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Suspense } from 'react';
import AdminUserActions from './AdminUserActions';
import UserFilters from './UserFilters';

async function getUsers(page: number, limit: number, search: string, role: string) {
  await connectDB();

  const query: Record<string, any> = {};

  if (search) {
    query.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (role) query.role = role;

  const [docs, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(query),
  ]);

  return { users: JSON.parse(JSON.stringify(docs)), total, totalPages: Math.ceil(total / limit) };
}

function buildLink(base: string, params: Record<string, string | number>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
  return `${base}?${p.toString()}`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string; search?: string; role?: string }>;
}) {
  const sp = await searchParams;

  const currentPage = Math.max(1, parseInt(sp.page  ?? '1'));
  const limit       = Math.min(100, Math.max(10, parseInt(sp.limit ?? '20')));
  const search      = sp.search ?? '';
  const role        = sp.role   ?? '';

  const { users, total, totalPages } = await getUsers(currentPage, limit, search, role);

  const baseParams = {
    limit,
    ...(search && { search }),
    ...(role   && { role   }),
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {total} user{total !== 1 ? 's' : ''}
            {(search || role) ? ' matching filters' : ' total'}
          </p>
        </div>
      </div>

      <Suspense>
        <UserFilters />
      </Suspense>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-medium">No users match your filters</p>
            <Link href="/admin/users" className="text-xs text-brand-500 mt-2 inline-block hover:underline">Clear all filters</Link>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Joined</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Reviews</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user: any) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img src={user.image} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-brand-600">{user.name?.[0]?.toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[160px]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden lg:table-cell">{user.reviewCount ?? 0}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.role === 'admin' ? 'bg-red-50 text-red-600'   :
                        user.role === 'owner' ? 'bg-blue-50 text-blue-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <AdminUserActions userId={user._id} currentRole={user.role} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="border-t border-gray-100 px-5 py-3 flex justify-between items-center">
                <span className="text-xs text-gray-400">Page {currentPage} of {totalPages} · {total} results</span>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <Link href={buildLink('/admin/users', { ...baseParams, page: currentPage - 1 })} className="text-xs btn-secondary py-1 px-3">← Prev</Link>
                  )}
                  {currentPage < totalPages && (
                    <Link href={buildLink('/admin/users', { ...baseParams, page: currentPage + 1 })} className="text-xs btn-primary py-1 px-3">Next →</Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}