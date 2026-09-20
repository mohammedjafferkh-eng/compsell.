import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const LISTING_SELECT =
  "id,seller_id,title,category,condition,price,quantity,description,city,campus,status,created_at,listing_images(image_url,sort_order)";

export type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  city: string | null;
  campus: string | null;
  rating: number;
  review_count: number;
  whatsapp?: string | null;
  created_at: string;
};

// Contact number is intentionally excluded: only signed-in users may read it.
export const PUBLIC_PROFILE_SELECT = "id,name,avatar_url,city,campus,rating,review_count,created_at";

export function useProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(PUBLIC_PROFILE_SELECT)
        .eq("id", userId ?? "")
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

/** WhatsApp number of a profile — only fetched for signed-in viewers. */
export function useProfileWhatsapp(userId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["profile-whatsapp", userId],
    enabled: !!userId && enabled,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("whatsapp")
        .eq("id", userId ?? "")
        .maybeSingle();
      if (error) throw error;
      return (data?.whatsapp as string | null) ?? null;
    },
  });
}

export type Filters = {
  q?: string;
  category?: string | null;
  condition?: string | null;
  min?: number | null;
  max?: number | null;
  place?: string;
  sort?: string;
  includeSold?: boolean;
};

export function useListings(filters: Filters, myPlace?: { city?: string | null; campus?: string | null }) {
  return useQuery({
    queryKey: ["listings", filters, myPlace?.city, myPlace?.campus],
    queryFn: async () => {
      let query = supabase.from("listings").select(LISTING_SELECT);
      if (!filters.includeSold) query = query.eq("status", "ACTIVE");
      if (filters.q) query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.condition) query = query.eq("condition", filters.condition);
      if (filters.min != null) query = query.gte("price", filters.min);
      if (filters.max != null) query = query.lte("price", filters.max);
      if (filters.place) query = query.or(`city.ilike.%${filters.place}%,campus.ilike.%${filters.place}%`);

      if (filters.sort === "price_asc") query = query.order("price", { ascending: true });
      else if (filters.sort === "price_desc") query = query.order("price", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      const { data, error } = await query.limit(120);
      if (error) throw error;
      let rows = data ?? [];

      if (filters.sort === "nearby" && (myPlace?.campus || myPlace?.city)) {
        const score = (l: { city: string | null; campus: string | null }) =>
          l.campus && myPlace?.campus && l.campus.toLowerCase() === myPlace.campus.toLowerCase()
            ? 0
            : l.city && myPlace?.city && l.city.toLowerCase() === myPlace.city.toLowerCase()
              ? 1
              : 2;
        rows = [...rows].sort((a, b) => score(a) - score(b));
      }
      return rows;
    },
  });
}
