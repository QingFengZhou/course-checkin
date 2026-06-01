import { WebSocket } from "ws";
import { WS_EVENTS, type WsMessage, type AttendanceUpdatePayload } from "./ws-types";

type SessionId = string;

class BroadcastManagerImpl {
  private rooms = new Map<SessionId, Set<WebSocket>>();
  private clientSessions = new Map<WebSocket, Set<SessionId>>();

  /**
   * Register a new WebSocket connection.
   */
  handleConnection(ws: WebSocket): void {
    this.clientSessions.set(ws, new Set());
  }

  /**
   * Parse and dispatch an incoming message.
   */
  handleMessage(ws: WebSocket, raw: string): void {
    let msg: WsMessage;
    try {
      msg = JSON.parse(raw) as WsMessage;
    } catch {
      this.send(ws, {
        type: WS_EVENTS.SESSION_ERROR,
        sessionId: "",
        payload: { message: "Invalid JSON" },
      });
      return;
    }

    switch (msg.type) {
      case WS_EVENTS.SUBSCRIBE: {
        const sessionId = (msg.payload as { sessionId: string })?.sessionId;
        if (sessionId) {
          this.subscribe(ws, sessionId);
        }
        break;
      }
      case WS_EVENTS.UNSUBSCRIBE: {
        const sessionId = (msg.payload as { sessionId: string })?.sessionId;
        if (sessionId) {
          this.unsubscribe(ws, sessionId);
        }
        break;
      }
      case WS_EVENTS.PONG:
        // Heartbeat pong received — tracked in server.ts
        break;
      default:
        this.send(ws, {
          type: WS_EVENTS.SESSION_ERROR,
          sessionId: "",
          payload: { message: `Unknown message type: ${msg.type}` },
        });
    }
  }

  /**
   * Clean up all room memberships for a disconnected client.
   */
  handleDisconnect(ws: WebSocket): void {
    const sessions = this.clientSessions.get(ws);
    if (sessions) {
      for (const sessionId of sessions) {
        this.rooms.get(sessionId)?.delete(ws);
        if (this.rooms.get(sessionId)?.size === 0) {
          this.rooms.delete(sessionId);
        }
      }
    }
    this.clientSessions.delete(ws);
  }

  /**
   * Subscribe a client to a session room.
   */
  subscribe(ws: WebSocket, sessionId: string): void {
    if (!this.rooms.has(sessionId)) {
      this.rooms.set(sessionId, new Set());
    }
    this.rooms.get(sessionId)!.add(ws);

    const sessions = this.clientSessions.get(ws);
    if (sessions) {
      sessions.add(sessionId);
    }
  }

  /**
   * Unsubscribe a client from a session room.
   */
  unsubscribe(ws: WebSocket, sessionId: string): void {
    this.rooms.get(sessionId)?.delete(ws);
    if (this.rooms.get(sessionId)?.size === 0) {
      this.rooms.delete(sessionId);
    }

    const sessions = this.clientSessions.get(ws);
    if (sessions) {
      sessions.delete(sessionId);
    }
  }

  /**
   * Send a message to all clients in a session room.
   * Dead clients are removed from the room after send failure.
   */
  broadcast(sessionId: string, message: WsMessage): void {
    const clients = this.rooms.get(sessionId);
    if (!clients || clients.size === 0) return;

    const data = JSON.stringify(message);
    const dead: WebSocket[] = [];

    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(data);
        } catch {
          dead.push(ws);
        }
      } else {
        dead.push(ws);
      }
    }

    // Clean up dead connections
    for (const ws of dead) {
      clients.delete(ws);
      this.clientSessions.get(ws)?.delete(sessionId);
    }

    if (clients.size === 0) {
      this.rooms.delete(sessionId);
    }
  }

  /**
   * Convenience: broadcast an attendance update to a session room.
   */
  broadcastAttendanceUpdate(
    sessionId: string,
    checkedInCount: number,
    totalStudents: number,
    newCheckIn?: { studentId: string; studentName: string },
  ): void {
    const payload: AttendanceUpdatePayload = {
      checkedInCount,
      totalStudents,
      newCheckIn: newCheckIn ?? null,
    };

    this.broadcast(sessionId, {
      type: WS_EVENTS.ATTENDANCE_UPDATE,
      sessionId,
      payload,
    });
  }

  /**
   * Broadcast that a session has ended.
   */
  broadcastSessionEnded(
    sessionId: string,
    reason: "timeout" | "teacher_ended",
  ): void {
    this.broadcast(sessionId, {
      type: WS_EVENTS.SESSION_ENDED,
      sessionId,
      payload: { reason },
    });
  }

  private send(ws: WebSocket, message: WsMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch {
        // Send errors are non-fatal
      }
    }
  }
}

export const BroadcastManager = new BroadcastManagerImpl();
