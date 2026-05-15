"use client";

import { useEffect } from "react";

export interface Shortcut {
  /** Tek tuş ('n', '/', '?') veya kombinasyon ('mod+k' = Cmd/Ctrl+K) */
  keys: string;
  handler: (e: KeyboardEvent) => void;
  /** Input/textarea içindeyken çalışsın mı (varsayılan: false — input'larda sessiz) */
  allowInInput?: boolean;
  /** Modifier şart mı? */
  preventDefault?: boolean;
}

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function matches(e: KeyboardEvent, keys: string): boolean {
  const parts = keys.toLowerCase().split("+").map((p) => p.trim());
  const key = parts[parts.length - 1];

  if (e.key.toLowerCase() !== key && e.code.toLowerCase() !== `key${key}`) {
    return false;
  }

  const mods = new Set(parts.slice(0, -1));
  const needMod = mods.has("mod");
  const needShift = mods.has("shift");
  const needAlt = mods.has("alt");
  const needCtrl = mods.has("ctrl");

  // 'mod' = Cmd (Mac) veya Ctrl (Windows/Linux)
  const hasMod = isMac ? e.metaKey : e.ctrlKey;
  if (needMod !== hasMod) return false;
  if (needShift !== e.shiftKey) return false;
  if (needAlt !== e.altKey) return false;
  if (needCtrl && !e.ctrlKey) return false;

  return true;
}

function isInInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * Tek bir keyboard shortcut'a abone ol.
 */
export function useKeyboardShortcut(shortcut: Shortcut): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!shortcut.allowInInput && isInInput(e.target)) return;
      if (matches(e, shortcut.keys)) {
        if (shortcut.preventDefault !== false) {
          e.preventDefault();
        }
        shortcut.handler(e);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut.keys, shortcut.handler, shortcut.allowInInput, shortcut.preventDefault]);
}

/**
 * Birden çok shortcut'a abone ol.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        if (!s.allowInInput && isInInput(e.target)) continue;
        if (matches(e, s.keys)) {
          if (s.preventDefault !== false) e.preventDefault();
          s.handler(e);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts]);
}

/** Mod tuşu sembolü — UI'da göstermek için */
export function modKeyLabel(): string {
  return isMac ? "⌘" : "Ctrl";
}
