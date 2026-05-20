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
  const { value, display, align = "left", placeholder, onSave, disabled } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      // input mount sonrası focus + select
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select?.();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function commit() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) {
      setEditing(false);
    } else {
      // hata — editör açık kalsın, focus geri ver
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    } else if (e.key === "Tab") {
      // Tab default davranışı korunur (sonraki odaklanabilir öğeye geçer);
      // önce kaydet
      void commit();
    }
  }

  const alignClass = align === "right" ? "text-right" : "text-left";

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setEditing(true)}
        className={`group/cell block w-full rounded px-2 py-1 ${alignClass} text-sm transition-colors hover:bg-[color-mix(in_oklch,var(--accent)_8%,transparent)] disabled:cursor-default disabled:hover:bg-transparent`}
        style={{ color: "var(--text)" }}
        title={disabled ? undefined : "Düzenlemek için tıkla"}
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
