// routes/schedule.ts
import type { Env } from "../index.ts";
import { Logger } from "../utils/logger.ts";
import { getReadyToUploadVideos, updateVideoStatus } from "../db/queue.ts";
import { generateMetadata } from "../services/groq.ts";
import { uploadToYouTube } from "../services/platforms/youtube.ts";

export async function handleSchedule(request: Request, env: Env): Promise<Response> {
  const logger = new Logger(env);
  await logger.info("🔄 Scheduler ishga tushdi");

  try {
    const videos = await getReadyToUploadVideos(env, 1);
    if (videos.length === 0) {
      await logger.info("📭 Navbatda video yo'q");
      return new Response("No videos ready", { status: 200 });
    }

    for (const video of videos) {
      await logger.info("▶️ Video ishlanmoqda", {
        id: video.id,
        platform: video.platform,
        channel: video.channelName,
        prompt: video.prompt,
      });

      try {
        await updateVideoStatus(env, video.id, "processing");

        // ✅ AI bilan metadata yaratish
        const meta = await generateMetadata(env, video.prompt);
        await logger.info("🧠 AI metadata yaratildi", {
          id: video.id,
          title: meta.title,
          tags: meta.tags,
        });

        await updateVideoStatus(env, video.id, "processing", meta);

        let success = false;
        if (video.platform === "youtube") {
          success = await uploadToYouTube(env, { ...video, ...meta });
        }

        await updateVideoStatus(env, video.id, success ? "uploaded" : "failed");
        await logger.info(
          success ? "✅ Muvaffaqiyatli yuklandi" : "❌ Yuklanmadi",
          { id: video.id, platform: video.platform, title: meta.title }
        );
      } catch (err) {
        await updateVideoStatus(env, video.id, "failed");
        await logger.error("💥 Video ishlashda xato", {
          id: video.id,
          error: err.message,
          stack: err.stack?.substring(0, 200),
        });
      }
    }

    await logger.info(`✅ ${videos.length} ta video ishlandi`);
    return new Response(`Processed ${videos.length} videos`, { status: 200 });
  } catch (err) {
    await logger.error("🔥 Scheduler xatosi", {
      error: err.message,
      stack: err.stack,
    });
    return new Response("Internal Server Error", { status: 500 });
  }
}
