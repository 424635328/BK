'use client';

import { use, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Next.js dynamic imports to completely avoid SSR hydration mismatch 
// since we rely entirely on localStorage which is browser-only.
const HostEngine = dynamic(() => import('@/components/HostEngine'), { ssr: false });
const GuestEngine = dynamic(() => import('@/components/GuestEngine'), { ssr: false });

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const [role, setRole] = useState<'host' | 'guest' | 'loading'>('loading');

  useEffect(() => {
    // Check local storage to determine our role in this room
    const hostToken = localStorage.getItem('bidking_hostToken');
    const guestToken = localStorage.getItem('bidking_guestToken');
    
    // Very rudimentary check: in a real app we'd decode JWT
    if (hostToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRole('host');
    } else if (guestToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRole('guest');
    } else {
      // Must join first
      window.location.href = '/';
    }
  }, []);

  if (role === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-yellow-500 font-bold">读取身份凭证...</div>
      </div>
    );
  }

  if (role === 'host') {
    return <HostEngine roomId={roomId} />;
  }

  return <GuestEngine roomId={roomId} />;
}
