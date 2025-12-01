// routes/stats.ts
import { kv } from "../db/queue.ts";
import { VideoRequest } from "../types.ts";

export async function handleStats(): Promise<Response> {
  const stats: Record<string, any> = {};
  const entries = kv.list<VideoRequest>({ prefix: ["video_queue"] });

  for await (const { value } of entries) {
    const key = value.channelName;
    if (!stats[key]) {
      stats[key] = {
        channelName: value.channelName,
        pending: 0,
        uploaded: 0,
        failed: 0,
        todayUploaded: 0,
      };
    }
    if (value.status === "pending") stats[key].pending++;
    if (value.status === "uploaded") stats[key].uploaded++;
    if (value.status === "failed") stats[key].failed++;

    const today = new Date().toISOString().split("T")[0];
    const createdAt = new Date(value.createdAt).toISOString().split("T")[0];
    if (createdAt === today && value.status === "uploaded") {
      stats[key].todayUploaded++;
    }
  }

  return new Response(JSON.stringify(Object.values(stats)), {
    headers: { "Content-Type": "application/json" },
  });
}
