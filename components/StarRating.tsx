'use client';
// components/StarRating.tsx
import { useState } from 'react';
import { IconStar } from '@tabler/icons-react';

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRate?: (rating: number) => void;
  showValue?: boolean;
  count?: number;
}

const SIZES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
};

export default function StarRating({
  rating,
  max = 5,
  size = 'md',
  interactive = false,
  onRate,
  showValue = false,
  count,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = interactive && hovered ? hovered : rating;
  const starSize = SIZES[size];

  return (
    <div className="flex items-center gap-1">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => interactive && setHovered(0)}
      >
        {Array.from({ length: max }, (_, i) => {
          const value    = i + 1;
          const filled   = value <= Math.floor(display);
          const partial  = !filled && value - display < 1 && value > display;
          const fraction = partial ? display - Math.floor(display) : 0;

          return (
            <span
              key={i}
              className={`relative ${interactive ? 'cursor-pointer' : ''}`}
              onClick={() => interactive && onRate?.(value)}
              onMouseEnter={() => interactive && setHovered(value)}
            >
              {/* Grey background star */}
              <IconStar className={`${starSize} text-gray-200 fill-gray-200`} />

              {/* Filled overlay — full or partial width clip */}
              {(filled || partial) && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: filled ? '100%' : `${fraction * 100}%` }}
                >
                  <IconStar
                    className={`${starSize} ${
                      interactive && hovered >= value
                        ? 'text-orange-400 fill-orange-400'
                        : 'text-brand-500 fill-brand-500'
                    }`}
                  />
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Optional value + count */}
      {showValue && (
        <span className="text-sm text-gray-500 ml-0.5">
          {rating.toFixed(1)}
          {count !== undefined && (
            <span className="ml-1">({count.toLocaleString()})</span>
          )}
        </span>
      )}
    </div>
  );
}