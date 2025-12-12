// db/queue.ts
import type { Env } from "../index.ts";
import { VideoRequest } from "../types.ts";

const QUEUE_PREFIX = "video_queue";
const DAILY_COUNTER_PREFIX = "daily_count";

// Video qo'shish
export async function enqueueVideo(env: Env, video: Omit<VideoRequest, "id" | "status" | "createdAt">): Promise<string> {
  const id = crypto.randomUUID();
  const request: VideoRequest = { ...video, id, status: "pending", createdAt: new Date() };
  await env.VIDEO_QUEUE.put(`${QUEUE_PREFIX}:${id}`, JSON.stringify(request));
  return id;
}

// Daily counter uchun kalit yaratish
function getDailyKey(date: Date | undefined): string {
  if (!date) return new Date().toISOString().split("T")[0];
  return date.toISOString().split("T")[0];
}

// Hozirgi daily count olish
async function getCurrentDailyCount(env: Env, channelName: string, platform: string, dailyKey: string): Promise<number> {
  const key = `${DAILY_COUNTER_PREFIX}:${channelName}:${platform}:${dailyKey}`;
  const value = await env.VIDEO_QUEUE.get(key);
  return value ? parseInt(value) : 0;
}

// Daily count increment qilish
async function incrementDailyCount(env: Env, channelName: string, platform: string, dailyKey: string): Promise<void> {
  const key = `${DAILY_COUNTER_PREFIX}:${channelName}:${platform}:${dailyKey}`;
  const current = await getCurrentDailyCount(env, channelName, platform, dailyKey);
  await env.VIDEO_QUEUE.put(key, (current + 1).toString());
}

// Tayyor videolarni olish
export async function getReadyToUploadVideos(env: Env, limit = 1): Promise<VideoRequest[]> {
  const now = new Date();
  const keys = await env.VIDEO_QUEUE.list({ prefix: QUEUE_PREFIX });
  const ready: VideoRequest[] = [];

  for (const key of keys.keys) {
    const value = await env.VIDEO_QUEUE.get(key.name);
    if (!value) continue;

    const video = JSON.parse(value) as VideoRequest;

    if (video.status !== "pending") continue;
    if (!video.scheduledAt) continue;
    if (new Date(video.scheduledAt) > now) continue;

    // Platform bo‘yicha daily limit tekshirish
    const dailyKey = getDailyKey(new Date(video.scheduledAt));
    const platforms = ["youtube", "tiktok", "instagram", "facebook"] as const;

    let canUpload = false;
    for (const platform of platforms) {
      const currentCount = await getCurrentDailyCount(env, video.channelName, platform, dailyKey);
      if (currentCount < 20) {
        await incrementDailyCount(env, video.channelName, platform, dailyKey);
        canUpload = true;
      }
    }

    if (!canUpload) continue;

    ready.push(video);
    if (ready.length >= limit) break;
  }

  return ready;
}

// Video status update qilish
export async function updateVideoStatus(
  env: Env,
  id: string,
  status: VideoRequest["status"],
  metadata?: Partial<VideoRequest>
): Promise<void> {
  const keyName = `${QUEUE_PREFIX}:${id}`;
  const value = await env.VIDEO_QUEUE.get(keyName);
  if (!value) return;

  const video = JSON.parse(value) as VideoRequest;
  const updated = { ...video, status, ...metadata };
  await env.VIDEO_QUEUE.put(keyName, JSON.stringify(updated));
}

// Loglarni tozalash
export async function clearLogs(env: Env) {
  const list = await env.LOGS.list({ limit: 1000 });
  for (const key of list.keys) {
    await env.LOGS.delete(key.name);
  }
}

// Loglarni olish
export async function getLogs(env: Env) {
  const list = await env.LOGS.list({ limit: 1000 });
  const logs: Record<string, string> = {};
  for (const key of list.keys) {
    const value = await env.LOGS.get(key.name);
    if (value) logs[key.name] = value;
  }
  return logs;
}
