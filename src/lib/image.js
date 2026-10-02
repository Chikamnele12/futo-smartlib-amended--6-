import { supabase } from "./supabaseClient";

// Resource types that can have a cover image.
export const COVER_TYPES = ["academic_book", "ebook"];
export const COVER_BUCKET = "book-covers";

// Covers live at <resource id>.jpg in a public bucket, so no extra database column is needed.
export function coverUrl(resourceId) {
  return supabase.storage.from(COVER_BUCKET).getPublicUrl(`${resourceId}.jpg`).data.publicUrl;
}

// Shrinks a picked image to a small JPEG so covers load fast on phones.
export function resizeToJpeg(file, maxSide = 700, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the image."))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a readable image."));
    };
    img.src = url;
  });
}

export async function uploadCover(resourceId, file) {
  const blob = await resizeToJpeg(file);
  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(`${resourceId}.jpg`, blob, { contentType: "image/jpeg", upsert: true });
  return error;
}
