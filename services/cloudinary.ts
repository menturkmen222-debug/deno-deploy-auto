// services/cloudinary.ts

/**
 * Faylni Cloudinaryga yuklash
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", Deno.env.get("CLOUDINARY_UPLOAD_PRESET")!);
  formData.append("context", `upload_date=${new Date().toISOString()}`);
  formData.append("tags", "auto-shorts");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${Deno.env.get("CLOUDINARY_CLOUD_NAME")}/video/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.statusText} – ${errorText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

/**
 * Video URLni Cloudinaryga yuklash (masalan: https://example.com/video.mp4)
 */
export async function uploadUrlToCloudinary(videoUrl: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", videoUrl); // Cloudinary to'g'ridan-to'g'ri URL qabul qiladi
  formData.append("upload_preset", Deno.env.get("CLOUDINARY_UPLOAD_PRESET")!);
  formData.append("context", `upload_date=${new Date().toISOString()}`);
  formData.append("tags", "auto-shorts");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${Deno.env.get("CLOUDINARY_CLOUD_NAME")}/video/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary URL upload failed: ${res.statusText} – ${text}`);
  }

  const data = await res.json();
  return data.secure_url;
}
