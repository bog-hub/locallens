'use client';
// app/dashboard/analytics/[businessId]/page.tsx
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ArrowLeft, Eye, MousePointer, Phone, Globe, MapPin, Star } from 'lucide-react';

interface DailyData {
  date:       string;
  views:      number;
  phone:      number;
  website:    number;
  directions: number;
}

interface Totals {
  views:      number;
  clicks:     number;
  phone:      number;
  website:    number;
  directions: number;
}

interface Analytics {
  business:     any;
  dailyData:    DailyData[];
  totals:       Totals;
  distribution: { _id: number; count: number }[];
}

function StatCard({
  icon: Icon, label, value, color,
}: {
  icon: any; label: string; value: number; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function AnalyticsPage() {
  const params = useParams<{ businessId?: string; id?: string }>();
  const businessId = params.businessId ?? params.id;
  const router = useRouter();
  const [data,    setData]    = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetch(`/api/analytics?businessId=${businessId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">Loading analytics…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-500 text-sm">{error || 'Failed to load'}</div>
    );
  }

  const { business: b, dailyData, totals, distribution } = data;
  const totalReviews = distribution.reduce((s, d) => s + d.count, 0);
  const avgRating    = totalReviews
    ? distribution.reduce((s, d) => s + d._id * d.count, 0) / totalReviews
    : 0;

  // Recharts needs short date labels
  const chartData = dailyData.map((d) => ({
    ...d,
    label: formatDate(d.date),
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-400">{b.name} · Last 30 days</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Eye}          label="Page Views"        value={totals.views}      color="bg-blue-50 text-blue-500"   />
        <StatCard icon={MousePointer} label="Total Clicks"      value={totals.clicks}     color="bg-brand-50 text-brand-500" />
        <StatCard icon={Star}         label="Avg Rating"        value={parseFloat(avgRating.toFixed(1))} color="bg-yellow-50 text-yellow-500" />
        <StatCard icon={Eye}          label="Total Reviews"     value={totalReviews}      color="bg-green-50 text-green-500" />
      </div>

      {/* Views chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-5">Page Views — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
              labelStyle={{ color: '#374151', fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="views"
              stroke="#ff3b3b"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#ff3b3b' }}
              name="Views"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Clicks chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">Clicks Breakdown — Last 30 Days</h2>
        <p className="text-xs text-gray-400 mb-5">Phone calls, website visits and direction requests</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="phone"      name="Phone"      fill="#3b82f6" radius={[3,3,0,0]} />
            <Bar dataKey="website"    name="Website"    fill="#8b5cf6" radius={[3,3,0,0]} />
            <Bar dataKey="directions" name="Directions" fill="#10b981" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Click summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Click Summary</h2>
          <div className="space-y-3">
            {[
              { icon: Phone,  label: 'Phone calls',        value: totals.phone,      color: 'text-blue-500',  bg: 'bg-blue-50'  },
              { icon: Globe,  label: 'Website visits',     value: totals.website,    color: 'text-purple-500', bg: 'bg-purple-50' },
              { icon: MapPin, label: 'Direction requests', value: totals.directions, color: 'text-green-500', bg: 'bg-green-50' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rating distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Rating Distribution</h2>
          {totalReviews === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No reviews yet</p>
          ) : (
            <div className="space-y-2.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution.find((d) => d._id === star)?.count ?? 0;
                const pct   = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-3 flex-shrink-0">{star}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-4 flex-shrink-0">{count}</span>
                  </div>
                );
              })}
              <p className="text-xs text-gray-400 pt-1">
                {avgRating.toFixed(1)} avg · {totalReviews} reviews
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}