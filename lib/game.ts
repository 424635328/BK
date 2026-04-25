export interface Item {
  id: string;
  name: string;
  baseValue: number;
  trueValue: number;
  description: string;
}

export interface RoundItemConfig {
  name: string;
  description: string;
  referencePrice: number;
  trueValue: number;
}

export interface RoomConfig {
  biddingSeconds: number;
  rounds: number;
  initialBalance: number;
  lockSeconds: number;
  revealSeconds: number;
  roundItems: RoundItemConfig[];
}

export interface RoleDefinition {
  name: string;
  desc: string;
  balanceMultiplier: number;
  ability: 'none' | 'appraiser_insight' | 'tie_breaker' | 'tycoon_refund' | 'investor_interest' | 'broker_discount' | 'scrapper_loot' | 'gambler_bonus';
}

export const ROLES = {
  tycoon: {
    name: '💰 富豪 (Tycoon)',
    desc: '资本优势型。开局资金 x1.40，未拍到返还出价 20%。',
    balanceMultiplier: 1.4,
    ability: 'tycoon_refund',
  },
  appraiser: {
    name: '🔍 鉴定师 (Appraiser)',
    desc: '信息优势型。可直接查看拍品真实价值，资金倍率 x1.00。',
    balanceMultiplier: 1,
    ability: 'appraiser_insight',
  },
  gambler: {
    name: '🃏 赌徒 (Gambler)',
    desc: '高风险型。平局必胜，拍到超值物品额外奖励 真实价值 × 20%，资金倍率 x0.75。',
    balanceMultiplier: 0.75,
    ability: 'gambler_bonus',
  },
  investor: {
    name: '📈 投资人 (Investor)',
    desc: '稳健增益型。每轮结束获得 5% 现金利息，资金倍率 x1.15。',
    balanceMultiplier: 1.15,
    ability: 'investor_interest',
  },
  broker: {
    name: '🤝 经纪人 (Broker)',
    desc: '交易优势型。最终成交价为出价的 90%，资金倍率 x1.05。',
    balanceMultiplier: 1.05,
    ability: 'broker_discount',
  },
  scrapper: {
    name: '🧰 捡漏客 (Scrapper)',
    desc: '逆袭型。流拍物品自动获得，价格为真实价值 50%，资金倍率 x0.90。',
    balanceMultiplier: 0.9,
    ability: 'scrapper_loot',
  },
} as const satisfies Record<string, RoleDefinition>;

export type RoleId = keyof typeof ROLES;

export interface Player {
  id: string;
  name: string;
  balance: number;
  roleId: RoleId;
  inventory: Item[];
}

export type GamePhase = 'lobby' | 'prepare' | 'bidding' | 'locking' | 'revealing' | 'end_round' | 'game_over';

// 详细的竞拍历史记录接口
export interface BidRecord {
  playerId: string;
  playerName: string;
  roleId: RoleId;
  amount: number;
  timestamp: number;
}

export interface AuctionRoundHistory {
  round: number;
  item: Item;
  bids: BidRecord[];
  winnerId: string | null;
  winnerName: string | null;
  winningBid: number;
  actualPayment: number;
  status: 'completed' | 'cancelled' | 'scrapper_take';
  roundStartTime: number;
  roundEndTime: number;
  profitLoss?: number; // 盈亏情况
}

export interface GameState {
  version: number; // Important for clients to ignore stale state
  status: GamePhase;
  round: number;
  config: RoomConfig;
  players: Record<string, Player>;
  currentItem: Item | null;
  // Bids are hidden during 'bidding' from other players. 
  // Host strips this before syncing if status is bidding.
  bids: Record<string, number>;
  roundStartTime: number; // 当前轮次开始时间
  winnerHistory: Array<{ round: number; winnerId: string | null; winningBid: number; item: Item }>;
  auctionHistory: AuctionRoundHistory[]; // 详细的竞拍历史
  timer: number;
}

export const GAME_ITEMS: Item[] = [
  { id: 'item1', name: '明朝青花瓷 (Ming Dynasty Vase)', baseValue: 500, trueValue: 300, description: '看起来像真迹，但釉面似乎有点可疑...' },
  { id: 'item2', name: '遗失的毕加索 (The Lost Picasso)', baseValue: 2000, trueValue: 8000, description: '在一个老旧车库中发现，散发着无法否认的艺术光环。' },
  { id: 'item3', name: '被诅咒的埃及护身符 (Cursed Egyptian Amulet)', baseValue: 800, trueValue: 50, description: '闻起来有一股塑料的味道和深深的遗憾。' },
  { id: 'item4', name: '复古劳力士迪通拿 (Vintage Rolex Daytona)', baseValue: 1500, trueValue: 1600, description: '一件坚固且运转流畅的经典艺术品。' },
  { id: 'item5', name: '外星陨石碎片 (Alien Meteorite Fragment)', baseValue: 3000, trueValue: 800, description: '在黑暗中隐隐发光。也许只是涂了放射性荧光漆而已。' },
  { id: 'item6', name: '黑胡子海盗金币 (Blackbeard\'s Gold Coin)', baseValue: 1000, trueValue: 5000, description: '沉重，磨损严重，但绝对属于真品。' }
];

export const INITIAL_BALANCE = 5000;
export const DEFAULT_ROUNDS = 5;
export const DEFAULT_BIDDING_SECONDS = 45;
export const DEFAULT_LOCK_SECONDS = 2;
export const DEFAULT_REVEAL_SECONDS = 7;

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export function buildDefaultRoundItem(index: number): RoundItemConfig {
  const template = GAME_ITEMS[index % GAME_ITEMS.length];
  return {
    name: template.name,
    description: template.description,
    referencePrice: template.baseValue,
    trueValue: template.trueValue,
  };
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  biddingSeconds: DEFAULT_BIDDING_SECONDS,
  rounds: DEFAULT_ROUNDS,
  initialBalance: INITIAL_BALANCE,
  lockSeconds: DEFAULT_LOCK_SECONDS,
  revealSeconds: DEFAULT_REVEAL_SECONDS,
  roundItems: Array.from({ length: DEFAULT_ROUNDS }, (_, idx) => buildDefaultRoundItem(idx)),
};

export function normalizeRoomConfig(input?: Partial<RoomConfig> | null): RoomConfig {
  const rounds = clampNumber(input?.rounds, DEFAULT_ROOM_CONFIG.rounds, 1, 12);
  const biddingSeconds = clampNumber(input?.biddingSeconds, DEFAULT_ROOM_CONFIG.biddingSeconds, 5, 180);
  const initialBalance = clampNumber(input?.initialBalance, DEFAULT_ROOM_CONFIG.initialBalance, 100, 2000000);
  const lockSeconds = clampNumber(input?.lockSeconds, DEFAULT_ROOM_CONFIG.lockSeconds, 1, 15);
  const revealSeconds = clampNumber(input?.revealSeconds, DEFAULT_ROOM_CONFIG.revealSeconds, 3, 30);

  const sourceRoundItems = Array.isArray(input?.roundItems) ? input.roundItems : [];
  const roundItems = Array.from({ length: rounds }, (_, idx) => {
    const source = sourceRoundItems[idx] as Partial<RoundItemConfig & Item> | undefined;
    const fallback = buildDefaultRoundItem(idx);
    const name = typeof source?.name === 'string' && source.name.trim() ? source.name.trim() : fallback.name;
    const description = typeof source?.description === 'string' && source.description.trim()
      ? source.description.trim()
      : fallback.description;
    const referencePrice = clampNumber(source?.referencePrice ?? source?.baseValue, fallback.referencePrice, 0, 2000000);
    const trueValue = clampNumber(source?.trueValue, fallback.trueValue, 0, 2000000);
    return { name, description, referencePrice, trueValue };
  });

  return {
    rounds,
    biddingSeconds,
    initialBalance,
    lockSeconds,
    revealSeconds,
    roundItems,
  };
}

export function buildRoundItemFromConfig(round: number, config: RoomConfig): Item {
  const idx = Math.max(0, round - 1);
  const fallback = buildDefaultRoundItem(idx);
  const source = config.roundItems[idx] ?? fallback;
  return {
    id: `round-${round}-${idx}`,
    name: source.name,
    description: source.description,
    baseValue: source.referencePrice,
    trueValue: source.trueValue,
  };
}

export function isRoleId(roleId: string): roleId is RoleId {
  return roleId in ROLES;
}

export function getStartingBalance(roleId: RoleId, initialBalance: number): number {
  const role = ROLES[roleId] ?? ROLES.tycoon;
  return Math.max(0, Math.round(initialBalance * role.balanceMultiplier));
}
