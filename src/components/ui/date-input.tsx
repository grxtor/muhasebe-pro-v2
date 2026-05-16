"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Custom DateInput — backward-compatible with <input type="date">.
 * TR locale, ay/yıl navigasyonu, "Bugün" butonu, ISO format çıktısı.
 *
 * Form submit için gizli input (name+value=YYYY-MM-DD).
 */

interface DateInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "defaultValue" | "onChange"
  > {
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  min?: string;
  max?: string;
}

const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];
const TR_DAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(s: string | undefined | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

function formatTrLong(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  return `${day} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Pazartesi başlangıçlı haftalık grid — 6 satır × 7 sütun */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // getDay: 0=Pazar, 1=Pzt, ... 6=Cumartesi. Pazartesi başlangıcı için:
  const offset = (first.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - offset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i));
  }
  return cells;
}

export function DateInput({
  value: controlledValue,
  defaultValue,
  onChange,
  name,
  id: idProp,
  required,
  disabled,
  placeholder = "GG Ay YYYY",
  min,
  max,
  className,
  autoFocus,
}: DateInputProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string>(defaultValue ?? "");
  const currentValue = isControlled ? (controlledValue ?? "") : internalValue;
  const currentDate = parseIso(currentValue);

  const reactId = useId();
  const id = idProp ?? `date-${reactId}`;
  const [open, setOpen] = useState(false);

  // Calendar view state — açılırken seçili tarih ya da bugün
  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);
  const [viewYear, setViewYear] = useState(
    (currentDate ?? today).getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    (currentDate ?? today).getMonth(),
  );

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Açılırken view'i seçili tarihe getir
  useEffect(() => {
    if (!open) return;
    const d = parseIso(currentValue) ?? today;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [open, currentValue, today]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(t) &&
        popoverRef.current &&
        !popoverRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Esc kapatma
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function commit(d: Date) {
    const iso = toIso(d);
    if (!isControlled) setInternalValue(iso);
    onChange?.({ target: { name, value: iso } });
    setOpen(false);
    triggerRef.current?.focus();
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const minDate = parseIso(min);
  const maxDate = parseIso(max);

  function isDisabled(d: Date): boolean {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  }

  // Yıl seçici için ±5 yıl
  const yearOptions = useMemo(() => {
    const cur = currentDate?.getFullYear() ?? today.getFullYear();
    const arr: number[] = [];
    for (let y = cur - 10; y <= cur + 10; y++) arr.push(y);
    return arr;
  }, [currentDate, today]);

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* Form submit için gizli input */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentValue}
          required={required}
        />
      )}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "ring-2 ring-offset-0" : ""
        }`}
        style={{
          background: "var(--surface)",
          borderColor: open ? "var(--accent)" : "var(--border-strong)",
          color: currentDate ? "var(--text)" : "var(--text-soft)",
        }}
      >
        <span className="truncate text-left">
          {currentDate ? formatTrLong(currentDate) : placeholder}
        </span>
        <CalendarIcon size={14} style={{ color: "var(--text-muted)" }} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 z-50 mt-1.5 w-72 rounded-xl border p-3 shadow-2xl"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-strong)",
          }}
        >
          {/* Header: ay/yıl + navigasyon */}
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: "var(--text-muted)" }}
              aria-label="Önceki ay"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="flex flex-1 items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="cursor-pointer rounded-md px-1.5 py-0.5 text-sm font-semibold outline-none"
                style={{
                  background: "transparent",
                  color: "var(--text)",
                }}
              >
                {TR_MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="cursor-pointer rounded-md px-1.5 py-0.5 text-sm font-semibold outline-none"
                style={{
                  background: "transparent",
                  color: "var(--text)",
                }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: "var(--text-muted)" }}
              aria-label="Sonraki ay"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Gün başlıkları */}
          <div
            className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium"
            style={{ color: "var(--text-soft)" }}
          >
            {TR_DAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Tarih grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((d, i) => {
              const isCurrent = currentDate ? isSameDay(d, currentDate) : false;
              const isToday = isSameDay(d, today);
              const isCurrentMonth = d.getMonth() === viewMonth;
              const dis = isDisabled(d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={dis}
                  onClick={() => commit(d)}
                  className="aspect-square rounded-md text-xs transition-colors disabled:cursor-not-allowed"
                  style={{
                    background: isCurrent
                      ? "var(--accent)"
                      : isToday
                        ? "var(--surface-muted)"
                        : "transparent",
                    color: isCurrent
                      ? "var(--accent-foreground, white)"
                      : isCurrentMonth
                        ? "var(--text)"
                        : "var(--text-soft)",
                    opacity: dis ? 0.3 : isCurrentMonth ? 1 : 0.5,
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent && !dis) {
                      e.currentTarget.style.background = "var(--surface-muted)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.background = isToday
                        ? "var(--surface-muted)"
                        : "transparent";
                    }
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Hızlı eylemler */}
          <div
            className="mt-2 flex items-center justify-between border-t pt-2 text-xs"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              type="button"
              onClick={() => commit(today)}
              className="rounded-md px-2 py-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: "var(--accent)" }}
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isControlled) setInternalValue("");
                onChange?.({ target: { name, value: "" } });
                setOpen(false);
              }}
              className="rounded-md px-2 py-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: "var(--text-muted)" }}
            >
              Temizle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
