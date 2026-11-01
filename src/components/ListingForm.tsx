import { useState } from "react";
import { X, ImagePlus, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, CONDITIONS } from "@/lib/marketplace";
import { useSignedUrl } from "@/lib/storage";

export type ListingFormValues = {
  title: string;
  category: string;
  condition: string;
  price: string;
  quantity: string;
  description: string;
  city: string;
  campus: string;
  is_project: boolean;
  components_used: string;
  includes_code: boolean;
  includes_report: boolean;
  includes_hardware: boolean;
};

export const MAX_PHOTOS = 5;

const INCLUDES = [
  { key: "includes_code", label: "Source code" },
  { key: "includes_report", label: "Report / docs" },
  { key: "includes_hardware", label: "Working hardware" },
] as const;

export function ListingForm({
  values,
  onChange,
  existing = [],
  onRemoveExisting,
  files,
  onFilesChange,
  onSubmit,
  submitting,
  submitLabel,
}: {
  values: ListingFormValues;
  onChange: (v: ListingFormValues) => void;
  existing?: { id: string; image_url: string }[];
  onRemoveExisting?: (id: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [previews, setPreviews] = useState<string[]>([]);
  const total = existing.length + files.length;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).slice(0, MAX_PHOTOS - total);
    onFilesChange([...files, ...next]);
    setPreviews((p) => [...p, ...next.map((f) => URL.createObjectURL(f))]);
  }

  function removeFile(i: number) {
    onFilesChange(files.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  }

  const set = (patch: Partial<ListingFormValues>) => onChange({ ...values, ...patch });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2">
        <Label>Photos ({total}/{MAX_PHOTOS})</Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {existing.map((img) => (
            <ExistingPhoto key={img.id} path={img.image_url} onRemove={() => onRemoveExisting?.(img.id)} />
          ))}
          {previews.map((src, i) => (
            <div key={src} className="relative">
              <img src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />
              <RemoveBtn onClick={() => removeFile(i)} />
            </div>
          ))}
          {total < MAX_PHOTOS && (
            <label className="circuit grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-border bg-secondary text-muted-foreground">
              <ImagePlus className="size-5" />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          required
          value={values.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="ESP32 DevKit V1"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={values.category} onValueChange={(v) => set({ category: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Condition</Label>
          <Select value={values.condition} onValueChange={(v) => set({ condition: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a condition" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price (₹ each)</Label>
          <Input
            id="price"
            inputMode="numeric"
            required
            value={values.price}
            onChange={(e) => set({ price: e.target.value.replace(/[^\d.]/g, "") })}
            placeholder="250"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            inputMode="numeric"
            required
            value={values.quantity}
            onChange={(e) => set({ quantity: e.target.value.replace(/\D/g, "") })}
            placeholder="1"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          value={values.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Barely used, soldered headers, tested with Arduino IDE."
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor="is-project" className="inline-flex items-center gap-1.5">
              <FolderGit2 className="size-4 text-primary" /> Completed project
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Selling a finished project? Add what it does and what is included.
            </p>
          </div>
          <Switch
            id="is-project"
            checked={values.is_project}
            onCheckedChange={(v) => set({ is_project: v })}
          />
        </div>

        {values.is_project && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="components-used">Components used</Label>
              <Textarea
                id="components-used"
                rows={2}
                value={values.components_used}
                onChange={(e) => set({ components_used: e.target.value })}
                placeholder="ESP32, DHT22, 16x2 LCD, jumper wires"
              />
            </div>
            <div>
              <Label>What is included</Label>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {INCLUDES.map(({ key, label }) => (
                  <label key={key} className="inline-flex cursor-pointer items-center gap-1.5">
                    <Checkbox
                      checked={values[key]}
                      onCheckedChange={(v) => set({ [key]: v === true } as Partial<ListingFormValues>)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={values.city}
            onChange={(e) => set({ city: e.target.value })}
            placeholder="Chennai"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="campus">Campus / area</Label>
          <Input
            id="campus"
            value={values.campus}
            onChange={(e) => set({ campus: e.target.value })}
            placeholder="SRM Kattankulathur"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

function ExistingPhoto({ path, onRemove }: { path: string; onRemove: () => void }) {
  const { data: url } = useSignedUrl("listing-images", path);
  return (
    <div className="relative">
      {url ? (
        <img src={url} alt="" className="aspect-square w-full rounded-xl object-cover" />
      ) : (
        <div className="aspect-square w-full rounded-xl bg-secondary" />
      )}
      <RemoveBtn onClick={onRemove} />
    </div>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove photo"
      className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-foreground text-background"
    >
      <X className="size-3.5" />
    </button>
  );
}
