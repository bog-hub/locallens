// components/CategoryGrid.tsx
import Link from 'next/link';
import { CATEGORIES } from '@/types';

export default function CategoryGrid() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-5">Explore Categories</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/businesses?category=${cat.slug}`}
            className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl border
                       border-gray-100 bg-white hover:border-gray-200 hover:shadow-md
                       transition-all duration-200 hover:-translate-y-0.5"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl
                         transition-transform duration-200 group-hover:scale-110"
              style={{ backgroundColor: cat.color + '20' }}
            >
              {cat.icon}
            </div>
            <span className="text-xs font-medium text-gray-600 text-center leading-tight">
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}