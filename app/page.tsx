'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { callRelay } from '@/lib/api';
import { DEFAULT_ROOM_CONFIG, normalizeRoomConfig, ROLES, RoomConfig } from '@/lib/game';
import { motion } from 'motion/react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [roleMode, setRoleMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLES>('tycoon');
  const [showRules, setShowRules] = useState(false);
  const [hostConfig, setHostConfig] = useState<RoomConfig>(() => normalizeRoomConfig(DEFAULT_ROOM_CONFIG));

  const roleEntries = Object.entries(ROLES) as Array<[keyof typeof ROLES, (typeof ROLES)[keyof typeof ROLES]]>;

  const updateHostConfig = (patch: Partial<RoomConfig>) => {
    setHostConfig((prev) => normalizeRoomConfig({ ...prev, ...patch }));
  };

  const updateRoundItem = (roundIdx: number, key: 'referencePrice' | 'trueValue', value: number) => {
    setHostConfig((prev) => {
      const nextRoundItems = prev.roundItems.map((item, idx) => {
        if (idx !== roundIdx) return item;
        return { ...item, [key]: value };
      });
      return normalizeRoomConfig({ ...prev, roundItems: nextRoundItems });
    });
  };

  const createRoom = async () => {
    setLoading(true);
    try {
      const finalConfig = normalizeRoomConfig(hostConfig);
      const res = await callRelay('create', { roomConfig: finalConfig });
      localStorage.setItem('bidking_hostToken', res.hostToken);
      localStorage.setItem(`bidking_roomConfig_${res.roomId}`, JSON.stringify(finalConfig));
      router.push(`/room?id=${res.roomId}`);
    } catch (e) {
      alert('创建房间失败，服务器异常请重试。 (Failed to create room)');
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
      router.push(`/room?id=${joinCode.toUpperCase()}`);
    } catch (e) {
      alert('连接节点失败。请检查房间密钥是否正确！(Failed to join room)');
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
          竞拍之王 <span className="text-amber-500 text-xs sm:text-sm align-top ml-1">v1.1.0-RC</span>
        </h1>
        <p className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">分布式连线协议 | 沉浸式暗标博弈</p>
      </motion.div>

        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
        {!roleMode ? (
          <div className="space-y-6 relative z-10">
              <div className="space-y-4 p-4 border border-white/10 bg-black/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">开房参数预设</h3>
                  <span className="text-[10px] font-mono text-white/40">仅主机生效</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="space-y-1">
                    <span className="block text-[10px] text-white/40 uppercase tracking-wider">等待时间(秒)</span>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={hostConfig.biddingSeconds}
                      onChange={(e) => updateHostConfig({ biddingSeconds: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-amber-500 font-mono text-sm"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-[10px] text-white/40 uppercase tracking-wider">拍卖轮数</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={hostConfig.rounds}
                      onChange={(e) => updateHostConfig({ rounds: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-amber-500 font-mono text-sm"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-[10px] text-white/40 uppercase tracking-wider">基础初始金</span>
                    <input
                      type="number"
                      min={100}
                      max={2000000}
                      step={100}
                      value={hostConfig.initialBalance}
                      onChange={(e) => updateHostConfig({ initialBalance: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-amber-500 font-mono text-sm"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">每轮价格配置 (参考价 / 真实值)</div>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                    {hostConfig.roundItems.map((item, idx) => (
                      <div key={`round-${idx}`} className="grid grid-cols-[56px_1fr_1fr] gap-2 items-center">
                        <span className="text-[10px] text-white/50 font-mono">R{idx + 1}</span>
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={item.referencePrice}
                          onChange={(e) => updateRoundItem(idx, 'referencePrice', Number(e.target.value))}
                          className="w-full px-2 py-2 bg-black/40 border border-white/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-white text-xs font-mono"
                        />
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={item.trueValue}
                          onChange={(e) => updateRoundItem(idx, 'trueValue', Number(e.target.value))}
                          className="w-full px-2 py-2 bg-black/40 border border-white/10 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-blue-300 text-xs font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={createRoom}
                disabled={loading}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95 text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]"
              >
                {loading ? '初始化中 (INITIALIZING)...' : '创建新房间 [主机节点]'}
              </button>

              <div className="flex items-center text-white/20 my-4">
                <div className="flex-1 border-t border-white/10"></div>
                <span className="px-4 text-[10px] uppercase tracking-widest">或连接至其他节点</span>
                <div className="flex-1 border-t border-white/10"></div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="游戏身份代号"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder:text-white/30 font-mono text-amber-500 text-sm sm:text-base"
                />
                <input
                  type="text"
                  placeholder="房间密钥 (例如: ABC12)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all uppercase placeholder:text-white/30 font-mono text-amber-500 text-sm sm:text-base"
                />
                <button
                  onClick={handleJoinClick}
                  disabled={!name || !joinCode}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-widest text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-white/5"
                >
                  验证并选择身份
                </button>
              </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 relative z-10"
          >
            <h3 className="text-[10px] font-bold text-center text-white/40 uppercase tracking-widest">选择你的被动协议特征 (职业)</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {roleEntries.map(([k, role]) => (
                <button
                  key={k}
                  onClick={() => setSelectedRole(k as keyof typeof ROLES)}
                  className={`w-full p-4 text-left border rounded-xl transition-all block ${selectedRole === k ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-white/10 bg-black/40 hover:bg-white/5'}`}
                >
                  <div className="font-bold text-white tracking-wide text-sm">{role.name}</div>
                  <div className="text-[11px] text-white/50 mt-1 font-mono leading-relaxed">{role.desc}</div>
                </button>
              ))}
            </div>
            
            <button
              onClick={joinRoom}
              disabled={loading}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-widest text-sm rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)] mt-4"
            >
              {loading ? '底层协议同步中...' : '确认登入'}
            </button>
          </motion.div>
        )}
      </div>
      
      <div className="mt-8 text-center relative z-10">
        <button 
          onClick={() => setShowRules(true)}
          className="text-white/40 hover:text-amber-500 text-xs tracking-widest uppercase border-b border-white/20 hover:border-amber-500/50 transition-colors pb-1"
        >
          查看详细游戏手册 (Game Rules)
        </button>
      </div>

      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl bg-black border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)] max-h-[85vh] overflow-y-auto custom-scrollbar"
          >
            <h2 className="text-2xl font-bold text-amber-500 mb-6 flex items-center justify-between">
              《竞拍之王》协议手册
              <button onClick={() => setShowRules(false)} className="text-white/50 hover:text-white text-lg px-2">✕</button>
            </h2>
            <div className="space-y-6 text-sm text-white/80 leading-relaxed font-sans">
              <section>
                <h3 className="text-amber-400 font-bold mb-2 tracking-widest">【🎯 核心目标】</h3>
                <p>参与地下暗网拍卖，运用你的初始资金竞拍神秘藏品。在拍卖中尽力用低价捡漏“真品”，或者忽悠别人高价买下“赝品”。</p>
                <p className="mt-1 text-white">协议终止时（完成配置轮数后），<span className="text-amber-500 font-bold">【结余资金】加【拍下藏品的真实价值】总净资产最高者，获得胜利！</span></p>
              </section>
              
              <section className="bg-white/5 p-4 rounded-lg border border-white/10">
                <h3 className="text-teal-400 font-bold mb-2 tracking-widest">【⚖️ 执行流程】</h3>
                <ul className="list-decimal list-inside space-y-2 text-white/70">
                  <li><strong>揭晓拍品：</strong>每回合开始，公布1件拍卖品及其“公开参考市值”。</li>
                  <li><strong>暗标互搏：</strong>在房主设定的等待时间内秘密输入“出价”。所有人互相不知道出价金额。主机节点仅作见证，不参与竞价。</li>
                  <li><strong>锁定结算：</strong>时间耗尽后，出价最高者必须强制购买该藏品。</li>
                  <li><strong>真相大白：</strong>立刻公开赢家的出价，并揭晓该藏品的<span className="text-blue-400 font-bold">【内部真实市值】</span>（有可能血赚，也有可能血亏）。</li>
                </ul>
              </section>

              <section>
                <h3 className="text-amber-400 font-bold mb-2 tracking-widest">【🧬 身份特性 (职业)】</h3>
                <ul className="space-y-3">
                  {roleEntries.map(([roleId, role]) => (
                    <li key={roleId} className="bg-black/40 p-3 rounded border border-white/5">
                      <span className="text-white font-bold">{role.name}：</span>
                      基础资金倍率 <span className="text-amber-500 font-bold">x{role.balanceMultiplier.toFixed(2)}</span>。
                      {role.ability === 'appraiser_insight' && <span className="text-blue-400"> 被动能力[火眼金睛]：可直接看到真实价值。</span>}
                      {role.ability === 'tie_breaker' && <span className="text-red-400"> 被动能力[绝境翻盘]：最高出价平局时优先获胜。</span>}
                      {role.ability === 'none' && <span className="text-white/70"> {role.desc}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <button onClick={() => setShowRules(false)} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors uppercase tracking-widest text-xs font-bold">
                掌握协议，返回大厅
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <footer className="mt-12 text-[10px] font-mono text-white/20 uppercase tracking-widest text-center">
        <div>&copy; 竞拍之王 (BidKing) 分布式异步引擎 {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
