'use client';
// components/MenuDisplay.tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MenuItem {
  _id:          string;
  name:         string;
  description?: string;
  price?:       number;
  photos:       string[];
  available:    boolean;
}

interface MenuSection {
  _id:   string;
  name:  string;
  items: MenuItem[];
}

interface Props {
  sections: MenuSection[];
}

export default function MenuDisplay({ sections }: Props) {
  const [openSection, setOpenSection] = useState<string | null>(
    sections[0]?._id ?? null
  );

  const available = sections
    .map((s) => ({ ...s, items: s.items.filter((i) => i.available !== false) }))
    .filter((s) => s.items.length > 0);

  if (available.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Menu</h2>
      </div>

      <div className="divide-y divide-gray-50">
        {available.map((section) => {
          const isOpen = openSection === section._id;
          return (
            <div key={section._id}>
              {/* Section header */}
              <button
                onClick={() => setOpenSection(isOpen ? null : section._id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900 text-sm">{section.name}</span>
                  <span className="text-xs text-gray-400">{section.items.length} items</span>
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
              </button>

              {/* Items */}
              {isOpen && (
                <div className="divide-y divide-gray-50 bg-gray-50/40">
                  {section.items.map((item) => (
                    <div key={item._id} className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        {/* Photo */}
                        {item.photos?.[0] && (
                          <img
                            src={item.photos[0]}
                            alt={item.name}
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                            {item.price !== undefined && (
                              <span className="text-sm font-semibold text-brand-600 flex-shrink-0 whitespace-nowrap">
                                {item.price.toFixed(2)} MAD
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                          )}

                          {/* Extra photos */}
                          {item.photos?.length > 1 && (
                            <div className="flex gap-1.5 mt-2">
                              {item.photos.slice(1).map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt=""
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}