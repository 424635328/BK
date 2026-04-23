export interface Item {
  id: string;
  name: string;
  baseValue: number;
  trueValue: number;
  description: string;
}

export interface Player {
  id: string;
  name: string;
  balance: number;
  roleId: 'tycoon' | 'appraiser' | 'gambler';
  inventory: Item[];
}

export type GamePhase = 'lobby' | 'prepare' | 'bidding' | 'locking' | 'revealing' | 'end_round' | 'game_over';

export interface GameState {
  version: number; // Important for clients to ignore stale state
  status: GamePhase;
  round: number; // Max 5
  players: Record<string, Player>;
  currentItem: Item | null;
  // Bids are hidden during 'bidding' from other players. 
  // Host strips this before syncing if status is bidding.
  bids: Record<string, number>;
  winnerHistory: Array<{ round: number; winnerId: string | null; winningBid: number; item: Item }>;
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

export const ROLES = {
  tycoon: { name: '💰 富豪 (Tycoon)', desc: '开局自带额外 $1000 资金。用钱砸死他们。', startBalance: 6000 },
  appraiser: { name: '🔍 鉴定师 (Appraiser)', desc: '你的火眼金睛能直接看穿拍品的【真实价值】。', startBalance: 5000 },
  gambler: { name: '🃏 赌徒 (Gambler)', desc: '资金极少，但出价时如果出现平局，永远是你获胜。', startBalance: 3500 },
};

export const INITIAL_BALANCE = 5000;
