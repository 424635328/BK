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
    
    const decodeToken = (token: string | null) => {
      if (!token) return null;
      try {
        const b64 = token.split('.')[0];
        return JSON.parse(atob(b64));
      } catch (e) {
        return null;
      }
    };

    const hostPayload = decodeToken(hostToken);
    const guestPayload = decodeToken(guestToken);

    if (hostPayload?.roomId === roomId && hostPayload?.role === 'host') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRole('host');
    } else if (guestPayload?.roomId === roomId && guestPayload?.role === 'guest') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRole('guest');
    } else {
      // Must join first
      window.location.href = '/';
    }
  }, [roomId]);

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
