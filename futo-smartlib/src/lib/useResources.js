import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useResources(type, { faculty, search } = {}) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      let query = supabase
        .from("resources_with_ratings")
        .select("*")
        .eq("type", type)
        .order("created_at", { ascending: false });

      if (faculty && faculty !== "All") query = query.eq("faculty", faculty);
      if (search) query = query.ilike("title", `%${search}%`);

      const { data, error: fetchError } = await query;

      if (cancelled) return;
      if (fetchError) setError(fetchError.message);
      else setResources(data || []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [type, faculty, search]);

  return { resources, loading, error };
}

export async function incrementDownload(resourceId, currentCount) {
  await supabase.from("resources").update({ downloads_count: (currentCount || 0) + 1 }).eq("id", resourceId);
}

export async function getFileUrl(bucket, path) {
  if (!path) return null;
  if (bucket === "resource-files") {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
    return error ? null : data.signedUrl;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
