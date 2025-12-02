// services/platforms/tiktok.ts
import { VideoRequest } from "../../types.ts";

const TIKTOK_TOKENS: Record<string, string> = {
  tech_buni: Deno.env.get("TECH_BUNI_TT_TOKEN")!,
  cooking_buni: Deno.env.get("COOKING_BUNI_TT_TOKEN")!,
  travel_buni: Deno.env.get("TRAVEL_BUNI_TT_TOKEN")!,
  gaming_buni: Deno.env.get("GAMING_BUNI_TT_TOKEN")!,
  life_buni: Deno.env.get("LIFE_BUNI_TT TOKEN")!,
};

export async function uploadToTikTok(video: VideoRequest): Promise<boolean> {
  const token = TIKTOK_TOKENS[video.channelName];
  if (!token) throw new Error(`TikTok token not found for ${video.channelName}`);

  // 1. Video yuklash
  const videoRes = await fetch(video.videoUrl);
  const videoBlob = await videoRes.blob();

  // 2. TikTok Business API
  const formData = new FormData();
  formData.append("video", videoBlob, "video.mp4");
  formData.append("title", video.title || "AI Shorts");
  formData.append("access_token", token);

  const res = await fetch("https://open.tiktokapis.com/v2/post/publish/", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("TikTok upload failed:", err);
    throw new Error(`TikTok upload error: ${res.status}`);
  }

  console.log(`[TikTok] ✅ ${video.channelName} — ${video.title}`);
  return true;
}
