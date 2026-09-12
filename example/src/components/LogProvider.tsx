import { useCallback, useMemo, useState, type PropsWithChildren } from "react";
import { LogContext, type LogEntry, type LogLevel } from "../lib/logStore";

export function LogProvider({ children }: PropsWithChildren) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const log = useCallback((message: string, level: LogLevel = "info") => {
    setLogs((prev) => [
      ...prev.slice(-79),
      { id: crypto.randomUUID(), ts: Date.now(), message, level },
    ]);
  }, []);

  const clear = useCallback(() => setLogs([]), []);

  const value = useMemo(() => ({ logs, log, clear }), [logs, log, clear]);

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}
