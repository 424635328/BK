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

// Fixed Set of Game Items
export const GAME_ITEMS: Item[] = [
  { id: 'item1', name: 'Ming Dynasty Vase', baseValue: 500, trueValue: 300, description: 'Looks authentic, but the glaze is suspicious...' },
  { id: 'item2', name: 'The Lost Picasso', baseValue: 2000, trueValue: 8000, description: 'Found in a garage. It radiates an undeniable aura.' },
  { id: 'item3', name: 'Cursed Egyptian Amulet', baseValue: 800, trueValue: 50, description: 'Smells like plastic and regret.' },
  { id: 'item4', name: 'Vintage Rolex Daytona', baseValue: 1500, trueValue: 1600, description: 'A solid piece, ticking smoothly.' },
  { id: 'item5', name: 'Alien Meteorite Fragment', baseValue: 3000, trueValue: 800, description: 'Glows in the dark. Probably just radioactive paint.' },
  { id: 'item6', name: 'Blackbeard\'s Gold Coin', baseValue: 1000, trueValue: 5000, description: 'Heavy, worn out, and authentic.' }
];

export const ROLES = {
  tycoon: { name: '💰 富豪 (Tycoon)', desc: '开局自带额外 $1000 资金。用钱砸死他们。', startBalance: 6000 },
  appraiser: { name: '🔍 鉴定师 (Appraiser)', desc: '你的火眼金睛能直接看穿拍品的【真实价值】。', startBalance: 5000 },
  gambler: { name: '🃏 赌徒 (Gambler)', desc: '资金极少，但出价时如果出现平局，永远是你获胜。', startBalance: 3500 },
};

export const INITIAL_BALANCE = 5000;
