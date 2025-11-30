// db/queue.ts

import { VideoRequest } from "../types.ts";

// Deno KV — serverless, bepul, Deno Deployda avtomatik ishlaydi
const kv = await Deno.openKv();

// Asosiy navbat kaliti
const QUEUE_PREFIX = ["video_queue"];

// Kunlik cheklov kaliti: ["daily_count", "tech_buni", "youtube", "2025-12-01"]
const DAILY_COUNTER_PREFIX = ["daily_count"];

/**
 * Yangi video so'rovini navbatga qo'shish
 */
export async function enqueueVideo(
  video: Omit<VideoRequest, "id" | "status" | "createdAt">
): Promise<string> {
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

/**
 * Sana uchun "YYYY-MM-DD" formatidagi kalit
 */
function getDailyKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Berilgan kanal + platforma uchun bugun nechta video yuklanganini olish
 */
async function getCurrentDailyCount(
  channelName: string,
  platform: string,
  dailyKey: string
): Promise<number> {
  const key = [...DAILY_COUNTER_PREFIX, channelName, platform, dailyKey];
  const res = await kv.get<number>(key);
  return res.value || 0;
}

/**
 * Kunlik hisoblagichni bittaga oshirish
 */
async function incrementDailyCount(
  channelName: string,
  platform: string,
  dailyKey: string
): Promise<void> {
  const key = [...DAILY_COUNTER_PREFIX, channelName, platform, dailyKey];
  const current = await getCurrentDailyCount(channelName, platform, dailyKey);
  await kv.set(key, current + 1);
}

/**
 * Faqat hozirgi vaqtga yetib kelgan, kunlik limit (5)dan oshmaydigan videolarni olish
 * Har bir so'rov bitta platformaga tegishli
 */
export async function getReadyToUploadVideos(limit = 1): Promise<VideoRequest[]> {
  const now = new Date();
  const entries = kv.list<VideoRequest>({ prefix: QUEUE_PREFIX });
  const ready: VideoRequest[] = [];

  for await (const { value } of entries) {
    // Faqat "pending" holatidagi videolar
    if (value.status !== "pending") continue;

    // Faqat hozirgi vaqtdan oldin rejalashtirilganlar
    if (value.scheduledAt > now) continue;

    // Kunlik cheklovni tekshirish
    const dailyKey = getDailyKey(value.scheduledAt);
    const currentCount = await getCurrentDailyCount(
      value.channelName,
      value.platform,
      dailyKey
    );

    if (currentCount >= 5) continue; // Kunlik limit

    // Hisoblagichni oshirish
    await incrementDailyCount(value.channelName, value.platform, dailyKey);

    ready.push(value);
    if (ready.length >= limit) break;
  }

  return ready;
}

/**
 * Video holatini yangilash (masalan: "uploaded")
 */
export async function updateVideoStatus(
  id: string,
  status: VideoRequest["status"],
  metadata?: Partial<VideoRequest>
): Promise<void> {
  const key = [...QUEUE_PREFIX, id];
  const res = await kv.get<VideoRequest>(key);
  if (!res.value) throw new Error(`Video ${id} topilmadi`);
  const updated = { ...res.value, status, ...metadata };
  await kv.set(key, updated);
}

/**
 * Deno KV instansini boshqa modullarga eksport qilish (masalan: stats uchun)
 */
export { kv };
