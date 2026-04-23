'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { callRelay } from '@/lib/api';
import { ROLES } from '@/lib/game';
import { motion } from 'motion/react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [roleMode, setRoleMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLES>('tycoon');

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await callRelay('create');
      localStorage.setItem('bidking_hostToken', res.hostToken);
      router.push(`/room/${res.roomId}`);
    } catch (e) {
      alert('Failed to create room');
      setLoading(false);
    }
  };

  const handleJoinClick = () => {
    if (!joinCode || !name) return alert('请输入房间号和昵称');
    setRoleMode(true);
  };

  const joinRoom = async () => {
    setLoading(true);
    try {
      const res = await callRelay('join', { roomId: joinCode.toUpperCase(), guestName: name, roleId: selectedRole });
      localStorage.setItem('bidking_guestToken', res.guestToken);
      localStorage.setItem('bidking_guestId', res.guestId);
      router.push(`/room/${joinCode.toUpperCase()}`);
    } catch (e) {
      alert('Failed to join room. Room might not exist?');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[500px]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)] mx-auto mb-6 border border-white/10">
          <span className="text-3xl sm:text-4xl font-black text-black tracking-tighter">BK</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-widest uppercase text-white mb-2">
          BidKing <span className="text-amber-500 text-xs sm:text-sm align-top ml-1">v1.0.4-beta</span>
        </h1>
        <p className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">Distributed Client-As-Host Protocol | No-DB Architecture</p>
      </motion.div>

      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
        {!roleMode ? (
          <div className="space-y-6 relative z-10">
            <button
              onClick={createRoom}
              disabled={loading}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95 text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]"
            >
              {loading ? 'INITIALIZING...' : 'Create New Instance (Host)'}
            </button>

            <div className="flex items-center text-white/20 my-4">
              <div className="flex-1 border-t border-white/10"></div>
              <span className="px-4 text-[10px] uppercase tracking-widest">Or connect to peer</span>
              <div className="flex-1 border-t border-white/10"></div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="YOUR ALIAS"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder:text-white/30 font-mono text-amber-500 text-sm sm:text-base"
              />
              <input
                type="text"
                placeholder="INSTANCE ID (E.G., ABC12)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all uppercase placeholder:text-white/30 font-mono text-amber-500 text-sm sm:text-base"
              />
              <button
                onClick={handleJoinClick}
                disabled={!name || !joinCode}
                className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-widest text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-white/5"
              >
                Proceed
              </button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 relative z-10"
          >
            <h3 className="text-[10px] font-bold text-center text-white/40 uppercase tracking-widest">Select Protocol Identity</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {(Object.keys(ROLES) as Array<keyof typeof ROLES>).map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedRole(k as keyof typeof ROLES)}
                  className={`w-full p-4 text-left border rounded-xl transition-all block ${selectedRole === k ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10 bg-black/40 hover:bg-white/5'}`}
                >
                  <div className="font-bold text-white tracking-wide text-sm">{ROLES[k as keyof typeof ROLES].name}</div>
                  <div className="text-[11px] text-white/50 mt-1 font-mono leading-relaxed">{ROLES[k as keyof typeof ROLES].desc}</div>
                </button>
              ))}
            </div>
            
            <button
              onClick={joinRoom}
              disabled={loading}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-widest text-sm rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)] mt-4"
            >
              {loading ? 'CONNECTING...' : 'Join Instance'}
            </button>
          </motion.div>
        )}
      </div>
      
      <footer className="mt-12 text-[10px] font-mono text-white/20 uppercase tracking-widest text-center">
        <div>&copy; BidKing Distributed Engine {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
