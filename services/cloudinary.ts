// services/cloudinary.ts
import type { Env } from "../index.ts";

export async function uploadToCloudinary(env: Env, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", env.CLOUDINARY_UPLOAD_PRESET);
  formData.append("context", `upload_date=${new Date().toISOString()}`);
  formData.append("tags", "auto-shorts");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/video/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.statusText} – ${errorText}`);
  }

  const data = await res.json();
  return data.secure_url.trim();
}

export async function uploadUrlToCloudinary(env: Env, videoUrl: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", videoUrl);
  formData.append("upload_preset", env.CLOUDINARY_UPLOAD_PRESET);
  formData.append("context", `upload_date=${new Date().toISOString()}`);
  formData.append("tags", "auto-shorts");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/video/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary URL upload failed: ${res.statusText} – ${text}`);
  }

  const data = await res.json();
  return data.secure_url.trim();
}
