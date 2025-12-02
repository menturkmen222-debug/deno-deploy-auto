// services/platforms/facebook.ts
import { VideoRequest } from "../../types.ts";

const FB_TOKENS: Record<string, string> = {
  tech_buni: Deno.env.get("TECH_BUNI_FB_TOKEN")!,
  cooking_buni: Deno.env.get("COOKING_BUNI_FB_TOKEN")!,
  travel_buni: Deno.env.get("TRAVEL_BUNI_FB_TOKEN")!,
  gaming_buni: Deno.env.get("GAMING_BUNI_FB_TOKEN")!,
  life_buni: Deno.env.get("LIFE_BUNI_FB_TOKEN")!,
};

export async function uploadToFacebook(video: VideoRequest): Promise<boolean> {
  const token = FB_TOKENS[video.channelName];
  if (!token) throw new Error(`Facebook token not found for ${video.channelName}`);

  const formData = new FormData();
  formData.append("file_url", video.videoUrl);
  formData.append("title", video.title || "AI Short");
  formData.append("description", video.description || video.prompt);
  formData.append("access_token", token);

  const res = await fetch("https://graph.facebook.com/v21.0/me/videos", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Facebook upload failed:", err);
    throw new Error(`Facebook upload error: ${res.status}`);
  }

  console.log(`[Facebook] ✅ ${video.channelName} — ${video.title}`);
  return true;
}
