const IG_TOKENS: Record<ChannelId, string> = {
  channel_1: Deno.env.get("IG_TOKEN_1")!,
  channel_2: Deno.env.get("IG_TOKEN_2")!,
  channel_3: Deno.env.get("IG_TOKEN_3")!,
  channel_4: Deno.env.get("IG_TOKEN_4")!,
  channel_5: Deno.env.get("IG_TOKEN_5")!,
};

export async function uploadToInstagram(video: any): Promise<boolean> {
  const token = IG_TOKENS[video.channelId];
  console.log(`[Instagram] Uploading to ${video.channelId}`);
  return true;
}
