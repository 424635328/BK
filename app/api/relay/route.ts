import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Serverless ephemeral state mapping.
// Vercel routes instances dynamically, this lives briefly per instance.
const activeRooms = new Map<string, RoomInstanceData>();

interface RoomInstanceData {
  state: any;
  pendingBids: any[];
  pendingJoins: any[];
  lastActive: number;
}

const SERVER_SECRET = process.env.APP_SECRET || 'bidking-extreme-stateless-secret-777';

function signToken(payload: any) {
  const str = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', SERVER_SECRET).update(str).digest('hex');
  return Buffer.from(str).toString('base64') + '.' + hmac;
}

function verifyToken(token: string) {
  try {
    const [b64, sig] = token.split('.');
    const str = Buffer.from(b64, 'base64').toString('utf8');
    const hmac = crypto.createHmac('sha256', SERVER_SECRET).update(str).digest('hex');
    if (hmac === sig) return JSON.parse(str);
  } catch (e) {}
  return null;
}

// Garbage collection logic executed naturally on request
function gc() {
  const now = Date.now();
  for (const [key, data] of activeRooms.entries()) {
    if (now - data.lastActive > 1000 * 60 * 15) { // 15 mins TTL per instance
      activeRooms.delete(key);
    }
  }
}

export async function POST(req: Request) {
  gc(); // lightweight prune
  
  try {
    const body = await req.json();
    const { action, payload, token } = body;
    const now = Date.now();

    // =============== PUBLIC ENDPOINTS ===============

    if (action === 'create') {
      const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const hostToken = signToken({ roomId, role: 'host' });
      activeRooms.set(roomId, { state: null, pendingBids: [], pendingJoins: [], lastActive: now });
      return NextResponse.json({ roomId, hostToken });
    }

    if (action === 'join') {
      const { roomId, guestName, roleId } = payload;
      const guestId = crypto.randomUUID();
      const guestToken = signToken({ roomId, guestId, role: 'guest' });

      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, { state: null, pendingBids: [], pendingJoins: [], lastActive: now });
      }
      activeRooms.get(roomId)!.pendingJoins.push({ guestId, name: guestName, roleId });
      return NextResponse.json({ guestId, guestToken });
    }

    // =============== PROTECTED ENDPOINTS ===============

    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or forged token' }, { status: 401 });

    const { roomId, role } = decoded;

    // Resurrect room instance memory if hit a cold instance
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, { state: null, pendingBids: [], pendingJoins: [], lastActive: now });
    }
    
    const room = activeRooms.get(roomId)!;
    room.lastActive = now;

    // Host Action
    if (role === 'host' && action === 'host-sync') {
      if (payload.state) {
        room.state = payload.state;
      }
      // DRAIN the local queue for the host
      const bids = [...room.pendingBids];
      const joins = [...room.pendingJoins];
      room.pendingBids = [];
      room.pendingJoins = [];

      return NextResponse.json({ pendingBids: bids, pendingJoins: joins });
    }

    // Guest Action
    if (role === 'guest' && action === 'guest-sync') {
      if (payload.pendingBid !== undefined) {
        // Enqueue the bid to the ephemeral memory
        room.pendingBids.push({
          guestId: decoded.guestId,
          amount: payload.pendingBid,
          round: payload.round,
          timestamp: now
        });
      }
      return NextResponse.json({ state: room.state });
    }

    return NextResponse.json({ error: 'Unknown authorized action' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
