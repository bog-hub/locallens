// app/admin/claims/page.tsx
import { connectDB } from '@/lib/Mongodb';
import { Claim } from '@/lib/models/Claim';
import { Business } from '@/lib/models/Business';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Suspense } from 'react';
import AdminClaimActions from './AdminClaimActions';
import ClaimFilters from './ClaimFilters';

async function getClaims(page: number, limit: number, status: string, city: string) {
  await connectDB();

  // Base status filter — always only show pending/verified
  const statusFilter = status
    ? [status]
    : ['submitted'];

  const query: Record<string, any> = { status: { $in: statusFilter } };

  // City filter — find matching business IDs first, then filter claims
  if (city) {
    const matchingBusinessIds = await Business
      .find({ 'address.city': { $regex: city, $options: 'i' } })
      .distinct('_id');
    query.business = { $in: matchingBusinessIds };
  }

  const [docs, total] = await Promise.all([
    Claim.find(query)
      .populate('user',     'name email image')
      .populate('business', 'name slug category address')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Claim.countDocuments(query),
  ]);

  return { claims: JSON.parse(JSON.stringify(docs)), total, totalPages: Math.ceil(total / limit) };
}

function buildLink(base: string, params: Record<string, string | number>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
  return `${base}?${p.toString()}`;
}

export default async function AdminClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string; status?: string; city?: string }>;
}) {
  const sp = await searchParams;

  const currentPage = Math.max(1, parseInt(sp.page  ?? '1'));
  const limit       = Math.min(100, Math.max(10, parseInt(sp.limit ?? '20')));
  const status      = sp.status ?? '';
  const city        = sp.city   ?? '';

  const { claims, total, totalPages } = await getClaims(currentPage, limit, status, city);

  const baseParams = {
    limit,
    ...(status && { status }),
    ...(city   && { city   }),
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Claims</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {total} claim{total !== 1 ? 's' : ''}
            {(status || city) ? ' matching filters' : ' pending review'}
          </p>
        </div>
      </div>

      <Suspense>
        <ClaimFilters />
      </Suspense>

      {claims.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-medium">No claims match your filters</p>
          <Link href="/admin/claims" className="text-xs text-brand-500 mt-2 inline-block hover:underline">Clear all filters</Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {claims.map((claim: any) => (
              <div key={claim._id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {claim.user?.image ? (
                      <img src={claim.user.image} className="w-10 h-10 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-brand-600">{claim.user?.name?.[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{claim.user?.name}</p>
                      <p className="text-xs text-gray-400">{claim.user?.email}</p>
                    </div>
                  </div>

                  <div className="text-gray-300 hidden sm:block">→</div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      <a href={`/businesses/${claim.business?.slug}`} target="_blank" className="hover:text-brand-500 transition-colors">
                        {claim.business?.name}
                      </a>
                    </p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">
                      {claim.business?.category} · {claim.business?.address?.city}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      claim.status === 'submitted' ? 'bg-blue-50 text-blue-600'
                      : claim.status === 'verified' ? 'bg-green-50 text-green-600'
                      : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      {claim.status === 'submitted' ? '📄 Docs submitted'
                      : claim.status === 'verified'  ? '✓ Code verified'
                      : '⏳ Pending code'}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(claim.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-4 flex-wrap text-sm">
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Proof type</span>
                    <p className="font-medium text-gray-700 capitalize">{claim.proofType}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Contact provided</span>
                    <p className="font-medium text-gray-700">{claim.proofValue}</p>
                  </div>
                  {claim.verifiedAt && (
                    <div>
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Verified at</span>
                      <p className="font-medium text-gray-700">{new Date(claim.verifiedAt).toLocaleString()}</p>
                    </div>
                  )}
                  <div className="ml-auto">
                    {claim.status === 'submitted' ? (
                      <AdminClaimActions claimId={claim._id} />
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        {claim.status === 'verified' ? 'Waiting for user to upload documents' : 'Waiting for user to verify code'}
                      </span>
                    )}
                  </div>
                  {claim.documents?.length > 0 && (
                    <div className="w-full mt-2 pt-2 border-t border-gray-50">
                      <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Documents ({claim.documents.length})</span>
                      <div className="flex flex-wrap gap-2">
                        {claim.documents.map((doc: any, i: number) => (
                          <a
                            key={i}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-brand-50 hover:border-brand-300 transition-colors"
                          >
                            <span>{doc.mimeType === 'application/pdf' ? '📄' : '🖼️'}</span>
                            <span className="font-medium text-gray-700">{doc.label}</span>
                            <span className="text-gray-400">↗</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-between items-center">
              <span className="text-xs text-gray-400">Page {currentPage} of {totalPages} · {total} claims</span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link href={buildLink('/admin/claims', { ...baseParams, page: currentPage - 1 })} className="text-xs btn-secondary py-1 px-3">← Prev</Link>
                )}
                {currentPage < totalPages && (
                  <Link href={buildLink('/admin/claims', { ...baseParams, page: currentPage + 1 })} className="text-xs btn-primary py-1 px-3">Next →</Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}