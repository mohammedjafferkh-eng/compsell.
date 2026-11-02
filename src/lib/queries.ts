import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const LISTING_SELECT =
  "id,seller_id,title,category,condition,price,quantity,description,city,campus,status,created_at,is_project,components_used,includes_code,includes_report,includes_hardware,listing_images(image_url,sort_order)";

export type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  city: string | null;
  campus: string | null;
  rating: number;
  review_count: number;
  whatsapp: string | null;
  verified: boolean;
  created_at: string;
};

export function useProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId ?? "")
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
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

export function useOwnerRole(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["my-owner-role", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId ?? "")
        .eq("role", "owner")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSavedIds(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["saved-ids", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_listings").select("listing_id");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.listing_id));
    },
  });
}

export function useFollowState(userId: string | null | undefined, sellerId: string) {
  return useQuery({
    queryKey: ["follow", userId, sellerId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_follows")
        .select("id")
        .eq("follower_id", userId ?? "")
        .eq("seller_id", sellerId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useFollowerCount(sellerId: string) {
  return useQuery({
    queryKey: ["follower-count", sellerId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("seller_follows")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
