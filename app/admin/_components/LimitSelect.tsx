'use client';
// app/admin/_components/LimitSelect.tsx
// Drives the per-page limit via URL search params so server components can read it.
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const OPTIONS = [10, 20, 50, 100] as const;

interface Props {
  current: number;
}

export default function LimitSelect({ current }: Props) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', e.target.value);
    params.set('page', '1'); // reset to page 1 when limit changes
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">Show</span>
      <select
        value={current}
        onChange={handleChange}
        className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 outline-none
                   focus:ring-2 focus:ring-brand-200 bg-white"
      >
        {OPTIONS.map((n) => (
          <option key={n} value={n}>{n} per page</option>
        ))}
      </select>
    </div>
  );
}