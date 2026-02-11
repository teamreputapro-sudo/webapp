import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdBannerProps {
  slot: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  responsive?: boolean;
  className?: string;
  enabled?: boolean;
  /**
   * Reserve space to avoid layout shifts (CLS). Heights are responsive.
   * `auto` is a safe default for AdSense "auto" units.
   */
  reserve?: 'none' | 'auto';
}

export default function AdBanner({
  slot,
  format = 'auto',
  responsive = true,
  className = '',
  enabled = true,
  reserve = 'auto',
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isAdLoaded = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (adRef.current && !isAdLoaded.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isAdLoaded.current = true;
      } catch (err) {
        console.error('AdSense error:', err);
      }
    }
  }, [enabled]);

  const reserveClass =
    reserve === 'auto'
      ? 'h-[90px] md:h-[250px]'
      : '';

  return (
    <div className={`ad-container ${reserveClass} ${className}`}>
      {enabled ? (
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client="ca-pub-9921450947609633"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      ) : (
        <div className="w-full h-full bg-gray-200/40 dark:bg-surface-800/40 rounded-lg animate-pulse" />
      )}
    </div>
  );
}
