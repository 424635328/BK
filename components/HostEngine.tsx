'use client';

import { useEffect, useRef, useState } from 'react';
import { callRelay } from '@/lib/api';
import { GameState, GAME_ITEMS, ROLES, Player } from '@/lib/game';
import { GameUI } from './SharedGameUI';

export default function HostEngine({ roomId }: { roomId: string }) {
  const hostToken = typeof window !== 'undefined' ? localStorage.getItem('bidking_hostToken')! : '';
  const [localState, setLocalState] = useState<GameState | null>(null);
  const stateRef = useRef<GameState | null>(null);

  // Initialize Host Database
  useEffect(() => {
    const saved = localStorage.getItem(`bidking_db_${roomId}`);
    if (saved) {
      try {
        stateRef.current = JSON.parse(saved);
        setLocalState(stateRef.current);
      } catch (e) {}
    }

    if (!stateRef.current) {
      stateRef.current = {
        version: 1,
        status: 'lobby',
        round: 0,
        players: {},
        currentItem: null,
        bids: {},
        winnerHistory: [],
        timer: 0
      };
      setLocalState(stateRef.current);
    }
  }, [roomId]);

  // Main Engine Loop (The Gossip & State Machine Driver)
  useEffect(() => {
    if (!stateRef.current) return;

    let timerInterval = 0;

    const tick = async () => {
      // 1. Sanitize state for broadcasting (hide bids during bidding, etc)
      // Actually, since all guests fetch the same state, we MUST sanitize it before broadcasting.
      const sanitized = JSON.parse(JSON.stringify(stateRef.current!));
      if (sanitized.status === 'bidding' || sanitized.status === 'locking') {
        const hidden: Record<string, any> = {};
        for(const k in sanitized.bids) {
           hidden[k] = "HIDDEN"; // Replace values so clients know a bid was placed without knowing amount
        }
        sanitized.bids = hidden; 
      }

      try {
        // 2. Broadcast authoritative state and reap fleet Mailbox
        const res = await callRelay('host-sync', { state: sanitized }, hostToken);

        const st = stateRef.current!;
        let modified = false;

        // Process Joins
        if (res.pendingJoins?.length > 0 && st.status === 'lobby') {
          for (const j of res.pendingJoins) {
            if (!st.players[j.guestId]) {
              const roleInfo = ROLES[j.roleId as keyof typeof ROLES] || ROLES.tycoon;
              st.players[j.guestId] = {
                id: j.guestId,
                name: j.name,
                balance: roleInfo.startBalance,
                roleId: j.roleId,
                inventory: []
              };
              modified = true;
            }
          }
        }

        // Process Bids
        if (res.pendingBids?.length > 0 && (st.status === 'bidding' || st.status === 'locking')) {
          for (const b of res.pendingBids) {
            // Ignore stale round bids
            if (b.round === st.round) {
              st.bids[b.guestId] = b.amount;
              modified = true;
            }
          }
        }

        if (modified) {
          st.version++;
          setLocalState({ ...st });
          localStorage.setItem(`bidking_db_${roomId}`, JSON.stringify(st));
        }

      } catch (e) {
        console.error("Host tick fault", e);
      }
    };

    // The Fleet Reaper Loop. Fast!
    timerInterval = window.setInterval(tick, 800);

    return () => clearInterval(timerInterval);
  }, [hostToken, roomId]);

  // Engine Clock
  useEffect(() => {
    const clock = setInterval(() => {
      const st = stateRef.current;
      if (!st) return;

      if (st.status === 'bidding') {
        st.timer -= 1;
        if (st.timer <= 0) {
          st.status = 'locking';
          st.timer = 2; // 2 seconds safety buffer 
        }
        st.version++;
        setLocalState({ ...st });
        localStorage.setItem(`bidking_db_${roomId}`, JSON.stringify(st));
      } else if (st.status === 'locking') {
        st.timer -= 1;
        if (st.timer <= 0) {
          resolveRound(st);
        }
        st.version++;
        setLocalState({ ...st });
        localStorage.setItem(`bidking_db_${roomId}`, JSON.stringify(st));
      } else if (st.status === 'revealing') {
        st.timer -= 1;
        if (st.timer <= 0) {
          if (st.round >= 5) {
            st.status = 'game_over';
          } else {
             startNewRound(st);
          }
        }
        st.version++;
        setLocalState({ ...st });
        localStorage.setItem(`bidking_db_${roomId}`, JSON.stringify(st));
      }

    }, 1000);
    return () => clearInterval(clock);
  }, [roomId]);


  function startNewRound(st: GameState) {
    st.round += 1;
    st.bids = {};
    st.status = 'bidding';
    st.timer = 45; // 45 seconds to bid
    
    // Pick random item
    const available = GAME_ITEMS.filter(item => !st.winnerHistory.find(w => w.item.id === item.id));
    st.currentItem = available[Math.floor(Math.random() * available.length)] || GAME_ITEMS[0];
    
    st.version++;
    setLocalState({ ...st });
  }

  function resolveRound(st: GameState) {
    st.status = 'revealing';
    st.timer = 7; // show results for 7 seconds
    
    // Determine winner
    let highest = -1;
    let winners: string[] = [];
    
    for (const [gid, amt] of Object.entries(st.bids)) {
      if (amt >= highest) {
        if (amt === highest) {
          winners.push(gid);
        } else {
          highest = amt;
          winners = [gid];
        }
      }
    }

    let finalWinner: string | null = null;
    
    if (winners.length > 0) {
      if (winners.length === 1) {
        finalWinner = winners[0];
      } else {
        // Gambler trait check logic
        const gamblers = winners.filter(w => st.players[w].roleId === 'gambler');
        if (gamblers.length === 1) {
          finalWinner = gamblers[0];
        } else {
          // Absolute tie, no one gets it or random? Let's just pick random.
          finalWinner = winners[Math.floor(Math.random() * winners.length)];
        }
      }

      if (finalWinner) {
        const p = st.players[finalWinner];
        p.balance -= highest; // Pay the bid
        p.inventory.push(st.currentItem!);
        
        st.winnerHistory.push({
          round: st.round,
          item: st.currentItem!,
          winnerId: finalWinner,
          winningBid: highest
        });
      }
    } else {
       st.winnerHistory.push({
          round: st.round,
          item: st.currentItem!,
          winnerId: null,
          winningBid: 0
        });
    }

    st.version++;
    setLocalState({ ...st });
  };

  if (!localState) return null;

  return (
    <GameUI 
      state={localState} 
      roomId={roomId} 
      isHost={true}
      onStart={() => {
        if (stateRef.current) startNewRound(stateRef.current);
      }}
    />
  );
}
