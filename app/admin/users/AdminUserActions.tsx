'use client';
// app/admin/users/AdminUserActions.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const ROLES = ['user', 'owner', 'admin'] as const;
type Role = typeof ROLES[number];

export default function AdminUserActions({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: Role;
}) {
  const router  = useRouter();
  const [role,    setRole]    = useState<Role>(currentRole);
  const [loading, setLoading] = useState(false);

  async function changeRole(newRole: Role) {
    if (newRole === role) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error();
      setRole(newRole);
      toast.success(`Role updated to ${newRole}`);
      router.refresh();
    } catch {
      toast.error('Failed to update role');
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={role}
      onChange={(e) => changeRole(e.target.value as Role)}
      disabled={loading}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none
                 focus:ring-2 focus:ring-brand-200 bg-white disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  );
}