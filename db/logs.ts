// db/logs.ts
import type { Env } from "../index.ts";

const LOG_PREFIX = "log";

// Log qo‘shish
export async function addLog(env: Env, message: string) {
  const id = crypto.randomUUID();

  const log = {
    id,
    message,
    timestamp: new Date().toISOString(),
  };

  await env.LOGS.put(`${LOG_PREFIX}:${id}`, JSON.stringify(log));
}

// Loglarni olish
export async function getLogs(env: Env) {
  const list = await env.LOGS.list({ prefix: LOG_PREFIX });
  const logs = [];

  for (const key of list.keys) {
    const value = await env.LOGS.get(key.name);
    if (value) logs.push(JSON.parse(value));
  }

  // eng yangi birinchi bo‘lsin
  return logs.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

// Loglarni tozalash
export async function clearLogs(env: Env) {
  const list = await env.LOGS.list({ prefix: LOG_PREFIX });

  for (const key of list.keys) {
    await env.LOGS.delete(key.name);
  }
}
