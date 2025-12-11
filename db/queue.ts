//  db/queue.ts
import type { Env } from "../index.ts";
import { VideoRequest } from "../types.ts";

const QUEUE_PREFIX = "video_queue";
const DAILY_COUNTER_PREFIX = "daily_count";

export async function enqueueVideo(env: Env, video: Omit<VideoRequest, "id" | "status" | "createdAt">): Promise<string> {
  const id = crypto.randomUUID();
  const request: VideoRequest = { ...video, id, status: "pending", createdAt: new Date() };
  await env.VIDEO_QUEUE.put(`${QUEUE_PREFIX}:${id}`, JSON.stringify(request));
  return id;
}

function getDailyKey(date: Date | undefined): string {
  if (!date) return new Date().toISOString().split("T")[0];
  return date.toISOString().split("T")[0];
}

async function getCurrentDailyCount(env: Env, channelName: string, platform: string, dailyKey: string): Promise<number> {
  const key = `${DAILY_COUNTER_PREFIX}:${channelName}:${platform}:${dailyKey}`;
  const value = await env.VIDEO_QUEUE.get(key);
  return value ? parseInt(value) : 0;
}

async function incrementDailyCount(env: Env, channelName: string, platform: string, dailyKey: string): Promise<void> {
  const key = `${DAILY_COUNTER_PREFIX}:${channelName}:${platform}:${dailyKey}`;
  const current = await getCurrentDailyCount(env, channelName, platform, dailyKey);
  await env.VIDEO_QUEUE.put(key, (current + 1).toString());
}

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

    const dailyKey = getDailyKey(new Date(video.scheduledAt));
    const currentCount = await getCurrentDailyCount(env, video.channelName, video.platform, dailyKey);
    if (currentCount >= 20) continue;

    await incrementDailyCount(env, video.channelName, video.platform, dailyKey);
    ready.push(video);
    if (ready.length >= limit) break;
  }

  return ready;
}

export async function updateVideoStatus(env: Env, id: string, status: VideoRequest["status"], metadata?: Partial<VideoRequest>): Promise<void> {
  const keyName = `${QUEUE_PREFIX}:${id}`;
  const value = await env.VIDEO_QUEUE.get(keyName);
  if (!value) return;
  const video = JSON.parse(value) as VideoRequest;
  const updated = { ...video, status, ...metadata };
  await env.VIDEO_QUEUE.put(keyName, JSON.stringify(updated));
}
