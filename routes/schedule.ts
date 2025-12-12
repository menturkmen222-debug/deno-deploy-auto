import type { Env } from "../index.ts";
import { Logger } from "../utils/logger.ts";
import { getReadyToUploadVideos, updateVideoStatus } from "../db/queue.ts";
import { generateMetadata } from "../services/groq.ts";
import { uploadToYouTube } from "../services/platforms/youtube.ts";
import { uploadToTikTok } from "../services/platforms/tiktok.ts";
import { uploadToInstagram } from "../services/platforms/instagram.ts";
import { uploadToFacebook } from "../services/platforms/facebook.ts";

export async function handleSchedule(request: Request, env: Env): Promise<Response> {
  const logger = new Logger(env);
  await logger.info("🔄 Scheduler ishga tushdi (bitta video barcha platformalar)");

  try {
    // ✅ Queue'dan **bitta** tayyor video olamiz
    const videos = await getReadyToUploadVideos(env, 1);
    if (videos.length === 0) {
      await logger.info("📭 Navbatda video yo'q");
      return new Response("No videos ready", { status: 200 });
    }

    const video = videos[0];

    await logger.info("▶️ Video ishlanmoqda", {
      id: video.id,
      prompt: video.prompt,
      channel: video.channelName,
    });

    try {
      // 1️⃣ Video statusni 'processing' ga o‘zgartiramiz
      await updateVideoStatus(env, video.id, "processing");

      // 2️⃣ AI metadata yaratish faqat bir marta
      const meta = await generateMetadata(env, video.prompt);
      await logger.info("🧠 AI metadata yaratildi", {
        id: video.id,
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
      });

      await updateVideoStatus(env, video.id, "processing", meta);

      // 3️⃣ Platformalar bo‘yicha parallel upload qilish
      const platformFuncs: Record<string, (env: Env, video: any) => Promise<boolean>> = {
        youtube: uploadToYouTube,
        tiktok: uploadToTikTok,
        instagram: uploadToInstagram,
        facebook: uploadToFacebook,
      };

      const uploadPromises = Object.entries(platformFuncs).map(async ([platform, func]) => {
        try {
          const success = await func(env, { ...video, ...meta, platform });
          await updateVideoStatus(env, video.id, success ? "uploaded" : "failed", { platform });
          await logger.info(success ? "✅ Muvaffaqiyatli yuklandi" : "❌ Yuklanmadi", {
            id: video.id,
            platform,
            title: meta.title,
          });
        } catch (err) {
          await updateVideoStatus(env, video.id, "failed", { platform });
          await logger.error("💥 Upload xatosi", {
            id: video.id,
            platform,
            error: err.message,
            stack: err.stack?.substring(0, 200),
          });
        }
      });

      await Promise.all(uploadPromises);

      return new Response(`Processed video ${video.id} for all platforms`, { status: 200 });
    } catch (err) {
      await updateVideoStatus(env, video.id, "failed");
      await logger.error("💥 Video ishlashda global xato", {
        id: video.id,
        error: err.message,
        stack: err.stack?.substring(0, 200),
      });
      return new Response("Video processing error", { status: 500 });
    }
  } catch (err) {
    await logger.error("🔥 Scheduler xatosi", {
      error: err.message,
      stack: err.stack,
    });
    return new Response("Internal Server Error", { status: 500 });
  }
}
