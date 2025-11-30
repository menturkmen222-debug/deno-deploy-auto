export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", Deno.env.get("CLOUDINARY_UPLOAD_PRESET")!);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${Deno.env.get("CLOUDINARY_CLOUD_NAME")}/video/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.statusText}`);
  const data = await res.json();
  return data.secure_url;
}
