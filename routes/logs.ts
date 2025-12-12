import type { Env } from "../index.ts";

const LOG_KEY = "SYSTEM_LOGS";

// Log qo‘shish
export async function addLog(env: Env, message: string) {
  const old = await env.LOGS.get(LOG_KEY);
  let logs = old ? JSON.parse(old) : [];

  logs.unshift({
    time: new Date().toISOString(),
    message,
  });

  // faqat oxirgi 200 ta logni saqlaymiz
  logs = logs.slice(0, 200);

  await env.LOGS.put(LOG_KEY, JSON.stringify(logs));
}

// Loglarni o‘qish
export async function getLogs(env: Env) {
  const raw = await env.LOGS.get(LOG_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Loglarni tozalash
export async function clearLogs(env: Env) {
  await env.LOGS.put(LOG_KEY, JSON.stringify([]));
}
