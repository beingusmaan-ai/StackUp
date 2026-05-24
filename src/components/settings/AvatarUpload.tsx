"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { toast } from "sonner";

interface Props {
  name: string;
  currentImage?: string | null;
}

export function AvatarUpload({ name, currentImage }: Props) {
  const { update } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage ?? null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/users/me/avatar", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      setPreview(json.imageUrl);
      await update({ image: json.imageUrl });
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setPreview(currentImage ?? null);
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setUploading(true);
    try {
      await fetch("/api/users/me/avatar", { method: "DELETE" });
      setPreview(null);
      await update({ image: null });
      toast.success("Profile picture removed");
    } catch {
      toast.error("Failed to remove picture");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Avatar with camera overlay */}
      <div className="relative group flex-shrink-0">
        <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-border">
          <UserAvatar name={name} image={preview} size="lg" className="w-16 h-16 text-lg" />
        </div>

        {/* Upload overlay */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
          title="Change photo"
        >
          {uploading
            ? <Loader2 className="w-5 h-5 text-white animate-spin" />
            : <Camera className="w-5 h-5 text-white" />
          }
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Labels + remove button */}
      <div>
        <p className="font-semibold text-foreground">{name}</p>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-[12px] text-[#e8170b] hover:underline disabled:opacity-50"
          >
            {preview ? "Change photo" : "Upload photo"}
          </button>
          {preview && (
            <>
              <span className="text-muted-foreground text-[12px]">·</span>
              <button
                onClick={() => void removeAvatar()}
                disabled={uploading}
                className="text-[12px] text-muted-foreground hover:text-red-500 flex items-center gap-1 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG or WebP · max 2 MB</p>
      </div>
    </div>
  );
}
