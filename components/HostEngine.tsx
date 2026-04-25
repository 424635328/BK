'use client';

import { useEffect, useRef, useState } from 'react';
import { callRelay } from '@/lib/api';
import {
  buildRoundItemFromConfig,
  DEFAULT_ROOM_CONFIG,
  GameState,
  getStartingBalance,
  isRoleId,
  normalizeRoomConfig,
  ROLES,
  RoleId,
  RoomConfig,
} from '@/lib/game';
import { GameUI } from './SharedGameUI';

export default function HostEngine({ roomId }: { roomId: string }) {
  const hostToken = typeof window !== 'undefined' ? localStorage.getItem('bidking_hostToken')! : '';
  const [localState, setLocalState] = useState<GameState | null>(null);
  const stateRef = useRef<GameState | null>(null);

  const persistState = (st: GameState) => {
    stateRef.current = st;
    setLocalState({ ...st });
    localStorage.setItem(`bidking_db_${roomId}`, JSON.stringify(st));
  };

  const parseRoomConfigFromStorage = (): RoomConfig => {
    const raw = localStorage.getItem(`bidking_roomConfig_${roomId}`);
    if (!raw) return normalizeRoomConfig(DEFAULT_ROOM_CONFIG);
    try {
      return normalizeRoomConfig(JSON.parse(raw) as Partial<RoomConfig>);
    } catch (e) {
      return normalizeRoomConfig(DEFAULT_ROOM_CONFIG);
    }
  };

  const sanitizeLoadedState = (rawState: Partial<GameState>, fallbackConfig: RoomConfig): GameState => {
    const config = normalizeRoomConfig(rawState.config ?? fallbackConfig);
    const players = Object.fromEntries(
      Object.entries(rawState.players ?? {}).map(([id, p]) => {
        const roleId: RoleId = isRoleId(String(p.roleId)) ? p.roleId : 'tycoon';
        const balance = Number.isFinite(p.balance) ? Math.max(0, Math.round(p.balance)) : getStartingBalance(roleId, config.initialBalance);
        return [
          id,
          {
            id,
            name: typeof p.name === 'string' && p.name.trim() ? p.name : '匿名节点',
            balance,
            roleId,
            inventory: Array.isArray(p.inventory) ? p.inventory : [],
          },
        ];
      })
    );

    return {
      version: Number.isFinite(rawState.version) ? Math.max(1, Math.round(rawState.version ?? 1)) : 1,
      status: rawState.status ?? 'lobby',
      round: Number.isFinite(rawState.round) ? Math.max(0, Math.round(rawState.round ?? 0)) : 0,
      config,
      players,
      currentItem: rawState.currentItem ?? null,
      bids: rawState.bids ?? {},
      winnerHistory: Array.isArray(rawState.winnerHistory) ? rawState.winnerHistory : [],
      timer: Number.isFinite(rawState.timer) ? Math.max(0, Math.round(rawState.timer ?? 0)) : 0,
    };
  };

  // Initialize Host Database
  useEffect(() => {
    const saved = localStorage.getItem(`bidking_db_${roomId}`);
    const roomConfig = parseRoomConfigFromStorage();

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<GameState>;
        const sanitized = sanitizeLoadedState(parsed, roomConfig);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        persistState(sanitized);
      } catch (e) {}
    }

    if (!stateRef.current) {
      const initialState: GameState = {
        version: 1,
        status: 'lobby',
        round: 0,
        config: roomConfig,
        players: {},
        currentItem: null,
        bids: {},
        winnerHistory: [],
        timer: 0
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      persistState(initialState);
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
              const roleId: RoleId = isRoleId(String(j.roleId)) ? j.roleId : 'tycoon';
              st.players[j.guestId] = {
                id: j.guestId,
                name: typeof j.name === 'string' && j.name.trim() ? j.name.trim() : '匿名节点',
                balance: getStartingBalance(roleId, st.config.initialBalance),
                roleId,
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
              const bidder = st.players[b.guestId];
              if (!bidder) continue;
              const amount = Number(b.amount);
              if (!Number.isFinite(amount) || amount < 0) continue;
              st.bids[b.guestId] = Math.min(Math.round(amount), bidder.balance);
              modified = true;
            }
          }
        }

        if (modified) {
          st.version++;
          persistState(st);
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
          st.timer = st.config.lockSeconds;
        }
        st.version++;
        persistState(st);
      } else if (st.status === 'locking') {
        st.timer -= 1;
        if (st.timer <= 0) {
          resolveRound(st);
          return;
        }
        st.version++;
        persistState(st);
      } else if (st.status === 'revealing') {
        st.timer -= 1;
        if (st.timer <= 0) {
          if (st.round >= st.config.rounds) {
            st.status = 'game_over';
            st.timer = 0;
            st.version++;
            persistState(st);
          } else {
             startNewRound(st);
          }
          return;
        }
        st.version++;
        persistState(st);
      }

    }, 1000);
    return () => clearInterval(clock);
  }, [roomId]);


  function startNewRound(st: GameState) {
    if (st.round >= st.config.rounds) {
      st.status = 'game_over';
      st.timer = 0;
      st.version++;
      persistState(st);
      return;
    }

    st.round += 1;
    st.bids = {};
    st.status = 'bidding';
    st.timer = st.config.biddingSeconds;
    st.currentItem = buildRoundItemFromConfig(st.round, st.config);
    
    st.version++;
    persistState(st);
  }

  function resolveRound(st: GameState) {
    st.status = 'revealing';
    st.timer = st.config.revealSeconds;
    
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
        const tieBreakers = winners.filter((winnerId) => {
          const role = ROLES[st.players[winnerId]?.roleId];
          return role?.ability === 'gambler_bonus';
        });
        if (tieBreakers.length === 1) {
          finalWinner = tieBreakers[0];
        } else {
          finalWinner = winners[Math.floor(Math.random() * winners.length)];
        }
      }

      if (finalWinner) {
        const p = st.players[finalWinner];
        const winnerRole = ROLES[p.roleId];
        
        let actualPayment = highest;
        
        if (winnerRole.ability === 'broker_discount') {
          actualPayment = Math.round(highest * 0.9);
        }
        
        p.balance -= actualPayment;
        p.inventory.push(st.currentItem!);
        
        if (winnerRole.ability === 'gambler_bonus') {
          const trueValue = st.currentItem?.trueValue || 0;
          if (trueValue >= highest * 2) {
            const bonus = Math.round(trueValue * 0.2);
            p.balance += bonus;
          }
        }
        
        st.winnerHistory.push({
          round: st.round,
          item: st.currentItem!,
          winnerId: finalWinner,
          winningBid: actualPayment
        });
      }
      
      for (const [gid, amt] of Object.entries(st.bids)) {
        if (gid !== finalWinner) {
          const p = st.players[gid];
          const role = ROLES[p.roleId];
          if (role.ability === 'tycoon_refund') {
            const refund = Math.round(amt * 0.2);
            p.balance += refund;
          }
        }
      }
    } else {
      for (const [gid, p] of Object.entries(st.players)) {
        const role = ROLES[p.roleId];
        if (role.ability === 'scrapper_loot') {
          const trueValue = st.currentItem?.trueValue || 0;
          const cost = Math.round(trueValue * 0.5);
          if (p.balance >= cost) {
            p.balance -= cost;
            p.inventory.push(st.currentItem!);
            st.winnerHistory.push({
              round: st.round,
              item: st.currentItem!,
              winnerId: gid,
              winningBid: cost
            });
            break;
          }
        }
      }
      
      if (!st.winnerHistory.find(w => w.round === st.round)) {
        st.winnerHistory.push({
          round: st.round,
          item: st.currentItem ?? buildRoundItemFromConfig(st.round, st.config),
          winnerId: null,
          winningBid: 0
        });
      }
    }
    
    for (const [gid, p] of Object.entries(st.players)) {
      const role = ROLES[p.roleId];
      if (role.ability === 'investor_interest') {
        const interest = Math.round(p.balance * 0.05);
        p.balance += interest;
      }
    }

    st.version++;
    persistState(st);
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
