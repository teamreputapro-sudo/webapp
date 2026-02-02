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

  if (!symbol) {
    navigate(getScannerPath(), { replace: true });
    return null;
  }

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
        opportunity={state.opportunity}
        onClose={() => navigate(getScannerPath())}
        mode="page"
      />
    </Suspense>
  );
}
