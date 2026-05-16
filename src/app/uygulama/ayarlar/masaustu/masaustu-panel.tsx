"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import {
  Monitor,
  Power,
  Database,
  Trash2,
  RefreshCw,
  Globe,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Terminal,
  Info,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "../profil-form";
import { Field, Label, TextInput } from "@/components/ui/form-field";
import { useIsElectron, type PlatformInfo } from "@/lib/hooks/use-electron";
import { useUpdater } from "@/lib/hooks/use-updater";

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function zoomPercent(level: number): number {
  // Electron zoom level: -3..3, her birim ~20%
  return Math.round(100 * Math.pow(1.2, level));
}

export function MasaustuPanel() {
  const isElectron = useIsElectron();
  const updater = useUpdater();
  const [info, setInfo] = useState<PlatformInfo | null>(null);
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const [appUrl, setAppUrl] = useState("");
  const [appUrlInput, setAppUrlInput] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [checking, setChecking] = useState(false);

  async function manualCheck() {
    setChecking(true);
    try {
      await updater.check();
      // status 1-2 sn içinde güncellenir
      setTimeout(() => {
        const s = updater.status;
        if (s.state === "not-available") {
          toast.success("Zaten en güncel sürümdesin");
        }
      }, 2000);
    } catch {
      toast.error("Kontrol başarısız");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!isElectron || !window.muhasebePro) return;
    const api = window.muhasebePro;

    void api.getPlatformInfo().then(setInfo);
    void api.getAutoLaunch().then(setAutoLaunch);
    void api.getZoomLevel().then(setZoomLevel);
    void api.getCacheSize().then(setCacheSize);
    void api.getAppUrl().then((u) => {
      setAppUrl(u);
      setAppUrlInput(u);
    });
  }, [isElectron]);

  if (!isElectron) {
    return (
      <SectionCard title="Masaüstü Ayarları">
        <div
          className="flex items-start gap-3 rounded-lg border p-4 text-sm"
          style={{
            background: "var(--warning-soft)",
            borderColor:
              "color-mix(in oklch, var(--warning) 30%, transparent)",
            color: "var(--warning)",
          }}
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Masaüstü uygulamasında değilsin</div>
            <div
              className="mt-0.5 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Bu ayarlar yalnızca Muhasebe Pro masaüstü uygulamasında çalışır.
              Tarayıcıdan girdiysen burası boş görünecektir.
            </div>
          </div>
        </div>
      </SectionCard>
    );
  }

  const api = window.muhasebePro!;

  async function toggleAutoLaunch() {
    const next = !autoLaunch;
    setAutoLaunch(next);
    try {
      await api.setAutoLaunch(next);
      toast.success(
        next
          ? "Açılışta otomatik başlatma açıldı"
          : "Açılışta otomatik başlatma kapatıldı",
      );
    } catch {
      toast.error("Ayar uygulanamadı");
      setAutoLaunch(!next);
    }
  }

  async function applyZoom(newLevel: number) {
    const clamped = Math.max(-3, Math.min(3, newLevel));
    setZoomLevel(clamped);
    await api.setZoomLevel(clamped);
  }

  async function clearCache() {
    setClearingCache(true);
    try {
      await api.clearCache();
      const newSize = await api.getCacheSize();
      setCacheSize(newSize);
      toast.success("Önbellek temizlendi");
    } catch {
      toast.error("Önbellek temizlenemedi");
    } finally {
      setClearingCache(false);
    }
  }

  async function refreshCacheSize() {
    setCacheSize(null);
    const size = await api.getCacheSize();
    setCacheSize(size);
  }

  async function saveAppUrl() {
    if (!appUrlInput || appUrlInput === appUrl) return;
    setSavingUrl(true);
    try {
      const ok = await api.setAppUrl(appUrlInput);
      if (ok) {
        toast.success("Sunucu adresi güncellendi — sayfa yeniden yükleniyor");
        setAppUrl(appUrlInput);
      } else {
        toast.error("Geçersiz URL — http(s):// ile başlamalı");
      }
    } catch {
      toast.error("Adres güncellenemedi");
    } finally {
      setSavingUrl(false);
    }
  }

  async function resetAppUrl() {
    setAppUrlInput("https://muhasebe.oceanyazilim.com");
    setSavingUrl(true);
    try {
      await api.setAppUrl("https://muhasebe.oceanyazilim.com");
      setAppUrl("https://muhasebe.oceanyazilim.com");
      toast.success("Varsayılan sunucuya döndü");
    } finally {
      setSavingUrl(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Sunucu adresi */}
      <SectionCard
        title="Sunucu Adresi"
        description="Masaüstü uygulamasının bağlanacağı sunucu adresi. Kendi sunucunda host'luyorsan değiştirebilirsin."
      >
        <Field>
          <Label htmlFor="appUrl">Aktif Sunucu</Label>
          <div className="flex gap-2">
            <TextInput
              id="appUrl"
              value={appUrlInput}
              onChange={(e) => setAppUrlInput(e.target.value)}
              placeholder="https://muhasebe.oceanyazilim.com"
              autoComplete="url"
              spellCheck={false}
            />
            <Button
              variant="primary"
              size="md"
              isDisabled={savingUrl || appUrlInput === appUrl}
              onPress={saveAppUrl}
            >
              Kaydet
            </Button>
            <Button
              variant="ghost"
              size="md"
              isDisabled={savingUrl}
              onPress={resetAppUrl}
            >
              <span className="inline-flex items-center gap-1.5">
                <RotateCcw size={14} /> Varsayılan
              </span>
            </Button>
          </div>
          <p
            className="mt-1.5 text-xs"
            style={{ color: "var(--text-soft)" }}
          >
            💡 Aktif: {appUrl || "—"}
          </p>
        </Field>
      </SectionCard>

      {/* Davranış */}
      <SectionCard
        title="Davranış"
        description="Açılış ve görünüm tercihleri"
      >
        <div className="space-y-4">
          {/* Auto-launch */}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
            style={{ borderColor: "var(--border)" }}
          >
            <input
              type="checkbox"
              checked={autoLaunch}
              onChange={toggleAutoLaunch}
              className="mt-0.5 size-4"
              style={{ accentColor: "var(--accent)" }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Power size={14} /> Bilgisayar açıldığında otomatik başlat
              </div>
              <div
                className="mt-0.5 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Sistem başladığında Muhasebe Pro arka planda otomatik açılır.
              </div>
            </div>
          </label>

          {/* Zoom */}
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">Yakınlaştırma</div>
                <div
                  className="mt-0.5 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Mevcut: {zoomPercent(zoomLevel)}%
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => applyZoom(zoomLevel - 1)}
                  className="rounded-md border p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
                  style={{ borderColor: "var(--border-strong)" }}
                  aria-label="Uzaklaştır"
                  title="Uzaklaştır"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  onClick={() => applyZoom(0)}
                  className="rounded-md border px-2 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10"
                  style={{ borderColor: "var(--border-strong)" }}
                >
                  100%
                </button>
                <button
                  onClick={() => applyZoom(zoomLevel + 1)}
                  className="rounded-md border p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
                  style={{ borderColor: "var(--border-strong)" }}
                  aria-label="Yakınlaştır"
                  title="Yakınlaştır"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Önbellek */}
      <SectionCard
        title="Önbellek ve Depolama"
        description="Yerel olarak tutulan sayfa ve görsel verileri"
      >
        <div className="space-y-3">
          <div
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="grid size-10 place-items-center rounded-lg"
                style={{
                  background: "var(--surface-muted)",
                  color: "var(--text-muted)",
                }}
              >
                <Database size={18} />
              </div>
              <div>
                <div className="text-sm font-medium">Önbellek boyutu</div>
                <div
                  className="text-xs tabular-nums"
                  style={{ color: "var(--text-muted)" }}
                >
                  {cacheSize == null ? "Hesaplanıyor…" : formatBytes(cacheSize)}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onPress={refreshCacheSize}>
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw size={13} /> Yenile
                </span>
              </Button>
              <Button
                variant="danger"
                size="sm"
                isDisabled={clearingCache || cacheSize === 0}
                onPress={clearCache}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Trash2 size={13} />
                  {clearingCache ? "Temizleniyor…" : "Temizle"}
                </span>
              </Button>
            </div>
          </div>
          <p
            className="text-xs"
            style={{ color: "var(--text-soft)" }}
          >
            ℹ️ Önbellek temizlenince oturumun korunur, sadece sayfa ve görsel
            yedekleri silinir. İlk yüklemeler biraz daha yavaş olabilir.
          </p>
        </div>
      </SectionCard>

      {/* Gelişmiş */}
      <SectionCard
        title="Gelişmiş"
        description="Geliştirici araçları ve yeniden başlatma"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="ghost"
            size="md"
            onPress={() => void api.openDevTools()}
          >
            <span className="inline-flex items-center gap-1.5">
              <Terminal size={14} /> Geliştirici Araçları
            </span>
          </Button>
          <Button
            variant="ghost"
            size="md"
            onPress={() => {
              if (confirm("Uygulama yeniden başlatılsın mı?")) {
                api.relaunch();
              }
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw size={14} /> Uygulamayı Yeniden Başlat
            </span>
          </Button>
        </div>
      </SectionCard>

      {/* Otomatik güncelleme */}
      <SectionCard
        title="Otomatik Güncelleme"
        description="Yeni sürümler arka planda iner, sen onay verince yüklenir"
      >
        <div
          className="rounded-lg border p-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="grid size-10 place-items-center rounded-lg"
                style={{
                  background:
                    updater.downloaded
                      ? "var(--positive-soft)"
                      : "var(--surface-muted)",
                  color: updater.downloaded
                    ? "var(--positive)"
                    : "var(--text-muted)",
                }}
              >
                {updater.downloaded ? (
                  <Sparkles size={18} />
                ) : updater.downloading ? (
                  <Download size={18} className="animate-pulse" />
                ) : (
                  <RefreshCw size={18} />
                )}
              </div>
              <div>
                <div className="text-sm font-medium">
                  {updater.downloaded
                    ? `v${updater.status.state === "downloaded" ? updater.status.version : ""} hazır`
                    : updater.downloading
                      ? `İndiriliyor — %${updater.status.state === "downloading" ? updater.status.percent : 0}`
                      : updater.available
                        ? "Güncelleme bulundu, iniyor…"
                        : "En güncel sürümdesin"}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Sürüm: <strong>{info?.appVersion ?? "—"}</strong>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {updater.downloaded ? (
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => void updater.install()}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw size={13} /> Güncelle ve Yeniden Başlat
                  </span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  isDisabled={checking || updater.downloading}
                  onPress={manualCheck}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw
                      size={13}
                      className={checking ? "animate-spin" : ""}
                    />
                    {checking ? "Kontrol…" : "Güncelleme Kontrol Et"}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {updater.downloading && (
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
              style={{
                background: "color-mix(in oklch, var(--accent) 15%, transparent)",
              }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${updater.status.state === "downloading" ? updater.status.percent : 0}%`,
                  background: "var(--accent)",
                }}
              />
            </div>
          )}
        </div>
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--text-soft)" }}
        >
          ℹ️ Sürümler GitHub Releases'tan çekilir. Her 2 saatte bir otomatik
          kontrol yapılır. İndirilen güncelleme uygulama açıkken arka planda
          bekler, sen onay verince yüklenir.
        </p>
      </SectionCard>

      {/* Hakkında */}
      <SectionCard
        title="Hakkında"
        description="Sürüm ve sistem bilgileri"
      >
        {info ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <InfoRow icon={<Monitor size={13} />} label="Uygulama" value={`${info.appName} ${info.appVersion}`} />
            <InfoRow icon={<Globe size={13} />} label="Sunucu" value={appUrl || "—"} />
            <InfoRow label="İşletim Sistemi" value={`${info.platform} ${info.arch}`} />
            <InfoRow label="Electron" value={info.electron} />
            <InfoRow label="Chrome" value={info.chrome} />
            <InfoRow label="Node.js" value={info.node} />
            <InfoRow
              label="Veri klasörü"
              value={info.userDataPath}
              mono
              full
            />
          </dl>
        ) : (
          <div
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Bilgi yükleniyor…
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-soft)" }}>
          <CheckCircle2 size={13} style={{ color: "var(--positive)" }} />
          Bağlantı:{" "}
          <a
            onClick={(e) => {
              e.preventDefault();
              void api.openExternal(appUrl);
            }}
            href={appUrl}
            className="inline-flex items-center gap-0.5 underline hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
          >
            {appUrl} <ExternalLink size={10} />
          </a>
        </div>
      </SectionCard>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
  full,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt
        className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider"
        style={{ color: "var(--text-soft)" }}
      >
        {icon}
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm ${mono ? "font-mono break-all text-xs" : ""}`}
        style={{ color: "var(--text)" }}
      >
        {value}
      </dd>
    </div>
  );
}
