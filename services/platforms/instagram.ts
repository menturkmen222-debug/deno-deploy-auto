import type { Env } from "../../index.ts";
import { Logger } from "../../utils/logger.ts";

export async function uploadToInstagram(env: Env, video: any): Promise<boolean> {
  const logger = new Logger(env);
  await logger.info("⚠️ Instagram upload stub ishladi", { videoId: video.id });
  return true;
}
