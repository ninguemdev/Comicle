import { Outlet } from 'react-router';

import { bootAndConnect } from './boot';
import { useRoomStore } from './stores/room-store';
import { useSessionStore } from './stores/session-store';
import { ConnectionBanner, type BannerStatus } from './ui/connection-banner';

function retryConnection(): void {
  void bootAndConnect();
}

function useBannerStatus(): BannerStatus | null {
  const sessionStatus = useSessionStore((state) => state.status);
  const connection = useRoomStore((state) => state.connection);
  if (sessionStatus === 'error' || connection === 'offline') {
    return 'offline';
  }
  return connection === 'reconnecting' ? 'reconnecting' : null;
}

export function AppLayout() {
  const bannerStatus = useBannerStatus();
  return (
    <>
      <ConnectionBanner status={bannerStatus} onRetry={retryConnection} />
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        <Outlet />
      </main>
    </>
  );
}
