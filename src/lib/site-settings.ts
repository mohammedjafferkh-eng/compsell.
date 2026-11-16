import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_ABOUT = "Good components deserve another project. compsell connects students and makers to buy, sell and reuse electronics—from a spare sensor to a completed build.";
export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", "main").maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}
export function useSiteEditor(userId: string | undefined) {
  return useQuery({
    queryKey: ["site-editor", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("can_edit_site");
      if (error) throw error;
      return data === true;
    },
  });
}