// routes/upload.ts
import { uploadToCloudinary } from "../services/cloudinary.ts";
import { enqueueVideo } from "../db/queue.ts";
import { Platform, ChannelId } from "../types.ts";
import { getScheduledSlotsForDate, US_OPTIMAL_HOURS } from "../utils/time.ts";

// Har bir kanal uchun kunlik maksimum — 5 video
const MAX_VIDEOS_PER_CHANNEL_PER_DAY = 5;

// 10 kunlik oldindan rejalashtirish chegarasi
const MAX_SCHEDULE_DAYS_AHEAD = 10;

// AQSH EST soat mintaqasiga asoslangan optimal yuklash soatlari (24 soatlik formatda)
// Bu soatlar AQSH auditoriyasining eng faol vaqtini qamrab oladi
// Masalan: 6 AM, 10 AM, 2 PM, 6 PM, 10 PM EST
export const US_OPTIMAL_EST_HOURS = [6, 10, 14, 18, 22] as const;

export async function handleUpload(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return new Response("Invalid form data", { status: 400 });
  }

  const videoFile = formData.get("video") as File | null;
  const prompt = (formData.get("prompt")?.toString() || "").trim();
  const platform = formData.get("platform")?.toString() as Platform | undefined;
  const channelId = formData.get("channelId")?.toString() as ChannelId | undefined;
  const scheduledAtStr = formData.get("scheduledAt")?.toString();

  const validPlatforms: Platform[] = ["youtube", "tiktok", "instagram", "facebook"];
  const validChannels: ChannelId[] = ["channel_1", "channel_2", "channel_3", "channel_4", "channel_5"];

  // Majburiy maydonlarni tekshirish
  if (!videoFile || videoFile.size === 0) {
    return new Response("Video file is required and must not be empty", { status: 400 });
  }
  if (!prompt || prompt.length < 10) {
    return new Response("Prompt must be at least 10 characters long", { status: 400 });
  }
  if (!platform || !validPlatforms.includes(platform)) {
    return new Response(`Invalid platform. Must be one of: ${validPlatforms.join(", ")}`, { status: 400 });
  }
  if (!channelId || !validChannels.includes(channelId)) {
    return new Response(`Invalid channelId. Must be one of: ${validChannels.join(", ")}`, { status: 400 });
  }

  // Kunlik limitni tekshirish (simulatsiya uchun, haqiqiy tizimda DB orqali tekshiriladi)
  // Bu yerda biz `queue.ts` dagi funksiya yoki statistika servisi orqali tekshiriladi.
  // Hozircha biz uni future enhancement sifatida qoldiramiz (sizning DB qatlamingizda amalga oshiriladi).

  let scheduledAt: Date;

  if (scheduledAtStr) {
    scheduledAt = new Date(scheduledAtStr);
    if (isNaN(scheduledAt.getTime())) {
      return new Response("Invalid ISO 8601 date format for scheduledAt", { status: 400 });
    }

    const now = new Date();
    const maxFuture = new Date(now);
    maxFuture.setDate(maxFuture.getDate() + MAX_SCHEDULE_DAYS_AHEAD);
    maxFuture.setUTCHours(23, 59, 59, 999);

    if (scheduledAt > maxFuture) {
      return new Response(`scheduledAt must be within the next ${MAX_SCHEDULE_DAYS_AHEAD} days`, { status: 400 });
    }

    // EST soat mintaqasiga konvertatsiya qilish va optimal soatga yaxlitlash
    const estHour = (scheduledAt.getUTCHours() - 5 + 24) % 24;
    const closestOptimalHour = US_OPTIMAL_EST_HOURS.reduce((prev, curr) =>
      Math.abs(curr - estHour) < Math.abs(prev - estHour) ? curr : prev
    );
    scheduledAt.setUTCHours(closestOptimalHour + 5, 0, 0, 0); // ES(T) → UTC
  } else {
    // Avtomatik: keyingi mavjud AQSH optimal soatini tanlash
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let slots = getScheduledSlotsForDate(today);
    let futureSlots = slots.filter(slot => slot > now);

    if (futureSlots.length === 0) {
      // Bugun boshqa slot yo‘q — ertaga 6 AM EST
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      slots = getScheduledSlotsForDate(tomorrow);
      futureSlots = slots;
    }

    if (futureSlots.length === 0) {
      return new Response("No available scheduling slots", { status: 500 });
    }

    scheduledAt = futureSlots[0];
  }

  // Video yuklash va navbatga qo‘shish
  try {
    const videoUrl = await uploadToCloudinary(videoFile);
    const id = await enqueueVideo({
      videoUrl,
      prompt,
      platform,
      channelId,
      scheduledAt,
    });

    return new Response(
      JSON.stringify({
        success: true,
        id,
        scheduledAt: scheduledAt.toISOString(),
        estDisplay: new Date(scheduledAt.getTime() - 5 * 60 * 60 * 1000).toLocaleString("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // Agar kerak bo‘lsa
        },
      }
    );
  } catch (err) {
    console.error("Upload or enqueue error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process upload. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
