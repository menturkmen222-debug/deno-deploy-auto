// utils/logger.ts
import type { Env } from "../index.ts";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, any>;
}

export class Logger {
  constructor(private env: Env) {}

  async log(level: LogEntry["level"], message: string, context?: Record<string, any>): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    // KVga saqlash
    const id = `log_${crypto.randomUUID()}`;
    await this.env.LOGS.put(id, JSON.stringify(entry));

    // Konsolga ham chiqarish
    console[level](`[${level.toUpperCase()}] ${message}`, context || "");
  }

  info(message: string, context?: Record<string, any>): Promise<void> {
    return this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, any>): Promise<void> {
    return this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, any>): Promise<void> {
    return this.log("error", message, context);
  }
}
