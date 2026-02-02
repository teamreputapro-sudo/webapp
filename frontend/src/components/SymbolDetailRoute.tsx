import { Suspense, lazy } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getScannerPath } from '../lib/routerBase';

const SymbolDetailModal = lazy(() => import('./SymbolDetailModal'));

type OpportunityLike = {
  symbol: string;
  net_apr?: number;
  gross_apr?: number;
  exchange_short?: string;
  exchange_long?: string;
  short_exchange?: string;
  long_exchange?: string;
  apr_7d?: number;
  apr_30d?: number;
  spread_bps?: number;
  oi_short?: number;
  oi_long?: number;
  min_oi?: number;
  dex_name_short?: string | null;
  dex_name_long?: string | null;
};

type LocationState = {
  opportunity?: OpportunityLike;
};

export default function SymbolDetailRoute() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const searchParams = new URLSearchParams(location.search);
  const venueShort = searchParams.get('venue_short') || undefined;
  const venueLong = searchParams.get('venue_long') || undefined;
  const dexShort = searchParams.get('dex_name_short') || undefined;
  const dexLong = searchParams.get('dex_name_long') || undefined;

  if (!symbol) {
    navigate(getScannerPath(), { replace: true });
    return null;
  }

  const opportunity: OpportunityLike | undefined = (() => {
    const base = state.opportunity ? { ...state.opportunity } : { symbol };
    if (venueShort && !base.exchange_short && !base.short_exchange) {
      base.exchange_short = venueShort;
    }
    if (venueLong && !base.exchange_long && !base.long_exchange) {
      base.exchange_long = venueLong;
    }
    if (dexShort && !base.dex_name_short) {
      base.dex_name_short = dexShort;
    }
    if (dexLong && !base.dex_name_long) {
      base.dex_name_long = dexLong;
    }
    return base;
  })();

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-12 h-12 spinner border-4" />
        </div>
      }
    >
      <SymbolDetailModal
        symbol={symbol}
        opportunity={opportunity}
        onClose={() => navigate(getScannerPath())}
        mode="page"
      />
    </Suspense>
  );
}
