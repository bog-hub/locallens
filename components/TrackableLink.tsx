'use client';
// components/TrackableLink.tsx
// Drop-in replacement for <a> that fires an analytics click event before navigating.

interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  businessId: string;
  trackType:  'phone' | 'website' | 'directions';
  children:   React.ReactNode;
}

export default function TrackableLink({
  businessId,
  trackType,
  children,
  onClick,
  ...rest
}: Props) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Fire-and-forget — never block navigation
    fetch('/api/analytics', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ businessId, type: trackType }),
    }).catch(() => {});

    onClick?.(e);
  }

  return (
    <a onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}