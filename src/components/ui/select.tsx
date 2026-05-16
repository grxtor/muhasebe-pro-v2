"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * Custom Select — backward-compatible with native <select>.
 * Children olarak <option> alır, içeride güzel dropdown render eder.
 *
 * Form submit için gizli native <select> tutulur (name + value),
 * böylece mevcut formAction'lar değişmeden çalışır.
 */

interface OptionInfo {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps
  extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    "onChange" | "value" | "defaultValue"
  > {
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  children: ReactNode;
  className?: string;
  placeholder?: string;
}

export function Select({
  value: controlledValue,
  defaultValue,
  onChange,
  children,
  className,
  placeholder = "Seçin",
  name,
  required,
  disabled,
  id: idProp,
  ...rest
}: SelectProps) {
  // <option> children'ı parse et
  const options = useMemo(() => parseOptions(children), [children]);

  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string>(
    defaultValue ?? "",
  );
  const currentValue = isControlled ? (controlledValue ?? "") : internalValue;

  const reactId = useId();
  const id = idProp ?? `select-${reactId}`;

  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === currentValue);

  // Click outside
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
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Açılınca seçili olanı focus'la
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === currentValue);
    setFocusedIndex(idx >= 0 ? idx : 0);
  }, [open, options, currentValue]);

  // Focused option'ı kaydır
  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${focusedIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [open, focusedIndex]);

  function commitValue(v: string) {
    if (!isControlled) setInternalValue(v);
    onChange?.({ target: { name, value: v } });
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onListKey(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[focusedIndex];
      if (opt && !opt.disabled) commitValue(opt.value);
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusedIndex(options.length - 1);
    }
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* Form submit için gizli native select */}
      {name && (
        <select
          name={name}
          value={currentValue}
          onChange={() => {
            /* controlled via button */
          }}
          required={required}
          aria-hidden
          tabIndex={-1}
          className="sr-only"
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-list`}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "ring-2 ring-offset-0" : ""
        }`}
        style={{
          background: "var(--surface)",
          borderColor: open ? "var(--accent)" : "var(--border-strong)",
          color: selected ? "var(--text)" : "var(--text-soft)",
        }}
      >
        <span className="truncate text-left">
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          style={{ color: "var(--text-muted)" }}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && options.length > 0 && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListKey}
          autoFocus
          className="absolute top-full right-0 left-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-lg border p-1 text-sm shadow-2xl outline-none"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-strong)",
            color: "var(--text)",
          }}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === currentValue;
            const isFocused = i === focusedIndex;
            return (
              <li
                key={opt.value}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                onMouseEnter={() => setFocusedIndex(i)}
                onClick={() => !opt.disabled && commitValue(opt.value)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5"
                style={{
                  background: isFocused
                    ? "var(--surface-muted)"
                    : "transparent",
                  color: opt.disabled
                    ? "var(--text-soft)"
                    : isSelected
                      ? "var(--accent)"
                      : "var(--text)",
                  fontWeight: isSelected ? 500 : 400,
                  opacity: opt.disabled ? 0.5 : 1,
                  cursor: opt.disabled ? "not-allowed" : "pointer",
                }}
              >
                <span className="flex w-3.5 shrink-0 items-center">
                  {isSelected && <Check size={13} />}
                </span>
                <span className="flex-1 truncate">{opt.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface OptionElementProps {
  value?: string | number;
  children?: ReactNode;
  disabled?: boolean;
}

/** Children'dan <option> elementlerini extract eder. */
function parseOptions(children: ReactNode): OptionInfo[] {
  const out: OptionInfo[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<OptionElementProps>;
    if (el.type === "option") {
      const value = String(el.props.value ?? "");
      const label = toLabel(el.props.children);
      out.push({
        value,
        label: label || value,
        disabled: el.props.disabled,
      });
    } else if (el.type === "optgroup") {
      // optgroup — şimdilik desteklemiyoruz, çocukları flat ekle
      out.push(...parseOptions(el.props.children as ReactNode));
    }
  });
  return out;
}

function toLabel(c: ReactNode): string {
  if (typeof c === "string" || typeof c === "number") return String(c);
  if (Array.isArray(c)) return c.map(toLabel).join("");
  if (isValidElement(c)) {
    return toLabel((c as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}
