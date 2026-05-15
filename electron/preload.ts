/**
 * Electron preload — render process'e güvenli API expose eder.
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("muhasebePro", {
  reload: () => ipcRenderer.invoke("app:reload"),
  getAppUrl: () => ipcRenderer.invoke("app:get-url"),
  isOnline: () => navigator.onLine,
  platform: process.platform,
  versions: process.versions,
});
