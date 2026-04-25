'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { callRelay } from '@/lib/api';
import { DEFAULT_ROOM_CONFIG, normalizeRoomConfig, ROLES, RoomConfig, GAME_ITEMS, buildDefaultRoundItem } from '@/lib/game';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '@/components/ui/Toast';
import { Button, Input, Card, FadeIn, SlideIn, ScaleIn, Badge } from '@/components/ui';
import { User, Key, Copy, ChevronRight, ChevronLeft, Settings, HelpCircle, X, Gavel, TrendingUp, Shuffle, RefreshCw, Clock, Zap, Shield, Award, Plus, Minus } from 'lucide-react';

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

const PRESETS: PresetMode[] = [
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

export default function Home() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [roleMode, setRoleMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLES>('tycoon');
  const [showRules, setShowRules] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'preset' | 'advanced'>('preset');
  const [hostConfig, setHostConfig] = useState<RoomConfig>(() => normalizeRoomConfig(DEFAULT_ROOM_CONFIG));
  const [errors, setErrors] = useState<FormErrors>({});

  const roleEntries = Object.entries(ROLES) as Array<[keyof typeof ROLES, (typeof ROLES)[keyof typeof ROLES]]>;

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

  const applyPreset = useCallback((preset: PresetMode) => {
    setHostConfig((prev) => normalizeRoomConfig({ ...prev, ...preset.config }));
    showToast(`已应用 ${preset.name}！`, 'success');
  }, [showToast]);

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
      const randomized = prev.roundItems.map((item, idx) => {
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
  }, []);

  const updateRoundItem = useCallback((roundIdx: number, key: keyof RoomConfig['roundItems'][0], value: string | number) => {
    setHostConfig((prev) => {
      const nextRoundItems = prev.roundItems.map((item, idx) => {
        if (idx !== roundIdx) return item;
        return { ...item, [key]: value };
      });
      return normalizeRoomConfig({ ...prev, roundItems: nextRoundItems });
    });
  }, []);

  const createRoom = useCallback(async () => {
    setLoading(true);
    try {
      const finalConfig = normalizeRoomConfig(hostConfig);
      const res = await callRelay('create', { roomConfig: finalConfig });
      localStorage.setItem('bidking_hostToken', res.hostToken);
      localStorage.setItem(`bidking_roomConfig_${res.roomId}`, JSON.stringify(finalConfig));
      showToast('房间创建成功！正在跳转到竞拍会场...', 'success');
      setTimeout(() => {
        router.push(`/room?id=${res.roomId}`);
      }, 500);
    } catch (e) {
      showToast('创建房间失败，请稍后重试', 'error');
      setLoading(false);
    }
  }, [hostConfig, router, showToast]);

  const handleJoinClick = useCallback(() => {
    if (validateForm()) {
      setRoleMode(true);
    }
  }, [validateForm]);

  const joinRoom = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callRelay('join', { roomId: joinCode.toUpperCase(), guestName: name, roleId: selectedRole });
      localStorage.setItem('bidking_guestToken', res.guestToken);
      localStorage.setItem('bidking_guestId', res.guestId);
      showToast('连接成功！正在进入竞拍会场...', 'success');
      setTimeout(() => {
        router.push(`/room?id=${joinCode.toUpperCase()}`);
      }, 500);
    } catch (e) {
      showToast('连接节点失败，请检查房间密钥是否正确', 'error');
      setLoading(false);
    }
  }, [joinCode, name, selectedRole, router, showToast]);

  const copyRoomCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    showToast('房间号已复制到剪贴板', 'success');
  }, [showToast]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 min-h-screen">
      <FadeIn>
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.3)] mx-auto mb-6 border-2 border-white/10"
          >
            <Gavel size={40} className="text-black" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-widest uppercase text-white mb-2">
            竞拍之王
          </h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="info">v1.2.0</Badge>
            <Badge variant="success">优化版</Badge>
          </div>
          <p className="text-xs font-mono text-white/50 uppercase tracking-tighter">
            分布式连线协议 | 沉浸式暗标博弈
          </p>
        </div>
      </FadeIn>

      <SlideIn from="bottom">
        <Card className="w-full max-w-md p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <AnimatePresence mode="wait">
            {!roleMode ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6 relative z-10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info">快捷创建</Badge>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => setShowConfig(!showConfig)}
                    variant="outline"
                    fullWidth
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Settings size={16} />
                      房间配置
                    </span>
                    <ChevronRight size={16} className={`transition-transform ${showConfig ? 'rotate-90' : ''}`} />
                  </Button>

                  <AnimatePresence>
                    {showConfig && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 p-4 border border-white/10 bg-black/30 rounded-xl">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setActiveTab('preset')}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${activeTab === 'preset' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-white/50'}`}
                            >
                              快速配置
                            </button>
                            <button
                              onClick={() => setActiveTab('advanced')}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${activeTab === 'advanced' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-white/50'}`}
                            >
                              高级设置
                            </button>
                          </div>

                          {activeTab === 'preset' && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-2"
                            >
                              <div className="grid grid-cols-1 gap-2">
                                {PRESETS.map((preset, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => applyPreset(preset)}
                                  className="p-3 rounded-lg border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-left flex items-center gap-3"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    {preset.icon}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-bold text-sm text-white">{preset.name}</div>
                                    <div className="text-[10px] text-white/50">{preset.description}</div>
                                  </div>
                                </button>
                              ))}
                              </div>
                              <div className="flex gap-2 pt-2">
                                <Button
                                  onClick={resetConfig}
                                  variant="secondary"
                                  size="sm"
                                  className="flex-1"
                                >
                                  <span className="flex items-center gap-1">
                                    <RefreshCw size={14} />
                                    重置
                                  </span>
                                </Button>
                              </div>
                            </motion.div>
                          )}

                          {activeTab === 'advanced' && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-3"
                            >
                              <div className="text-xs text-white/40 uppercase tracking-widest border-b border-white/10 pb-2">
                                <div className="text-white/50">⏱️ 时间设置</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <span className="block text-[10px] text-white/40 uppercase tracking-wider">等待时间 (秒)</span>
                                  <input
                                    type="number"
                                    min={5}
                                    max={180}
                                    value={hostConfig.biddingSeconds}
                                    onChange={(e) => updateHostConfig({ biddingSeconds: Number(e.target.value) })}
                                    className="w-full px-2 py-2 bg-black/40 border border-white/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-amber-500 font-mono text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="block text-[10px] text-white/40 uppercase tracking-wider">锁定时间 (秒)</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={15}
                                    value={hostConfig.lockSeconds}
                                    onChange={(e) => updateHostConfig({ lockSeconds: Number(e.target.value) })}
                                    className="w-full px-2 py-2 bg-black/40 border border-white/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-amber-500 font-mono text-sm"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <span className="block text-[10px] text-white/40 uppercase tracking-wider">揭晓时间 (秒)</span>
                                  <input
                                    type="number"
                                    min={3}
                                    max={30}
                                    value={hostConfig.revealSeconds}
                                    onChange={(e) => updateHostConfig({ revealSeconds: Number(e.target.value) })}
                                    className="w-full px-2 py-2 bg-black/40 border border-white/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-amber-500 font-mono text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="block text-[10px] text-white/40 uppercase tracking-wider">总轮数</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={hostConfig.rounds}
                                    onChange={(e) => updateHostConfig({ rounds: Number(e.target.value) })}
                                    className="w-full px-2 py-2 bg-black/40 border border-white/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-amber-500 font-mono text-sm"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="block text-[10px] text-white/40 uppercase tracking-wider">初始资金</span>
                                <input
                                  type="number"
                                  min={100}
                                  max={2000000}
                                  step={100}
                                  value={hostConfig.initialBalance}
                                  onChange={(e) => updateHostConfig({ initialBalance: Number(e.target.value) })}
                                  className="w-full px-2 py-2 bg-black/40 border border-white/10 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-amber-500 font-mono text-sm"
                                />
                              </div>

                              <div className="text-xs text-white/40 uppercase tracking-widest border-b border-white/10 pb-2 pt-3">
                                <div className="text-white/50">🏷️ 商品配置</div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Button onClick={shuffleItems} variant="secondary" size="sm">
                                  <span className="flex items-center gap-1">
                                    <Shuffle size={14} />
                                    随机排序
                                  </span>
                                </Button>
                                <Button onClick={randomizeItemValues} variant="secondary" size="sm">
                                  <span className="flex items-center gap-1">
                                    <TrendingUp size={14} />
                                    随机价值
                                  </span>
                                </Button>
                              </div>

                              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                {hostConfig.roundItems.map((item, idx) => (
                                  <div key={idx} className="p-2 border border-white/10 rounded-lg bg-black/40">
                                    <div className="font-bold text-xs text-white mb-1">第 {idx + 1} 轮</div>
                                    <div className="text-xs text-amber-400 font-mono mb-1">
                                      参考: {item.referencePrice} / 真实: {item.trueValue}
                                    </div>
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => updateRoundItem(idx, 'name', e.target.value)}
                                      className="w-full text-xs py-1 px-2 bg-white/5 border border-white/10 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-white/80 placeholder:text-white/40 mb-1"
                                      placeholder="商品名称"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="number"
                                        min={0}
                                        step={10}
                                        value={item.referencePrice}
                                        onChange={(e) => updateRoundItem(idx, 'referencePrice', Number(e.target.value))}
                                        className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-amber-500 font-mono"
                                      />
                                      <input
                                        type="number"
                                        min={0}
                                        step={10}
                                        value={item.trueValue}
                                        onChange={(e) => updateRoundItem(idx, 'trueValue', Number(e.target.value))}
                                        className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all text-amber-500 font-mono"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={resetConfig}
                                  variant="secondary"
                                  size="sm"
                                  className="flex-1"
                                >
                                  <span className="flex items-center gap-1">
                                    <RefreshCw size={14} />
                                    重置
                                  </span>
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Button
                  onClick={createRoom}
                  loading={loading}
                  fullWidth
                  size="lg"
                >
                  <span className="flex items-center gap-2">
                    <Gavel size={18} />
                    创建新房间
                  </span>
                </Button>

                <div className="flex items-center gap-4 text-white/20 my-2">
                  <div className="flex-1 border-t border-white/10" />
                  <span className="text-xs uppercase tracking-widest whitespace-nowrap">或加入房间</span>
                  <div className="flex-1 border-t border-white/10" />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/50 uppercase tracking-wider flex items-center gap-2">
                      <User size={14} />
                      你的身份代号
                    </label>
                    <Input
                      placeholder="例如：收藏家小王"
                      value={name}
                      onChange={(e: any) => setName(e.target.value)}
                      error={errors.name}
                      icon={<User size={16} />}
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-white/50 uppercase tracking-wider flex items-center gap-2">
                      <Key size={14} />
                      房间密钥
                    </label>
                    <Input
                      placeholder="例如：ABC12"
                      value={joinCode}
                      onChange={(e: any) => setJoinCode(e.target.value.toUpperCase())}
                      error={errors.joinCode}
                      icon={<Key size={16} />}
                      maxLength={10}
                    />
                  </div>

                  <Button
                    onClick={handleJoinClick}
                    disabled={!name.trim() || !joinCode.trim()}
                    variant="secondary"
                    fullWidth
                    size="lg"
                  >
                    <span className="flex items-center gap-2">
                      验证并选择身份
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
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setRoleMode(false)}
                    className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
                  >
                    <ChevronLeft size={16} />
                    返回
                  </button>
                  <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest">选择身份</h3>
                  <div className="w-16" />
                </div>

                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
                  {roleEntries.map(([k, role], index) => (
                    <motion.button
                      key={k}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedRole(k as keyof typeof ROLES)}
                      className={`w-full p-4 text-left border rounded-xl transition-all block ${selectedRole === k ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-white/10 bg-black/40 hover:bg-white/5 hover:border-white/20'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-white tracking-wide text-sm flex items-center gap-2">
                            {role.name}
                            {selectedRole === k && <Badge variant="success">已选</Badge>}
                          </div>
                          <div className="text-[11px] text-white/50 mt-1 font-mono leading-relaxed">
                            {role.desc}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] text-white/40 uppercase mb-1">倍率</div>
                          <div className="text-amber-500 font-bold font-mono text-lg">
                            x{role.balanceMultiplier.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
                
                <Button
                  onClick={joinRoom}
                  loading={loading}
                  fullWidth
                  size="lg"
                >
                  确认加入
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </SlideIn>
      
      <SlideIn from="bottom" delay={0.2}>
        <div className="mt-8 text-center relative z-10">
          <button 
            onClick={() => setShowRules(true)}
            className="inline-flex items-center gap-2 text-white/40 hover:text-amber-500 text-xs tracking-widest uppercase border-b border-white/20 hover:border-amber-500/50 transition-colors pb-1"
          >
            <HelpCircle size={14} />
            查看游戏手册
          </button>
        </div>
      </SlideIn>

      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
            onClick={() => setShowRules(false)}
          >
            <ScaleIn>
              <div 
                className="w-full max-w-2xl bg-black border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_60px_rgba(245,158,11,0.2)] max-h-[85vh] overflow-y-auto custom-scrollbar relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-amber-500">《竞拍之王》协议手册</h2>
                  <button 
                    onClick={() => setShowRules(false)} 
                    className="text-white/50 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6 text-sm text-white/80 leading-relaxed">
                  <section>
                    <h3 className="text-amber-400 font-bold mb-3 tracking-widest flex items-center gap-2">
                      <TrendingUp size={18} />
                      【🎯 核心目标】
                    </h3>
                    <p>参与地下暗网拍卖，运用你的初始资金竞拍神秘藏品。在拍卖中尽力用低价捡漏“真品”，或者忽悠别人高价买下“赝品”。</p>
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-white">协议终止时（完成配置轮数后），<span className="text-amber-400 font-bold">【结余资金】加【拍下藏品的真实价值】总净资产最高者，获得胜利！</span></p>
                    </div>
                  </section>
                  
                  <section className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <h3 className="text-teal-400 font-bold mb-3 tracking-widest">【⚖️ 执行流程】</h3>
                    <ul className="space-y-2 text-white/70">
                      <li className="flex gap-2">
                        <span className="text-amber-500 font-bold shrink-0">1.</span>
                        <span><strong>揭晓拍品：</strong>每回合开始，公布1件拍卖品及其“公开参考市值”。</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-500 font-bold shrink-0">2.</span>
                        <span><strong>暗标互搏：</strong>在房主设定的等待时间内秘密输入“出价”。所有人互相不知道出价金额。主机节点仅作见证，不参与竞价。</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-500 font-bold shrink-0">3.</span>
                        <span><strong>锁定结算：</strong>时间耗尽后，出价最高者必须强制购买该藏品。</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-500 font-bold shrink-0">4.</span>
                        <span><strong>真相大白：</strong>立刻公开赢家的出价，并揭晓该藏品的<span className="text-blue-400 font-bold">【内部真实市值】</span>（有可能血赚，也有可能血亏）。</span>
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-amber-400 font-bold mb-3 tracking-widest">【🧬 身份特性 (职业)】</h3>
                    <div className="grid gap-3">
                      {roleEntries.map(([roleId, role]) => (
                        <div key={roleId} className="bg-black/40 p-4 rounded-xl border border-white/10">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-white font-bold">{role.name}</span>
                            <Badge>x{role.balanceMultiplier.toFixed(2)}</Badge>
                          </div>
                          <p className="text-white/60 text-sm">{role.desc}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                  <Button 
                    onClick={() => setShowRules(false)}
                    variant="secondary"
                  >
                    掌握协议，返回大厅
                  </Button>
                </div>
              </div>
            </ScaleIn>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-12 text-[10px] font-mono text-white/20 uppercase tracking-widest text-center">
        <div>&copy; 竞拍之王 (BidKing) 分布式异步引擎 {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
