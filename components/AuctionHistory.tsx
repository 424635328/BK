'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuctionRoundHistory, ROLES } from '@/lib/game';
import { Download, Filter, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface AuctionHistoryProps {
  auctionHistory: AuctionRoundHistory[];
}

type FilterType = 'all' | 'completed' | 'scrapper_take' | 'cancelled';
type SortType = 'round_asc' | 'round_desc' | 'profit_asc' | 'profit_desc';

export default function AuctionHistory({ auctionHistory }: AuctionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('round_desc');
  const [searchTerm, setSearchTerm] = useState('');

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
        default:
          return b.round - a.round;
      }
    });

    return filtered;
  }, [auctionHistory, statusFilter, sortBy, searchTerm]);

  // 导出为 JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(auctionHistory, null, 2);
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

  // 获取状态标签
  const getStatusBadge = (status: AuctionRoundHistory['status']) => {
    const statusMap: Record<AuctionRoundHistory['status'], { label: string; color: string }> = {
      completed: { label: '已成交', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      scrapper_take: { label: '捡漏成交', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      cancelled: { label: '流拍', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
    };
    return statusMap[status];
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-xl">📜</span>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-white">竞拍历史记录</h3>
            <p className="text-white/50 text-sm">共 {auctionHistory.length} 轮竞拍</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="text-white/50" size={24} />
        ) : (
          <ChevronDown className="text-white/50" size={24} />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-black/30 border-x border-b border-white/10 rounded-b-xl space-y-4">
              {/* 过滤器和搜索 */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search size={16} className="text-white/40" />
                  <input
                    type="text"
                    placeholder="搜索拍品、参与者..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterType)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="all">全部状态</option>
                  <option value="completed">已成交</option>
                  <option value="scrapper_take">捡漏成交</option>
                  <option value="cancelled">流拍</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="round_desc">最新优先</option>
                  <option value="round_asc">最早优先</option>
                  <option value="profit_desc">盈利最高</option>
                  <option value="profit_asc">亏损最多</option>
                </select>

                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all text-sm"
                >
                  <Download size={16} />
                  导出
                </button>
              </div>

              {/* 竞拍历史列表 */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredAndSortedHistory.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    暂无竞拍记录
                  </div>
                ) : (
                  filteredAndSortedHistory.map((round, idx) => {
                    const statusBadge = getStatusBadge(round.status);
                    return (
                      <motion.div
                        key={round.round}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <div
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            selectedRound === round.round
                              ? 'bg-blue-500/10 border-blue-500/40'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                          onClick={() => setSelectedRound(selectedRound === round.round ? null : round.round)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-bold">
                                  第 {round.round} 轮
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${statusBadge.color}`}>
                                  {statusBadge.label}
                                </span>
                                <span className="text-white/50 text-xs">
                                  {formatDuration(round.roundStartTime, round.roundEndTime)}
                                </span>
                              </div>
                              <h4 className="mt-2 font-bold text-white truncate">{round.item.name}</h4>
                              <p className="text-white/50 text-sm truncate">{round.item.description}</p>

                              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                                {round.winnerName && (
                                  <div>
                                    <span className="text-white/50">中标者：</span>
                                    <span className="text-amber-400 font-bold">{round.winnerName}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-white/50">出价：</span>
                                  <span className="text-white font-mono">¥{round.winningBid.toLocaleString()}</span>
                                </div>
                                {round.actualPayment !== round.winningBid && (
                                  <div>
                                    <span className="text-white/50">实付：</span>
                                    <span className="text-green-400 font-mono">¥{round.actualPayment.toLocaleString()}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-white/50">真实价值：</span>
                                  <span className="text-blue-400 font-mono">¥{round.item.trueValue.toLocaleString()}</span>
                                </div>
                                {round.profitLoss !== undefined && (
                                  <div>
                                    <span className="text-white/50">盈亏：</span>
                                    <span className={`font-mono font-bold ${round.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {round.profitLoss >= 0 ? '+' : ''}¥{round.profitLoss.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRound(selectedRound === round.round ? null : round.round);
                              }}
                            >
                              {selectedRound === round.round ? (
                                <ChevronUp className="text-white/50" size={20} />
                              ) : (
                                <ChevronDown className="text-white/50" size={20} />
                              )}
                            </button>
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
                                <div className="mt-4 pt-4 border-t border-white/10">
                                  <h5 className="text-white/60 text-xs uppercase tracking-widest mb-3">
                                    出价记录 ({round.bids.length}人)
                                  </h5>
                                  <div className="space-y-2">
                                    {round.bids
                                      .sort((a, b) => b.amount - a.amount)
                                      .map((bid, bidIdx) => (
                                        <div
                                          key={bid.playerId}
                                          className={`flex items-center justify-between p-2 rounded border ${
                                            bid.playerId === round.winnerId
                                              ? 'bg-amber-500/10 border-amber-500/30'
                                              : 'bg-white/5 border-white/10'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white font-bold">
                                              {bidIdx + 1}
                                            </span>
                                            <div>
                                              <span className="text-white font-medium">{bid.playerName}</span>
                                              <span className="text-white/40 text-xs ml-2">
                                                ({ROLES[bid.roleId]?.name || bid.roleId})
                                              </span>
                                            </div>
                                            {bid.playerId === round.winnerId && (
                                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded font-bold">
                                                中标
                                              </span>
                                            )}
                                          </div>
                                          <span className="font-mono text-amber-400 font-bold">
                                            ¥{bid.amount.toLocaleString()}
                                          </span>
                                        </div>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
