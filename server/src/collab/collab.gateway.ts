import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

interface UserInfo {
  id: string;
  name: string;
  color: string;
  boardId: string;
  isFacilitator?: boolean;
}

interface VoteState {
  votes: Record<string, string[]>; // shapeId -> userId[]
  userVoteCount: Record<string, number>; // userId -> votes used
  maxVotes: number;
  active: boolean;
}

interface TimerState {
  endTime: number | null; // unix ms
  duration: number;
  active: boolean;
}

interface SessionState {
  voting: VoteState;
  timer: TimerState;
  anonymousMode: boolean;
  facilitatorId: string | null;
  spotlight: { x: number; y: number; w: number; h: number } | null;
  cursorsLocked: boolean;
}

const COLORS = ['#e03131','#2f9e44','#1971c2','#f08c00','#7048e8','#0c8599','#e8590c','#5c940d'];

function getColor(userId: string): string {
  let hash = 0;
  for (const c of userId) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function defaultSession(): SessionState {
  return {
    voting: { votes: {}, userVoteCount: {}, maxVotes: 5, active: false },
    timer: { endTime: null, duration: 300, active: false },
    anonymousMode: false,
    facilitatorId: null,
    spotlight: null,
    cursorsLocked: false,
  };
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/collab',
  transports: ['websocket', 'polling'],
})
export class CollabGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private users = new Map<string, UserInfo>();
  private sessions = new Map<string, SessionState>(); // boardId -> state

  private getSession(boardId: string): SessionState {
    if (!this.sessions.has(boardId)) {
      this.sessions.set(boardId, defaultSession());
    }
    return this.sessions.get(boardId)!;
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token as string;
    const boardId = client.handshake.query?.boardId as string;
    if (!token || !boardId) { client.disconnect(); return; }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const session = this.getSession(boardId);
      const isFacilitator = !session.facilitatorId;
      
      const userInfo: UserInfo = {
        id: payload.sub,
        name: payload.name || 'User',
        color: getColor(payload.sub),
        boardId,
        isFacilitator,
      };
      
      if (isFacilitator) session.facilitatorId = payload.sub;
      
      this.users.set(client.id, userInfo);
      client.join(boardId);

      client.to(boardId).emit('user:joined', { socketId: client.id, ...userInfo });

      const roomUsers: any[] = [];
      this.users.forEach((u, sid) => {
        if (u.boardId === boardId && sid !== client.id) {
          roomUsers.push({ socketId: sid, ...u });
        }
      });
      client.emit('room:users', roomUsers);
      client.emit('session:state', session);

      console.log(`[Collab] ${userInfo.name} joined ${boardId}${isFacilitator ? ' (facilitator)' : ''}`);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const user = this.users.get(client.id);
    if (user) {
      client.to(user.boardId).emit('user:left', { socketId: client.id });
      const session = this.getSession(user.boardId);
      if (session.facilitatorId === user.id) {
        // Transfer facilitator to next user
        let transferred = false;
        this.users.forEach((u, sid) => {
          if (!transferred && u.boardId === user.boardId && sid !== client.id) {
            u.isFacilitator = true;
            session.facilitatorId = u.id;
            this.server.to(user.boardId).emit('facilitator:changed', { userId: u.id, name: u.name });
            transferred = true;
          }
        });
        if (!transferred) {
          session.facilitatorId = null;
          this.sessions.delete(user.boardId);
        }
      }
      this.users.delete(client.id);
    }
  }

  @SubscribeMessage('store:patch')
  handleStorePatch(@ConnectedSocket() client: Socket, @MessageBody() data: { patch: any }) {
    const user = this.users.get(client.id);
    if (!user) return;
    client.to(user.boardId).emit('store:patch', { socketId: client.id, patch: data.patch });
  }

  @SubscribeMessage('cursor:move')
  handleCursorMove(@ConnectedSocket() client: Socket, @MessageBody() data: { x: number; y: number }) {
    const user = this.users.get(client.id);
    if (!user) return;
    const session = this.getSession(user.boardId);
    if (session.cursorsLocked && !user.isFacilitator) return;
    client.to(user.boardId).emit('cursor:move', {
      socketId: client.id, x: data.x, y: data.y,
      name: session.anonymousMode ? 'Anonymous' : user.name,
      color: user.color,
    });
  }

  // ===== VOTING =====
  @SubscribeMessage('vote:start')
  handleVoteStart(@ConnectedSocket() client: Socket, @MessageBody() data: { maxVotes?: number }) {
    const user = this.users.get(client.id);
    if (!user?.isFacilitator) return;
    const session = this.getSession(user.boardId);
    session.voting = { votes: {}, userVoteCount: {}, maxVotes: data.maxVotes || 5, active: true };
    this.server.to(user.boardId).emit('vote:started', session.voting);
  }

  @SubscribeMessage('vote:end')
  handleVoteEnd(@ConnectedSocket() client: Socket) {
    const user = this.users.get(client.id);
    if (!user?.isFacilitator) return;
    const session = this.getSession(user.boardId);
    session.voting.active = false;
    this.server.to(user.boardId).emit('vote:ended', session.voting);
  }

  @SubscribeMessage('vote:cast')
  handleVoteCast(@ConnectedSocket() client: Socket, @MessageBody() data: { shapeId: string }) {
    const user = this.users.get(client.id);
    if (!user) return;
    const session = this.getSession(user.boardId);
    if (!session.voting.active) return;

    const used = session.voting.userVoteCount[user.id] || 0;
    if (used >= session.voting.maxVotes) {
      client.emit('vote:error', { message: `已用完所有 ${session.voting.maxVotes} 票` });
      return;
    }

    if (!session.voting.votes[data.shapeId]) session.voting.votes[data.shapeId] = [];
    session.voting.votes[data.shapeId].push(user.id);
    session.voting.userVoteCount[user.id] = used + 1;

    this.server.to(user.boardId).emit('vote:update', {
      shapeId: data.shapeId,
      votes: session.voting.votes[data.shapeId].length,
      userVotesRemaining: session.voting.maxVotes - (session.voting.userVoteCount[user.id] || 0),
      userId: user.id,
    });
  }

  @SubscribeMessage('vote:remove')
  handleVoteRemove(@ConnectedSocket() client: Socket, @MessageBody() data: { shapeId: string }) {
    const user = this.users.get(client.id);
    if (!user) return;
    const session = this.getSession(user.boardId);
    if (!session.voting.active) return;
    if (!session.voting.votes[data.shapeId]) return;

    const idx = session.voting.votes[data.shapeId].lastIndexOf(user.id);
    if (idx === -1) return;
    session.voting.votes[data.shapeId].splice(idx, 1);
    session.voting.userVoteCount[user.id] = Math.max(0, (session.voting.userVoteCount[user.id] || 1) - 1);

    this.server.to(user.boardId).emit('vote:update', {
      shapeId: data.shapeId,
      votes: session.voting.votes[data.shapeId].length,
      userVotesRemaining: session.voting.maxVotes - (session.voting.userVoteCount[user.id] || 0),
      userId: user.id,
    });
  }

  // ===== TIMER =====
  @SubscribeMessage('timer:start')
  handleTimerStart(@ConnectedSocket() client: Socket, @MessageBody() data: { duration: number }) {
    const user = this.users.get(client.id);
    if (!user?.isFacilitator) return;
    const session = this.getSession(user.boardId);
    const endTime = Date.now() + data.duration * 1000;
    session.timer = { endTime, duration: data.duration, active: true };
    this.server.to(user.boardId).emit('timer:started', { endTime, duration: data.duration });
  }

  @SubscribeMessage('timer:stop')
  handleTimerStop(@ConnectedSocket() client: Socket) {
    const user = this.users.get(client.id);
    if (!user?.isFacilitator) return;
    const session = this.getSession(user.boardId);
    session.timer = { endTime: null, duration: 0, active: false };
    this.server.to(user.boardId).emit('timer:stopped');
  }

  // ===== ANONYMOUS MODE =====
  @SubscribeMessage('anonymous:toggle')
  handleAnonymousToggle(@ConnectedSocket() client: Socket) {
    const user = this.users.get(client.id);
    if (!user?.isFacilitator) return;
    const session = this.getSession(user.boardId);
    session.anonymousMode = !session.anonymousMode;
    this.server.to(user.boardId).emit('anonymous:changed', { enabled: session.anonymousMode });
  }

  // ===== FACILITATOR CONTROLS =====
  @SubscribeMessage('facilitator:spotlight')
  handleSpotlight(@ConnectedSocket() client: Socket, @MessageBody() data: { bounds: any } | null) {
    const user = this.users.get(client.id);
    if (!user?.isFacilitator) return;
    const session = this.getSession(user.boardId);
    session.spotlight = data?.bounds || null;
    client.to(user.boardId).emit('facilitator:spotlight', { bounds: session.spotlight });
  }

  @SubscribeMessage('facilitator:lock-cursors')
  handleLockCursors(@ConnectedSocket() client: Socket, @MessageBody() data: { locked: boolean }) {
    const user = this.users.get(client.id);
    if (!user?.isFacilitator) return;
    const session = this.getSession(user.boardId);
    session.cursorsLocked = data.locked;
    this.server.to(user.boardId).emit('facilitator:cursors-locked', { locked: data.locked });
  }
}
