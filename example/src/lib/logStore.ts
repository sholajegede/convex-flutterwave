import { createContext, useContext } from "react";

export type LogLevel = "info" | "success" | "error";

export type LogEntry = {
  id: string;
  ts: number;
  message: string;
  level: LogLevel;
};

export type LogContextValue = {
  logs: LogEntry[];
  log: (message: string, level?: LogLevel) => void;
  clear: () => void;
};

export const LogContext = createContext<LogContextValue | null>(null);

export function useLog(): LogContextValue {
  const ctx = useContext(LogContext);
  if (!ctx) {
    throw new Error("useLog() must be used within a <LogProvider>");
  }
  return ctx;
}
