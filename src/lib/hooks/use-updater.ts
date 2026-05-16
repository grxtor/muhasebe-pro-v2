"use client";

import { useEffect, useState } from "react";
import type { UpdateStatus } from "./use-electron";

/**
 * Electron auto-updater'a abone olur.
 * Web/SSR'da idle döner — hata vermez.
 */
export function useUpdater(): {
  status: UpdateStatus;
  check: () => Promise<void>;
  install: () => Promise<void>;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
} {
  const [status, setStatus] = useState<UpdateStatus>({ state: "idle" });

  useEffect(() => {
    if (typeof window === "undefined" || !window.muhasebePro) return;
    const api = window.muhasebePro;

    // İlk durumu çek
    void api.getUpdateStatus().then(setStatus).catch(() => {});

    // Status değişimlerini dinle
    const unsubscribe = api.onUpdateStatus((s) => {
      setStatus(s);
    });

    return unsubscribe;
  }, []);

  async function check() {
    if (typeof window === "undefined" || !window.muhasebePro) return;
    await window.muhasebePro.checkForUpdates();
  }

  async function install() {
    if (typeof window === "undefined" || !window.muhasebePro) return;
    await window.muhasebePro.installUpdate();
  }

  return {
    status,
    check,
    install,
    available: status.state === "available",
    downloading: status.state === "downloading",
    downloaded: status.state === "downloaded",
  };
}
