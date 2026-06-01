"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WS_EVENTS, type WsMessage } from "./ws-types";
import type { AttendanceUpdatePayload, SessionEndedPayload } from "./ws-types";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface UseCheckinSessionOptions {
  sessionId: string;
  onAttendanceUpdate: (payload: AttendanceUpdatePayload) => void;
  onSessionEnded: (payload: SessionEndedPayload) => void;
  onError?: (error: string) => void;
  wsUrl?: string;
}

export interface UseCheckinSessionResult {
  connectionStatus: ConnectionStatus;
}

const INITIAL_RECONNECT_DELAY = 1000; // 1s
const MAX_RECONNECT_DELAY = 30000; // 30s
const RECONNECT_MULTIPLIER = 2;

function getWsUrl(fallback?: string): string {
  if (fallback) return fallback;
  const origin = window.location.origin;
  return origin.replace(/^http/, "ws");
}

export function useCheckinSession({
  sessionId,
  onAttendanceUpdate,
  onSessionEnded,
  onError,
  wsUrl,
}: UseCheckinSessionOptions): UseCheckinSessionResult {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const mountedRef = useRef(true);
  const sessionIdRef = useRef(sessionId);

  // Keep sessionId ref in sync
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus("connecting");
    const url = getWsUrl(wsUrl);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        setConnectionStatus("connected");
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;

        // Subscribe to session updates
        ws.send(
          JSON.stringify({
            type: WS_EVENTS.SUBSCRIBE,
            sessionId: sessionIdRef.current,
            payload: { sessionId: sessionIdRef.current },
          }),
        );
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;

        try {
          const msg = JSON.parse(event.data) as WsMessage;

          switch (msg.type) {
            case WS_EVENTS.ATTENDANCE_UPDATE:
              onAttendanceUpdate(msg.payload as AttendanceUpdatePayload);
              break;
            case WS_EVENTS.SESSION_ENDED:
              onSessionEnded(msg.payload as SessionEndedPayload);
              break;
            case WS_EVENTS.SESSION_ERROR:
              onError?.(
                (msg.payload as { message: string }).message ||
                  "WebSocket error",
              );
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        wsRef.current = null;
        setConnectionStatus("disconnected");

        // Schedule reconnect with exponential backoff
        const delay = reconnectDelayRef.current;
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            reconnectDelayRef.current = Math.min(
              delay * RECONNECT_MULTIPLIER,
              MAX_RECONNECT_DELAY,
            );
            connect();
          }
        }, delay);
      };

      ws.onerror = () => {
        // onclose will fire after onerror, triggering reconnect
        onError?.("WebSocket connection failed");
      };
    } catch {
      setConnectionStatus("disconnected");
      // Retry with backoff
      const delay = reconnectDelayRef.current;
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          reconnectDelayRef.current = Math.min(
            delay * RECONNECT_MULTIPLIER,
            MAX_RECONNECT_DELAY,
          );
          connect();
        }
      }, delay);
    }
  }, [onAttendanceUpdate, onSessionEnded, onError, wsUrl]);

  useEffect(() => {
    if (!sessionId) return; // Don't connect without a valid session

    mountedRef.current = true;
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
    connect();

    return () => {
      mountedRef.current = false;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (wsRef.current) {
        // Send unsubscribe before closing
        if (wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(
              JSON.stringify({
                type: WS_EVENTS.UNSUBSCRIBE,
                sessionId: sessionIdRef.current,
                payload: { sessionId: sessionIdRef.current },
              }),
            );
          } catch {
            // Best-effort
          }
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, sessionId]);

  return { connectionStatus };
}
