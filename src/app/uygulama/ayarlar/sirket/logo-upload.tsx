"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "../profil-form";
import { uploadLogo, deleteLogo } from "../actions";

export function LogoUpload({ currentUrl }: { currentUrl: string | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [preview, setPreview] = useState<string | null>(currentUrl);

  function onPick() {
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Dosya çok büyük (max 10 MB)");
      return;
    }
    if (
      ![
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/svg+xml",
        "image/webp",
      ].includes(file.type)
    ) {
      toast.error("Sadece PNG, JPG, SVG, WEBP destekleniyor");
      return;
    }

    // Optimistic preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    start(async () => {
      const fd = new FormData();
      fd.set("logo", file);
      const r = await uploadLogo(fd);
      if (r.ok) {
        toast.success("Logo yüklendi");
        setPreview(r.url);
        router.refresh();
      } else {
        toast.error(r.error);
        setPreview(currentUrl); // rollback
      }
    });
  }

  function onDelete() {
    if (!preview) return;
    startDelete(async () => {
      const r = await deleteLogo();
      if (r.ok) {
        toast.success("Logo silindi");
        setPreview(null);
        router.refresh();
      } else {
        toast.error("error" in r ? r.error : "Hata");
      }
    });
  }

  return (
    <SectionCard
      title="Logo"
      description="Faturalarda ve dekontlarda sol üstte görünür — PNG, JPG, SVG, WEBP (max 10 MB)"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        onChange={onFileChange}
        className="hidden"
      />
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-xl border"
          style={{
            background: "var(--surface-muted)",
            borderColor: "var(--border-strong)",
            borderStyle: preview ? "solid" : "dashed",
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Logo önizleme"
              className="size-full object-contain"
            />
          ) : (
            <ImageIcon
              size={28}
              style={{ color: "var(--text-soft)" }}
            />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            {preview
              ? "Logo yüklü. Yeni bir dosya seçerek değiştirebilirsiniz."
              : "Henüz logo yüklenmemiş."}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onPress={onPick}
              isDisabled={pending || deleting}
            >
              <span className="inline-flex items-center gap-1.5">
                <Upload size={14} /> {pending ? "Yükleniyor…" : preview ? "Değiştir" : "Logo Seç"}
              </span>
            </Button>
            {preview && (
              <Button
                variant="ghost"
                size="sm"
                onPress={onDelete}
                isDisabled={pending || deleting}
              >
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{ color: "var(--negative)" }}
                >
                  <Trash2 size={14} /> {deleting ? "Siliniyor…" : "Sil"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
