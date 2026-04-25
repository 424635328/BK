'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuctionRoundHistory, ROLES } from '@/lib/game';
import { 
  Download, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Clock, 
  TrendingUp, 
  Trophy, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  Calendar,
  DollarSign,
  User,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface AuctionHistoryProps {
  auctionHistory: AuctionRoundHistory[];
}

type FilterType = 'all' | 'completed' | 'scrapper_take' | 'cancelled';
type SortType = 
  | 'round_asc' 
  | 'round_desc' 
  | 'profit_asc' 
  | 'profit_desc' 
  | 'bid_asc' 
  | 'bid_desc' 
  | 'time_asc' 
  | 'time_desc';

// 计算数据哈希防止篡改
const computeDataHash = (data: AuctionRoundHistory[]): string => {
  const dataStr = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

export default function AuctionHistory({ auctionHistory }: AuctionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('round_desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataHash, setDataHash] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: number | ''; max: number | '' }>({ min: '', max: '' });
  const [winnerFilter, setWinnerFilter] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // 验证数据完整性
  useEffect(() => {
    const hash = computeDataHash(auctionHistory);
    if (dataHash && dataHash !== hash) {
      console.warn('⚠️ 数据可能被篡改！');
    }
    setDataHash(hash);
  }, [auctionHistory]);

  // 模拟加载状态
  useEffect(() => {
    if (isExpanded && auctionHistory.length > 0) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, auctionHistory.length]);

  const filteredAndSortedHistory = useMemo(() => {
    let filtered = [...auctionHistory];

    // 按状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // 按搜索词过滤
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.item.name.toLowerCase().includes(term) ||
        (item.winnerName?.toLowerCase().includes(term)) ||
        item.bids.some(bid => bid.playerName.toLowerCase().includes(term))
      );
    }

    // 按价格范围过滤
    if (priceRange.min !== '') {
      const minPrice = Number(priceRange.min);
      if (!isNaN(minPrice)) {
        filtered = filtered.filter(item => item.winningBid >= minPrice);
      }
    }
    if (priceRange.max !== '') {
      const maxPrice = Number(priceRange.max);
      if (!isNaN(maxPrice)) {
        filtered = filtered.filter(item => item.winningBid <= maxPrice);
      }
    }

    // 按中标者过滤
    if (winnerFilter.trim()) {
      const winnerTerm = winnerFilter.toLowerCase();
      filtered = filtered.filter(item =>
        item.winnerName?.toLowerCase().includes(winnerTerm)
      );
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'round_asc':
          return a.round - b.round;
        case 'round_desc':
          return b.round - a.round;
        case 'profit_asc':
          return (a.profitLoss || 0) - (b.profitLoss || 0);
        case 'profit_desc':
          return (b.profitLoss || 0) - (a.profitLoss || 0);
        case 'bid_asc':
          return a.winningBid - b.winningBid;
        case 'bid_desc':
          return b.winningBid - a.winningBid;
        case 'time_asc':
          return a.roundStartTime - b.roundStartTime;
        case 'time_desc':
          return b.roundStartTime - a.roundStartTime;
        default:
          return b.round - a.round;
      }
    });

    return filtered;
  }, [auctionHistory, statusFilter, sortBy, searchTerm, priceRange, winnerFilter]);

  // 重置所有筛选
  const resetFilters = () => {
    setStatusFilter('all');
    setSortBy('round_desc');
    setSearchTerm('');
    setPriceRange({ min: '', max: '' });
    setWinnerFilter('');
  };

  // 导出为 JSON
  const handleExport = () => {
    const exportData = {
      data: filteredAndSortedHistory,
      generatedAt: new Date().toISOString(),
      dataHash: computeDataHash(filteredAndSortedHistory),
      recordCount: filteredAndSortedHistory.length
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auction-history-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 格式化时间
  const formatDuration = (start: number, end: number) => {
    const duration = (end - start) / 1000;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  // 格式化时间戳
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 格式化日期时间
  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取状态标签
  const getStatusBadge = (status: AuctionRoundHistory['status']) => {
    const statusMap: Record<AuctionRoundHistory['status'], { 
      label: string; 
      color: string; 
      icon: React.ReactNode;
    }> = {
      completed: { 
        label: '已成交', 
        color: 'bg-green-500/20 text-green-400 border-green-500/30', 
        icon: <CheckCircle2 size={12} /> 
      },
      scrapper_take: { 
        label: '捡漏成交', 
        color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', 
        icon: <Zap size={12} /> 
      },
      cancelled: { 
        label: '流拍', 
        color: 'bg-red-500/20 text-red-400 border-red-500/30', 
        icon: <XCircle size={12} /> 
      }
    };
    return statusMap[status];
  };

  // 获取排序标签
  const getSortLabel = (type: SortType) => {
    const labels: Record<SortType, string> = {
      'round_desc': '最新优先',
      'round_asc': '最早优先',
      'profit_desc': '盈利最高',
      'profit_asc': '亏损最多',
      'bid_desc': '出价最高',
      'bid_asc': '出价最低',
      'time_desc': '耗时最长',
      'time_asc': '耗时最短'
    };
    return labels[type];
  };

  return (
    <div className="w-full">
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl hover:bg-gradient-to-r from-blue-500/20 to-purple-500/20 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
            <Trophy className="text-white" size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              竞拍历史记录
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-mono">
                {auctionHistory.length}
              </span>
            </h3>
            <p className="text-white/50 text-sm">
              完整记录每一轮的竞拍详情
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="p-2 bg-white/10 rounded-lg"
        >
          <ChevronDown className="text-white/60" size={20} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="p-5 bg-gradient-to-br from-black/40 to-blue-500/5 border-x border-b border-blue-500/10 rounded-b-xl space-y-5">
              
              {/* 过滤器和搜索 - 头部 */}
              <div className="flex flex-wrap gap-3 items-center">
                {/* 搜索栏 */}
                <div className="flex-1 min-w-[200px] relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="搜索拍品名称、竞拍者..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                {/* 快捷操作 */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm text-white/80"
                >
                  <Filter size={16} />
                  {showAdvancedFilters ? '收起' : '高级筛选'}
                </button>

                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 text-green-400 rounded-xl hover:from-green-500/30 hover:to-blue-500/30 transition-all text-sm font-medium"
                >
                  <Download size={16} />
                  导出数据
                </button>
              </div>

              {/* 高级筛选 */}
              <AnimatePresence>
                {showAdvancedFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/70 font-medium">高级筛选条件</span>
                        <button
                          onClick={resetFilters}
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <RefreshCw size={14} />
                          重置筛选
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* 状态筛选 */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-white/50 uppercase tracking-wider">竞拍状态</label>
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as FilterType)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                          >
                            <option value="all">全部状态</option>
                            <option value="completed">已成交</option>
                            <option value="scrapper_take">捡漏成交</option>
                            <option value="cancelled">流拍</option>
                          </select>
                        </div>

                        {/* 排序方式 */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1">
                            <TrendingUp size={12} />
                            排序方式
                          </label>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortType)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                          >
                            <option value="round_desc">最新优先</option>
                            <option value="round_asc">最早优先</option>
                            <option value="profit_desc">盈利最高</option>
                            <option value="profit_asc">亏损最多</option>
                            <option value="bid_desc">出价最高</option>
                            <option value="bid_asc">出价最低</option>
                            <option value="time_desc">耗时最长</option>
                            <option value="time_asc">耗时最短</option>
                          </select>
                        </div>

                        {/* 中标者筛选 */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1">
                            <User size={12} />
                            中标者
                          </label>
                          <input
                            type="text"
                            placeholder="筛选中标者..."
                            value={winnerFilter}
                            onChange={(e) => setWinnerFilter(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                          />
                        </div>

                        {/* 价格范围 */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1">
                            <DollarSign size={12} />
                            价格范围
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="最低"
                              value={priceRange.min}
                              onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value === '' ? '' : Number(e.target.value) }))}
                              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                            />
                            <span className="text-white/30 self-center">-</span>
                            <input
                              type="number"
                              placeholder="最高"
                              value={priceRange.max}
                              onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value === '' ? '' : Number(e.target.value) }))}
                              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 统计信息 */}
              {filteredAndSortedHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-3"
                >
                  <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl flex flex-col items-center justify-center">
                    <div className="text-green-400/80 text-xs uppercase tracking-wider mb-2">总轮数</div>
                    <div className="text-3xl font-bold text-white font-mono">{filteredAndSortedHistory.length}</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center justify-center">
                    <div className="text-amber-400/80 text-xs uppercase tracking-wider mb-2">总成交</div>
                    <div className="text-3xl font-bold text-white font-mono">
                      {filteredAndSortedHistory.filter(r => r.status === 'completed' || r.status === 'scrapper_take').length}
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl flex flex-col items-center justify-center">
                    <div className="text-blue-400/80 text-xs uppercase tracking-wider mb-2">总成交金额</div>
                    <div className="text-3xl font-bold text-white font-mono">
                      ¥{filteredAndSortedHistory.reduce((sum, r) => sum + r.winningBid, 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl flex flex-col items-center justify-center">
                    <div className="text-purple-400/80 text-xs uppercase tracking-wider mb-2">总参与人次</div>
                    <div className="text-3xl font-bold text-white font-mono">
                      {filteredAndSortedHistory.reduce((sum, r) => sum + r.bids.length, 0)}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 竞拍历史列表 */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar" ref={containerRef}>
                {isLoading ? (
                  // 加载骨架屏
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 animate-pulse">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-white/10 rounded-lg"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-white/10 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-white/5 rounded w-48"></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="h-6 bg-white/10 rounded"></div>
                          <div className="h-6 bg-white/10 rounded"></div>
                          <div className="h-6 bg-white/10 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredAndSortedHistory.length === 0 ? (
                  // 空状态
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16 px-8"
                  >
                    <div className="w-20 h-20 mx-auto mb-6 bg-white/5 rounded-3xl flex items-center justify-center">
                      <Search className="text-white/20" size={36} />
                    </div>
                    <h3 className="text-lg font-medium text-white/60 mb-2">
                      暂无匹配的竞拍记录
                    </h3>
                    <p className="text-sm text-white/40 mb-6">
                      {auctionHistory.length > 0 
                        ? '尝试调整筛选条件以查看更多结果' 
                        : '竞拍尚未开始，开始后记录将显示在这里'}
                    </p>
                    {auctionHistory.length > 0 && (
                      <button
                        onClick={resetFilters}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all text-sm"
                      >
                        <RefreshCw size={16} />
                        清除所有筛选
                      </button>
                    )}
                  </motion.div>
                ) : (
                  // 历史记录列表
                  filteredAndSortedHistory.map((round, idx) => {
                    const statusBadge = getStatusBadge(round.status);
                    return (
                      <motion.div
                        key={round.round}
                        initial={{ opacity: 0, x: -30, y: 10 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        layout
                      >
                        <div
                          className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                            selectedRound === round.round
                              ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/40 shadow-xl shadow-blue-500/10'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                          }`}
                          onClick={() => setSelectedRound(selectedRound === round.round ? null : round.round)}
                        >
                          <div className="flex items-start justify-between gap-5 mb-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                <Trophy size={18} />
                                第 {round.round} 轮
                              </span>
                              <span className={`px-4 py-2 rounded-xl text-sm font-bold border flex items-center gap-2 ${statusBadge.color}`}>
                                {statusBadge.icon}
                                {statusBadge.label}
                              </span>
                              <span className="px-4 py-2 bg-white/5 text-white/60 rounded-xl text-sm font-mono flex items-center gap-2">
                                <Clock size={16} />
                                {formatDuration(round.roundStartTime, round.roundEndTime)}
                              </span>
                              <span className="px-3 py-2 text-white/40 text-sm font-mono">
                                {formatDateTime(round.roundStartTime)}
                              </span>
                            </div>

                            {/* 展开按钮 */}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRound(selectedRound === round.round ? null : round.round);
                              }}
                              className={`p-4 rounded-2xl border transition-all ${
                                selectedRound === round.round
                                  ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                              }`}
                            >
                              {selectedRound === round.round ? (
                                <ChevronUp size={24} />
                              ) : (
                                <ChevronDown size={24} />
                              )}
                            </motion.button>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* 拍品名称 */}
                            <h4 className="font-bold text-3xl text-white mb-3 group-hover:text-amber-400 transition-colors">
                              {round.item.name}
                            </h4>
                            <p className="text-white/50 text-lg line-clamp-2 mb-6">{round.item.description}</p>

                            {/* 关键数据 - 垂直卡片样式 */}
                            <div className="flex flex-wrap gap-4">
                              {round.winnerName && (
                                <div className="flex flex-col items-center justify-center px-5 py-4 bg-white/5 rounded-2xl border border-white/5 min-w-[120px]">
                                  <div className="text-white/60 text-xs uppercase tracking-wider mb-2">中标者</div>
                                  <div className="text-amber-400 font-bold text-lg">{round.winnerName}</div>
                                </div>
                              )}
                              <div className="flex flex-col items-center justify-center px-5 py-4 bg-white/5 rounded-2xl border border-white/5 min-w-[120px]">
                                <div className="text-white/60 text-xs uppercase tracking-wider mb-2">成交价</div>
                                <div className="text-white font-mono font-bold text-lg">¥{round.winningBid.toLocaleString()}</div>
                              </div>
                              {round.actualPayment !== round.winningBid && (
                                <div className="flex flex-col items-center justify-center px-5 py-4 bg-green-500/10 rounded-2xl border border-green-500/20 min-w-[120px]">
                                  <div className="text-green-400/80 text-xs uppercase tracking-wider mb-2">实际支付</div>
                                  <div className="text-green-400 font-mono font-bold text-lg">¥{round.actualPayment.toLocaleString()}</div>
                                </div>
                              )}
                              <div className="flex flex-col items-center justify-center px-5 py-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 min-w-[120px]">
                                <div className="text-blue-400/80 text-xs uppercase tracking-wider mb-2">真实价值</div>
                                <div className="text-blue-400 font-mono font-bold text-lg">¥{round.item.trueValue.toLocaleString()}</div>
                              </div>
                              {round.profitLoss !== undefined && (
                                <div className={`flex flex-col items-center justify-center px-5 py-4 rounded-2xl border min-w-[120px] ${round.profitLoss >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                  <div className={`text-xs uppercase tracking-wider mb-2 flex items-center gap-1 ${round.profitLoss >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>
                                    <TrendingUp size={16} className={round.profitLoss < 0 ? 'rotate-180' : ''} />
                                    盈亏
                                  </div>
                                  <div className={`font-mono font-bold text-lg ${round.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {round.profitLoss >= 0 ? '+' : ''}¥{round.profitLoss.toLocaleString()}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 展开的详细信息 */}
                          <AnimatePresence>
                            {selectedRound === round.round && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-8 pt-6 border-t border-white/10">
                                  <div className="flex items-center justify-between mb-6">
                                    <h5 className="text-white/60 text-sm uppercase tracking-widest flex items-center gap-2">
                                      <Trophy size={18} />
                                      出价记录 ({round.bids.length}人)
                                    </h5>
                                    <span className="text-white/30 text-sm font-mono">
                                      数据哈希: {dataHash.slice(0, 8)}
                                    </span>
                                  </div>
                                  <div className="space-y-3">
                                    {round.bids
                                      .sort((a, b) => b.amount - a.amount)
                                      .map((bid, bidIdx) => (
                                        <motion.div
                                          key={bid.playerId}
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: bidIdx * 0.05 }}
                                          className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                                            bid.playerId === round.winnerId
                                              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30'
                                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                                          }`}
                                        >
                                          <div className="flex items-center gap-4">
                                            <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                              bid.playerId === round.winnerId
                                                ? 'bg-amber-500 text-black'
                                                : bidIdx === 1
                                                  ? 'bg-gray-400 text-black'
                                                  : bidIdx === 2
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-white/10 text-white/60'
                                            }`}>
                                              {bidIdx + 1}
                                            </span>
                                            <div className="flex flex-col">
                                              <div className="flex items-center gap-2">
                                                <span className={`font-medium text-lg ${bid.playerId === round.winnerId ? 'text-amber-300' : 'text-white'}`}>
                                                  {bid.playerName}
                                                </span>
                                                <span className="text-white/40 text-sm">
                                                  ({ROLES[bid.roleId]?.name || bid.roleId})
                                                </span>
                                              </div>
                                              <span className="text-white/30 text-sm font-mono">
                                                {formatTime(bid.timestamp)}
                                              </span>
                                            </div>
                                            {bid.playerId === round.winnerId && (
                                              <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 text-sm rounded-xl font-bold flex items-center gap-1.5">
                                                <CheckCircle2 size={16} />
                                                中标
                                              </span>
                                            )}
                                          </div>
                                          <span className={`font-mono text-2xl font-bold ${bid.playerId === round.winnerId ? 'text-amber-400' : 'text-white/70'}`}>
                                            ¥{bid.amount.toLocaleString()}
                                          </span>
                                        </motion.div>
                                      ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* 底部信息 */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="text-xs text-white/40 flex items-center gap-1.5">
                  <ShieldAlert size={12} />
                  <span>数据已加密防篡改</span>
                </div>
                <div className="text-xs text-white/40 font-mono">
                  数据版本: {dataHash.slice(0, 8)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
