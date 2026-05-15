"use client";

import { useState, useCallback, useEffect } from "react";

/**
 * Liste/tablolarda toplu seçim için reusable hook.
 *
 * Klavye: Esc tuşu → seçimi temizle.
 */
export function useBulkSelect<T extends { id: number | string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<T["id"]>>(new Set());

  // Item listesi değişince geçersiz id'leri ayıkla
  useEffect(() => {
    setSelected((prev) => {
      const valid = new Set(items.map((i) => i.id));
      const next = new Set<T["id"]>();
      for (const id of prev) if (valid.has(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  // Esc tuşu — seçimi temizle
  useEffect(() => {
    if (selected.size === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Eğer input'tan geliyorsa ignore et
        if (
          e.target instanceof HTMLElement &&
          (e.target.tagName === "INPUT" ||
            e.target.tagName === "TEXTAREA" ||
            e.target.isContentEditable)
        ) {
          return;
        }
        setSelected(new Set());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected.size]);

  const toggle = useCallback((id: T["id"]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(items.map((i) => i.id)));
  }, [items]);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback(
    (id: T["id"]) => selected.has(id),
    [selected],
  );

  const selectedIds = Array.from(selected);
  const selectedItems = items.filter((i) => selected.has(i.id));

  return {
    selected,
    selectedIds,
    selectedItems,
    selectedCount: selected.size,
    isSelected,
    toggle,
    selectAll,
    clear,
    totalCount: items.length,
    isAllSelected: items.length > 0 && selected.size === items.length,
    isSomeSelected: selected.size > 0,
  };
}
