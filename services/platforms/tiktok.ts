import type { Env } from "../../index.ts";
import { Logger } from "../../utils/logger.ts";

export async function uploadToTikTok(env: Env, video: any): Promise<boolean> {
  const logger = new Logger(env);
  await logger.info("⚠️ TikTok upload stub ishladi", { videoId: video.id });
  return true; // faqat stub, ishlayotganini ko‘rsatadi
}
