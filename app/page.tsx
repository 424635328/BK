'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { callRelay } from '@/lib/api';
import { 
  DEFAULT_ROOM_CONFIG, 
  normalizeRoomConfig, 
  ROLES, 
  RoomConfig, 
  GAME_ITEMS 
} from '@/lib/game';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '@/components/ui/Toast';
import { Button, Input, Card, FadeIn, SlideIn, ScaleIn, Badge } from '@/components/ui';
import { 
  User, Key, ChevronRight, ChevronLeft, Settings, HelpCircle, 
  X, Gavel, TrendingUp, Shuffle, RefreshCw, Zap, Shield, Award 
} from 'lucide-react';

interface FormErrors {
  name?: string;
  joinCode?: string;
}

interface PresetMode {
  name: string;
  description: string;
  config: Partial<RoomConfig>;
  icon: React.ReactNode;
}

const PRESETS: PresetMode[] =[
  {
    name: '快速模式',
    description: '快速游戏，适合新手',
    icon: <Zap size={16} />,
    config: {
      biddingSeconds: 20,
      rounds: 3,
      initialBalance: 3000,
      lockSeconds: 2,
      revealSeconds: 5,
    },
  },
  {
    name: '标准模式',
    description: '平衡的游戏体验',
    icon: <Shield size={16} />,
    config: {
      biddingSeconds: 45,
      rounds: 5,
      initialBalance: 5000,
      lockSeconds: 2,
      revealSeconds: 7,
    },
  },
  {
    name: '疯狂模式',
    description: '更多轮数，更多资金！',
    icon: <Award size={16} />,
    config: {
      biddingSeconds: 60,
      rounds: 10,
      initialBalance: 10000,
      lockSeconds: 3,
      revealSeconds: 10,
    },
  },
];

// 独立抽离：规则手册弹窗组件
function RulesModal({ onClose }: { onClose: () => void }) {
  const roleEntries = useMemo(() => 
    Object.entries(ROLES) as Array<[keyof typeof ROLES, (typeof ROLES)[keyof typeof ROLES]]>,[]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
    >
      <ScaleIn>
        <div 
          className="w-full max-w-2xl bg-[#0a0a0a] border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_60px_rgba(245,158,11,0.15)] max-h-[85vh] overflow-y-auto custom-scrollbar relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-sm pb-4 z-10 border-b border-white/10 -mt-2 pt-2">
            <h2 id="rules-title" className="text-xl sm:text-2xl font-bold text-amber-500 flex items-center gap-2">
              <Gavel size={24} />
              《竞拍》协议手册
            </h2>
            <button 
              onClick={onClose} 
              className="text-white/50 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              aria-label="关闭面板"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6 text-sm text-white/80 leading-relaxed mt-2">
            <section>
              <h3 className="text-amber-400 font-bold mb-3 tracking-widest flex items-center gap-2">
                <TrendingUp size={18} />
                【🎯 核心目标】
              </h3>
              <p>参与地下暗网拍卖，运用你的初始资金竞拍神秘藏品。在拍卖中尽力用低价捡漏“真品”，或者忽悠别人高价买下“赝品”。</p>
              <div className="mt-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl shadow-inner">
                <p className="text-white/90">协议终止时（完成配置轮数后），<span className="text-amber-400 font-bold">【结余资金】加【拍下藏品的真实价值】总净资产最高者，获得胜利！</span></p>
              </div>
            </section>
            
            <section className="bg-white/5 p-5 rounded-xl border border-white/10">
              <h3 className="text-teal-400 font-bold mb-4 tracking-widest">【⚖️ 执行流程】</h3>
              <ul className="space-y-4 text-white/70">
                <li className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 font-bold shrink-0 text-xs border border-amber-500/30">1</span>
                  <span><strong>揭晓拍品：</strong>每回合开始，公布1件拍卖品及其“公开参考市值”。</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 font-bold shrink-0 text-xs border border-amber-500/30">2</span>
                  <span><strong>暗标互搏：</strong>在房主设定的等待时间内秘密输入“出价”。所有人互相不知道出价金额。主机节点仅作见证，不参与竞价。</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 font-bold shrink-0 text-xs border border-amber-500/30">3</span>
                  <span><strong>锁定结算：</strong>时间耗尽后，出价最高者必须强制购买该藏品。</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 font-bold shrink-0 text-xs border border-amber-500/30">4</span>
                  <span><strong>真相大白：</strong>立刻公开赢家的出价，并揭晓该藏品的<span className="text-blue-400 font-bold">【内部真实市值】</span>（有可能血赚，也有可能血亏）。</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-amber-400 font-bold mb-3 tracking-widest flex items-center gap-2">
                <User size={18} />
                【🧬 身份特性 (职业)】
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {roleEntries.map(([roleId, role]) => (
                  <div key={roleId} className="bg-black/40 p-4 rounded-xl border border-white/10 hover:border-white/20 transition-colors group">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-white font-bold group-hover:text-amber-400 transition-colors">{role.name}</span>
                      <Badge variant="info">倍率 x{role.balanceMultiplier.toFixed(2)}</Badge>
                    </div>
                    <p className="text-white/60 text-xs leading-relaxed">{role.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <Button onClick={onClose} variant="secondary" className="px-8">
              掌握协议，返回大厅
            </Button>
          </div>
        </div>
      </ScaleIn>
    </motion.div>
  );
}

export default function Home() {
  const router = useRouter();
  const { showToast } = useToast();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const[joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const[roleMode, setRoleMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLES>('tycoon');
  const [showRules, setShowRules] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const[activeTab, setActiveTab] = useState<'preset' | 'advanced'>('preset');
  const [hostConfig, setHostConfig] = useState<RoomConfig>(() => normalizeRoomConfig(DEFAULT_ROOM_CONFIG));
  const[errors, setErrors] = useState<FormErrors>({});

  const roleEntries = useMemo(() => 
    Object.entries(ROLES) as Array<[keyof typeof ROLES, (typeof ROLES)[keyof typeof ROLES]]>,[]);

  // 表单处理
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
  },[errors.name]);

  const handleJoinCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // 自动转大写并移除空格
    setJoinCode(e.target.value.toUpperCase().replace(/\s+/g, ''));
    if (errors.joinCode) setErrors(prev => ({ ...prev, joinCode: undefined }));
  }, [errors.joinCode]);

  const validateForm = useCallback(() => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = '请输入你的身份代号';
      isValid = false;
    } else if (name.trim().length < 2) {
      newErrors.name = '身份代号至少2个字符';
      isValid = false;
    }

    if (!joinCode.trim()) {
      newErrors.joinCode = '请输入房间密钥';
      isValid = false;
    } else if (joinCode.trim().length < 3) {
      newErrors.joinCode = '房间密钥至少3个字符';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, [name, joinCode]);

  // 房间配置逻辑
  const applyPreset = useCallback((preset: PresetMode) => {
    setHostConfig((prev) => normalizeRoomConfig({ ...prev, ...preset.config }));
    showToast(`已应用 ${preset.name}！`, 'success');
  },[showToast]);

  const resetConfig = useCallback(() => {
    setHostConfig(normalizeRoomConfig(DEFAULT_ROOM_CONFIG));
    showToast('配置已重置为默认值', 'info');
  }, [showToast]);

  const shuffleItems = useCallback(() => {
    setHostConfig((prev) => {
      const shuffled = [...prev.roundItems].sort(() => Math.random() - 0.5);
      return normalizeRoomConfig({ ...prev, roundItems: shuffled });
    });
    showToast('商品顺序已随机化！', 'success');
  }, [showToast]);

  const randomizeItemValues = useCallback(() => {
    setHostConfig((prev) => {
      const randomized = prev.roundItems.map(() => {
        const template = GAME_ITEMS[Math.floor(Math.random() * GAME_ITEMS.length)];
        const variance = 0.6 + Math.random() * 0.8;
        const trueVariance = 0.3 + Math.random() * 2.5;
        return {
          name: template.name,
          description: template.description,
          referencePrice: Math.round(template.baseValue * variance),
          trueValue: Math.round(template.baseValue * trueVariance),
        };
      });
      return normalizeRoomConfig({ ...prev, roundItems: randomized });
    });
    showToast('商品价值已随机化！', 'success');
  }, [showToast]);

  const updateHostConfig = useCallback((patch: Partial<RoomConfig>) => {
    setHostConfig((prev) => normalizeRoomConfig({ ...prev, ...patch }));
  },[]);

  const handleConfigNumberChange = useCallback((key: keyof RoomConfig, val: string) => {
    const num = val === '' ? 0 : Number(val);
    if (!isNaN(num)) {
      updateHostConfig({ [key]: num });
    }
  }, [updateHostConfig]);

  const updateRoundItem = useCallback((roundIdx: number, key: keyof RoomConfig['roundItems'][0], value: string | number) => {
    setHostConfig((prev) => {
      const nextRoundItems = prev.roundItems.map((item, idx) => {
        if (idx !== roundIdx) return item;
        return { ...item, [key]: value };
      });
      return normalizeRoomConfig({ ...prev, roundItems: nextRoundItems });
    });
  },[]);

  const createRoom = useCallback(async () => {
    setLoading(true);
    try {
      const finalConfig = normalizeRoomConfig(hostConfig);
      const res = await callRelay('create', { roomConfig: finalConfig });
      localStorage.setItem('bidking_hostToken', res.hostToken);
      localStorage.setItem(`bidking_roomConfig_${res.roomId}`, JSON.stringify(finalConfig));
      showToast('房间创建成功！正在跳转到竞拍会场...', 'success');
      setTimeout(() => router.push(`/room?id=${res.roomId}`), 500);
    } catch (e) {
      showToast('创建房间失败，请稍后重试', 'error');
      setLoading(false);
    }
  },[hostConfig, router, showToast]);

  const handleJoinClick = useCallback(() => {
    if (validateForm()) setRoleMode(true);
  }, [validateForm]);

  const joinRoom = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callRelay('join', { roomId: joinCode, guestName: name, roleId: selectedRole });
      localStorage.setItem('bidking_guestToken', res.guestToken);
      localStorage.setItem('bidking_guestId', res.guestId);
      showToast('连接成功！正在进入竞拍会场...', 'success');
      setTimeout(() => router.push(`/room?id=${joinCode}`), 500);
    } catch (e) {
      showToast('连接节点失败，请检查房间密钥是否正确或房间是否满员', 'error');
      setLoading(false);
    }
  }, [joinCode, name, selectedRole, router, showToast]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 py-8 min-h-screen">
      {/* 头部 Logo 区域 */}
      <FadeIn>
        <header className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.3)] mx-auto mb-6 border-2 border-white/10"
          >
            <Gavel size={40} className="text-black" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-widest uppercase text-white mb-3">
            竞拍
          </h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Badge variant="info">v1.2.0</Badge>
            <Badge variant="success">网络优化版</Badge>
          </div>
          <p className="text-xs font-mono text-white/50 uppercase tracking-tighter">
            分布式连线协议 | 沉浸式暗标博弈
          </p>
        </header>
      </FadeIn>

      {/* 核心功能卡片 */}
      <SlideIn from="bottom">
        <Card className="w-full max-w-md p-6 sm:p-8 shadow-2xl relative overflow-hidden bg-[#111] border-white/5">
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <AnimatePresence mode="wait">
            {!roleMode ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6 relative z-10"
              >
                {/* --- 房主操作区 --- */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="info">我是房主</Badge>
                  </div>

                  <Button
                    onClick={() => setShowConfig(!showConfig)}
                    variant="outline"
                    fullWidth
                    className={`flex items-center justify-between transition-colors ${showConfig ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <Settings size={16} className={showConfig ? "text-amber-500" : ""} />
                      自定义房间参数
                    </span>
                    <ChevronRight size={16} className={`transition-transform duration-300 ${showConfig ? 'rotate-90 text-amber-500' : 'text-white/50'}`} />
                  </Button>

                  <AnimatePresence>
                    {showConfig && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 p-4 mt-2 border border-white/10 bg-black/40 rounded-xl shadow-inner">
                          {/* Tab 切换 */}
                          <div className="flex p-1 bg-white/5 rounded-lg border border-white/5">
                            <button
                              onClick={() => setActiveTab('preset')}
                              className={`flex-1 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'preset' ? 'bg-amber-500 text-black shadow-md' : 'text-white/50 hover:text-white/80'}`}
                            >
                              预设模式
                            </button>
                            <button
                              onClick={() => setActiveTab('advanced')}
                              className={`flex-1 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'advanced' ? 'bg-amber-500 text-black shadow-md' : 'text-white/50 hover:text-white/80'}`}
                            >
                              进阶微调
                            </button>
                          </div>

                          {/* 预设模式视图 */}
                          {activeTab === 'preset' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                              <div className="grid grid-cols-1 gap-2">
                                {PRESETS.map((preset, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => applyPreset(preset)}
                                    className="p-3 rounded-lg border border-white/10 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all text-left flex items-center gap-3 group"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                      {preset.icon}
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-bold text-sm text-white">{preset.name}</div>
                                      <div className="text-[10px] text-white/50">{preset.description}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* 高级设置视图 */}
                          {activeTab === 'advanced' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                              {/* 基础参数 */}
                              <div>
                                <div className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/10 pb-1.5 mb-2 flex items-center gap-1.5">
                                  <Clock size={12} /> 基础与时间机制
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <span className="block text-[10px] text-white/40 uppercase">出价时间 (秒)</span>
                                    <input
                                      type="number" inputMode="numeric" min={5} max={180}
                                      value={hostConfig.biddingSeconds}
                                      onChange={(e) => handleConfigNumberChange('biddingSeconds', e.target.value)}
                                      className="w-full px-2 py-1.5 bg-black/50 border border-white/10 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-amber-500 font-mono text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="block text-[10px] text-white/40 uppercase">确认锁定 (秒)</span>
                                    <input
                                      type="number" inputMode="numeric" min={1} max={15}
                                      value={hostConfig.lockSeconds}
                                      onChange={(e) => handleConfigNumberChange('lockSeconds', e.target.value)}
                                      className="w-full px-2 py-1.5 bg-black/50 border border-white/10 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-amber-500 font-mono text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="block text-[10px] text-white/40 uppercase">结算展示 (秒)</span>
                                    <input
                                      type="number" inputMode="numeric" min={3} max={30}
                                      value={hostConfig.revealSeconds}
                                      onChange={(e) => handleConfigNumberChange('revealSeconds', e.target.value)}
                                      className="w-full px-2 py-1.5 bg-black/50 border border-white/10 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-amber-500 font-mono text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="block text-[10px] text-white/40 uppercase">总轮数</span>
                                    <input
                                      type="number" inputMode="numeric" min={1} max={15}
                                      value={hostConfig.rounds}
                                      onChange={(e) => handleConfigNumberChange('rounds', e.target.value)}
                                      className="w-full px-2 py-1.5 bg-black/50 border border-white/10 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-amber-500 font-mono text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1 col-span-2">
                                    <span className="block text-[10px] text-white/40 uppercase">玩家初始起始资金 (¥)</span>
                                    <input
                                      type="number" inputMode="numeric" min={100} max={2000000} step={100}
                                      value={hostConfig.initialBalance}
                                      onChange={(e) => handleConfigNumberChange('initialBalance', e.target.value)}
                                      className="w-full px-2 py-1.5 bg-black/50 border border-white/10 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-amber-500 font-mono text-sm"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* 轮次商品 */}
                              <div>
                                <div className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/10 pb-1.5 mb-2 mt-4 flex items-center justify-between">
                                  <span className="flex items-center gap-1.5"><TrendingUp size={12} /> 拍品队列</span>
                                  <span className="text-white/30 text-[9px] font-mono">Total: {hostConfig.roundItems.length}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <Button onClick={shuffleItems} variant="secondary" size="sm" className="h-7 text-xs">
                                    <Shuffle size={12} className="mr-1" /> 打乱队列
                                  </Button>
                                  <Button onClick={randomizeItemValues} variant="secondary" size="sm" className="h-7 text-xs">
                                    <RefreshCw size={12} className="mr-1" /> 重洗价值
                                  </Button>
                                </div>

                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1.5 custom-scrollbar pb-1">
                                  {hostConfig.roundItems.map((item, idx) => (
                                    <div key={idx} className="p-2.5 border border-white/10 rounded-lg bg-black/60 hover:border-white/20 transition-colors group">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="font-bold text-xs text-white bg-white/10 px-2 py-0.5 rounded-full">Round {idx + 1}</div>
                                      </div>
                                      <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => updateRoundItem(idx, 'name', e.target.value)}
                                        className="w-full text-xs py-1.5 px-2 bg-white/5 border border-transparent rounded focus:border-amber-500/50 focus:bg-black/50 outline-none transition-all text-white/90 placeholder:text-white/30 mb-1.5"
                                        placeholder="藏品名称..."
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                          <span className="absolute left-2 top-1.5 text-[9px] text-white/30">市</span>
                                          <input
                                            type="number" inputMode="numeric" min={0} step={10}
                                            value={item.referencePrice}
                                            onChange={(e) => updateRoundItem(idx, 'referencePrice', Number(e.target.value) || 0)}
                                            className="w-full text-xs pl-6 pr-2 py-1 bg-white/5 border border-transparent rounded focus:border-amber-500/50 outline-none transition-all text-amber-400 font-mono"
                                            title="公开参考价"
                                          />
                                        </div>
                                        <div className="relative">
                                          <span className="absolute left-2 top-1.5 text-[9px] text-white/30">底</span>
                                          <input
                                            type="number" inputMode="numeric" min={0} step={10}
                                            value={item.trueValue}
                                            onChange={(e) => updateRoundItem(idx, 'trueValue', Number(e.target.value) || 0)}
                                            className="w-full text-xs pl-6 pr-2 py-1 bg-white/5 border border-transparent rounded focus:border-amber-500/50 outline-none transition-all text-teal-400 font-mono"
                                            title="真实底价"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <Button onClick={resetConfig} variant="secondary" size="sm" fullWidth className="mt-2 text-white/50 hover:text-white">
                                <RefreshCw size={14} className="mr-1.5" /> 重置所有参数
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Button onClick={createRoom} loading={loading} fullWidth size="lg">
                  <span className="flex items-center gap-2">
                    <Gavel size={18} />
                    创建新竞拍房间
                  </span>
                </Button>

                <div className="flex items-center gap-4 text-white/20 my-4 relative">
                  <div className="flex-1 border-t border-white/10" />
                  <span className="text-[10px] uppercase tracking-widest whitespace-nowrap bg-[#111] px-2 text-white/40">或者作为访客</span>
                  <div className="flex-1 border-t border-white/10" />
                </div>

                {/* --- 访客加入区 --- */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-white/50 uppercase tracking-wider flex items-center gap-2 ml-1">
                      <Key size={14} className="text-amber-500/70" />
                      目标房间号
                    </label>
                    <Input
                      placeholder="如: ABC12 (不区分大小写)"
                      value={joinCode}
                      onChange={handleJoinCodeChange}
                      error={errors.joinCode}
                      maxLength={10}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-white/50 uppercase tracking-wider flex items-center gap-2 ml-1">
                      <User size={14} className="text-amber-500/70" />
                      伪装代号
                    </label>
                    <Input
                      placeholder="给自己起个霸气的名字..."
                      value={name}
                      onChange={handleNameChange}
                      error={errors.name}
                      maxLength={20}
                    />
                  </div>

                  <Button
                    onClick={handleJoinClick}
                    disabled={!name.trim() || !joinCode.trim()}
                    variant="secondary"
                    fullWidth
                    size="lg"
                    className="mt-2"
                  >
                    <span className="flex items-center gap-2">
                      验证身份 & 选择职业
                      <ChevronRight size={16} />
                    </span>
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="roles"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 relative z-10"
              >
                {/* 身份选择区 */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <button
                    onClick={() => setRoleMode(false)}
                    className="flex items-center gap-1 text-white/50 hover:text-white transition-colors text-sm py-1 pr-2"
                  >
                    <ChevronLeft size={16} /> 返回修改
                  </button>
                  <h3 className="text-xs font-bold text-white/80 uppercase tracking-widest flex items-center gap-2">
                    分配角色身份
                  </h3>
                  <div className="w-[84px]" />
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1.5 custom-scrollbar pb-2">
                  {roleEntries.map(([k, role], index) => {
                    const isSelected = selectedRole === k;
                    return (
                      <motion.button
                        key={k}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedRole(k as keyof typeof ROLES)}
                        className={`w-full p-4 text-left border rounded-xl transition-all block relative overflow-hidden ${
                          isSelected 
                            ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
                            : 'border-white/10 bg-black/40 hover:bg-white/5 hover:border-white/20'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/20 blur-2xl rounded-full" />
                        )}
                        <div className="flex items-start justify-between gap-3 relative z-10">
                          <div>
                            <div className="font-bold text-white tracking-wide text-sm flex items-center gap-2">
                              {role.name}
                              {isSelected && <Badge variant="success">已选定</Badge>}
                            </div>
                            <div className="text-[11px] text-white/50 mt-1.5 font-mono leading-relaxed max-w-[200px]">
                              {role.desc}
                            </div>
                          </div>
                          <div className="text-right shrink-0 bg-black/40 p-2 rounded-lg border border-white/5">
                            <div className="text-[9px] text-white/40 uppercase mb-0.5">资金倍率</div>
                            <div className={`font-bold font-mono text-base ${isSelected ? 'text-amber-500' : 'text-white/80'}`}>
                              x{role.balanceMultiplier.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
                
                <Button onClick={joinRoom} loading={loading} fullWidth size="lg" className="shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  确认身份，进入暗网
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </SlideIn>
      
      {/* 底部手册链接 */}
      <SlideIn from="bottom" delay={0.2}>
        <div className="mt-8 text-center relative z-10">
          <button 
            onClick={() => setShowRules(true)}
            className="inline-flex items-center gap-2 text-white/40 hover:text-amber-500 text-xs tracking-widest uppercase border-b border-white/20 hover:border-amber-500/50 transition-colors pb-1"
          >
            <HelpCircle size={14} />
            查阅地下交易协议手册
          </button>
        </div>
      </SlideIn>

      <AnimatePresence>
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      </AnimatePresence>

      <footer className="mt-auto pt-12 pb-4 text-[10px] font-mono text-white/20 uppercase tracking-widest text-center w-full">
        <p>&copy; BidKing Protocol &middot; 分布式异步引擎 &middot; {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}