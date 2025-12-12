// services/platforms/youtube.ts
import type { Env } from "../../index.ts";
import { Logger } from "../../utils/logger.ts";
import { VideoRequest } from "../../types.ts";

export async function uploadToYouTube(env: Env, video: VideoRequest): Promise<boolean> {
  const logger = new Logger(env);
  const client_id = "209564473028-2gkh592o4gkba6maepq61sh5np6japen.apps.googleusercontent.com";
  const client_secret = "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";
  const refreshToken = "1//04fITPJejppkXCgYIARAAGAQSNwF-L9Ir-x_XgAP_Jja5mkn5NqnCjyjs91O94FJIeMYtiSJRTsXhdFhbv18KCT4PzB2mkniM_A4";

  try {
    // 1️⃣ Access token olish
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id,
        client_secret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      await logger.error("🔐 YouTube token xatosi", { status: tokenRes.status, error: errText });
      return false;
    }

    const { access_token } = await tokenRes.json();
    await logger.info("🔑 YouTube access token olindi");

    // 2️⃣ Video URL dan yuklash
    const videoRes = await fetch(video.videoUrl);
    if (!videoRes.ok) {
      await logger.error("📥 Video yuklanmadi", { status: videoRes.status });
      return false;
    }

    const videoBuffer = await videoRes.arrayBuffer();

    // 3️⃣ Metadata
    const metadata = {
      snippet: {
        title: video.title || "AI Auto Shorts Upload",
        description: video.description || "Uploaded using Refresh Token!",
        tags: video.tags || ["shorts", "ai", "viral"],
        categoryId: "22",
      },
      status: { privacyStatus: "public" },
    };

    // 4️⃣ FormData bilan multipart upload
    const formData = new FormData();
    formData.append("snippet", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    formData.append("video", new Blob([videoBuffer], { type: "video/mp4" }));

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        body: formData,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      await logger.error("🚀 YouTube yuklashda xato", { status: uploadRes.status, error: errText });
      return false;
    }

    const uploadData = await uploadRes.json();
    await logger.info("✅ YouTubega muvaffaqiyatli yuklandi", {
      videoId: uploadData.id,
      title: video.title,
      url: `https://www.youtube.com/shorts/${uploadData.id}`,
    });

    return true;

  } catch (err) {
    await logger.error("💥 YouTube uploadda kutilmagan xato", {
      error: err.message,
      stack: err.stack,
    });
    return false;
  }
}
