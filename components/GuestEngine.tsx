'use client';

import { useEffect, useState, useRef } from 'react';
import { callRelay } from '@/lib/api';
import { GameState } from '@/lib/game';
import { GameUI } from './SharedGameUI';

export default function GuestEngine({ roomId }: { roomId: string }) {
  const guestToken = typeof window !== 'undefined' ? localStorage.getItem('bidking_guestToken')! : '';
  const guestId = typeof window !== 'undefined' ? localStorage.getItem('bidking_guestId')! : '';
  
  const [state, setState] = useState<GameState | null>(null);
  const [pendingBid, setPendingBid] = useState<number | undefined>();

  const stateRef = useRef<GameState | null>(null);
  const pendingBidRef = useRef<number | undefined>(undefined);

  // Async Polling loop
  useEffect(() => {
    let active = true;
    
    const poll = async () => {
      while (active) {
        try {
          const st = stateRef.current;
          const payload: any = {};
          
          if (pendingBidRef.current !== undefined && st?.status === 'bidding') {
            payload.pendingBid = pendingBidRef.current;
            payload.round = st.round;
          }

          const res = await callRelay('guest-sync', payload, guestToken);
          
          if (res.state && active) {
            setState((prev) => {
              if (!prev || res.state.version > prev.version) {
                 stateRef.current = res.state;
                 return res.state;
              }
              return prev;
            });
          }
        } catch (e) {
          console.error('Guest poll error', e);
        }

        const isIntense = stateRef.current?.status === 'bidding' || stateRef.current?.status === 'locking';
        await new Promise(r => setTimeout(r, isIntense ? 600 : 1500));
      }
    };
    
    poll();
    return () => { active = false; };
  }, [guestToken]);

  // Clean pendingBid correctly across rounds
  useEffect(() => {
    if (state?.status === 'revealing' || state?.status === 'lobby') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingBid(undefined);
      pendingBidRef.current = undefined;
    }
  }, [state?.status, state?.round]);

  const handleBid = async (amt: number) => {
    setPendingBid(amt);
    pendingBidRef.current = amt;
    
    // Fire it synchronously to bypass polling wait
    const st = stateRef.current;
    if (st && st.status === 'bidding') {
      try {
        await callRelay('guest-sync', { pendingBid: amt, round: st.round }, guestToken);
      } catch (e) {}
    }
  };

  if (!state) return <div className="text-white text-center mt-20">Loading or waiting for Host sync...</div>;

  return (
    <GameUI 
      state={state} 
      roomId={roomId} 
      myId={guestId}
      isHost={false}
      onBid={handleBid}
      hasBid={pendingBid !== undefined}
    />
  );
}
