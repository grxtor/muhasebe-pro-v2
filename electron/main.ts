/**
 * Muhasebe Pro v2 — Electron main process
 *
 * Üç çalışma modu:
 *  - APP_URL env varsa: bu URL'i aç (production wrapper modu)
 *  - dev: http://localhost:3000 aç (yerel Next.js dev server)
 *  - production fallback: https://muhasebe.oceanyazilim.com
 */

import { app, BrowserWindow, Menu, shell, dialog, ipcMain, nativeImage, session } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

// Logger setup
log.transports.file.level = "info";
autoUpdater.logger = log;
// Ad-hoc imza (Apple Developer hesabı yok) → Squirrel.Mac auto-install
// code signature validation'da takılıyor. Bu yüzden:
// - Yeni sürüm tespit ederiz ama otomatik indirmeyiz
// - Kullanıcıya banner gösterir, GitHub Release sayfasını tarayıcıda açarız
// - User manuel DMG indirir + kurar (xattr -cr otomatik olmadığı için
//   ilk açılışta sağ tık → Aç gerekir)
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; version: string }
  | { state: "not-available" }
  | { state: "downloading"; percent: number }
  | { state: "downloaded"; version: string }
  | { state: "error"; message: string };

let updateStatus: UpdateStatus = { state: "idle" };

function broadcastUpdate(status: UpdateStatus): void {
  updateStatus = status;
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isDestroyed()) {
      w.webContents.send("updater:status", status);
    }
  });
}

function setupAutoUpdater(): void {
  if (isDev) {
    log.info("[updater] dev modda devre dışı");
    return;
  }

  autoUpdater.on("checking-for-update", () => {
    broadcastUpdate({ state: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    log.info("[updater] güncelleme bulundu:", info.version);
    broadcastUpdate({ state: "available", version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    broadcastUpdate({ state: "not-available" });
  });

  autoUpdater.on("download-progress", (progress) => {
    broadcastUpdate({
      state: "downloading",
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("[updater] güncelleme indirildi:", info.version);
    broadcastUpdate({ state: "downloaded", version: info.version });
  });

  autoUpdater.on("error", (err) => {
    log.error("[updater] hata:", err);
    broadcastUpdate({
      state: "error",
      message: err.message ?? "Bilinmeyen güncelleme hatası",
    });
  });

  // Açılışta + her 2 saatte bir kontrol
  void autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    log.error("[updater] ilk kontrol başarısız:", err);
  });
  setInterval(() => {
    void autoUpdater.checkForUpdates().catch(() => {});
  }, 2 * 60 * 60 * 1000);
}

const isDev = !app.isPackaged;
const DEFAULT_APP_URL = "https://muhasebe.oceanyazilim.com";

// User settings — basit JSON store (electron-store yerine sıfır bağımlılık)
interface UserSettings {
  appUrl?: string;
  autoLaunch?: boolean;
  zoomLevel?: number;
  closeToTray?: boolean;
}

function getSettingsPath(): string {
  const dir = app.getPath("userData");
  mkdirSync(dir, { recursive: true });
  return join(dir, "settings.json");
}

function loadSettings(): UserSettings {
  try {
    const raw = readFileSync(getSettingsPath(), "utf-8");
    return JSON.parse(raw) as UserSettings;
  } catch {
    return {};
  }
}

function saveSettings(s: UserSettings): void {
  try {
    writeFileSync(getSettingsPath(), JSON.stringify(s, null, 2), "utf-8");
  } catch (err) {
    console.error("[settings] yazılamadı:", err);
  }
}

const settings = loadSettings();

function getAppUrl(): string {
  return (
    process.env.APP_URL ??
    settings.appUrl ??
    (isDev ? "http://localhost:3000" : DEFAULT_APP_URL)
  );
}

let mainWindow: BrowserWindow | null = null;

function getIcon(): Electron.NativeImage | undefined {
  // Build'de electron/icons içine konulan icon
  const iconPath = join(__dirname, "icons", "icon.png");
  if (existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return undefined;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: "#0a0a0a",
    title: "Muhasebe Pro",
    icon: getIcon(),
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      // Performans optimizasyonları
      backgroundThrottling: false,
      v8CacheOptions: "code",
      // Spell check ihtiyacımız yok, kapatınca CPU tasarrufu
      spellcheck: false,
    },
  });

  // Yükleme tamamlanınca göster (flicker önler)
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Yükleme başarısızsa offline ekranını göster
  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error(
        `[main] yükleme başarısız: ${errorCode} ${errorDescription} (${validatedURL})`,
      );
      // İnternet yok ya da sunucu erişilemez — offline page göster
      const offlinePath = join(__dirname, "offline.html");
      if (existsSync(offlinePath)) {
        void mainWindow?.loadFile(offlinePath);
      }
    },
  );

  // Harici linkler varsayılan tarayıcıda açılsın
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Zoom level varsa uygula
  if (settings.zoomLevel != null) {
    mainWindow.webContents.on("did-finish-load", () => {
      mainWindow?.webContents.setZoomLevel(settings.zoomLevel ?? 0);
    });
  }

  // İlk yükleme
  void mainWindow.loadURL(getAppUrl());

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function getCacheSize(): Promise<number> {
  try {
    const size = await session.defaultSession.getCacheSize();
    return size;
  } catch {
    return 0;
  }
}

// IPC handlers
ipcMain.handle("app:reload", () => {
  if (mainWindow) void mainWindow.loadURL(getAppUrl());
});

ipcMain.handle("app:get-url", () => getAppUrl());

ipcMain.handle("app:set-url", (_e, url: string) => {
  try {
    new URL(url);
    settings.appUrl = url;
    saveSettings(settings);
    if (mainWindow) void mainWindow.loadURL(url);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("app:get-version", () => app.getVersion());

ipcMain.handle("app:get-platform-info", () => ({
  platform: process.platform,
  arch: process.arch,
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  appName: app.getName(),
  appVersion: app.getVersion(),
  userDataPath: app.getPath("userData"),
  appPath: app.getAppPath(),
}));

ipcMain.handle("app:open-devtools", () => {
  mainWindow?.webContents.openDevTools({ mode: "detach" });
});

ipcMain.handle("app:clear-cache", async () => {
  await session.defaultSession.clearCache();
  await session.defaultSession.clearStorageData({
    storages: ["cachestorage", "shadercache", "serviceworkers"],
  });
});

ipcMain.handle("app:get-cache-size", () => getCacheSize());

ipcMain.handle("app:get-auto-launch", () => {
  const ls = app.getLoginItemSettings();
  return ls.openAtLogin;
});

ipcMain.handle("app:set-auto-launch", (_e, enabled: boolean) => {
  app.setLoginItemSettings({ openAtLogin: enabled });
  settings.autoLaunch = enabled;
  saveSettings(settings);
  return enabled;
});

ipcMain.handle("app:set-zoom", (_e, level: number) => {
  const clamped = Math.max(-3, Math.min(3, level));
  mainWindow?.webContents.setZoomLevel(clamped);
  settings.zoomLevel = clamped;
  saveSettings(settings);
});

ipcMain.handle("app:get-zoom", () => {
  return mainWindow?.webContents.getZoomLevel() ?? 0;
});

ipcMain.on("app:minimize", () => mainWindow?.minimize());
ipcMain.on("app:relaunch", () => {
  app.relaunch();
  app.exit(0);
});
ipcMain.on("app:quit", () => app.quit());

ipcMain.handle("app:open-external", (_e, url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    void shell.openExternal(url);
    return true;
  }
  return false;
});

// Custom menü — TR
function buildMenu() {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: "Muhasebe Pro",
            submenu: [
              { role: "about" as const, label: "Muhasebe Pro Hakkında" },
              { type: "separator" as const },
              { role: "hide" as const, label: "Muhasebe Pro'yu Gizle" },
              { role: "hideOthers" as const, label: "Diğerlerini Gizle" },
              { role: "unhide" as const, label: "Tümünü Göster" },
              { type: "separator" as const },
              { role: "quit" as const, label: "Çıkış" },
            ],
          },
        ]
      : []),
    {
      label: "Dosya",
      submenu: [
        {
          label: "Yenile",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            mainWindow?.webContents.reload();
          },
        },
        ...(isMac
          ? []
          : [{ role: "quit" as const, label: "Çıkış" }]),
      ],
    },
    {
      label: "Düzen",
      submenu: [
        { role: "undo" as const, label: "Geri Al" },
        { role: "redo" as const, label: "Yinele" },
        { type: "separator" as const },
        { role: "cut" as const, label: "Kes" },
        { role: "copy" as const, label: "Kopyala" },
        { role: "paste" as const, label: "Yapıştır" },
        { role: "selectAll" as const, label: "Tümünü Seç" },
      ],
    },
    {
      label: "Görünüm",
      submenu: [
        { role: "reload" as const, label: "Yeniden Yükle" },
        { role: "forceReload" as const, label: "Önbelleksiz Yeniden Yükle" },
        { type: "separator" as const },
        { role: "resetZoom" as const, label: "Zoom Sıfırla" },
        { role: "zoomIn" as const, label: "Yakınlaştır" },
        { role: "zoomOut" as const, label: "Uzaklaştır" },
        { type: "separator" as const },
        { role: "togglefullscreen" as const, label: "Tam Ekran" },
        ...(isDev
          ? [{ role: "toggleDevTools" as const, label: "Geliştirici Araçları" }]
          : []),
      ],
    },
    {
      label: "Yardım",
      submenu: [
        {
          label: "Web Sitesi",
          click: () => {
            void shell.openExternal("https://muhasebe.oceanyazilim.com");
          },
        },
        {
          label: "Bağlantıyı Test Et",
          click: async () => {
            try {
              const url = new URL(getAppUrl());
              const res = await fetch(`${url.origin}/api/health`).catch(() => null);
              if (res?.ok) {
                void dialog.showMessageBox({
                  type: "info",
                  title: "Bağlantı Tamam",
                  message: `Sunucuya başarıyla bağlanıldı:\n${url.origin}`,
                });
              } else {
                void dialog.showMessageBox({
                  type: "warning",
                  title: "Bağlantı Yok",
                  message:
                    "Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.",
                });
              }
            } catch {
              void dialog.showMessageBox({
                type: "error",
                title: "Bağlantı Hatası",
                message: "Sunucuya ulaşılamadı.",
              });
            }
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// HTTP cache boyutunu artır (varsayılan ~80MB) — sayfa geçişlerinde
// CSS/JS/HTML local'den okunur, network round-trip yok
// 2 GB — Discord ~1 GB kullanıyor, biz bol bol cache'leyebiliriz
app.commandLine.appendSwitch("disk-cache-size", "2147483648"); // 2 GB
app.commandLine.appendSwitch("media-cache-size", "536870912"); // 512 MB media

// V8 heap size — büyük dataset'leri RAM'de tutmak için
// Default ~1.4 GB, biz 4 GB'a çıkaralım (Discord ~2-3 GB kullanır)
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=4096");

// Donanım hızlandırma + render optimizasyonları
app.commandLine.appendSwitch(
  "enable-features",
  "CalculateNativeWinOcclusion,CanvasOopRasterization,UseSkiaRenderer",
);
// Arka plan tab throttling kapalı — uygulama dock'tayken bile cache fresh kalır
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

app.whenReady().then(async () => {
  // Sunucuya önceden bağlan — DNS + TLS handshake'i ilk navigation'dan
  // önce hazırla (TCP/TLS preconnect ~100-300ms kazandırır)
  try {
    const targetUrl = new URL(getAppUrl());
    if (targetUrl.protocol === "https:" || targetUrl.protocol === "http:") {
      void fetch(targetUrl.origin + "/api/health").catch(() => {});
    }
  } catch {
    // ignore
  }

  buildMenu();
  createWindow();

  // Auto-updater — production'da GitHub Releases'i kontrol eder
  setupAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Updater IPC handlers
ipcMain.handle("updater:get-status", () => updateStatus);

ipcMain.handle("updater:check", async () => {
  if (isDev) {
    return { ok: false, error: "Dev modda güncelleme kontrolü yapılmaz" };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, version: result?.updateInfo.version ?? null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Kontrol başarısız",
    };
  }
});

ipcMain.handle("updater:install", () => {
  // Ad-hoc imzalı build'lerde Squirrel.Mac signature validation fail eder.
  // Bu yüzden auto-install yerine GitHub release sayfasını tarayıcıda açıyoruz.
  // Kullanıcı manuel DMG indirir.
  if (updateStatus.state === "available" || updateStatus.state === "downloaded") {
    const version =
      updateStatus.state === "available"
        ? updateStatus.version
        : updateStatus.version;
    void shell.openExternal(
      `https://github.com/grxtor/muhasebe-pro-v2/releases/tag/v${version}`,
    );
  } else {
    void shell.openExternal(
      "https://github.com/grxtor/muhasebe-pro-v2/releases/latest",
    );
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Güvenlik: app URL'i dışına navigation harici tarayıcıya
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (e, url) => {
    try {
      const parsed = new URL(url);
      const current = new URL(getAppUrl());
      const allowed = [current.origin, "http://localhost:3000"];
      if (!allowed.includes(parsed.origin)) {
        e.preventDefault();
        void shell.openExternal(url);
      }
    } catch {
      e.preventDefault();
    }
  });
});
