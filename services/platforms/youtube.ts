// services/platforms/youtube.ts   ← TO‘LIQ SHU BILAN ALMASHTIRING
import type { Env } from "../../index.ts";
import { VideoRequest } from "../../types.ts";

export async function uploadToYouTube(env: Env, video: VideoRequest): Promise<boolean> {
  console.log("YouTube yuklash boshlandi:", video.id, video.channelName);

  const channelKey = `${video.channelName.toUpperCase()}_YT_TOKEN` as keyof Env;
  const refreshToken = env[channelKey] as string | undefined;

  if (!refreshToken) {
    console.error("TOKEN TOPILMADI:", channelKey);
    throw new Error("YouTube token yo‘q");
  }

  console.log("Token topildi, uzunligi:", refreshToken.length);

  // YANGI WEB CLIENT (albatta to‘g‘ri bo‘lishi kerak!)
  const client_id = "209564473028-m7sd2gprndtfv99h6vm6vm894f1apv8g.apps.googleusercontent.com";
  const client_secret = "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";

  console.log("Token yangilash boshlanmoqda...");

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

  const tokenText = await tokenRes.text();
  console.log("Token javobi status:", tokenRes.status);
  console.log("Token javobi body:", tokenText);

  if (!tokenRes.ok) {
    throw new Error(`Token yangilashda xato: \( {tokenRes.status} – \){tokenText}`);
  }

  const { access_token } = JSON.parse(tokenText);
  console.log("Access token olindi, uzunligi:", access_token.length);

  // Video faylni olish
  const videoRes = await fetch(video.videoUrl);
  console.log("Video fetch status:", videoRes.status, "size:", videoRes.headers.get("content-length"));

  if (!videoRes.ok || !videoRes.body) throw new Error("Video yuklanmadi");

  const videoArrayBuffer = await videoRes.arrayBuffer();
  const videoBytes = new Uint8Array(videoArrayBuffer);

  const boundary = "boundary_xxxx" + Date.now();
  const metadata = {
    snippet: {
      title: (video.title || "AI Short").slice(0, 100),
      description: (video.description || video.prompt || "").slice(0, 5000),
      tags: video.tags || ["shorts", "ai"],
      categoryId: "22",
    },
    status: { privacyStatus: "private" },
  };

  const parts = [
    `--\( {boundary}\r\nContent-Type: application/json\r\n\r\n \){JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: video/mp4\r\nContent-Transfer-Encoding: binary\r\n\r\n`,
    videoBytes,
    `\r\n--${boundary}--\r\n`,
  ];

  const body = new Blob(parts, { type: "multipart/related" });

  console.log("YouTube'ga yuklash boshlanmoqda...");

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

  const uploadText = await uploadRes.text();
  console.log("YouTube javobi status:", uploadRes.status);
  console.log("YouTube javobi:", uploadText.substring(0, 500));

  if (!uploadRes.ok) {
    throw new Error(`YouTube xatosi: \( {uploadRes.status} – \){uploadText}`);
  }

  const result = JSON.parse(uploadText);
  console.log("MUVAFFAQIYAT! Video ID:", result.id);
  return true;
}
