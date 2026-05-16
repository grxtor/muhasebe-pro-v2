"use client";

import { useEffect, useState } from "react";

export interface PlatformInfo {
  platform: NodeJS.Platform;
  arch: string;
  electron: string;
  chrome: string;
  node: string;
  appName: string;
  appVersion: string;
  userDataPath: string;
  appPath: string;
}

export interface MuhasebeProApi {
  reload: () => Promise<void>;
  getAppUrl: () => Promise<string>;
  setAppUrl: (url: string) => Promise<boolean>;
  isOnline: () => boolean;
  platform: NodeJS.Platform;
  versions: NodeJS.ProcessVersions;
  getAppVersion: () => Promise<string>;
  getPlatformInfo: () => Promise<PlatformInfo>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  clearCache: () => Promise<void>;
  getCacheSize: () => Promise<number>;
  setZoomLevel: (level: number) => Promise<void>;
  getZoomLevel: () => Promise<number>;
  openDevTools: () => Promise<void>;
  minimize: () => void;
  relaunch: () => void;
  quit: () => void;
  openExternal: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    muhasebePro?: MuhasebeProApi;
  }
}

/**
 * Electron içinde çalışıyorsa true döner.
 * SSR-safe: ilk render'da false, mount sonrası gerçek değer.
 */
export function useIsElectron(): boolean {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== "undefined" && !!window.muhasebePro);
  }, []);

  return isElectron;
}

/** macOS Electron için ek bilgi — traffic light konumu */
export function useIsMacElectron(): boolean {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(
      typeof window !== "undefined" &&
        !!window.muhasebePro &&
        window.muhasebePro.platform === "darwin",
    );
  }, []);

  return isMac;
}
