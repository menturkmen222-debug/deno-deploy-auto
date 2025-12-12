// utils/logger.ts
import type { Env } from "../index.ts";

export class Logger {
  constructor(private env: Env) {}

  async info(message: string, context?: any) {
    console.log("INFO:", message, context || "");
    // Agar KV log saqlashni xohlasangiz, quyidagini yoqing
    // await this.env.LOGS.put(`log_${Date.now()}`, JSON.stringify({ level: "info", message, context }));
  }

  async error(message: string, context?: any) {
    console.error("ERROR:", message, context || "");
    // Agar KV log saqlashni xohlasangiz, quyidagini yoqing
    // await this.env.LOGS.put(`log_${Date.now()}`, JSON.stringify({ level: "error", message, context }));
  }

  // To‘liq loglarni o‘chirish (paginated)
  async clearLogs() {
    let cursor: string | undefined = undefined;
    let totalDeleted = 0;

    do {
      const list = await this.env.LOGS.list({ cursor, limit: 1000 });
      cursor = list.cursor;

      for (const key of list.keys) {
        await this.env.LOGS.delete(key.name);
      }

      totalDeleted += list.keys.length;
    } while (cursor);

    console.log(`✅ ${totalDeleted} ta log o‘chirildi`);
    return totalDeleted;
  }
}
