// services/platforms/youtube.ts
import type { Env } from "../../index.ts";
import { VideoRequest } from "../../types.ts";

export async function uploadToYouTube(env: Env, video: VideoRequest): Promise<boolean> {
  const channelKey = `${video.channelName.toUpperCase()}_YT_TOKEN` as keyof Env;
  const refreshToken = env[channelKey];

  if (!refreshToken || typeof refreshToken !== "string") {
    throw new Error(`YouTube token topilmadi: ${video.channelName}`);
  }

  // 1. Yangi Web Application OAuth Client ma'lumotlari (Google Console dan oling!)
  const client_id = "209564473028-m7sd2gprndtfv99h6vm6vm894f1apv8g.apps.googleusercontent.com";         // Masalan: 1234567890-abc123.apps.googleusercontent.com
  const client_secret = "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"; // Masalan: GOCSPX-xyz789

  // Access tokenni yangilash
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    throw new Error(`Token yangilashda xato: \( {tokenResponse.status} – \){err}`);
  }

  const { access_token } = await tokenResponse.json();

  // 2. Video faylni Cloudinary URL dan olish
  const videoRes = await fetch(video.videoUrl);
  if (!videoRes.ok) throw new Error(`Video yuklanmadi: ${videoRes.status}`);

  const videoBuffer = await videoRes.arrayBuffer();
  const videoBytes = new Uint8Array(videoBuffer);

  // Content-Type ni avto aniqlash
  const contentType = videoRes.headers.get("content-type") || "video/mp4";

  // 3. Metadata (title, desc, tags)
  const metadata = {
    snippet: {
      title: (video.title || "AI Generated Short").slice(0, 100), // Max 100 belgi
      description: (video.description || video.prompt || "AI bilan yaratilgan qiziqarli video.\n\n#shorts #ai #automation #uzbekcha").slice(0, 5000),
      tags: video.tags || ["shorts", "ai", "automation", "uzbekcha", "techbuni"],
      categoryId: "28", // Science & Technology (tech_buni uchun mos)
    },
    status: {
      privacyStatus: "private", // Birinchi test uchun private, keyin public ga o'zgartiring
      madeForKids: false,
      selfDeclaredMadeForKids: false,
    },
  };

  // 4. Multipart body yaratish (binary video buzilmaydi)
  const boundary = "boundary_" + Math.random().toString(36).substring(2);
  const parts: (string | Uint8Array)[] = [];

  parts.push(
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) + "\r\n"
  );

  parts.push(
    `--${boundary}\r\n` +
    `Content-Type: ${contentType}\r\n` +
    "Content-Transfer-Encoding: binary\r\n\r\n"
  );

  parts.push(videoBytes);

  parts.push(`\r\n--${boundary}--\r\n`);

  // Blob orqali body yaratish (Cloudflare/Deno uchun mos)
  const body = new Blob(parts);

  // 5. YouTube API ga yuklash
  const uploadResponse = await fetch(
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

  const resultText = await uploadResponse.text();

  if (!uploadResponse.ok) {
    console.error("YouTube yuklash xatosi:", uploadResponse.status, resultText);
    throw new Error(`YouTube xatosi: \( {uploadResponse.status} – \){resultText.substring(0, 500)}`);
  }

  const result = JSON.parse(resultText);
  console.log(`✅ YouTube'ga yuklandi: https://youtu.be/\( {result.id} (Kanal: \){video.channelName})`);

  return true;
}
