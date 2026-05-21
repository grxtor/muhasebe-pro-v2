"use client";

import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { Select } from "./select";

type CellType = "text" | "number" | "date";

interface BaseProps {
  /** Ham değer (input'a giren) */
  value: string;
  /** Gösterim — formatlı (ör. ₺1.250). Verilmezse value gösterilir. */
  display?: ReactNode;
  align?: "left" | "right";
  placeholder?: string;
  /** Kaydet — true dönerse başarılı, hücre kapanır. false: editör açık kalır. */
  onSave: (next: string) => Promise<boolean>;
  disabled?: boolean;
  /** Excel grid koordinatı — ok tuşu navigasyonu için (r-c) */
  row?: number;
  col?: number;
}

/** Komşu hücreye odaklan — data-cell="r-c" attribute ile DOM tabanlı. */
function focusCell(row: number, col: number) {
  const el = document.querySelector<HTMLElement>(
    `[data-cell="${row}-${col}"]`,
  );
  el?.focus();
}

type TextProps = BaseProps & { type?: CellType; options?: undefined };
type SelectProps = BaseProps & {
  type: "select";
  options: { value: string; label: string }[];
};

type EditableCellProps = TextProps | SelectProps;

/**
 * EditableCell — Excel-tarzı inline düzenlenebilir tablo hücresi.
 *
 * Tıkla → editör açılır (input/select). Enter veya blur → kaydet.
 * Esc → iptal. Kaydederken spinner. Hata olursa editör açık kalır.
 *
 * Parent value'yu kontrol eder (server'dan gelir); onSave server action
 * çağırıp router.refresh yapar — value yeni render'da güncellenir.
 */
export function EditableCell(props: EditableCellProps) {
  const { value, display, align = "left", placeholder, onSave, disabled, row, col } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasGrid = row !== undefined && col !== undefined;

  useEffect(() => {
    if (editing) {
      // input mount sonrası focus + select (setState yok — lint güvenli)
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select?.();
      });
    }
  }, [editing]);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  async function commit(then?: "down" | "right" | "self") {
    if (draft !== value) {
      setSaving(true);
      const ok = await onSave(draft);
      setSaving(false);
      if (!ok) {
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }
    }
    setEditing(false);
    /* Kaydetten sonra komşu hücreye/aynı hücreye odaklan (Excel akışı) */
    if (hasGrid) {
      requestAnimationFrame(() => {
        if (then === "down") focusCell(row! + 1, col!);
        else if (then === "right") focusCell(row!, col! + 1);
        else focusCell(row!, col!);
      });
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
    if (hasGrid) requestAnimationFrame(() => focusCell(row!, col!));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit("down"); // Excel: Enter → alta in
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    } else if (e.key === "Tab") {
      e.preventDefault();
      void commit("right"); // Tab → sağa geç
    }
  }

  /* Hücre seçili (editing değil) iken ok tuşlarıyla gezinme — Excel davranışı */
  function onCellKeyDown(e: KeyboardEvent) {
    if (!hasGrid) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusCell(row! + 1, col!);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusCell(row! - 1, col!);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusCell(row!, col! - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        focusCell(row!, col! + 1);
        break;
      case "Enter":
      case "F2":
        e.preventDefault();
        startEdit();
        break;
    }
  }

  const alignClass = align === "right" ? "text-right" : "text-left";

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        data-cell={hasGrid ? `${row}-${col}` : undefined}
        onClick={() => !disabled && startEdit()}
        onKeyDown={onCellKeyDown}
        className={`block w-full px-2 py-1 ${alignClass} text-sm transition-colors hover:bg-[color-mix(in_oklch,var(--accent)_8%,transparent)] disabled:cursor-default disabled:hover:bg-transparent`}
        style={{ color: "var(--text)" }}
        title={disabled ? undefined : "Düzenle: tıkla veya Enter"}
      >
        {display ?? value ?? (
          <span style={{ color: "var(--text-soft)" }}>{placeholder ?? "—"}</span>
        )}
      </button>
    );
  }

  if (props.type === "select") {
    return (
      <div className="min-w-0">
        <Select
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          disabled={saving}
        >
          {props.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {/* select değişince hemen commit + kapat */}
        <SelectCommit draft={draft} value={value} onCommit={commit} onCancel={cancel} />
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type={props.type === "number" ? "number" : props.type === "date" ? "date" : "text"}
      value={draft}
      disabled={saving}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => void commit()}
      placeholder={placeholder}
      className={`w-full rounded border px-2 py-1 ${alignClass} text-sm outline-none focus:ring-2 focus:ring-offset-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      style={{
        background: "var(--surface)",
        borderColor: "var(--accent)",
        color: "var(--text)",
        opacity: saving ? 0.6 : 1,
      }}
    />
  );
}

/** Select değiştiğinde commit tetikler — select'in kendi onChange'i draft'ı set eder,
 *  bu da effect'le commit'i çağırır. */
function SelectCommit({
  draft,
  value,
  onCommit,
  onCancel,
}: {
  draft: string;
  value: string;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (draft !== value) {
      onCommit();
    } else {
      onCancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  return null;
}
