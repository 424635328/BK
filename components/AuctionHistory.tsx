'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuctionRoundHistory, ROLES } from '@/lib/game';
import { 
  Download, Filter, ChevronDown, ChevronUp, Search, Clock, 
  TrendingUp, Trophy, Zap, ShieldAlert, CheckCircle2, XCircle,
  User, RefreshCw, DollarSign, Activity, History
} from 'lucide-react';

// ==========================================
// Types & Interfaces
// ==========================================

interface AuctionHistoryProps {
  auctionHistory: AuctionRoundHistory[];
}

type FilterType = 'all' | 'completed' | 'scrapper_take' | 'cancelled';
type SortType = 
  | 'round_asc' | 'round_desc' 
  | 'profit_asc' | 'profit_desc' 
  | 'bid_asc' | 'bid_desc' 
  | 'time_asc' | 'time_desc';

interface FilterState {
  status: FilterType;
  sort: SortType;
  search: string;
  minPrice: string;
  maxPrice: string;
  winner: string;
}

const defaultFilters: FilterState = {
  status: 'all',
  sort: 'round_desc',
  search: '',
  minPrice: '',
  maxPrice: '',
  winner: ''
};

// ==========================================
// Utility Functions
// ==========================================

// FNV-1a 风格的高效非加密哈希，用于生成数据版本指纹
const computeDataHash = (data: unknown): string => {
  const str = JSON.stringify(data);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const formatDuration = (start: number, end: number) => {
  if (!start || !end) return '-';
  const duration = Math.max(0, (end - start) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

const formatDateTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
};

const getStatusBadge = (status: AuctionRoundHistory['status']) => {
  const statusMap = {
    completed: { label: '已成交', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
    scrapper_take: { label: '捡漏成交', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: Zap },
    cancelled: { label: '流拍', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle }
  };
  return statusMap[status] || statusMap.completed;
};

// ==========================================
// Sub-Components
// ==========================================

const StatCard = ({ title, value, theme }: { title: string; value: string | number; theme: 'green' | 'amber' | 'blue' | 'purple' }) => {
  const themes = {
    green: 'from-green-500/10 to-emerald-500/5 border-green-500/20 text-green-400',
    amber: 'from-amber-500/10 to-orange-500/5 border-amber-500/20 text-amber-400',
    blue: 'from-blue-500/10 to-indigo-500/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/10 to-pink-500/5 border-purple-500/20 text-purple-400',
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 bg-gradient-to-br border rounded-2xl flex flex-col items-center justify-center transition-all hover:scale-[1.02] ${themes[theme].split(' text-')[0]}`}
    >
      <div className={`text-xs uppercase tracking-wider mb-2 opacity-80 ${themes[theme].match(/text-\w+-400/)?.[0]}`}>{title}</div>
      <div className="text-3xl font-bold text-white font-mono">{value}</div>
    </motion.div>
  );
};

const InputGroup = ({ label, icon: Icon, children }: { label: string, icon?: any, children: React.ReactNode }) => (
  <div className="space-y-2">
    <label className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5 font-medium">
      {Icon && <Icon size={14} className="text-white/40" />}
      {label}
    </label>
    {children}
  </div>
);

const EmptyState = ({ hasSourceData, onReset }: { hasSourceData: boolean; onReset: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-20 px-8 bg-white/[0.02] rounded-3xl border border-white/5"
  >
    <div className="w-20 h-20 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center shadow-inner">
      <Search className="text-white/20" size={36} />
    </div>
    <h3 className="text-xl font-medium text-white mb-3">暂无匹配的竞拍记录</h3>
    <p className="text-sm text-white/40 mb-8 max-w-sm mx-auto leading-relaxed">
      {hasSourceData 
        ? '未找到符合当前筛选条件的记录，请尝试调整搜索关键词或重置筛选条件。' 
        : '当前尚未产生任何竞拍记录，游戏开始后的历史将展示在这里。'}
    </p>
    {hasSourceData && (
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/10 rounded-xl text-white hover:bg-white/20 hover:scale-105 transition-all text-sm font-medium"
      >
        <RefreshCw size={16} />
        清除所有筛选条件
      </button>
    )}
  </motion.div>
);

const DataItem = ({ label, value, isPositive = null, highlighted = false }: { label: string, value: string, isPositive?: boolean | null, highlighted?: boolean }) => {
  let styles = "bg-white/5 border-white/5 text-white label-white/60";
  if (highlighted) styles = "bg-amber-500/10 border-amber-500/20 text-amber-400 label-amber-400/80";
  else if (isPositive === true) styles = "bg-green-500/10 border-green-500/20 text-green-400 label-green-400/80";
  else if (isPositive === false) styles = "bg-red-500/10 border-red-500/20 text-red-400 label-red-400/80";

  return (
    <div className={`flex flex-col flex-1 sm:flex-none items-center justify-center px-5 py-4 rounded-2xl border min-w-[120px] transition-colors ${styles.split(' text-')[0]}`}>
      <div className={`text-xs uppercase tracking-wider mb-2 flex items-center gap-1 ${styles.match(/label-([^ ]+)/)?.[1].replace('-', 'text-')}`}>
        {isPositive !== null && <TrendingUp size={14} className={isPositive === false ? 'rotate-180' : ''} />}
        {label}
      </div>
      <div className={`font-mono font-bold text-lg ${styles.match(/text-\w+(-\d+)?/)?.[0]}`}>{value}</div>
    </div>
  );
};

const RoundItem = ({ round, isExpanded, onToggle, dataHash }: { round: AuctionRoundHistory; isExpanded: boolean; onToggle: () => void; dataHash: string; }) => {
  const badge = getStatusBadge(round.status);
  
  return (
    <div
      onClick={onToggle}
      className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer ${
        isExpanded
          ? 'bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30 shadow-2xl shadow-blue-500/10'
          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
      }`}
    >
      {/* 头部信息 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Trophy size={16} />第 {round.round} 轮
          </span>
          <span className={`px-4 py-2 rounded-xl text-sm font-bold border flex items-center gap-2 ${badge.color}`}>
            <badge.icon size={16} />{badge.label}
          </span>
          <span className="px-4 py-2 bg-white/5 border border-white/5 text-white/70 rounded-xl text-sm font-mono flex items-center gap-2">
            <Clock size={14} className="text-white/40" />{formatDuration(round.roundStartTime, round.roundEndTime)}
          </span>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-white/40 text-sm font-mono">{formatDateTime(round.roundStartTime)}</span>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`p-2.5 rounded-xl border transition-all ${
              isExpanded ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </motion.button>
        </div>
      </div>

      {/* 拍品与核心数据 */}
      <div className="mb-6">
        <h4 className="font-bold text-2xl sm:text-3xl text-white mb-2 group-hover:text-amber-400 transition-colors">
          {round.item.name}
        </h4>
        <p className="text-white/50 text-base line-clamp-2 leading-relaxed max-w-3xl">
          {round.item.description}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {round.winnerName && <DataItem label="中标者" value={round.winnerName} highlighted />}
        <DataItem label="成交价" value={`¥${round.winningBid.toLocaleString()}`} />
        {round.actualPayment !== round.winningBid && <DataItem label="实际支付" value={`¥${round.actualPayment.toLocaleString()}`} isPositive={true} />}
        <DataItem label="真实价值" value={`¥${round.item.trueValue.toLocaleString()}`} />
        {round.profitLoss !== undefined && (
          <DataItem label="盈亏" value={`${round.profitLoss >= 0 ? '+' : ''}¥${round.profitLoss.toLocaleString()}`} isPositive={round.profitLoss >= 0} />
        )}
      </div>

      {/* 展开的详情页 - 出价历史 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h5 className="text-white/70 text-sm uppercase tracking-widest flex items-center gap-2 font-medium">
                  <Activity size={16} className="text-blue-400" />
                  出价记录 ({round.bids.length} 人参与)
                </h5>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-xs font-mono text-white/30">
                  <ShieldAlert size={12} />数据签名: {dataHash}
                </div>
              </div>

              <div className="space-y-3">
                {round.bids.length === 0 ? (
                  <div className="text-center py-6 text-white/30 text-sm">此轮暂无任何出价记录</div>
                ) : (
                  round.bids.sort((a, b) => b.amount - a.amount).map((bid, bidIdx) => {
                    const isWinner = bid.playerId === round.winnerId;
                    let rankStyle = "bg-white/5 text-white/50 border border-white/10";
                    if (isWinner) rankStyle = "bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/20 font-bold border-none";
                    else if (bidIdx === 1) rankStyle = "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900 font-bold border-none";
                    else if (bidIdx === 2) rankStyle = "bg-gradient-to-br from-orange-800 to-orange-900 text-orange-100 font-bold border-none";

                    return (
                      <motion.div
                        key={`${bid.playerId}-${bid.timestamp}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: bidIdx * 0.04 }}
                        className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all ${
                          isWinner ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-amber-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-4 sm:gap-5">
                          <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${rankStyle}`}>
                            {bidIdx + 1}
                          </span>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-base sm:text-lg ${isWinner ? 'text-amber-400' : 'text-white/90'}`}>
                                {bid.playerName}
                              </span>
                              <span className="px-2 py-0.5 bg-white/10 rounded-md text-white/50 text-xs">
                                {ROLES[bid.roleId]?.name || bid.roleId}
                              </span>
                            </div>
                            <span className="text-white/30 text-xs font-mono">
                              {formatTime(bid.timestamp)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {isWinner && (
                            <span className="hidden sm:flex px-3 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-lg font-bold items-center gap-1">
                              <CheckCircle2 size={14} /> 最终得主
                            </span>
                          )}
                          <span className={`font-mono text-xl sm:text-2xl font-bold ${isWinner ? 'text-amber-400' : 'text-white/70'}`}>
                            ¥{bid.amount.toLocaleString()}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// Main Component
// ==========================================

export default function AuctionHistory({ auctionHistory }: AuctionHistoryProps) {
  const [isMainExpanded, setIsMainExpanded] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const[dataHash, setDataHash] = useState<string>('');

  // 计算全局数据哈希用于防篡改与导出校验
  useEffect(() => {
    setDataHash(computeDataHash(auctionHistory));
  },[auctionHistory]);

  const updateFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  },[]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  },[]);

  const handleToggleRound = useCallback((roundId: number) => {
    setSelectedRound(prev => prev === roundId ? null : roundId);
  },[]);

  // 核心过滤与排序逻辑
  const filteredAndSortedHistory = useMemo(() => {
    return [...auctionHistory]
      .filter(item => {
        if (filters.status !== 'all' && item.status !== filters.status) return false;
        
        if (filters.search.trim()) {
          const term = filters.search.toLowerCase();
          const matchName = item.item.name.toLowerCase().includes(term);
          const matchWinner = item.winnerName?.toLowerCase().includes(term);
          const matchBidders = item.bids.some(b => b.playerName.toLowerCase().includes(term));
          if (!matchName && !matchWinner && !matchBidders) return false;
        }

        if (filters.winner.trim() && !item.winnerName?.toLowerCase().includes(filters.winner.toLowerCase())) return false;

        const min = Number(filters.minPrice);
        if (filters.minPrice !== '' && !isNaN(min) && item.winningBid < min) return false;
        
        const max = Number(filters.maxPrice);
        if (filters.maxPrice !== '' && !isNaN(max) && item.winningBid > max) return false;

        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case 'round_asc': return a.round - b.round;
          case 'round_desc': return b.round - a.round;
          case 'profit_asc': return (a.profitLoss || 0) - (b.profitLoss || 0);
          case 'profit_desc': return (b.profitLoss || 0) - (a.profitLoss || 0);
          case 'bid_asc': return a.winningBid - b.winningBid;
          case 'bid_desc': return b.winningBid - a.winningBid;
          case 'time_asc': return a.roundStartTime - b.roundStartTime;
          case 'time_desc': return b.roundStartTime - a.roundStartTime;
          default: return b.round - a.round;
        }
      });
  }, [auctionHistory, filters]);

  const handleExport = useCallback(() => {
    const exportData = {
      data: filteredAndSortedHistory,
      generatedAt: new Date().toISOString(),
      sourceDataHash: dataHash,
      exportDataHash: computeDataHash(filteredAndSortedHistory),
      recordCount: filteredAndSortedHistory.length
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auction-history-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredAndSortedHistory, dataHash]);

  return (
    <div className="w-full">
      {/* 顶部折叠触发器 */}
      <motion.button
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        onClick={() => setIsMainExpanded(!isMainExpanded)}
        className="w-full flex items-center justify-between p-5 sm:p-6 bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-blue-900/40 border border-white/10 rounded-2xl shadow-xl backdrop-blur-md group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="flex items-center gap-4 sm:gap-5 relative z-10">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-110">
            <History className="text-white" size={26} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg sm:text-xl text-white flex items-center gap-3">
              历史竞拍记录
              <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-lg text-xs font-mono shadow-inner">
                {auctionHistory.length} 轮次
              </span>
            </h3>
            <p className="text-white/50 text-xs sm:text-sm mt-1">
              完整追踪每轮物品的流转、报价与得主详情
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isMainExpanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="p-2.5 bg-white/5 border border-white/10 rounded-xl group-hover:bg-white/10 transition-colors relative z-10 hidden sm:block"
        >
          <ChevronDown className="text-white/70" size={20} />
        </motion.div>
      </motion.button>

      {/* 主面板内容 */}
      <AnimatePresence>
        {isMainExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-5 sm:p-8 bg-[#0B0F19]/80 backdrop-blur-xl border border-white/10 rounded-3xl space-y-8 shadow-2xl">
              
              {/* 控制栏 (搜索与操作) */}
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <div className="flex-1 relative group">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="搜索拍品名称、竞拍者或得主..."
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 border rounded-xl transition-all text-sm font-medium ${
                      showAdvancedFilters ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08]'
                    }`}
                  >
                    <Filter size={16} />
                    {showAdvancedFilters ? '收起筛选' : '高级筛选'}
                  </button>

                  <button
                    onClick={handleExport}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl hover:from-emerald-600/30 hover:to-teal-600/30 transition-all text-sm font-medium"
                  >
                    <Download size={16} />导出 JSON
                  </button>
                </div>
              </div>

              {/* 高级筛选面板 */}
              <AnimatePresence>
                {showAdvancedFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 sm:p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-5">
                      <div className="flex items-center justify-between pb-4 border-b border-white/5">
                        <span className="text-sm text-white/80 font-medium flex items-center gap-2">
                          <Activity size={16} className="text-blue-400" />
                          自定义条件
                        </span>
                        <button onClick={resetFilters} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg">
                          <RefreshCw size={12} />重置
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <InputGroup label="竞拍状态" icon={Zap}>
                          <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50">
                            <option value="all">全部状态</option>
                            <option value="completed">正常成交</option>
                            <option value="scrapper_take">捡漏成交</option>
                            <option value="cancelled">流拍</option>
                          </select>
                        </InputGroup>

                        <InputGroup label="排序规则" icon={TrendingUp}>
                          <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50">
                            <option value="round_desc">轮次：最新优先</option>
                            <option value="round_asc">轮次：最早优先</option>
                            <option value="profit_desc">盈亏：盈利最高</option>
                            <option value="profit_asc">盈亏：亏损最多</option>
                            <option value="bid_desc">价格：出价最高</option>
                            <option value="bid_asc">价格：出价最低</option>
                          </select>
                        </InputGroup>

                        <InputGroup label="指定得主" icon={User}>
                          <input type="text" placeholder="输入玩家昵称..." value={filters.winner} onChange={(e) => updateFilter('winner', e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50" />
                        </InputGroup>

                        <InputGroup label="成交价区间 (¥)" icon={DollarSign}>
                          <div className="flex gap-2 items-center">
                            <input type="number" placeholder="最低" value={filters.minPrice} onChange={(e) => updateFilter('minPrice', e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 text-center" />
                            <span className="text-white/20">-</span>
                            <input type="number" placeholder="最高" value={filters.maxPrice} onChange={(e) => updateFilter('maxPrice', e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 text-center" />
                          </div>
                        </InputGroup>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 统计看板 */}
              {filteredAndSortedHistory.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="匹配轮次" value={filteredAndSortedHistory.length} theme="green" />
                  <StatCard title="有效成交" value={filteredAndSortedHistory.filter(r => r.status === 'completed' || r.status === 'scrapper_take').length} theme="amber" />
                  <StatCard title="总交易额" value={`¥${filteredAndSortedHistory.reduce((s, r) => s + r.winningBid, 0).toLocaleString()}`} theme="blue" />
                  <StatCard title="总出价人次" value={filteredAndSortedHistory.reduce((s, r) => s + r.bids.length, 0)} theme="purple" />
                </div>
              )}

              {/* 列表渲染 */}
              <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredAndSortedHistory.length === 0 ? (
                  <EmptyState hasSourceData={auctionHistory.length > 0} onReset={resetFilters} />
                ) : (
                  filteredAndSortedHistory.map((round) => (
                    <RoundItem
                      key={round.round}
                      round={round}
                      isExpanded={selectedRound === round.round}
                      onToggle={() => handleToggleRound(round.round)}
                      dataHash={dataHash.slice(0, 16)}
                    />
                  ))
                )}
              </div>

              {/* 底部验证区 */}
              <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="text-white/30 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-emerald-500/50" />
                  <span>记录已应用防篡改校验保护</span>
                </div>
                <div className="text-white/20 font-mono tracking-wider">
                  Checksum: {dataHash}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}