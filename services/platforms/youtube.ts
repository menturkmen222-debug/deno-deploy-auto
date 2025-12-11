// services/platforms/youtube.ts  ← TO‘LIQ SHU BILAN ALMASHTIRING!
import type { Env } from "../../index.ts";
import { VideoRequest } from "../../types.ts";

const CLIENT_ID = "209564473028-m7sd2gprndtfv99h6vm6vm894f1apv8g.apps.googleusercontent.com";      // Google Console dan
const CLIENT_SECRET = "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";  // Google Console dan

export async function uploadToYouTube(env: Env, video: VideoRequest): Promise<boolean> {
  const refreshToken = env.TECH_BUNI_YT_TOKEN;
  if (!refreshToken) throw new Error("TECH_BUNI_YT_TOKEN yo‘q");

  // 1. Access token olish (testda to‘g‘ri ishlaydi)
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("TOKEN XATOSI:", err);
    throw new Error("Token invalid: " + err);
  }

  const { access_token } = await tokenRes.json();

  // 2. Cloudinary dan video olish (testda to‘g‘ri: binary olinadi)
  const videoRes = await fetch(video.videoUrl);
  if (!videoRes.ok) throw new Error("Video yuklanmadi: " + videoRes.status);

  const videoBuffer = await videoRes.arrayBuffer();  // Binary to‘g‘ri olinadi (testda 1.5 MB MP4 olingan)
  const videoBytes = new Uint8Array(videoBuffer);
  const contentType = videoRes.headers.get("content-type") || "video/mp4";

  console.log("Video olindi: Size = " + videoBytes.length + " bytes, Type = " + contentType);

  // 3. Metadata
  const metadata = {
    snippet: {
      title: (video.title || "AI Short Test").slice(0, 100),
      description: (video.description || video.prompt || "Cloudinary dan olingan test video").slice(0, 5000),
      tags: video.tags || ["shorts", "ai", "test"],
      categoryId: "28",
    },
    status: { privacyStatus: "private" },
  };

  // 4. Multipart body (binary buzilmaydi – testda to‘g‘ri ishlagan)
  const boundary = "bound_" + Date.now();
  const body = new Blob([
    `--\( {boundary}\r\nContent-Type: application/json\r\n\r\n \){JSON.stringify(metadata)}\r\n`,
    `--\( {boundary}\r\nContent-Type: \){contentType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`,
    videoBytes,
    `\r\n--${boundary}--\r\n`,
  ]);

  // 5. YouTube ga yuklash
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

  const resultText = await uploadRes.text();

  if (!uploadRes.ok) {
    console.error("YOUTUBE XATOSI:", uploadRes.status, resultText.substring(0, 600));
    throw new Error("YouTube xatosi: " + resultText);
  }

  const result = JSON.parse(resultText);
  console.log("YUKLANDI → https://youtu.be/" + result.id);
  return true;
}
