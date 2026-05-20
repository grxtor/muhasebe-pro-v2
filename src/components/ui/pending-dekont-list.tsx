"use client";

import { useRef } from "react";
import {
  Paperclip,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@heroui/react";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function FileTypeIcon({ mime }: { mime: string }) {
  if (mime.startsWith("image/")) return <ImageIcon size={14} />;
  return <FileText size={14} />;
}

/**
 * PendingDekontList — yeni kayıt sırasında dosyaları memory'de toplar.
 * Submit'te parent kayıt id'sini alıp gerçek upload'ı yapar.
 * Audit/Kullanıcı isteği: yeni kayıtta dekont eklemek için 2-adım gerekmesin.
 */
export function PendingDekontList({ files, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  function onPickFiles() {
    fileRef.current?.click();
  }

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    const fresh: File[] = [];
    for (const f of picked) {
      if (!ALLOWED_MIME.includes(f.type)) continue;
      if (f.size > MAX_BYTES) continue;
      fresh.push(f);
    }
    onChange([...files, ...fresh]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeAt(i: number) {
    onChange(files.filter((_, idx) => idx !== i));
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
          Ekli Dosyalar ({files.length})
        </div>
        <Button variant="ghost" size="sm" onPress={onPickFiles}>
          <span className="inline-flex items-center gap-1.5">
            <Upload size={13} /> Dosya Ekle
          </span>
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ALLOWED_MIME.join(",")}
        onChange={onFilesChange}
        className="hidden"
      />

      {files.length === 0 ? (
        <div
          className="py-3 text-center text-xs"
          style={{ color: "var(--text-soft)" }}
        >
          PDF veya görsel ekleyebilirsin (max 10 MB / dosya)
        </div>
      ) : (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-xs"
              style={{ background: "var(--surface)" }}
            >
              <FileTypeIcon mime={f.type} />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span style={{ color: "var(--text-soft)" }}>
                {formatBytes(f.size)}
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Kaldır"
                className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: "var(--negative)" }}
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
