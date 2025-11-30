const FB_TOKENS: Record<ChannelId, string> = {
  channel_1: Deno.env.get("FB_TOKEN_1")!,
  channel_2: Deno.env.get("FB_TOKEN_2")!,
  channel_3: Deno.env.get("FB_TOKEN_3")!,
  channel_4: Deno.env.get("FB_TOKEN_4")!,
  channel_5: Deno.env.get("FB_TOKEN_5")!,
};

export async function uploadToFacebook(video: any): Promise<boolean> {
  const token = FB_TOKENS[video.channelId];
  console.log(`[Facebook] Uploading to ${video.channelId}`);
  return true;
}
