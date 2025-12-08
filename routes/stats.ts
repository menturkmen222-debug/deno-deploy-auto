// routes/stats.ts
import type { Env } from "../index.ts";
import { VideoRequest } from "../types.ts";

export async function handleStats(request: Request, env: Env): Promise<Response> {
  const stats: Record<string, any> = {};
  
  // KVdan barcha kalitlarni olish
  const keys = await env.VIDEO_QUEUE.list({ prefix: "video_queue:" });
  
  for (const key of keys.keys) {
    const value = await env.VIDEO_QUEUE.get(key.name);
    if (!value) continue;
    
    const video = JSON.parse(value) as VideoRequest;
    const channelName = video.channelName;
    
    if (!stats[channelName]) {
      stats[channelName] = {
        channelName,
        pending: 0,
        uploaded: 0,
        failed: 0,
        todayUploaded: 0,
      };
    }
    
    if (video.status === "pending") stats[channelName].pending++;
    if (video.status === "uploaded") stats[channelName].uploaded++;
    if (video.status === "failed") stats[channelName].failed++;
    
    const today = new Date().toISOString().split("T")[0];
    const createdAt = new Date(video.createdAt).toISOString().split("T")[0];
    if (createdAt === today && video.status === "uploaded") {
      stats[channelName].todayUploaded++;
    }
  }

  return new Response(JSON.stringify(Object.values(stats)), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
