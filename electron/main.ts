/**
 * Muhasebe Pro v2 — Electron main process
 *
 * Üç çalışma modu:
 *  - APP_URL env varsa: bu URL'i aç (production wrapper modu)
 *  - dev: http://localhost:3000 aç (yerel Next.js dev server)
 *  - production fallback: https://muhasebe.oceanyazilim.com
 */

import { app, BrowserWindow, Menu, shell, dialog, ipcMain, nativeImage } from "electron";
import { join } from "node:path";
import { existsSync } from "node:fs";

const isDev = !app.isPackaged;
const APP_URL =
  process.env.APP_URL ??
  (isDev ? "http://localhost:3000" : "https://muhasebe.oceanyazilim.com");

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

  // İlk yükleme
  void mainWindow.loadURL(APP_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC: render process'ten "tekrar dene" isteği
ipcMain.handle("app:reload", () => {
  if (mainWindow) {
    void mainWindow.loadURL(APP_URL);
  }
});

ipcMain.handle("app:get-url", () => APP_URL);

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
              const url = new URL(APP_URL);
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

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Güvenlik: HTTPS olmayan linkleri engelle (dev hariç)
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (e, url) => {
    const parsed = new URL(url);
    const allowed = [new URL(APP_URL).origin, "http://localhost:3000"];
    if (!allowed.includes(parsed.origin)) {
      e.preventDefault();
      void shell.openExternal(url);
    }
  });
});
