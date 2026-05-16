"use client";

import { useEffect, useState } from "react";
import type { UpdateStatus } from "./use-electron";

/**
 * Electron auto-updater'a abone olur (custom Vencord tarzı flow).
 * Web/SSR'da idle döner — hata vermez.
 */
export function useUpdater(): {
  status: UpdateStatus;
  check: () => Promise<void>;
  download: () => Promise<void>;
  install: () => Promise<void>;
  available: boolean;
  downloading: boolean;
  extracting: boolean;
  downloaded: boolean;
} {
  const [status, setStatus] = useState<UpdateStatus>({ state: "idle" });

  useEffect(() => {
    if (typeof window === "undefined" || !window.muhasebePro) return;
    const api = window.muhasebePro;

    void api.getUpdateStatus().then(setStatus).catch(() => {});

    const unsubscribe = api.onUpdateStatus((s) => {
      setStatus(s);
    });

    return unsubscribe;
  }, []);

  async function check() {
    if (typeof window === "undefined" || !window.muhasebePro) return;
    await window.muhasebePro.checkForUpdates();
  }

  async function download() {
    if (typeof window === "undefined" || !window.muhasebePro) return;
    await window.muhasebePro.downloadUpdate();
  }

  async function install() {
    if (typeof window === "undefined" || !window.muhasebePro) return;
    await window.muhasebePro.installUpdate();
  }

  return {
    status,
    check,
    download,
    install,
    available: status.state === "available",
    downloading: status.state === "downloading",
    extracting: status.state === "extracting",
    downloaded: status.state === "downloaded",
  };
}
