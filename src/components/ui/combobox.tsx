"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Plus } from "lucide-react";

interface ComboboxOption {
  /** Mevcut item ise id (string formatında), yeni item ise undefined */
  value?: string;
  label: string;
  /** Label dışında küçük yardımcı metin */
  hint?: string;
  /** Sol tarafta ikon/avatar/logo */
  leading?: ReactNode;
}

interface ComboboxProps {
  options: ComboboxOption[];
  /** Seçili existing item'in value'si veya yeni item ise null */
  value: string | null;
  /** Yeni item label'i (value=null iken kullanıcının yazdığı) */
  newLabel?: string;
  onChange: (selection: {
    value: string | null;
    label: string;
    isNew: boolean;
  }) => void;
  placeholder?: string;
  /** Yeni item oluşturmaya izin ver. Default true. */
  allowCreate?: boolean;
  /** Yeni item rastgele label'i — örn "Yeni şarkı: ..." */
  createLabel?: (typed: string) => string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  emptyHint?: string;
}

/**
 * Combobox — type-to-search + opsiyonel "yeni ekle" satırı.
 *
 * Native select'in aksine kullanıcı listede olmayan bir değer yazabilir;
 * arama metni hiçbir option'la eşleşmiyorsa (ve allowCreate=true ise)
 * "Yeni: 'X' oluştur" satırı çıkar.
 *
 * Form submit için iki gizli input:
 *   - {name}__id   → mevcut option seçildiyse value, yoksa boş
 *   - {name}__new  → yeni item yazıldıysa label, yoksa boş
 *
 * Submit eden kod ya birini ya diğerini okuyup işler.
 */
export function Combobox({
  options,
  value,
  newLabel,
  onChange,
  placeholder = "Yaz veya seç…",
  allowCreate = true,
  createLabel = (t) => `Yeni: "${t}" oluştur`,
  disabled = false,
  required = false,
  id: idProp,
  name,
  emptyHint = "Sonuç yok",
}: ComboboxProps) {
  const reactId = useId();
  const id = idProp ?? `combobox-${reactId}`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  function computePos() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const POPOVER_MAX_H = 280;
    const GAP = 6;
    let top = rect.bottom + GAP;
    if (top + POPOVER_MAX_H > window.innerHeight - 8) {
      top = rect.top - POPOVER_MAX_H - GAP;
      if (top < 8) top = 8;
    }
    return { top, left: rect.left, width: rect.width };
  }

  function openWithPos() {
    if (disabled) return;
    const p = computePos();
    if (p) setPos(p);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const selected = value
    ? options.find((o) => o.value === value) ?? null
    : null;
  const displayValue = selected ? selected.label : newLabel ?? "";

  // Search değişince filtrele
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(s) ||
        (o.hint && o.hint.toLowerCase().includes(s)),
    );
  }, [options, search]);

  const exactMatch = useMemo(
    () =>
      options.find((o) => o.label.toLowerCase() === search.trim().toLowerCase()),
    [options, search],
  );
  const canCreate =
    allowCreate && search.trim().length > 0 && !exactMatch;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Resize / scroll — popover pozisyonunu güncelle
  useEffect(() => {
    if (!open) return;
    function reposition() {
      const p = computePos();
      if (p) setPos(p);
    }
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function selectOption(opt: ComboboxOption) {
    onChange({
      value: opt.value ?? null,
      label: opt.label,
      isNew: opt.value === undefined,
    });
    setSearch("");
    setOpen(false);
  }

  function createNew() {
    const label = search.trim();
    if (!label) return;
    onChange({ value: null, label, isNew: true });
    setSearch("");
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) {
        selectOption(filtered[0]);
      } else if (canCreate) {
        createNew();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
    } else if (e.key === "ArrowDown" && !open) {
      setOpen(true);
    }
  }

  return (
    <div ref={triggerRef} className="relative">
      {/* Trigger: tıklayınca açılır */}
      {!open ? (
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={false}
          disabled={disabled}
          onClick={openWithPos}
          className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-strong)",
            color: displayValue ? "var(--text)" : "var(--text-soft)",
          }}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            {selected?.leading}
            <span className="truncate">
              {displayValue || placeholder}
            </span>
            {newLabel && !selected && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  background: "var(--positive-soft)",
                  color: "var(--positive)",
                }}
              >
                YENİ
              </span>
            )}
          </span>
          <ChevronDown
            size={14}
            className="shrink-0"
            style={{ color: "var(--text-muted)" }}
          />
        </button>
      ) : (
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-0"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-strong)",
            color: "var(--text)",
          }}
        />
      )}

      {/* Hidden inputs — form submit için */}
      {name && (
        <>
          <input type="hidden" name={`${name}__id`} value={value ?? ""} />
          <input
            type="hidden"
            name={`${name}__new`}
            value={!value && newLabel ? newLabel : ""}
          />
          {required && !value && !newLabel && (
            <input
              type="text"
              required
              value=""
              onChange={() => {}}
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              style={{ position: "absolute", opacity: 0, height: 0, width: 0 }}
            />
          )}
        </>
      )}

      {/* Popover liste — portal'a alındı: dialog overflow kesmesin */}
      {open && pos && typeof document !== "undefined" && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          className="fixed z-[60] max-h-64 overflow-y-auto rounded-lg border p-1 text-sm shadow-2xl outline-none"
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            background: "var(--surface)",
            borderColor: "var(--border-strong)",
          }}
        >
          {filtered.length === 0 && !canCreate && (
            <li
              className="px-2.5 py-2 text-xs"
              style={{ color: "var(--text-soft)" }}
            >
              {emptyHint}
            </li>
          )}

          {filtered.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value ?? opt.label}
                role="option"
                aria-selected={isSelected}
                onClick={() => selectOption(opt)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{
                  background: isSelected
                    ? "color-mix(in oklch, var(--accent) 12%, transparent)"
                    : undefined,
                  color: isSelected ? "var(--accent)" : "var(--text)",
                }}
              >
                <span className="flex w-3.5 shrink-0 items-center">
                  {isSelected && <Check size={12} />}
                </span>
                {opt.leading && (
                  <span className="shrink-0">{opt.leading}</span>
                )}
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.hint && (
                  <span
                    className="shrink-0 text-[11px]"
                    style={{ color: "var(--text-soft)" }}
                  >
                    {opt.hint}
                  </span>
                )}
              </li>
            );
          })}

          {canCreate && (
            <li
              role="option"
              aria-selected={false}
              onClick={createNew}
              className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border-t px-2.5 py-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{
                borderColor: "var(--border)",
                color: "var(--positive)",
              }}
            >
              <Plus size={12} className="shrink-0" />
              <span className="flex-1 truncate font-medium">
                {createLabel(search)}
              </span>
            </li>
          )}
        </ul>,
        document.body,
      )}
    </div>
  );
}
