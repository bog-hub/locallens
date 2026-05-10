// app/admin/page.tsx
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';
import { User } from '@/lib/models/User';
import { Review } from '@/lib/models/Review';
import { BarChart2, Users, Star, Building2 } from 'lucide-react';

async function getStats() {
  await connectDB();
  const [businesses, users, reviews, topBusinesses, recentUsers] = await Promise.all([
    Business.countDocuments(),
    User.countDocuments(),
    Review.countDocuments(),
    Business.find().sort({ reviewCount: -1 }).limit(5).select('name averageRating reviewCount category').lean(),
    User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt role').lean(),
  ]);
  return {
    businesses, users, reviews,
    topBusinesses: JSON.parse(JSON.stringify(topBusinesses)),
    recentUsers:   JSON.parse(JSON.stringify(recentUsers)),
  };
}

export default async function AdminPage() {
  const { businesses, users, reviews, topBusinesses, recentUsers } = await getStats();

  const stats = [
    { label: 'Total Businesses', value: businesses, icon: Building2, color: 'text-blue-500',  bg: 'bg-blue-50'  },
    { label: 'Total Users',      value: users,       icon: Users,     color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Total Reviews',    value: reviews,     icon: Star,      color: 'text-brand-500', bg: 'bg-brand-50' },
    { label: 'Avg Reviews/Biz',  value: businesses > 0 ? (reviews / businesses).toFixed(1) : 0,
      icon: BarChart2, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform statistics at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top businesses */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Top Businesses by Reviews</h2>
          <div className="space-y-3">
            {topBusinesses.map((biz: any, i: number) => (
              <div key={biz._id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-300 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{biz.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{biz.category}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-brand-500">★ {(biz.averageRating ?? 0).toFixed(1)}</p>
                  <p className="text-xs text-gray-400">{biz.reviewCount} reviews</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Sign-ups</h2>
          <div className="space-y-3">
            {recentUsers.map((user: any) => (
              <div key={user._id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-brand-600">{user.name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  user.role === 'admin' ? 'bg-red-50 text-red-600' :
                  user.role === 'owner' ? 'bg-blue-50 text-blue-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}