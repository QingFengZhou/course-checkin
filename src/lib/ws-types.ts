// Message types for WS protocol (D-4.04, D-4.05, D-4.06)

export interface WsMessage {
  type: string;
  sessionId: string;
  payload: unknown;
}

// Server → Client payloads
export interface AttendanceUpdatePayload {
  checkedInCount: number;
  totalStudents: number;
  newCheckIn: {
    studentId: string;
    studentName: string;
  } | null;
}

export interface SessionEndedPayload {
  reason: "timeout" | "teacher_ended";
}

export interface SessionErrorPayload {
  message: string;
}

// Client → Server payloads
export interface SubscribePayload {
  sessionId: string;
}

// Type constants
export const WS_EVENTS = {
  ATTENDANCE_UPDATE: "attendance_update",
  SESSION_ENDED: "session_ended",
  SESSION_ERROR: "session_error",
  SUBSCRIBE: "subscribe",
  UNSUBSCRIBE: "unsubscribe",
  PING: "ping",
  PONG: "pong",
} as const;
