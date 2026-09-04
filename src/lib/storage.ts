import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const YEAR = 60 * 60 * 24 * 365;

/** Buckets are private, so display URLs are signed on demand. */
export async function signedUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, YEAR);
  return data?.signedUrl ?? null;
}

export function useSignedUrl(bucket: string, path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed", bucket, path],
    queryFn: () => signedUrl(bucket, path),
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
  });
}

export async function uploadImage(bucket: string, userId: string, file: File, prefix = "") {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${prefix}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}
