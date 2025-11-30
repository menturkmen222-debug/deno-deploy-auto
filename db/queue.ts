// db/queue.ts
import { VideoRequest } from "../types.ts";

const kv = await Deno.openKv();

const QUEUE_PREFIX = ["video_queue"];
const DAILY_COUNTER_PREFIX = ["daily_count"];

// Video qo'shish
export async function enqueueVideo(video: Omit<VideoRequest, "id" | "status" | "createdAt">): Promise<string> {
  const id = crypto.randomUUID();
  const request: VideoRequest = {
    id,
    ...video,
    status: "pending",
    createdAt: new Date(),
  };
  await kv.set([...QUEUE_PREFIX, id], request);
  return id;
}

// Kunlik hisoblagichni oshirish
async function incrementDailyCount(platform: string, channelId: string, dateKey: string): Promise<number> {
  const key = [...DAILY_COUNTER_PREFIX, platform, channelId, dateKey];
  let res = await kv.get<number>(key);
  let count = (res.value || 0) + 1;
  await kv.set(key, count);
  return count;
}

// Sana uchun "YYYY-MM-DD" kalit
function getDailyKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Faqat hozirgi vaqtga yetib kelgan, kunlik limit (5) oshmaydigan videolarni olish
export async function getReadyToUploadVideos(limit = 1): Promise<VideoRequest[]> {
  const now = new Date();
  const entries = kv.list<VideoRequest>({ prefix: QUEUE_PREFIX });
  const ready: VideoRequest[] = [];

  for await (const { key, value } of entries) {
    if (value.status !== "pending") continue;
    if (value.scheduledAt > now) continue;

    const dailyKey = getDailyKey(value.scheduledAt);
    const currentCount = await getCurrentDailyCount(value.platform, value.channelId, dailyKey);
    if (currentCount >= 5) continue; // Kunlik limit

    // Hisoblagichni oshirish (atomik emas, lekin bepul rejimda yetarli)
    await incrementDailyCount(value.platform, value.channelId, dailyKey);
    ready.push(value);
    if (ready.length >= limit) break;
  }

  return ready;
}

async function getCurrentDailyCount(platform: string, channelId: string, dailyKey: string): Promise<number> {
  const key = [...DAILY_COUNTER_PREFIX, platform, channelId, dailyKey];
  const res = await kv.get<number>(key);
  return res.value || 0;
}
// db/queue.ts — oxiriga qo'shing
export { kv };
// Statusni yangilash
export async function updateVideoStatus(id: string, status: VideoRequest["status"], metadata?: Partial<VideoRequest>) {
  const key = [...QUEUE_PREFIX, id];
  const res = await kv.get<VideoRequest>(key);
  if (!res.value) throw new Error(`Video ${id} not found`);
  const updated = { ...res.value, status, ...metadata };
  await kv.set(key, updated);
}
