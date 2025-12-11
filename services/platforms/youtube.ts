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
    // Access token olish
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

    // Video yuklash
    const videoRes = await fetch(video.videoUrl);
    if (!videoRes.ok) {
      await logger.error("📥 Cloudinarydan video yuklanmadi", { status: videoRes.status });
      return false;
    }

    const videoBytes = new Uint8Array(await videoRes.arrayBuffer());
    const metadata = {
      snippet: {
        title: video.title || "AI Auto Shorts Upload",
        description: video.description || "Uploaded using Refresh Token!",
        tags: ["shorts", "ai", "viral"],
        categoryId: "22",
      },
      status: { privacyStatus: "public" },
    };

    const boundary = "----YouTubeBoundary" + crypto.randomUUID().substring(0, 8);
    const body = buildMultipartPayload(metadata, videoBytes, boundary);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      await logger.error("🚀 YouTube yuklashda xato", { status: uploadRes.status, error: errText });
      return false;
    }

    await logger.info("✅ YouTubega muvaffaqiyatli yuklandi", { title: video.title });
    return true;
  } catch (err) {
    await logger.error("💥 YouTube yuklashda kutilmagan xato", {
      error: err.message,
      stack: err.stack,
    });
    return false;
  }
}

function buildMultipartPayload(metadata: any, videoBytes: Uint8Array, boundary: string): string {
  let payload = "";
  payload += `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  payload += `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n${new TextDecoder().decode(videoBytes)}\r\n`;
  payload += `--${boundary}--\r\n`;
  return payload;
}
