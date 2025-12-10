// services/platforms/youtube.ts
import type { Env } from "../../index.ts";
import { VideoRequest } from "../../types.ts";

export async function uploadToYouTube(env: Env, video: VideoRequest): Promise<boolean> {
  const channelKey = `${video.channelName.toUpperCase()}_YT_TOKEN` as keyof Env;
  const refreshToken = env[channelKey];

  if (!refreshToken || typeof refreshToken !== "string") {
    throw new Error(`YouTube token topilmadi: ${video.channelName}`);
  }

  // 1. Access tokenni yangilash
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: "209564473028-m7sd2gprndtfv99h6vm6vm894f1apv8g.apps.googleusercontent.com",
      client_secret: "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",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    throw new Error(`Token yangilashda xato: \( {tokenResponse.status} – \){err}`);
  }

  const { access_token } = await tokenResponse.json();

  // 2. Video faylni olish (Cloudinary URL dan)
  const videoRes = await fetch(video.videoUrl);
  if (!videoRes.ok) throw new Error(`Video yuklanmadi: ${videoRes.status}`);

  const videoBuffer = await videoRes.arrayBuffer();
  const videoBytes = new Uint8Array(videoBuffer);

  // Content-Type ni to'g'ri aniqlash
  const contentType = videoRes.headers.get("content-type") || "video/mp4";

  // 3. Metadata
  const metadata = {
    snippet: {
      title: (video.title || "AI Generated Short").slice(0, 100), // YouTube max 100 ta belgi
      description: (video.description || video.prompt || "AI bilan yaratilgan qiziqarli video") + "\n\n#shorts #ai #automation".slice(0, 5000),
      tags: video.tags || ["shorts", "ai", "automation", "uzbekcha"],
      categoryId: "22", // People & Blogs
    },
    status: {
      privacyStatus: "public", // yoki "private" test uchun
      // Shorts uchun maxsus flag yo'q, lekin vertical bo'lsa avto Shorts bo'ladi
    },
  };

  // 4. To'g'ri multipart body yaratish (binary buzilmaydi!)
  const boundary = "boundary" + Math.random().toString(36).substring(2);
  const parts = [];

  // JSON qism
  parts.push(
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
  );

  // Video qism
  parts.push(
    `--${boundary}`,
    `Content-Type: ${contentType}`,
    "Content-Transfer-Encoding: binary",
    "",
  );

  // Binary qo'shish (string emas!)
  const body = new Blob([
    parts.join("\r\n") + "\r\n",
    videoBytes,
    `\r\n--${boundary}--\r\n`,
  ]);

  // 5. Yuklash
  const uploadResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  const resultText = await uploadResponse.text();

  if (!uploadResponse.ok) {
    console.error("YouTube yuklashda xato:", uploadResponse.status, resultText);
    throw new Error(`YouTube xatosi: \( {uploadResponse.status} – \){resultText.substring(0, 500)}`);
  }

  const result = JSON.parse(resultText);
  console.log(`YouTube'ga muvaffaqiyatli yuklandi: https://youtu.be/${result.id}`);

  return true;
}
