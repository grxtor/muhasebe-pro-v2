"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  Paperclip,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
} from "lucide-react";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import {
  listFaturaDekontlari,
  uploadFaturaDekonti,
  deleteFaturaDekonti,
  type DekontDto,
} from "./dekont-actions";

interface Props {
  faturaId: number;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(mime: string | null) {
  if (mime?.startsWith("image/")) return ImageIcon;
  return FileText;
}

export function DekontList({ faturaId }: Props) {
  const [items, setItems] = useState<DekontDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listFaturaDekontlari(faturaId).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [faturaId]);

  function onPickFiles() {
    fileRef.current?.click();
  }

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    startUpload(async () => {
      const fd = new FormData();
      for (const f of files) fd.append("dosya", f);
      const r = await uploadFaturaDekonti(faturaId, fd);
      if (r.ok) {
        toast.success(`${r.data?.length ?? 0} dosya yüklendi`);
        // Listeyi yenile
        const fresh = await listFaturaDekontlari(faturaId);
        setItems(fresh);
      } else {
        toast.error(r.error);
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  async function onDelete(id: number) {
    if (!confirm("Bu dekont silinsin mi?")) return;
    const r = await deleteFaturaDekonti(id);
    if (r.ok) {
      toast.success("Dekont silindi");
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      toast.error(r.error);
    }
  }

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        background: "var(--surface-muted)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Paperclip size={14} />
          Ekli Dosyalar ({items.length})
        </div>
        <Button
          variant="ghost"
          size="sm"
          onPress={onPickFiles}
          isDisabled={uploading}
        >
          <span className="inline-flex items-center gap-1.5">
            <Upload size={13} /> {uploading ? "Yükleniyor…" : "Dosya Ekle"}
          </span>
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/gif"
        onChange={onFilesChange}
        className="hidden"
      />

      {loading ? (
        <div
          className="py-4 text-center text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          Yükleniyor…
        </div>
      ) : items.length === 0 ? (
        <div
          className="py-4 text-center text-xs"
          style={{ color: "var(--text-soft)" }}
        >
          Henüz dekont eklenmemiş. PDF, görsel ekleyebilirsin.
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((d) => {
            const Icon = fileIcon(d.mimeTip);
            return (
              <li
                key={d.id}
                className="flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <Icon
                  size={14}
                  style={{ color: "var(--text-muted)" }}
                  className="shrink-0"
                />
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate hover:underline"
                  title={d.dosyaAdi}
                >
                  {d.dosyaAdi}
                </a>
                <span
                  className="shrink-0 text-xs tabular-nums"
                  style={{ color: "var(--text-soft)" }}
                >
                  {formatBytes(d.boyut)}
                </span>
                <a
                  href={d.url}
                  download={d.dosyaAdi}
                  className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="İndir"
                  title="İndir"
                >
                  <Download size={13} />
                </a>
                <button
                  onClick={() => onDelete(d.id)}
                  className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
                  style={{ color: "var(--negative)" }}
                  aria-label="Sil"
                  title="Sil"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
