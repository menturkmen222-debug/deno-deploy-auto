// routes/schedule.ts
import type { Env } from "../index.ts";
import { Logger } from "../utils/logger.ts";
import { getReadyToUploadVideos, updateVideoStatus, incrementDailyCount } from "../db/queue.ts";
import { generateMetadata } from "../services/groq.ts";
import { uploadToYouTube } from "../services/platforms/youtube.ts";
import { uploadToTikTok } from "../services/platforms/tiktok.ts";
import { uploadToInstagram } from "../services/platforms/instagram.ts";
import { uploadToFacebook } from "../services/platforms/facebook.ts";

const platformFuncs: Record<string, (env: Env, video: any) => Promise<boolean>> = {
  youtube: uploadToYouTube,
  tiktok: uploadToTikTok,
  instagram: uploadToInstagram,
  facebook: uploadToFacebook,
};

export async function handleScheduleAll(request: Request, env: Env): Promise<Response> {
  const logger = new Logger(env);
  await logger.info("🔄 Scheduler ishga tushdi (barcha platformalar)");

  try {
    // Hozirgi vaqtda ready videolarni olish (limit 5 video)
    const videos = await getReadyToUploadVideos(env, 5);
    if (videos.length === 0) {
      await logger.info("📭 Navbatda video yo'q");
      return new Response("No videos ready", { status: 200 });
    }

    for (const video of videos) {
      await logger.info("▶️ Video ishlanmoqda", { id: video.id, prompt: video.prompt, channel: video.channelName });

      try {
        await updateVideoStatus(env, video.id, "processing");

        // AI metadata yaratish
        const meta = await generateMetadata(env, video.prompt);
        await logger.info("🧠 AI metadata yaratildi", { id: video.id, title: meta.title, description: meta.description, tags: meta.tags });

        // 4 platforma uchun alohida upload
        const platforms: ("youtube" | "tiktok" | "instagram" | "facebook")[] = ["youtube", "tiktok", "instagram", "facebook"];
        const dailyKey = new Date(video.scheduledAt).toISOString().split("T")[0];

        for (const platform of platforms) {
          const currentCount = await env.VIDEO_QUEUE.get(`daily_count:${video.channelName}:${platform}:${dailyKey}`);
          if (currentCount && parseInt(currentCount) >= 50) {
            await logger.info(`⚠️ ${platform} daily limitga yetdi, o'tkazildi`, { id: video.id });
            continue;
          }

          try {
            await logger.info(`⬆️ ${platform} uchun yuklanish boshlandi`, { id: video.id });

            // Alohida platforma video object
            const platformVideo = { ...video, ...meta, platform };

            const success = await platformFuncs[platform](env, platformVideo);
            await updateVideoStatus(env, video.id, success ? "uploaded" : "failed", { platform });

            if (success) await incrementDailyCount(env, video.channelName, platform, dailyKey);

            await logger.info(success ? `✅ ${platform} muvaffaqiyatli yuklandi` : `❌ ${platform} yuklanmadi`, { id: video.id, title: meta.title });

          } catch (err: any) {
            await updateVideoStatus(env, video.id, "failed", { platform });
            await logger.error(`💥 ${platform} upload xatosi`, { id: video.id, error: err.message, stack: err.stack?.substring(0, 200) });
          }
        }

        await logger.info("✅ Video ishlandi barcha platformalar uchun", { id: video.id });

      } catch (err: any) {
        await updateVideoStatus(env, video.id, "failed");
        await logger.error("💥 Video ishlashda global xato", { id: video.id, error: err.message, stack: err.stack?.substring(0, 200) });
      }
    }

    return new Response(`Processed ${videos.length} videos for all platforms`, { status: 200 });

  } catch (err: any) {
    await logger.error("🔥 Scheduler xatosi", { error: err.message, stack: err.stack });
    return new Response("Internal Server Error", { status: 500 });
  }
}
