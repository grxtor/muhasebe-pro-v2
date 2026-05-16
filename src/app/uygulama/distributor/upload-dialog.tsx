"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@heroui/react";
import {
  FileSpreadsheet,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { DataModal } from "@/components/ui/data-modal";
import { Field, Label, TextInput, Select } from "@/components/ui/form-field";
import { parseCsv, createDistributorRapor, type ParsedCsv } from "./actions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (raporId: number) => void;
}

type Step = 1 | 2 | 3;

function nowDonem(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

export function UploadDialog({ isOpen, onClose, onSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);

  // Adım 1 alanları
  const [ad, setAd] = useState("");
  const [platform, setPlatform] = useState("Spotify");
  const [donem, setDonem] = useState(nowDonem());
  const [paraBirimi, setParaBirimi] = useState("TRY");

  // Adım 3 mapping
  const [colTrack, setColTrack] = useState("");
  const [colRevenue, setColRevenue] = useState("");
  const [colStreams, setColStreams] = useState("");

  const [parsing, startParse] = useTransition();
  const [saving, startSave] = useTransition();

  function reset() {
    setStep(1);
    setFile(null);
    setParsed(null);
    setAd("");
    setPlatform("Spotify");
    setDonem(nowDonem());
    setParaBirimi("TRY");
    setColTrack("");
    setColRevenue("");
    setColStreams("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!ad) {
      // Dosya adından öneri (uzantısız)
      const dotIdx = f.name.lastIndexOf(".");
      setAd(dotIdx > 0 ? f.name.slice(0, dotIdx) : f.name);
    }
  }

  function gotoStep2() {
    if (!file) {
      toast.error("CSV dosyası seç");
      return;
    }
    if (!ad.trim()) {
      toast.error("Rapor adı zorunlu");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(donem)) {
      toast.error("Dönem yyyy-MM formatında olmalı");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    startParse(async () => {
      const res = await parseCsv(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const data = res.data;
      if (!data) {
        toast.error("Parse sonucu boş");
        return;
      }
      setParsed(data);
      // Mapping otomatik öneri
      autoSuggestMapping(data.columns);
      setStep(2);
    });
  }

  function autoSuggestMapping(cols: string[]) {
    const lower = cols.map((c) => c.toLowerCase());
    const find = (kws: string[]): string => {
      for (const kw of kws) {
        const idx = lower.findIndex((c) => c.includes(kw));
        if (idx >= 0) return cols[idx];
      }
      return "";
    };
    setColTrack(
      find(["track", "song", "video", "title", "şarkı", "isim", "name"]),
    );
    setColRevenue(
      find(["revenue", "earnings", "amount", "kazanç", "gelir", "total"]),
    );
    setColStreams(find(["stream", "play", "view", "dinleme", "izlenme"]));
  }

  function gotoStep3() {
    if (!parsed) return;
    setStep(3);
  }

  function handleSave() {
    if (!file || !parsed) return;
    if (!colTrack) {
      toast.error("Track/Video adı sütunu seç");
      return;
    }
    if (!colRevenue) {
      toast.error("Gelir sütunu seç");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("ad", ad);
    fd.append("platform", platform);
    fd.append("donem", donem);
    fd.append("paraBirimi", paraBirimi);
    fd.append("mapping.trackName", colTrack);
    fd.append("mapping.revenue", colRevenue);
    if (colStreams) fd.append("mapping.streams", colStreams);

    startSave(async () => {
      const res = await createDistributorRapor(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Rapor oluşturuldu");
      const id = res.data?.id;
      reset();
      if (id) onSaved(id);
      else onClose();
    });
  }

  const ilkBesSatir = parsed ? parsed.preview.slice(0, 5) : [];
  const sutunlar = parsed?.columns ?? [];

  const footer = (
    <>
      <Button
        variant="ghost"
        size="md"
        onPress={handleClose}
        isDisabled={parsing || saving}
      >
        İptal
      </Button>
      {step === 1 && (
        <Button
          variant="primary"
          size="md"
          onPress={gotoStep2}
          isDisabled={parsing || !file}
        >
          <span className="flex items-center gap-1.5">
            {parsing ? "Okunuyor…" : "Devam"} <ArrowRight size={14} />
          </span>
        </Button>
      )}
      {step === 2 && (
        <>
          <Button variant="ghost" size="md" onPress={() => setStep(1)}>
            <span className="flex items-center gap-1.5">
              <ArrowLeft size={14} /> Geri
            </span>
          </Button>
          <Button variant="primary" size="md" onPress={gotoStep3}>
            <span className="flex items-center gap-1.5">
              Sütunları Eşle <ArrowRight size={14} />
            </span>
          </Button>
        </>
      )}
      {step === 3 && (
        <>
          <Button
            variant="ghost"
            size="md"
            onPress={() => setStep(2)}
            isDisabled={saving}
          >
            <span className="flex items-center gap-1.5">
              <ArrowLeft size={14} /> Geri
            </span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onPress={handleSave}
            isDisabled={saving}
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </>
      )}
    </>
  );

  return (
    <DataModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Yeni Distribütör Raporu"
      description={`Adım ${step} / 3`}
      size="xl"
      footer={footer}
    >
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <Label htmlFor="ad" required>
                Rapor Adı
              </Label>
              <TextInput
                id="ad"
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                placeholder="Spotify Mart 2026"
              />
            </Field>
            <Field>
              <Label htmlFor="platform">Platform</Label>
              <Select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="Spotify">Spotify</option>
                <option value="YouTube">YouTube</option>
                <option value="Apple Music">Apple Music</option>
                <option value="Diğer">Diğer</option>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="donem" required hint="yyyy-MM">
                Dönem
              </Label>
              <TextInput
                id="donem"
                type="month"
                value={donem}
                onChange={(e) => setDonem(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="paraBirimi">Para Birimi</Label>
              <Select
                id="paraBirimi"
                value={paraBirimi}
                onChange={(e) => setParaBirimi(e.target.value)}
              >
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Select>
            </Field>
          </div>

          <div
            className="rounded-lg border-2 border-dashed p-6 text-center"
            style={{
              borderColor: "var(--border-strong)",
              background: "var(--surface-muted)",
            }}
          >
            <FileSpreadsheet
              size={36}
              className="mx-auto mb-3"
              style={{ color: "var(--text-muted)" }}
            />
            {file ? (
              <>
                <p className="text-sm font-medium">{file.name}</p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">CSV / XLSX dosyası seç</p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Spotify, YouTube veya Apple Music gelir raporu
                </p>
              </>
            )}
            <label className="mt-4 inline-block cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                onChange={onFileSelected}
                className="hidden"
              />
              <span
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-foreground)",
                }}
              >
                <FileSpreadsheet size={14} />
                {file ? "Farklı dosya seç" : "Dosya seç"}
              </span>
            </label>
          </div>
        </div>
      )}

      {step === 2 && parsed && (
        <div className="space-y-4">
          <div
            className="flex items-center gap-2 rounded-lg border p-3 text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--positive-soft)",
              color: "var(--positive)",
            }}
          >
            <CheckCircle2 size={16} />
            <span className="flex-1">
              <strong>{file?.name}</strong> okundu — toplam{" "}
              <strong>{parsed.totalRows}</strong> satır,{" "}
              <strong>{parsed.columns.length}</strong> sütun.
            </span>
          </div>

          <div>
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Önizleme (ilk 5 satır)
            </div>
            <div
              className="overflow-x-auto rounded-lg border"
              style={{ borderColor: "var(--border)" }}
            >
              <table className="w-full text-xs">
                <thead
                  className="text-left"
                  style={{
                    background: "var(--surface-muted)",
                    color: "var(--text-muted)",
                  }}
                >
                  <tr>
                    {sutunlar.map((s) => (
                      <th
                        key={s}
                        className="px-3 py-2 font-medium whitespace-nowrap"
                      >
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ilkBesSatir.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        borderTop:
                          i === 0 ? "none" : "1px solid var(--border)",
                      }}
                    >
                      {sutunlar.map((s) => (
                        <td
                          key={s}
                          className="px-3 py-2 whitespace-nowrap"
                          style={{ color: "var(--text)" }}
                        >
                          {formatCell(row[s])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 3 && parsed && (
        <div className="space-y-4">
          <div
            className="flex items-start gap-2 rounded-lg border p-3 text-xs"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-muted)",
              color: "var(--text-muted)",
            }}
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <p>
              Hangi sütunun ne olduğunu seç. Gelir sütunu zorunlu; stream sayısı
              opsiyonel. Otomatik öneri yapıldı — gerekirse düzelt.
            </p>
          </div>

          <Field>
            <Label htmlFor="col-track" required>
              Track / Video adı sütunu
            </Label>
            <Select
              id="col-track"
              value={colTrack}
              onChange={(e) => setColTrack(e.target.value)}
            >
              <option value="">— Seç —</option>
              {sutunlar.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label htmlFor="col-revenue" required>
              Gelir sütunu
            </Label>
            <Select
              id="col-revenue"
              value={colRevenue}
              onChange={(e) => setColRevenue(e.target.value)}
            >
              <option value="">— Seç —</option>
              {sutunlar.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label htmlFor="col-streams" hint="opsiyonel">
              Stream / İzlenme sayısı sütunu
            </Label>
            <Select
              id="col-streams"
              value={colStreams}
              onChange={(e) => setColStreams(e.target.value)}
            >
              <option value="">— Yok —</option>
              {sutunlar.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
    </DataModal>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toLocaleString("tr-TR");
  if (typeof value === "boolean") return value ? "Evet" : "Hayır";
  if (value instanceof Date) return value.toLocaleDateString("tr-TR");
  return String(value);
}
