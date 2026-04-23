import { Item, GameState } from '@/lib/game';
import { motion } from 'motion/react';
import { ShieldAlert, Info } from 'lucide-react';

export function GameUI({
  state,
  roomId,
  myId,
  isHost,
  onStart,
  onBid,
  hasBid
}: {
  state: GameState;
  roomId: string;
  myId?: string;
  isHost: boolean;
  onStart?: () => void;
  onBid?: (amt: number) => void;
  hasBid?: boolean;
}) {
  const me = myId ? state.players[myId] : null;

  if (state.status === 'lobby') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] mx-auto mb-6">
            <span className="text-3xl font-black text-black">BK</span>
          </div>
          <h1 className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-2">ROOM INSTANCE</h1>
          <p className="text-4xl font-mono font-bold text-white tracking-widest">#{roomId}</p>
          <p className="text-white/40 text-[10px] uppercase font-mono mt-4">Awaiting peer connections...</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl px-4">
          {Object.values(state.players).length === 0 && (
            <div className="col-span-full py-8 text-center border border-white/10 bg-white/5 rounded-xl text-white/40 font-mono text-xs uppercase">
              No peers connected
            </div>
          )}
          {Object.values(state.players).map(p => (
            <div key={p.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-black border border-white/10 rounded-full flex items-center justify-center font-bold text-amber-500">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="font-bold text-sm tracking-wide text-white">{p.name}</div>
              {p.id === myId && <div className="text-[10px] bg-amber-500/20 border border-amber-500/30 text-amber-500 px-2 py-1 rounded font-bold uppercase tracking-widest">You</div>}
            </div>
          ))}
        </div>

        {isHost && (
          <button
            onClick={onStart}
            disabled={Object.values(state.players).length < 2}
            className="px-12 py-4 mt-8 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            {Object.values(state.players).length < 2 ? 'Awaiting >= 2 Peers' : 'Initialize Protocol'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* HEADER */}
      <header className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b border-white/10 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0">
            <span className="text-2xl font-black text-black">BK</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest uppercase mb-1">BidKing <span className="text-amber-500">v1.0.4</span></h1>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">Round {state.round} / 5 • Room {roomId}</p>
          </div>
        </div>
        {me && (
          <div className="flex gap-4 sm:gap-6 items-center">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Current Assets</div>
              <div className="text-amber-500 font-mono font-bold text-lg">${me.balance.toLocaleString()}</div>
            </div>
            <div className="h-10 w-[1px] bg-white/10 hidden sm:block"></div>
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-md">
              <span className="text-[10px] block text-white/40 uppercase mb-1">Identity Profile</span>
              <span className="font-mono font-bold text-sm">{me.name} <span className="text-white/40 text-xs">({me.roleId})</span></span>
              <div className="sm:hidden text-amber-500 font-mono font-bold mt-1 text-xs">Asset: ${me.balance.toLocaleString()}</div>
            </div>
          </div>
        )}
      </header>

      {/* Main Grid Component for matching design HTML */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12 flex-1">
        
        {/* LEFT COLUMN: Players & Log */}
        <aside className="col-span-1 lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <h3 className="text-[10px] font-bold text-amber-500 uppercase mb-4 tracking-widest">Active Peers ({Object.keys(state.players).length}/20)</h3>
            <div className="space-y-3">
              {Object.values(state.players).map(p => (
                <div key={p.id} className={`flex flex-col p-2 rounded border ${p.id === myId ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${p.id === myId ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-white/20'}`}></div>
                       <span className={`text-sm tracking-wide ${p.id === myId ? 'font-bold text-white' : 'font-medium text-white/80'}`}>{p.name} {p.id === myId && '(You)'}</span>
                       {(state.status === 'bidding' || state.status === 'locking') && state.bids[p.id] !== undefined && (
                           <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ml-1">✓ Ready</span>
                       )}
                    </div>
                    <span className={`text-xs font-mono font-bold ${p.id === myId ? 'text-amber-500' : 'text-white/60'}`}>
                      ${p.balance.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1 px-4">
                    {p.inventory.map((i, idx) => (
                      <div key={idx} className="w-1.5 h-1.5 bg-amber-500/60 rounded-sm" title={i.name} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 p-4 bg-black/40 border border-white/10 rounded-xl font-mono text-[10px] opacity-80 min-h-[150px]">
             <div className="text-amber-500 mb-2">[SYS_LOG]: Optimistic Replicated State Init...</div>
             <div className="text-white/40 mb-1">{`>>`} Handshaking with Room {roomId}...</div>
             <div className="text-white/40 mb-1">{`>>`} Protocol Phase: {state.status.toUpperCase()}</div>
             <div className="text-blue-400 mb-1">{`>>`} Timer Sync: {state.timer}s remaining</div>
             <div className="text-green-500 mt-4">{`>>`} NO-DB HACK: PROTOCOL SECURE</div>
          </div>
        </aside>

        {/* CENTER COLUMN: Auction Stage */}
        <section className="col-span-1 lg:col-span-6 flex flex-col gap-6 order-1 lg:order-2">
          {state.status === 'game_over' ? (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px]">
              <h2 className="text-4xl lg:text-5xl font-black text-amber-500 mb-2 uppercase tracking-widest text-center">Protocol Concluded</h2>
              <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-12 text-center">Final Asset Evaluation</div>
              
              <div className="space-y-4 w-full max-w-md">
                {Object.values(state.players).sort((a,b) => {
                  const nwA = a.balance + a.inventory.reduce((sum, item) => sum + item.trueValue, 0);
                  const nwB = b.balance + b.inventory.reduce((sum, item) => sum + item.trueValue, 0);
                  return nwB - nwA;
                }).map((p, idx) => {
                  const netWorth = p.balance + p.inventory.reduce((sum, item) => sum + item.trueValue, 0);
                  return (
                    <div key={p.id} className={`p-4 rounded-xl border flex justify-between items-center w-full ${idx === 0 ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-black/40 border-white/10 text-white/80'}`}>
                      <span className="font-bold tracking-wide">{idx + 1}. {p.name} {p.id === myId && '(You)'}</span>
                      <span className="font-mono font-bold">${netWorth.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl p-6 lg:p-8 flex flex-col items-center relative overflow-hidden min-h-[500px]">
              <div className="absolute top-4 left-4 flex gap-2 z-10 hidden sm:flex">
                <span className="px-2 py-1 bg-red-500/20 text-red-500 border border-red-500/40 rounded text-[10px] font-bold uppercase tracking-widest">Blind Bidding</span>
                <span className="px-2 py-1 bg-white/10 text-white/60 border border-white/10 rounded text-[10px] font-bold uppercase tracking-widest">Round {state.round}/5</span>
              </div>
              
              {/* TIMER */}
              <div className="absolute top-4 right-4 z-10 text-right">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Time Remaining</div>
                <div className={`text-2xl font-black font-mono transition-colors ${state.timer <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  00:{state.timer.toString().padStart(2, '0')}
                </div>
              </div>

              <motion.div 
                key={state.round}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mt-16 sm:mt-12 w-full flex flex-col items-center justify-center flex-1"
              >
                <div className="text-center mb-8 w-full z-10 relative">
                  <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3">Current Lot / 拍品</div>
                  <h2 className="text-3xl lg:text-4xl font-serif italic text-white leading-tight px-4 break-words">
                    {state.currentItem?.name || 'Awaiting Sync...'}
                  </h2>
                  <p className="text-xs text-white/50 mt-4 max-w-sm mx-auto min-h-[40px] italic">
                    &quot;{state.currentItem?.description}&quot;
                  </p>
                  
                  <div className="mt-8 flex justify-center gap-8 border-t border-white/10 pt-6 px-4 w-fit mx-auto">
                    <div className="text-center">
                      <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Public Base Value</div>
                      <div className="text-xl font-mono text-white tracking-widest font-bold">
                        ${state.currentItem?.baseValue.toLocaleString() || '---'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MYSTERY ORB from HTML spec */}
                <div className="w-48 h-48 sm:w-64 sm:h-64 bg-white/5 rounded-full border border-white/10 flex items-center justify-center relative mb-8 shrink-0 z-0 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                  <div className={"absolute inset-2 sm:inset-4 rounded-full border border-dashed border-amber-500/30 " + (state.status === 'bidding' ? 'animate-[spin_10s_linear_infinite]' : '')}></div>
                  <div className="w-36 h-36 sm:w-48 sm:h-48 bg-gradient-to-tr from-stone-800 to-stone-900 rounded-full shadow-2xl flex items-center justify-center border border-white/20">
                    <div className="text-amber-500/30 text-7xl sm:text-8xl font-serif italic leading-none">?</div>
                  </div>
                </div>
              </motion.div>

              {/* ACTION / INPUT FORM */}
              <div className="w-full mt-auto relative z-10">
                {state.status === 'bidding' && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const amt = Number((e.currentTarget.elements.namedItem('amt') as HTMLInputElement).value);
                      if (amt >= 0 && onBid) onBid(amt);
                    }}
                    className="w-full flex items-center gap-2 sm:gap-4 bg-black/40 p-2 sm:p-4 rounded-xl border border-white/10"
                  >
                    <input 
                      name="amt" 
                      type="number" 
                      required
                      min={0}
                      step={10}
                      disabled={isHost}
                      placeholder={isHost ? "HOST EXEMPT FROM BIDDING" : "ENTER SECRET BID AMOUNT..."}
                      className="flex-1 bg-transparent border-none outline-none text-lg lg:text-2xl font-mono text-amber-500 placeholder:text-white/20 px-2 sm:px-4 min-w-0" 
                    />
                    {!isHost && (
                      <button type="submit" className="shrink-0 px-4 sm:px-8 py-3 sm:py-4 bg-amber-500 text-black font-bold uppercase tracking-widest text-xs sm:text-[10px] md:text-sm rounded-lg hover:bg-amber-400 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        {hasBid ? 'Update Bid' : 'Submit'}
                      </button>
                    )}
                  </form>
                )}

                {state.status === 'locking' && (
                  <div className="w-full flex justify-center py-6 bg-black/40 border border-white/10 rounded-xl">
                    <div className="text-amber-500 font-bold uppercase tracking-widest flex items-center gap-3 animate-pulse text-sm">
                      <ShieldAlert size={18}/> Protocol Locking...
                    </div>
                  </div>
                )}

                {state.status === 'revealing' && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} className="w-full bg-black/40 p-4 sm:p-6 rounded-xl border border-white/10">
                    <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-4 text-center">Outcome Revealed</div>
                    <div className="space-y-2">
                       {Object.entries(state.bids).sort((a,b)=>b[1]-a[1]).map(([gid, amt]) => {
                         const winHistory = state.winnerHistory.find(w => w.round === state.round);
                         const isWinner = winHistory?.winnerId === gid;
                         return (
                           <div key={gid} className={`flex justify-between items-center p-3 rounded border ${isWinner ? 'bg-amber-500/10 border-amber-500/40' : 'bg-white/5 border-white/5'}`}>
                             <span className={`font-bold text-sm tracking-wide ${isWinner ? 'text-amber-400' : 'text-white/80'}`}>{state.players[gid]?.name}</span>
                             <span className={`font-mono text-sm font-bold ${isWinner ? 'text-amber-400' : 'text-white/60'}`}>${amt.toLocaleString()} {isWinner && '👑'}</span>
                           </div>
                         );
                       })}
                    </div>
                    <div className="mt-6 p-4 border border-blue-500/30 bg-blue-500/10 rounded-lg text-center">
                      <div className="text-[10px] text-blue-400 uppercase tracking-widest mb-1 font-bold">Actual Value</div>
                      <div className="font-mono text-xl text-blue-300 font-bold">${state.currentItem?.trueValue.toLocaleString()}</div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Intelligence */}
        <aside className="col-span-1 lg:col-span-3 flex flex-col gap-4 order-3">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex-1 flex flex-col min-h-[250px]">
            <h3 className="text-[10px] font-bold text-blue-400 uppercase mb-4 tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
              Tactical Intelligence
            </h3>
            
            <div className="space-y-6">
              {/* Contextual Hint */}
              {isHost ? (
                <div className="relative p-4 border border-amber-500/20 bg-amber-500/5 rounded-lg">
                  <div className="text-[10px] text-amber-500 uppercase mb-2 font-bold flex items-center gap-2"><ShieldAlert size={12}/> Host Override</div>
                  <p className="text-xs leading-relaxed text-white/70 italic text-pretty">
                    True Value: <span className="font-mono text-amber-500 font-bold">${state.currentItem?.trueValue.toLocaleString()}</span>. You observe the protocol state engine. Host is exempt from bidding.
                  </p>
                </div>
              ) : me?.roleId === 'appraiser' ? (
                <div className="relative p-4 border border-blue-500/20 bg-blue-500/5 rounded-lg">
                  <div className="text-[10px] text-blue-400 uppercase mb-2 font-bold flex items-center gap-2"><Info size={12}/> Passive: Forensic Eye</div>
                  <p className="text-xs leading-relaxed text-blue-200/70 italic font-mono text-pretty break-all">
                     {'>'} DECODE SUCCESS: ActVal=${state.currentItem?.trueValue.toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="relative p-4 border border-white/10 bg-black/40 rounded-lg">
                  <div className="text-[10px] text-white/40 uppercase mb-2 font-bold">Intelligence Feed</div>
                  <p className="text-xs leading-relaxed text-white/50 italic text-pretty">
                    Standard access level. True value is obscured until the reveal phase.
                  </p>
                </div>
              )}

               <div className="mt-8">
                <div className="text-[10px] text-white/40 uppercase mb-2 tracking-widest">Protocol Specs</div>
                <div className="p-3 bg-black rounded border border-white/5 font-mono text-[9px] text-white/50 leading-relaxed uppercase">
                  STRATEGY: Client-As-Host<br/>
                  SYNC: Gossip Polling (800ms)<br/>
                  ENGINE: Stateless Node.js Ext<br/>
                  GARBAGE_COL: LRU Memory Decay
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
      
      {/* FOOTER */}
      <footer className="mt-auto flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-white/20 uppercase tracking-widest border-t border-white/5 pt-4 pb-2 gap-4">
        <div className="flex gap-4">
          <span className="text-green-500/70">System: Healthy</span>
          <span className="hidden sm:inline">Uptime: {Math.floor(state.timer)}s Ticks</span>
          <span>Consistency: Eventual</span>
        </div>
        <div>&copy; {new Date().getFullYear()} BidKing DISTRIBUTED ENGINE {isHost ? '[H]' : '[G]'}</div>
      </footer>
    </div>
  );
}
