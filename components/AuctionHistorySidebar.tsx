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
  Trophy
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { AuctionRoundHistory } from '@/lib/game';
import { Button, Badge, Input } from './ui';

// 操作类型定义
type OperationType = 'auction_start' | 'bid_submit' | 'auction_end' | 'winner_award' | 'item_transfer' | 'refund' | 'interest' | 'scrapper_take';

// 操作记录接口
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

// 操作类型配置
const OPERATION_TYPE_CONFIG: Record<OperationType, { label: string; color: string; icon: React.ElementType }> = {
  auction_start: { label: '竞拍开始', color: 'blue', icon: Gavel },
  bid_submit: { label: '提交出价', color: 'amber', icon: Gavel },
  auction_end: { label: '竞拍结束', color: 'purple', icon: CheckCircle2 },
  winner_award: { label: '中标', color: 'green', icon: Trophy },
  item_transfer: { label: '物品转让', color: 'cyan', icon: Eye },
  refund: { label: '退款', color: 'yellow', icon: TrendingUp },
  interest: { label: '利息', color: 'emerald', icon: TrendingUp },
  scrapper_take: { label: '捡漏', color: 'orange', icon: AlertCircle }
};

// 操作状态配置
const STATUS_CONFIG = {
  success: { label: '成功', color: 'green', icon: CheckCircle2 },
  failed: { label: '失败', color: 'red', icon: XCircle },
  pending: { label: '处理中', color: 'amber', icon: Clock }
};

// 将竞拍历史转换为操作记录
function convertToOperationRecords(auctionHistory: AuctionRoundHistory[]): OperationRecord[] {
  const records: OperationRecord[] = [];

  auctionHistory.forEach((roundHistory) => {
    // 竞拍开始记录
    records.push({
      id: `round-${roundHistory.round}-start`,
      timestamp: roundHistory.roundStartTime,
      operationType: 'auction_start',
      operationObject: roundHistory.item.name,
      operationStatus: 'success',
      remarks: `第 ${roundHistory.round} 轮竞拍开始，拍品 ${roundHistory.item.name}`,
      round: roundHistory.round,
      details: { baseValue: roundHistory.item.baseValue }
    });

    // 每个出价记录
    roundHistory.bids.forEach((bid) => {
      records.push({
        id: `round-${roundHistory.round}-bid-${bid.playerId}`,
        timestamp: bid.timestamp,
        operationType: 'bid_submit',
        operationObject: roundHistory.item.name,
        operationStatus: 'success',
        remarks: `${bid.playerName} 出价 ¥${bid.amount.toLocaleString()}`,
        round: roundHistory.round,
        playerName: bid.playerName,
        amount: bid.amount,
        details: { roleId: bid.roleId }
      });
    });

    // 竞拍结束记录
    records.push({
      id: `round-${roundHistory.round}-end`,
      timestamp: roundHistory.roundEndTime,
      operationType: 'auction_end',
      operationObject: roundHistory.item.name,
      operationStatus: 'success',
      remarks: `第 ${roundHistory.round} 轮竞拍结束`,
      round: roundHistory.round,
      details: { status: roundHistory.status }
    });

    // 中标者记录
    if (roundHistory.winnerId && roundHistory.winnerName) {
      records.push({
        id: `round-${roundHistory.round}-winner`,
        timestamp: roundHistory.roundEndTime + 100,
        operationType: 'winner_award',
        operationObject: roundHistory.item.name,
        operationStatus: 'success',
        remarks: `${roundHistory.winnerName} 以 ¥${roundHistory.actualPayment.toLocaleString()} 中标`,
        round: roundHistory.round,
        playerName: roundHistory.winnerName,
        amount: roundHistory.actualPayment,
        details: { winningBid: roundHistory.winningBid, trueValue: roundHistory.item.trueValue, profitLoss: roundHistory.profitLoss }
      });

      // 物品转让记录
      records.push({
        id: `round-${roundHistory.round}-transfer`,
        timestamp: roundHistory.roundEndTime + 200,
        operationType: 'item_transfer',
        operationObject: roundHistory.item.name,
        operationStatus: 'success',
        remarks: `拍品 ${roundHistory.item.name} 已转让给 ${roundHistory.winnerName}`,
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
        remarks: `捡漏客获得流拍物品 ${roundHistory.item.name}，价格为真实价值的50%`,
        round: roundHistory.round,
        details: { trueValue: roundHistory.item.trueValue }
      });
    }
  });

  // 按时间倒序排列
  return records.sort((a, b) => b.timestamp - a.timestamp);
}

// 格式化时间
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 格式化日期
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

// 状态徽章组件
function StatusBadge({ status }: { status: 'success' | 'failed' | 'pending' }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
      status === 'success' ? 'bg-green-500/20 text-green-400' :
      status === 'failed' ? 'bg-red-500/20 text-red-400' :
      'bg-amber-500/20 text-amber-400'
    }`}>
      <Icon size={12} />
      {config.label}
    </div>
  );
}

// 操作类型徽章组件
function OperationTypeBadge({ type }: { type: OperationType }) {
  const config = OPERATION_TYPE_CONFIG[type];
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      type === 'auction_start' ? 'bg-blue-500/20 text-blue-400' :
      type === 'bid_submit' ? 'bg-amber-500/20 text-amber-400' :
      type === 'auction_end' ? 'bg-purple-500/20 text-purple-400' :
      type === 'winner_award' ? 'bg-green-500/20 text-green-400' :
      type === 'item_transfer' ? 'bg-cyan-500/20 text-cyan-400' :
      type === 'refund' ? 'bg-yellow-500/20 text-yellow-400' :
      type === 'interest' ? 'bg-emerald-500/20 text-emerald-400' :
      'bg-orange-500/20 text-orange-400'
    }`}>
      <Icon size={12} />
      {config.label}
    </div>
  );
}

// 排序图标组件 - 移到外部以避免在渲染时创建
function SortIcon({ columnKey, sortConfig }: { 
  columnKey: keyof OperationRecord; 
  sortConfig: { key: keyof OperationRecord; direction: 'asc' | 'desc' }; 
}) {
  if (sortConfig.key !== columnKey) return null;
  return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
}

// 详情弹窗组件
function DetailModal({ record, onClose }: { record: OperationRecord; onClose: () => void }) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-gradient-to-b from-white/10 to-black/40 border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">操作详情</h3>
              <div className="flex items-center gap-2">
                <OperationTypeBadge type={record.operationType} />
                <StatusBadge status={record.operationStatus} />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white/60 hover:text-white">
              ×
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-black/30 rounded-xl">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">时间</div>
                <div className="font-mono text-sm text-white">{formatTime(record.timestamp)}</div>
              </div>
              {record.round !== undefined && (
                <div className="p-3 bg-black/30 rounded-xl">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">轮次</div>
                  <div className="font-mono text-sm text-amber-500">第 {record.round} 轮</div>
                </div>
              )}
            </div>

            <div className="p-3 bg-black/30 rounded-xl">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">操作对象</div>
              <div className="text-sm text-white">{record.operationObject}</div>
            </div>

            <div className="p-3 bg-black/30 rounded-xl">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">备注</div>
              <div className="text-sm text-white/80">{record.remarks}</div>
            </div>

            {record.playerName && (
              <div className="p-3 bg-black/30 rounded-xl">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">参与者</div>
                <div className="text-sm text-white flex items-center gap-2">
                  <User size={14} />
                  {record.playerName}
                </div>
              </div>
            )}

            {record.amount !== undefined && (
              <div className="p-3 bg-black/30 rounded-xl">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">金额</div>
                <div className="font-mono text-lg text-amber-500">¥{record.amount.toLocaleString()}</div>
              </div>
            )}

            {record.details && Object.keys(record.details).length > 0 && (
              <div className="p-3 bg-black/30 rounded-xl">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">额外信息</div>
                <div className="space-y-1 font-mono text-xs">
                  {Object.entries(record.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-white/60">
                      <span>{key}:</span>
                      <span className="text-white/80">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function AuctionHistorySidebar({ auctionHistory }: { auctionHistory: AuctionRoundHistory[] }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof OperationRecord; direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<OperationRecord | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 转换记录
  const operationRecords = useMemo(() => convertToOperationRecords(auctionHistory), [auctionHistory]);

  // 过滤和排序记录，并管理分页
  const { filteredAndSortedRecords, totalPages, paginatedRecords } = useMemo(() => {
    let filtered = [...operationRecords];

    // 搜索过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.operationObject.toLowerCase().includes(searchLower) ||
          record.remarks.toLowerCase().includes(searchLower) ||
          (record.playerName?.toLowerCase().includes(searchLower)) ||
          record.operationType.toLowerCase().includes(searchLower)
      );
    }

    // 排序
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    // 计算总页数
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    
    // 处理分页
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedRecords = filtered.slice(start, start + itemsPerPage);

    return { filteredAndSortedRecords: filtered, totalPages, paginatedRecords };
  }, [operationRecords, searchTerm, sortConfig, currentPage, itemsPerPage]);

  // 处理排序点击
  const handleSort = (key: keyof OperationRecord) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortConfig({ key, direction: 'desc' });
    }
    setCurrentPage(1);
  };

  // 导出功能
  const handleExport = () => {
    const csvContent = [
      ['时间', '操作类型', '操作对象', '操作状态', '备注', '轮次', '参与者', '金额'].join(','),
      ...filteredAndSortedRecords.map(record => [
        formatTime(record.timestamp),
        OPERATION_TYPE_CONFIG[record.operationType].label,
        record.operationObject,
        STATUS_CONFIG[record.operationStatus].label,
        record.remarks,
        record.round || '',
        record.playerName || '',
        record.amount || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auction-history-${formatDate(Date.now())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 收起状态 - 只显示关键信息
  if (!isExpanded) {
    return (
      <motion.div
        initial={{ width: 60 }}
        animate={{ width: 60 }}
        className="bg-white/5 border border-white/10 rounded-xl h-full flex flex-col"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="p-3 justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-t-xl"
        >
          <ChevronRight size={20} />
        </Button>
        <div className="flex-1 flex flex-col items-center py-4 gap-4">
          <PanelLeft size={20} className="text-amber-500" />
          <div className="text-center">
            <div className="text-amber-500 font-bold text-lg">{operationRecords.length}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest">记录</div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: '100%' }}
      animate={{ width: '100%' }}
      className="bg-white/5 border border-white/10 rounded-xl flex flex-col h-full min-h-[400px]"
    >
      {/* 头部 */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft size={16} />
            </Button>
            <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <Filter size={14} />
              操作历史记录
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="text-white/60 hover:text-white hover:bg-white/10 text-xs"
          >
            <Download size={14} />
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          <Input
            type="text"
            placeholder="搜索记录..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 bg-black/30 border-white/10 text-sm placeholder:text-white/30 w-full"
          />
        </div>
      </div>

      {/* 表格内容 */}
      <div className="flex-1 overflow-auto">
        {paginatedRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-white/40">
            <Info size={40} className="mb-4 opacity-50" />
            <div className="text-sm font-medium">暂无记录</div>
            <div className="text-xs mt-1">游戏开始后将显示操作历史</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/30 sticky top-0 z-10">
                <tr>
                  <th
                    className="px-3 py-3 cursor-pointer hover:bg-white/5 select-none"
                    onClick={() => handleSort('timestamp')}
                  >
                    <div className="flex items-center gap-1 text-white/60 uppercase tracking-widest font-bold text-[10px]">
                      <Clock size={12} />
                      时间
                      <SortIcon columnKey="timestamp" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:bg-white/5 select-none"
                    onClick={() => handleSort('operationType')}
                  >
                    <div className="flex items-center gap-1 text-white/60 uppercase tracking-widest font-bold text-[10px]">
                      操作类型
                      <SortIcon columnKey="operationType" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:bg-white/5 select-none"
                    onClick={() => handleSort('operationObject')}
                  >
                    <div className="flex items-center gap-1 text-white/60 uppercase tracking-widest font-bold text-[10px]">
                      操作对象
                      <SortIcon columnKey="operationObject" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:bg-white/5 select-none"
                    onClick={() => handleSort('operationStatus')}
                  >
                    <div className="flex items-center gap-1 text-white/60 uppercase tracking-widest font-bold text-[10px]">
                      状态
                      <SortIcon columnKey="operationStatus" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th className="px-3 py-3">
                    <div className="text-white/60 uppercase tracking-widest font-bold text-[10px]">备注</div>
                  </th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedRecords.map((record) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-3 py-3 font-mono text-white/60">
                      {formatTime(record.timestamp)}
                    </td>
                    <td className="px-3 py-3">
                      <OperationTypeBadge type={record.operationType} />
                    </td>
                    <td className="px-3 py-3 text-white/80 max-w-[120px] truncate" title={record.operationObject}>
                      {record.operationObject}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={record.operationStatus} />
                    </td>
                    <td className="px-3 py-3 text-white/60 max-w-[200px] truncate" title={record.remarks}>
                      {record.remarks}
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRecord(record)}
                        className="p-1 opacity-0 group-hover:opacity-100 text-white/40 hover:text-white hover:bg-white/10 transition-opacity"
                      >
                        <Eye size={14} />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-[10px] text-white/40">
            显示 {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedRecords.length)} 共 {filteredAndSortedRecords.length} 条
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="text-xs"
            >
              上一页
            </Button>
            <div className="text-xs text-white/60 font-mono">
              {currentPage} / {totalPages}
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="text-xs"
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
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
