import type { Env } from "../../index.ts";
import { Logger } from "../../utils/logger.ts";
 
export async function uploadToFacebook(env: Env, video: any): Promise<boolean> {
  const logger = new Logger(env);
  await logger.info("⚠️ Facebook upload stub ishladi", { videoId: video.id });
  return true;
}
