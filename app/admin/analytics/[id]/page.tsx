'use client';
// app/dashboard/analytics/[id]/page.tsx
import { useState, useEffect, use } from 'react';
import { BarChart2, Eye, Star, TrendingUp, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ViewData  { date: string; views: number }
interface DistData  { _id: number; count: number  }

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [data,    setData]    = useState<{ views: ViewData[]; totalViews: number; distribution: DistData[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analytics?businessId=${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Bar chart: find max value for scaling
  const maxViews = data ? Math.max(...data.views.map((d) => d.views), 1) : 1;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl hover:bg-white border border-gray-200 text-gray-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-brand-500" /> Analytics
            </h1>
            <p className="text-sm text-gray-400">Last 30 days</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map((i) => (
              <div key={i} className="card animate-pulse h-24" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Views',  value: data.totalViews, icon: Eye,      color: 'text-blue-500',   bg: 'bg-blue-50'   },
                { label: 'Peak Day',     value: Math.max(...data.views.map((d) => d.views)), icon: TrendingUp, color: 'text-green-500',  bg: 'bg-green-50'  },
                { label: 'Total Reviews',value: data.distribution.reduce((s, d) => s + d.count, 0), icon: Star, color: 'text-brand-500', bg: 'bg-brand-50' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="card flex items-center gap-4">
                  <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-400">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Views bar chart */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-5">Daily Page Views</h2>
              <div className="flex items-end gap-1 h-40">
                {data.views.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full bg-brand-400 rounded-t-sm hover:bg-brand-500 transition-colors cursor-default"
                      style={{ height: `${(d.views / maxViews) * 100}%`, minHeight: d.views > 0 ? '4px' : '0' }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white
                                    text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity
                                    whitespace-nowrap pointer-events-none z-10">
                      {d.date.slice(5)}: {d.views} views
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>{data.views[0]?.date.slice(5)}</span>
                <span>{data.views[data.views.length - 1]?.date.slice(5)}</span>
              </div>
            </div>

            {/* Rating distribution */}
            {data.distribution.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-4">Rating Distribution</h2>
                <div className="space-y-2">
                  {[5,4,3,2,1].map((star) => {
                    const entry = data.distribution.find((d) => d._id === star);
                    const count = entry?.count ?? 0;
                    const total = data.distribution.reduce((s, d) => s + d.count, 0);
                    const pct   = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 w-12">{star} stars</span>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-400 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card text-center py-12 text-gray-400">
            No analytics data yet. Share your listing to start getting views!
          </div>
        )}
      </div>
    </div>
  );
}