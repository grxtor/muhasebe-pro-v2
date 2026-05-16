/**
 * Electron preload — render process'e güvenli API expose eder.
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("muhasebePro", {
  // Yenileme + temel
  reload: () => ipcRenderer.invoke("app:reload"),
  getAppUrl: () => ipcRenderer.invoke("app:get-url"),
  setAppUrl: (url: string) => ipcRenderer.invoke("app:set-url", url),
  isOnline: () => navigator.onLine,
  platform: process.platform,
  versions: process.versions,

  // Sürüm ve sistem bilgisi
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  getPlatformInfo: () => ipcRenderer.invoke("app:get-platform-info"),

  // Otomatik başlatma
  getAutoLaunch: () => ipcRenderer.invoke("app:get-auto-launch"),
  setAutoLaunch: (enabled: boolean) =>
    ipcRenderer.invoke("app:set-auto-launch", enabled),

  // Önbellek
  clearCache: () => ipcRenderer.invoke("app:clear-cache"),
  getCacheSize: () => ipcRenderer.invoke("app:get-cache-size"),

  // Zoom
  setZoomLevel: (level: number) =>
    ipcRenderer.invoke("app:set-zoom", level),
  getZoomLevel: () => ipcRenderer.invoke("app:get-zoom"),

  // Geliştirici araçları
  openDevTools: () => ipcRenderer.invoke("app:open-devtools"),

  // Pencere kontrolü
  minimize: () => ipcRenderer.send("app:minimize"),
  relaunch: () => ipcRenderer.send("app:relaunch"),
  quit: () => ipcRenderer.send("app:quit"),

  // Harici link
  openExternal: (url: string) =>
    ipcRenderer.invoke("app:open-external", url),

  // Otomatik güncelleme
  getUpdateStatus: () => ipcRenderer.invoke("updater:get-status"),
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  installUpdate: () => ipcRenderer.invoke("updater:install"),
  onUpdateStatus: (callback: (status: unknown) => void) => {
    const listener = (_event: unknown, status: unknown) => callback(status);
    ipcRenderer.on("updater:status", listener);
    return () => {
      ipcRenderer.removeListener("updater:status", listener);
    };
  },
});
