import type { Env } from "../index.ts";
import { Logger } from "../utils/logger.ts";
import { getReadyToUploadVideos, updateVideoStatus } from "../db/queue.ts";
import { generateMetadata } from "../services/groq.ts";
import { uploadToYouTube } from "../services/platforms/youtube.ts";
import { uploadToTikTok } from "../services/platforms/tiktok.ts";
import { uploadToInstagram } from "../services/platforms/instagram.ts";
import { uploadToFacebook } from "../services/platforms/facebook.ts";

export async function handleScheduleAll(request: Request, env: Env): Promise<Response> {
  const logger = new Logger(env);
  await logger.info("🔄 Scheduler ishga tushdi (barcha platformalar)");

  try {
    // Navbatdagi videoni olish, limit = 1
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
      await updateVideoStatus(env, video.id, "processing");

      // AI metadata yaratish
      const meta = await generateMetadata(env, video.prompt);
      await logger.info("🧠 AI metadata yaratildi", {
        id: video.id,
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
      });

      await updateVideoStatus(env, video.id, "processing", meta);

      // Platformalar bo‘yicha upload
      const platformFuncs: Record<string, (env: Env, video: any) => Promise<boolean>> = {
        youtube: uploadToYouTube,
        tiktok: uploadToTikTok,
        instagram: uploadToInstagram,
        facebook: uploadToFacebook,
      };

      for (const platform of ["youtube", "tiktok", "instagram", "facebook"] as const) {
        try {
          await logger.info(`⬆️ ${platform} uchun yuklanish boshlandi`, { id: video.id });

          const uploadFunc = platformFuncs[platform];
          const success = await uploadFunc(env, { ...video, ...meta, platform });

          await updateVideoStatus(env, video.id, success ? "uploaded" : "failed", { platform });

          await logger.info(
            success ? `✅ ${platform} muvaffaqiyatli yuklandi` : `❌ ${platform} yuklanmadi`,
            { id: video.id, title: meta.title }
          );
        } catch (err: any) {
          await updateVideoStatus(env, video.id, "failed", { platform });
          await logger.error(`💥 ${platform} upload xatosi`, {
            id: video.id,
            error: err.message,
            stack: err.stack?.substring(0, 200),
          });
        }
      }
    } catch (err: any) {
      await updateVideoStatus(env, video.id, "failed");
      await logger.error("💥 Video ishlashda global xato", {
        id: video.id,
        error: err.message,
        stack: err.stack?.substring(0, 200),
      });
    }

    await logger.info("✅ Video ishlandi barcha platformalar uchun", { id: video.id });

    return new Response(`Processed video ${video.id} for all platforms`, { status: 200 });
  } catch (err: any) {
    await logger.error("🔥 Scheduler xatosi", { error: err.message, stack: err.stack });
    return new Response("Internal Server Error", { status: 500 });
  }
}
