'use client';

import { useEffect, useState } from 'react';
import { callRelay } from '@/lib/api';
import { GameState } from '@/lib/game';
import { GameUI } from './SharedGameUI';

export default function GuestEngine({ roomId }: { roomId: string }) {
  const guestToken = typeof window !== 'undefined' ? localStorage.getItem('bidking_guestToken')! : '';
  const guestId = typeof window !== 'undefined' ? localStorage.getItem('bidking_guestId')! : '';
  
  const [state, setState] = useState<GameState | null>(null);
  const [pendingBid, setPendingBid] = useState<number | undefined>();

  // Polling loop
  useEffect(() => {
    let timer = 0;
    
    const poll = async () => {
      try {
        const payload: any = {};
        if (pendingBid !== undefined && state?.status === 'bidding') {
          payload.pendingBid = pendingBid;
          payload.round = state.round;
        }

        const res = await callRelay('guest-sync', payload, guestToken);
        
        if (res.state) {
          setState((prev) => {
            // Ignore stale state if we somehow fetched an older version
            if (!prev || res.state.version >= prev.version) {
              return res.state;
            }
            return prev;
          });
        }
      } catch (e) {
        console.error('Guest poll error', e);
      }
    };

    // Adaptive backoff
    const isIntense = state?.status === 'bidding' || state?.status === 'locking';
    timer = window.setInterval(poll, isIntense ? 500 : 1500);

    return () => clearInterval(timer);
  }, [guestToken, pendingBid, state?.status, state?.round]);

  const handleBid = (amt: number) => {
    setPendingBid(amt);
  };

  if (!state) return <div className="text-white text-center mt-20">Loading or waiting for Host sync...</div>;

  return (
    <GameUI 
      state={state} 
      roomId={roomId} 
      myId={guestId}
      isHost={false}
      onBid={handleBid}
    />
  );
}
