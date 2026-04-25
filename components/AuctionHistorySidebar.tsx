'use client';

import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  Clock,
  Gavel,
  CheckCircle2,
  XCircle,
  User,
  Eye,
  Download,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  PanelLeft,
  Info,
  Trophy,
  X,
  FileText
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { AuctionRoundHistory } from '@/lib/game';
import { Button, Input } from './ui';

// ==========================================
// 1. 类型与配置 (Types & Configs)
// ==========================================

type OperationType = 'auction_start' | 'bid_submit' | 'auction_end' | 'winner_award' | 'item_transfer' | 'refund' | 'interest' | 'scrapper_take';

interface OperationRecord {
  id: string;
  timestamp: number;
  operationType: OperationType;
  operationObject: string;
  operationStatus: 'success' | 'failed' | 'pending';
  remarks: string;
  round?: number;
  playerName?: string;
  amount?: number;
  details?: Record<string, unknown>;
}

const OPERATION_TYPE_CONFIG: Record<OperationType, { label: string; icon: React.ElementType; theme: string }> = {
  auction_start: { label: '竞拍开始', icon: Gavel, theme: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  bid_submit: { label: '提交出价', icon: Gavel, theme: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  auction_end: { label: '竞拍结束', icon: CheckCircle2, theme: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  winner_award: { label: '中标', icon: Trophy, theme: 'text-green-400 bg-green-500/10 border-green-500/20' },
  item_transfer: { label: '物品转让', icon: Eye, theme: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  refund: { label: '退款', icon: TrendingUp, theme: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  interest: { label: '利息', icon: TrendingUp, theme: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  scrapper_take: { label: '捡漏', icon: AlertCircle, theme: 'text-orange-400 bg-orange-500/10 border-orange-500/20' }
};

const STATUS_CONFIG = {
  success: { label: '成功', icon: CheckCircle2, theme: 'text-green-400 bg-green-500/10 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]' },
  failed: { label: '失败', icon: XCircle, theme: 'text-red-400 bg-red-500/10 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' },
  pending: { label: '处理中', icon: Clock, theme: 'text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' }
};

// ==========================================
// 2. 工具函数 (Utilities)
// ==========================================

function convertToOperationRecords(auctionHistory: AuctionRoundHistory[]): OperationRecord[] {
  const records: OperationRecord[] =[];

  auctionHistory.forEach((roundHistory) => {
    records.push({
      id: `round-${roundHistory.round}-start`,
      timestamp: roundHistory.roundStartTime,
      operationType: 'auction_start',
      operationObject: roundHistory.item.name,
      operationStatus: 'success',
      remarks: `第 ${roundHistory.round} 轮竞拍开始`,
      round: roundHistory.round,
      details: { baseValue: roundHistory.item.baseValue }
    });

    roundHistory.bids.forEach((bid) => {
      records.push({
        id: `round-${roundHistory.round}-bid-${bid.playerId}`,
        timestamp: bid.timestamp,
        operationType: 'bid_submit',
        operationObject: roundHistory.item.name,
        operationStatus: 'success',
        remarks: `${bid.playerName} 提交了暗标`,
        round: roundHistory.round,
        playerName: bid.playerName,
        amount: bid.amount,
        details: { roleId: bid.roleId }
      });
    });

    records.push({
      id: `round-${roundHistory.round}-end`,
      timestamp: roundHistory.roundEndTime,
      operationType: 'auction_end',
      operationObject: roundHistory.item.name,
      operationStatus: 'success',
      remarks: `第 ${roundHistory.round} 轮博弈锁定并结束`,
      round: roundHistory.round,
      details: { status: roundHistory.status }
    });

    if (roundHistory.winnerId && roundHistory.winnerName) {
      records.push({
        id: `round-${roundHistory.round}-winner`,
        timestamp: roundHistory.roundEndTime + 100,
        operationType: 'winner_award',
        operationObject: roundHistory.item.name,
        operationStatus: 'success',
        remarks: `${roundHistory.winnerName} 赢得了竞拍`,
        round: roundHistory.round,
        playerName: roundHistory.winnerName,
        amount: roundHistory.actualPayment,
        details: { winningBid: roundHistory.winningBid, trueValue: roundHistory.item.trueValue, profitLoss: roundHistory.profitLoss }
      });

      records.push({
        id: `round-${roundHistory.round}-transfer`,
        timestamp: roundHistory.roundEndTime + 200,
        operationType: 'item_transfer',
        operationObject: roundHistory.item.name,
        operationStatus: 'success',
        remarks: `拍品所有权已转移至 ${roundHistory.winnerName}`,
        round: roundHistory.round,
        playerName: roundHistory.winnerName,
        details: { trueValue: roundHistory.item.trueValue }
      });
    } else if (roundHistory.status === 'scrapper_take') {
      records.push({
        id: `round-${roundHistory.round}-scrapper`,
        timestamp: roundHistory.roundEndTime + 150,
        operationType: 'scrapper_take',
        operationObject: roundHistory.item.name,
        operationStatus: 'success',
        remarks: `流拍，捡漏客触发被动回收`,
        round: roundHistory.round,
        details: { trueValue: roundHistory.item.trueValue }
      });
    }
  });

  return records.sort((a, b) => b.timestamp - a.timestamp);
}

const formatTime = (timestamp: number) => 
  new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(timestamp);

const formatDate = (timestamp: number) => 
  new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(timestamp).replace(/\//g, '-');

// ==========================================
// 3. 子组件 (Sub Components)
// ==========================================

function StatusBadge({ status }: { status: 'success' | 'failed' | 'pending' }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-widest ${config.theme}`}>
      <Icon size={12} />
      {config.label}
    </div>
  );
}

function OperationTypeBadge({ type }: { type: OperationType }) {
  const config = OPERATION_TYPE_CONFIG[type];
  const Icon = config.icon;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-medium tracking-wide ${config.theme}`}>
      <Icon size={12} />
      {config.label}
    </div>
  );
}

function SortIcon({ columnKey, sortConfig }: { 
  columnKey: keyof OperationRecord; 
  sortConfig: { key: keyof OperationRecord; direction: 'asc' | 'desc' }; 
}) {
  if (sortConfig.key !== columnKey) return <ChevronDown size={14} className="opacity-20 group-hover:opacity-50 transition-opacity" />;
  return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-amber-500" /> : <ChevronDown size={14} className="text-amber-500" />;
}

function DetailModal({ record, onClose }: { record: OperationRecord; onClose: () => void }) {
  
  // 监听 ESC 键关闭弹窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none" />

        <div className="flex items-start justify-between mb-6 relative z-10 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FileText size={18} className="text-amber-500" /> 操作流水详情
            </h3>
            <div className="flex items-center gap-2">
              <OperationTypeBadge type={record.operationType} />
              <StatusBadge status={record.operationStatus} />
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Clock size={12}/> 记录时间</div>
              <div className="font-mono text-sm text-white/90">{formatTime(record.timestamp)}</div>
            </div>
            {record.round !== undefined ? (
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-1"><TrendingUp size={12}/> 所属轮次</div>
                <div className="font-mono text-sm text-amber-500 font-bold">Round {record.round}</div>
              </div>
            ) : <div className="p-3 bg-white/5 border border-white/5 rounded-xl" />}
          </div>

          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-1"><PanelLeft size={12}/> 操作对象</div>
            <div className="text-sm text-white font-medium">{record.operationObject}</div>
          </div>

          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Info size={12}/> 备注说明</div>
            <div className="text-sm text-white/70 leading-relaxed">{record.remarks}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {record.playerName && (
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-1"><User size={12}/> 参与者节点</div>
                <div className="text-sm text-white font-medium">{record.playerName}</div>
              </div>
            )}
            {record.amount !== undefined && (
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5">触发金额</div>
                <div className="font-mono text-lg text-amber-400 font-bold">¥{record.amount.toLocaleString()}</div>
              </div>
            )}
          </div>

          {record.details && Object.keys(record.details).length > 0 && (
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl shadow-inner">
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-bold">Payload Data</div>
              <div className="space-y-1.5 font-mono text-[11px]">
                {Object.entries(record.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center border-b border-white/5 pb-1 last:border-0 last:pb-0">
                    <span className="text-white/40">{key}</span>
                    <span className="text-blue-300/80">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// 4. 主组件 (Main Component)
// ==========================================

export default function AuctionHistorySidebar({ auctionHistory }: { auctionHistory: AuctionRoundHistory[] }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const[searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof OperationRecord; direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const[selectedRecord, setSelectedRecord] = useState<OperationRecord | null>(null);
  const itemsPerPage = 12;

  const operationRecords = useMemo(() => convertToOperationRecords(auctionHistory), [auctionHistory]);

  const { filteredAndSortedRecords, totalPages, paginatedRecords } = useMemo(() => {
    let filtered =[...operationRecords];

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.operationObject.toLowerCase().includes(searchLower) ||
          record.remarks.toLowerCase().includes(searchLower) ||
          (record.playerName?.toLowerCase().includes(searchLower)) ||
          record.operationType.toLowerCase().includes(searchLower)
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedRecords = filtered.slice(start, start + itemsPerPage);

    return { filteredAndSortedRecords: filtered, totalPages: Math.max(1, totalPages), paginatedRecords };
  }, [operationRecords, searchTerm, sortConfig, currentPage]);

  const handleSort = (key: keyof OperationRecord) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
    setCurrentPage(1);
  };

  const handleExport = () => {
    const csvContent = [['时间', '操作类型', '操作对象', '操作状态', '备注', '轮次', '参与者', '金额'].join(','),
      ...filteredAndSortedRecords.map(record =>[
        formatTime(record.timestamp),
        OPERATION_TYPE_CONFIG[record.operationType].label,
        record.operationObject,
        STATUS_CONFIG[record.operationStatus].label,
        `"${record.remarks}"`, // 用引号包裹防止由于内容含有逗号而破坏CSV格式
        record.round || '',
        record.playerName || '',
        record.amount || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // 加入 BOM 以防 Excel 中文乱码
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auction-syslog-${formatDate(Date.now())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      animate={{ 
        width: isExpanded ? '100%' : '60px',
        minHeight: isExpanded ? '400px' : '200px'
      }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className={`bg-black/40 border border-white/10 rounded-2xl flex flex-col h-full overflow-hidden ${isExpanded ? 'shadow-lg backdrop-blur-md' : ''}`}
    >
      {/* 收起状态视图 */}
      {!isExpanded ? (
        <div className="flex flex-col h-full py-2">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(true)}
            className="mx-auto p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <ChevronRight size={20} />
          </Button>
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <PanelLeft size={18} className="text-amber-500/50" />
            <div className="text-center writing-vertical-rl rotate-180">
              <span className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">系统日志</span>
              <span className="text-amber-500 font-mono font-bold ml-2">{operationRecords.length}</span>
            </div>
          </div>
        </div>
      ) : (
        // 展开状态视图
        <div className="flex flex-col h-full w-full min-w-[300px]">
          {/* Header */}
          <div className="p-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 -ml-1 text-white/40 hover:text-white hover:bg-white/10"
                >
                  <ChevronLeft size={18} />
                </Button>
                <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <Filter size={14} className="text-amber-500" />
                  协议操作流水 (Log)
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="text-xs py-1 px-3 border-white/10 hover:bg-white/10 flex items-center gap-1.5"
              >
                <Download size={12} />
                <span className="hidden sm:inline">导出 CSV</span>
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <Input
                type="text"
                placeholder="检索对象、备注或参与者..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-9 bg-black/40 border-white/10 text-sm placeholder:text-white/30 w-full focus:border-amber-500/50 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors focus:outline-none"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            {paginatedRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-white/30">
                <Info size={40} className="mb-4 opacity-30" />
                <div className="text-sm font-bold tracking-widest uppercase">检索结果为空</div>
                <div className="text-xs mt-1 opacity-70">等待节点产生新的数据块...</div>
              </div>
            ) : (
              <div className="min-w-[600px] w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#111] sticky top-0 z-10 shadow-sm border-b border-white/10">
                    <tr>
                      {([
                        { key: 'timestamp', label: '记录时间', icon: Clock },
                        { key: 'operationType', label: '指令类型' },
                        { key: 'operationObject', label: '操作对象' },
                        { key: 'operationStatus', label: '状态' },
                      ] as const).map((col) => (
                        <th
                          key={col.key}
                          className="px-4 py-3 cursor-pointer hover:bg-white/5 select-none transition-colors group first:pl-6"
                          onClick={() => handleSort(col.key)}
                        >
                          <div className="flex items-center gap-1.5 text-white/50 uppercase tracking-widest font-bold text-[10px]">
                            {'icon' in col && col.icon && <col.icon size={12} />}
                            {col.label}
                            <SortIcon columnKey={col.key} sortConfig={sortConfig} />
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3">
                        <div className="text-white/50 uppercase tracking-widest font-bold text-[10px]">负载/备注</div>
                      </th>
                      <th className="px-4 py-3 w-12 pr-6"></th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence mode="popLayout">
                      {paginatedRecords.map((record) => (
                        <motion.tr
                          layout
                          key={record.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="hover:bg-white/5 transition-colors group"
                        >
                          <td className="px-4 py-3 pl-6 font-mono text-white/50 whitespace-nowrap">
                            {formatTime(record.timestamp)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <OperationTypeBadge type={record.operationType} />
                          </td>
                          <td className="px-4 py-3 text-white/80 max-w-[120px] truncate font-medium" title={record.operationObject}>
                            {record.operationObject}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={record.operationStatus} />
                          </td>
                          <td className="px-4 py-3 text-white/50 max-w-[200px] truncate text-[11px]" title={record.remarks}>
                            {record.remarks}
                          </td>
                          <td className="px-4 py-3 pr-6 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRecord(record)}
                              className="p-1.5 opacity-0 group-hover:opacity-100 text-white/40 hover:text-amber-500 hover:bg-amber-500/10 transition-all focus:opacity-100"
                              title="查看 Payload"
                            >
                              <Eye size={14} />
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-white/10 flex items-center justify-between bg-black/40">
              <div className="text-[10px] text-white/40 font-mono">
                Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedRecords.length)} / {filteredAndSortedRecords.length}
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 rounded-md p-1 border border-white/5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1 text-white/50 hover:text-white disabled:opacity-30 disabled:hover:text-white/50 transition-colors rounded"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="text-[10px] text-white/70 font-mono px-2 font-bold select-none">
                  {currentPage} <span className="text-white/30 mx-0.5">/</span> {totalPages}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1 text-white/50 hover:text-white disabled:opacity-30 disabled:hover:text-white/50 transition-colors rounded"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 弹窗在顶层渲染 */}
      <AnimatePresence>
        {selectedRecord && (
          <DetailModal
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}