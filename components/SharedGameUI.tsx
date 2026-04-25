'use client';

import React, { useState, useEffect } from 'react';
import { GameState, ROLES } from '@/lib/game';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, Info, Copy, Trophy, TrendingUp, TrendingDown, 
  Clock, User, Key, Gavel, CheckCircle2, Zap, 
  Terminal, Activity, Lock, Eye, Crown, Radio
} from 'lucide-react';
import AuctionHistorySidebar from './AuctionHistorySidebar';
import { Button, Card, Badge } from './ui';

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
  const meRole = me ? ROLES[me.roleId] : null;
  const totalRounds = state.config.rounds;
  
  const [copied, setCopied] = useState(false);
  const[bidInput, setBidInput] = useState('');

  // 每次回合变更时，清空输入框
  useEffect(() => {
    setBidInput('');
  }, [state.round]);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room ID: ', err);
    }
  };

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(bidInput);
    if (amt >= 0 && onBid) {
      onBid(amt);
    }
  };

  // ==========================================
  // 渲染辅助函数：左侧 - 战术情报面板
  // ==========================================
  const renderTacticalIntel = () => {
    if (isHost) {
      return (
        <Card className="p-4 bg-amber-500/10 border-amber-500/30 relative overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.05)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="text-[10px] text-amber-500 uppercase mb-3 font-bold flex items-center gap-2 relative z-10">
            <ShieldAlert size={14}/> 主机全知权限 (Host Omniscience)
          </div>
          <div className="text-xs text-white/80 space-y-2 font-mono relative z-10">
            <p className="flex justify-between items-center bg-black/60 p-2.5 rounded-lg border border-amber-500/20">
              <span className="text-white/50">当前拍品真实价值</span>
              <span className="text-amber-400 font-bold text-base drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                ¥{state.currentItem?.trueValue.toLocaleString()}
              </span>
            </p>
            <p className="text-amber-500/70 text-[10px] mt-2 leading-relaxed italic border-l-2 border-amber-500/30 pl-2">
              作为中立主机，您负责见证整场博弈，无需参与竞拍。协议由您守护。
            </p>
          </div>
        </Card>
      );
    }

    if (!meRole) return null;

    const abilities: Record<string, { color: string, border: string, bg: string, icon: any, title: string, content: React.ReactNode }> = {
      appraiser_insight: {
        color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10', icon: Eye, title: '被动技能: 火眼金睛',
        content: (
          <div className="font-mono space-y-1">
            <p className="text-blue-300/80 mb-2"> {'>'} 正在解密内部数据...</p>
            <p className="text-blue-400 font-bold text-sm bg-black/60 p-2.5 rounded-lg border border-blue-500/20 shadow-inner flex justify-between items-center">
              <span>真实估值</span>
              <span className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">¥{state.currentItem?.trueValue.toLocaleString()}</span>
            </p>
          </div>
        )
      },
      tycoon_refund: {
        color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', icon: Activity, title: '被动技能: 财大气粗',
        content: <p className="text-yellow-200/80">资本优势！未拍到物品将返还出价 <span className="font-bold text-yellow-400 bg-yellow-500/20 px-1 rounded">20%</span>。大胆出价，不怕失败。</p>
      },
      gambler_bonus: {
        color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10', icon: Zap, title: '被动技能: 赌运亨通',
        content: <p className="text-red-200/80">平局必胜！拍到超值物品(真值≥出价×2)额外奖励真值 <span className="font-bold text-red-400 bg-red-500/20 px-1 rounded">20%</span>！</p>
      },
      investor_interest: {
        color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/10', icon: TrendingUp, title: '被动技能: 复利增长',
        content: <p className="text-green-200/80">稳健收益！每轮结束获得当前现金的 <span className="font-bold text-green-400 bg-green-500/20 px-1 rounded">5%</span> 利息。现金为王！</p>
      },
      broker_discount: {
        color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10', icon: TrendingDown, title: '被动技能: 砍价高手',
        content: <p className="text-purple-200/80">交易优势！最终成交价仅为出价的 <span className="font-bold text-purple-400 bg-purple-500/20 px-1 rounded">90%</span>，变相节省 10%！</p>
      },
      scrapper_loot: {
        color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10', icon: Key, title: '被动技能: 捡漏高手',
        content: <p className="text-orange-200/80">逆袭机会！流拍物品自动获得，价格仅为真值的 <span className="font-bold text-orange-400 bg-orange-500/20 px-1 rounded">50%</span>！</p>
      }
    };

    const ability = abilities[meRole.ability];
    if (ability) {
      const Icon = ability.icon;
      return (
        <Card className={`p-4 border ${ability.border} ${ability.bg} relative overflow-hidden shadow-inner`}>
          <div className={`absolute -right-4 -top-4 opacity-10 ${ability.color} pointer-events-none`}>
            <Icon size={80} />
          </div>
          <div className={`text-[10px] ${ability.color} uppercase mb-3 font-bold flex items-center gap-2 relative z-10`}>
            <Icon size={14}/> {ability.title}
          </div>
          <div className="text-xs leading-relaxed italic text-pretty relative z-10">
            {ability.content}
          </div>
        </Card>
      );
    }

    return (
      <Card className="p-4 border-white/10 bg-white/5 relative overflow-hidden">
        <div className="text-[10px] text-white/50 uppercase mb-2 font-bold flex items-center gap-2">
          <Info size={14}/> 基础情报流
        </div>
        <p className="text-xs leading-relaxed text-white/50 italic text-pretty">
          标准访问权限。在结果揭晓前，藏品的真实价值对您完全隐藏。依靠直觉和场面博弈吧。
        </p>
      </Card>
    );
  };

  // ==========================================
  // 大厅视图 (Lobby)
  // ==========================================
  if (state.status === 'lobby') {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4 min-h-screen relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 relative z-10 w-full max-w-md"
        >
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8, bounce: 0.5 }}
            className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.3)] mx-auto mb-8 border-2 border-white/10"
          >
            <Gavel size={48} className="text-black" />
          </motion.div>
          
          <div>
            <h1 className="text-[10px] text-amber-500/80 uppercase tracking-[0.4em] mb-2 font-bold">房间实例 (INSTANCE)</h1>
            <div className="flex items-center justify-center gap-3">
              <p className="text-5xl font-mono font-black text-white tracking-widest drop-shadow-lg">
                {roomId}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-3 mt-6">
            <Button
              onClick={copyRoomId}
              size="lg"
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto bg-black/40 backdrop-blur-sm border-white/20 hover:bg-white/10 transition-colors"
            >
              <Copy size={18} className={copied ? "text-green-400" : ""} />
              {copied ? <span className="text-green-400">已复制成功</span> : '复制房间号'}
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-white/40 text-[10px] uppercase font-mono mt-6 bg-black/40 py-2 px-4 rounded-full border border-white/5 w-fit mx-auto">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
            等待节点连接中 (Awaiting peers...)
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-2xl mt-10 grid gap-4 relative z-10"
        >
          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center gap-1">
              <Clock size={16} className="text-white/40 mb-1" />
              <div className="text-white/40 text-[10px] uppercase">等待时间</div>
              <div className="text-amber-500 font-bold text-lg">{state.config.biddingSeconds}s</div>
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center gap-1">
              <Activity size={16} className="text-white/40 mb-1" />
              <div className="text-white/40 text-[10px] uppercase">拍卖轮数</div>
              <div className="text-amber-500 font-bold text-lg">{state.config.rounds}</div>
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center gap-1">
              <TrendingUp size={16} className="text-white/40 mb-1" />
              <div className="text-white/40 text-[10px] uppercase">初始资金</div>
              <div className="text-amber-500 font-bold text-lg">¥{state.config.initialBalance.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
              <div className="text-[10px] text-white/50 uppercase tracking-widest flex items-center gap-2 font-bold">
                <User size={14} className="text-amber-500/80" /> 已连接节点 ({Object.keys(state.players).length}/20)
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[35vh] overflow-y-auto custom-scrollbar pr-1">
              {Object.values(state.players).length === 0 && (
                <div className="col-span-full py-8 text-center border border-white/5 bg-white/5 rounded-xl text-white/30 font-mono text-xs uppercase border-dashed">
                  暂无节点连接
                </div>
              )}
              <AnimatePresence>
                {Object.values(state.players).map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`p-4 rounded-xl flex flex-col items-center gap-3 transition-all border relative overflow-hidden ${
                      p.id === myId 
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    {p.id === myId && <div className="absolute inset-0 bg-amber-500/5 animate-pulse" />}
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center font-bold text-xl text-white border-2 border-white/10 shadow-inner relative z-10">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center relative z-10 w-full">
                      <div className="font-bold text-sm tracking-wide text-white truncate px-1" title={p.name}>{p.name}</div>
                      <div className="text-[9px] text-white/50 font-mono uppercase tracking-widest mt-1 truncate px-1">
                        {ROLES[p.roleId]?.name || p.roleId}
                      </div>
                    </div>
                    {p.id === myId && (
                      <Badge variant="default" className="absolute top-2 right-2 bg-amber-500 text-black border-none text-[8px] px-1.5 py-0">你</Badge>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {isHost && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 relative z-10 w-full max-w-sm"
          >
            <Button
              onClick={onStart}
              disabled={Object.values(state.players).length < 2}
              size="lg"
              fullWidth
              className={`flex items-center justify-center gap-2 shadow-2xl ${
                Object.values(state.players).length >= 2 ? 'shadow-amber-500/20 hover:shadow-amber-500/40' : ''
              }`}
            >
              {Object.values(state.players).length < 2 ? (
                <>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  至少需要 2 人启动
                </>
              ) : (
                <>
                  <Zap size={18} />
                  启动竞拍协议
                </>
              )}
            </Button>
          </motion.div>
        )}
      </main>
    );
  }

  // ==========================================
  // 主游戏视图 (Active Game)
  // ==========================================
  return (
    <div className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full min-h-screen">
      
      {/* 头部信息区 */}
      <header className="relative z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-white/10 gap-4 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 rounded-b-xl px-2 sm:px-4 pt-2 -mx-2 sm:mx-0">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0 border border-white/20">
            <span className="text-2xl font-black text-black tracking-tighter">BK</span>
          </div>
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
              竞拍之王 <Badge variant="default" className="bg-amber-500/20 text-amber-500 border-none scale-90">v1.2.0</Badge>
            </h1>
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-tighter">
              <span className="px-1.5 py-0.5 bg-white/10 rounded">Round {state.round}/{totalRounds}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Lock size={10} /> {roomId}</span>
            </div>
          </div>
        </div>

        {me && (
          <div className="flex gap-4 sm:gap-6 items-center w-full sm:w-auto bg-black/40 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-white/5 sm:border-none">
            <div className="flex-1 sm:text-right">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1 font-bold">流动资金 (Net Balance)</div>
              <div className="text-amber-500 font-mono font-black text-xl sm:text-2xl drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                ¥{me.balance.toLocaleString()}
              </div>
            </div>
            <div className="h-10 w-[1px] bg-white/10 hidden sm:block"></div>
            <div className="text-right shrink-0">
              <span className="text-[10px] block text-white/40 uppercase mb-1 font-bold">身份代号 (Agent)</span>
              <span className="font-mono font-bold text-sm text-white">{me.name}</span>
              <div className="text-[10px] text-amber-500/70">{meRole?.name || me.roleId}</div>
            </div>
          </div>
        )}
      </header>

      {/* 核心网格布局： 左侧 3 列 | 右侧 9 列 */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 pb-20 lg:pb-12 flex-1 items-start">
        
        {/* ========================================== */}
        {/* 左侧边栏 (3 Cols)：战术情报、节点、日志        */}
        {/* ========================================== */}
        <aside className="col-span-1 lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1 sticky top-[100px]">
          
          {/* 1. 战术情报 */}
          {renderTacticalIntel()}

          {/* 2. 活跃节点池 */}
          <Card className="p-4 bg-black/40 border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
              <h3 className="text-[10px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                <Radio size={14} className="text-blue-400" /> 
                活跃节点 ({Object.keys(state.players).length})
              </h3>
            </div>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
              {Object.values(state.players).map(p => {
                const isMe = p.id === myId;
                const isReady = (state.status === 'bidding' || state.status === 'locking') && state.bids[p.id] !== undefined;
                
                return (
                  <div key={p.id} className={`flex flex-col p-2.5 rounded-lg border transition-all ${isMe ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 overflow-hidden">
                         <div className={`w-2 h-2 shrink-0 rounded-full ${isMe ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : isReady ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-white/20'}`} />
                         <span className={`text-xs sm:text-sm tracking-wide truncate ${isMe ? 'font-bold text-white' : 'font-medium text-white/80'}`}>
                           {p.name}
                         </span>
                         {isReady && <CheckCircle2 size={12} className="text-green-500 shrink-0" />}
                      </div>
                      <span className={`text-xs font-mono font-bold shrink-0 ml-2 ${isMe ? 'text-amber-500' : 'text-white/60'}`}>
                        {(p.balance / 1000).toFixed(1)}k
                      </span>
                    </div>
                    {p.inventory.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-4 mt-1">
                        {p.inventory.map((i, idx) => (
                          <div key={idx} className="w-1.5 h-1.5 bg-amber-500/60 rounded-sm" title={i.name} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
          
          {/* 3. 终端日志 */}
          <Card className="p-4 bg-[#050505] border-white/10 font-mono text-[10px] sm:text-xs min-h-[140px] relative overflow-hidden group shadow-inner">
             <div className="absolute top-2 right-2 text-white/10 group-hover:text-white/20 transition-colors">
               <Terminal size={16} />
             </div>
             <div className="text-amber-500 mb-2 font-bold border-b border-white/5 pb-1">[SYS_LOG]: 初始化完毕</div>
             <div className="text-white/40 mb-1 leading-relaxed">{`>>`} 挂载实例: {roomId}</div>
             <div className="text-white/40 mb-1 leading-relaxed">{`>>`} 协议状态: <span className="text-white">{state.status.toUpperCase()}</span></div>
             <div className="text-blue-400/80 mb-1 leading-relaxed">{`>>`} 时钟同步: 剩余 {state.timer}s</div>
             <div className="text-green-500/80 mt-2 flex items-center">{`>>`} 监听指令... <div className="w-2 h-3.5 bg-green-500/80 animate-pulse ml-1 inline-block" /></div>
          </Card>

        </aside>

        {/* ========================================== */}
        {/* 右侧主区 (9 Cols)：主竞拍区 + 历史记录表       */}
        {/* ========================================== */}
        <section className="col-span-1 lg:col-span-9 flex flex-col gap-4 lg:gap-6 order-1 lg:order-2 w-full min-w-0">
          
          {/* 上半部：主竞拍 UI / 结算页面 */}
          {state.status === 'game_over' ? (
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 bg-gradient-to-b from-amber-500/5 to-black border border-amber-500/20 rounded-2xl p-6 lg:p-12 flex flex-col items-center justify-center min-h-[50vh] shadow-[0_0_50px_rgba(245,158,11,0.05)] relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
              <Crown className="text-amber-500 mb-6 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)] relative z-10" size={80} />
              <h2 className="text-4xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500 mb-3 uppercase tracking-widest text-center relative z-10">
                协议已终止
              </h2>
              <div className="text-xs text-white/40 uppercase tracking-[0.4em] mb-12 text-center relative z-10">最终资产核算 (Final Valuation)</div>
              
              <div className="space-y-4 w-full max-w-2xl relative z-10">
                {Object.values(state.players).sort((a,b) => {
                  const nwA = a.balance + a.inventory.reduce((sum, item) => sum + item.trueValue, 0);
                  const nwB = b.balance + b.inventory.reduce((sum, item) => sum + item.trueValue, 0);
                  return nwB - nwA;
                }).map((p, idx) => {
                  const netWorth = p.balance + p.inventory.reduce((sum, item) => sum + item.trueValue, 0);
                  const isWinner = idx === 0;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.15 }}
                      className={`p-5 rounded-2xl border flex justify-between items-center w-full relative overflow-hidden ${
                        isWinner 
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.2)] scale-105' 
                          : 'bg-black/60 border-white/10 text-white/80'
                      }`}
                    >
                      {isWinner && <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 animate-[shimmer_2s_infinite]" />}
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${isWinner ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/50'}`}>
                          {idx + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold tracking-wider text-lg">{p.name} {p.id === myId && <span className="text-xs font-normal opacity-60 ml-1">(你)</span>}</span>
                          {isWinner && <span className="text-[10px] uppercase tracking-widest opacity-80 mt-0.5">Top Earner</span>}
                        </div>
                      </div>
                      <span className={`font-mono font-black text-2xl relative z-10 ${isWinner ? 'text-amber-400 drop-shadow-md' : ''}`}>
                        ¥{netWorth.toLocaleString()}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <div className="flex-none bg-black/40 border border-white/10 rounded-2xl p-6 lg:p-8 flex flex-col relative overflow-hidden shadow-2xl min-h-[450px]">
              {/* 背景装饰网络 */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
              
              {/* 顶部状态与倒计时 */}
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm ${
                  state.status === 'bidding' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                  state.status === 'locking' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                  {state.status === 'bidding' && <><Activity size={14} className="animate-pulse" /> 暗标收集中</>}
                  {state.status === 'locking' && <><Lock size={14} /> 协议锁定</>}
                  {state.status === 'revealing' && <><Eye size={14} /> 结果公示</>}
                </div>
                
                <div className="text-right bg-black/40 px-4 py-2 rounded-lg border border-white/5">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5 font-bold">剩余时间</div>
                  <div className={`text-3xl font-black font-mono transition-colors tracking-tighter leading-none ${
                    state.timer <= 3 ? 'text-red-500 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'text-white'
                  }`}>
                    00:{state.timer.toString().padStart(2, '0')}
                  </div>
                </div>
              </div>

              {/* 中央拍品展示区 */}
              <motion.div 
                key={state.round}
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center flex-1 z-10 w-full my-4"
              >
                <div className="text-[10px] text-amber-500 uppercase tracking-[0.4em] mb-4 font-bold border border-amber-500/20 bg-amber-500/5 px-6 py-1.5 rounded-full inline-block shadow-sm">
                  Current Lot / 拍卖品
                </div>
                
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif italic text-white leading-tight px-4 text-center break-words drop-shadow-lg max-w-3xl">
                  {state.currentItem?.name || '同步中...'}
                </h2>
                
                <p className="text-sm text-white/50 mt-6 max-w-xl mx-auto min-h-[48px] italic leading-relaxed px-4 text-center">
                  &quot;{state.currentItem?.description}&quot;
                </p>
                
                <div className="mt-8 flex justify-center">
                  <div className="bg-gradient-to-b from-white/10 to-transparent border border-white/20 px-10 py-4 rounded-2xl flex flex-col items-center shadow-lg backdrop-blur-sm">
                    <div className="text-xs text-white/40 uppercase tracking-widest mb-1.5 font-medium">公开参考市值</div>
                    <div className="text-3xl font-mono text-white tracking-widest font-black drop-shadow-md">
                      ¥{state.currentItem?.baseValue.toLocaleString() || '---'}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 底部交互区：表单 或 揭晓 */}
              <div className="w-full mt-auto relative z-20">
                {state.status === 'bidding' && (
                  <form 
                    onSubmit={handleBidSubmit}
                    className="w-full max-w-3xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-black/60 p-4 rounded-2xl border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.08)] backdrop-blur-md"
                  >
                    <div className="flex-1 relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-500/50 font-mono text-2xl font-bold">¥</span>
                      <input 
                        type="number" inputMode="numeric" pattern="[0-9]*" required min={0} step={10} disabled={isHost}
                        value={bidInput} onChange={(e) => setBidInput(e.target.value)}
                        placeholder={isHost ? "主机免除出价" : "输入暗标金额..."}
                        className="w-full bg-black/50 border border-white/10 focus:border-amber-500 rounded-xl outline-none text-2xl font-mono text-amber-400 placeholder:text-white/20 pl-12 pr-4 py-4 transition-colors shadow-inner" 
                      />
                    </div>
                    {!isHost && (
                      <Button type="submit" size="lg" className="h-[66px] px-10 shrink-0 text-lg font-bold tracking-widest shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40">
                        {hasBid ? '更新出价' : '确认暗标'}
                      </Button>
                    )}
                  </form>
                )}

                {state.status === 'locking' && (
                  <div className="w-full max-w-3xl mx-auto flex justify-center py-6 bg-amber-500/5 border border-amber-500/30 rounded-2xl backdrop-blur-md">
                    <div className="text-amber-500 font-bold uppercase tracking-widest flex items-center gap-3 animate-pulse text-base">
                      <Lock size={20}/> 停止出价，计算结算池...
                    </div>
                  </div>
                )}

                {state.status === 'revealing' && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full bg-gradient-to-br from-[#0f172a] to-black border border-blue-500/20 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]" />
                    
                    <div className="text-center mb-8 relative z-10">
                      <div className="inline-flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/20 px-6 py-2 rounded-full">
                        <Trophy className="text-blue-400" size={16} />
                        <span className="text-xs text-blue-400 uppercase tracking-[0.2em] font-bold">竞拍结果公示</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                      {/* 左侧：排名榜 */}
                      <div className="space-y-3">
                        <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-bold px-1">出价排名 (Rankings)</div>
                        {Object.entries(state.bids)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5) // 如果人多，只展示前5名防重叠
                          .map(([gid, amt], idx) => {
                            const winHistory = state.winnerHistory.find(w => w.round === state.round);
                            const isWinner = winHistory?.winnerId === gid;
                            const isMe = gid === myId;
                            
                            return (
                              <motion.div
                                key={gid}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                  isWinner
                                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                                    : isMe ? 'bg-white/10 border-white/20' : 'bg-black/40 border-white/5'
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                    isWinner ? 'bg-amber-500 text-black shadow-[0_0_10px_#f59e0b]' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-orange-800 text-white' : 'bg-white/5 text-white/40'
                                  }`}>
                                    {idx + 1}
                                  </div>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold text-base ${isWinner ? 'text-amber-400' : 'text-white/90'}`}>
                                        {state.players[gid]?.name}
                                      </span>
                                      {isMe && <span className="text-[10px] text-white/50">(你)</span>}
                                    </div>
                                    {isWinner && <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mt-0.5">中标者 WINNER</span>}
                                  </div>
                                </div>
                                <span className={`font-mono text-xl font-bold ${isWinner ? 'text-amber-400 drop-shadow-md' : 'text-white/70'}`}>
                                  ¥{amt.toLocaleString()}
                                </span>
                              </motion.div>
                            );
                          })}
                      </div>

                      {/* 右侧：真相揭晓面板 */}
                      <div className="flex flex-col gap-4 justify-center">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: Object.keys(state.bids).length * 0.1 + 0.2 }}
                          className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 text-center backdrop-blur-sm shadow-inner"
                        >
                          <div className="text-[10px] text-blue-400 uppercase tracking-widest mb-2 font-bold">真实内部价值</div>
                          <div className="font-mono text-4xl text-blue-400 font-black drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                            ¥{state.currentItem?.trueValue.toLocaleString()}
                          </div>
                        </motion.div>

                        {(() => {
                          const winHistory = state.winnerHistory.find(w => w.round === state.round);
                          if (winHistory?.winnerId && state.currentItem) {
                            const profit = state.currentItem.trueValue - winHistory.winningBid;
                            const isProfit = profit >= 0;
                            return (
                              <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Object.keys(state.bids).length * 0.1 + 0.4 }}
                                className={`border rounded-2xl p-6 text-center backdrop-blur-sm shadow-inner ${
                                  isProfit ? 'bg-green-500/10 border-green-500/40' : 'bg-red-500/10 border-red-500/40'
                                }`}
                              >
                                <div className={`text-[10px] uppercase tracking-widest mb-2 font-bold flex items-center justify-center gap-1.5 ${
                                  isProfit ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                  赢家净盈亏
                                </div>
                                <div className={`font-mono text-4xl font-black ${
                                  isProfit ? 'text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                                }`}>
                                  {isProfit ? '+' : ''}¥{profit.toLocaleString()}
                                </div>
                              </motion.div>
                            );
                          }
                          return <div className="border border-white/5 bg-black/40 rounded-2xl p-8 flex items-center justify-center text-xs text-white/30 uppercase tracking-widest flex-1">无中标数据</div>;
                        })()}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* 下半部：全宽度历史记录表 (利用 9 列宽度) */}
          {state.auctionHistory && state.auctionHistory.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex-shrink-0 mt-2 lg:mt-0"
            >
              {/* 渲染 AuctionHistorySidebar 组件 */}
              <AuctionHistorySidebar auctionHistory={state.auctionHistory} />
            </motion.div>
          )}

        </section>
      </main>
      
      {/* 底部系统状态栏 */}
      <footer className="mt-auto flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-white/30 uppercase tracking-widest border-t border-white/10 pt-4 gap-2 z-10 relative">
        <div className="flex flex-wrap justify-center gap-4">
          <span className="text-green-500/80 flex items-center gap-1.5 font-bold">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]" />
            SYS_OK
          </span>
          <span className="hidden sm:inline text-white/20">|</span>
          <span>UPTIME: {Math.floor(state.timer)}s</span>
          <span className="hidden sm:inline text-white/20">|</span>
          <span>CONSENSUS: SECURE</span>
        </div>
        <div className="opacity-50 hover:opacity-100 transition-opacity">
          BidKing &copy; {new Date().getFullYear()} {isHost ? '[HOST_NODE]' : '[GUEST_NODE]'}
        </div>
      </footer>
    </div>
  );
}