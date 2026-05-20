"use client";

import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
import { Select as CustomSelect } from "./select";
import { DateInput } from "./date-input";
import { Switch } from "./switch";

const baseInputClass =
  "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-0";

const baseInputStyle = {
  background: "var(--surface)",
  borderColor: "var(--border-strong)",
  color: "var(--text)",
} as const;

interface LabelProps {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}

export function Label({ htmlFor, children, required, hint }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 flex items-baseline justify-between text-xs font-medium"
      style={{ color: "var(--text)" }}
    >
      <span>
        {children}
        {required && <span style={{ color: "var(--negative)" }}> *</span>}
      </span>
      {hint && (
        <span
          className="text-[11px] font-normal"
          style={{ color: "var(--text-soft)" }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * TextInput — type="date" verilirse otomatik olarak custom DateInput'a
 * yönlendirilir (chrome native date picker yerine güzel custom popover).
 */
export function TextInput({ className, type, ...props }: TextInputProps) {
  if (type === "date") {
    const {
      value,
      defaultValue,
      onChange,
      min,
      max,
      ...rest
    } = props;
    return (
      <DateInput
        value={typeof value === "string" ? value : undefined}
        defaultValue={
          typeof defaultValue === "string" ? defaultValue : undefined
        }
        onChange={(e) => {
          onChange?.({
            target: { name: e.target.name, value: e.target.value },
          } as React.ChangeEvent<HTMLInputElement>);
        }}
        min={typeof min === "string" ? min : undefined}
        max={typeof max === "string" ? max : undefined}
        name={rest.name}
        id={rest.id}
        required={rest.required}
        disabled={rest.disabled}
        className={className}
        placeholder={typeof rest.placeholder === "string" ? rest.placeholder : undefined}
        autoFocus={rest.autoFocus}
      />
    );
  }
  return (
    <input
      {...props}
      type={type}
      className={`${baseInputClass} ${className ?? ""}`}
      style={baseInputStyle}
    />
  );
}

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className, ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      className={`${baseInputClass} ${className ?? ""}`}
      style={baseInputStyle}
    />
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/**
 * Select — native <option> children'larını kabul eder ama custom dropdown
 * popover'la render eder (Chrome native dropdown yerine).
 */
export function Select({ className, children, value, defaultValue, onChange, ...rest }: SelectProps) {
  return (
    <CustomSelect
      className={className}
      value={typeof value === "string" ? value : undefined}
      defaultValue={
        typeof defaultValue === "string" ? defaultValue : undefined
      }
      onChange={(e) => {
        onChange?.({
          target: { name: e.target.name, value: e.target.value },
        } as React.ChangeEvent<HTMLSelectElement>);
      }}
      name={rest.name}
      id={rest.id}
      required={rest.required}
      disabled={rest.disabled}
    >
      {children}
    </CustomSelect>
  );
}

interface FieldProps {
  children: ReactNode;
  className?: string;
}

export function Field({ children, className }: FieldProps) {
  return <div className={`space-y-1 ${className ?? ""}`}>{children}</div>;
}

/* ============================================================
   Yeni form primitive'leri — dialog'larda tutarlı düzen için
   ============================================================ */

/**
 * FormGrid — dialog form içinde 2-3 kolonlu grid helper.
 *
 * @example
 *   <FormGrid cols={2}>
 *     <Field>...</Field>
 *     <Field>...</Field>
 *   </FormGrid>
 */
export function FormGrid({
  cols = 2,
  children,
  className,
}: {
  cols?: 2 | 3 | "tutar-birim" | "ucucu";
  children: ReactNode;
  className?: string;
}) {
  let gridClass = "grid gap-3 sm:grid-cols-2";
  if (cols === 3) gridClass = "grid gap-3 sm:grid-cols-3";
  if (cols === "tutar-birim")
    gridClass = "grid gap-3 sm:grid-cols-[1fr_130px]";
  if (cols === "ucucu")
    gridClass = "grid gap-3 sm:grid-cols-[1fr_130px_1fr]";
  return <div className={`${gridClass} ${className ?? ""}`}>{children}</div>;
}

/**
 * FormSection — opsiyonel grup için sade ayraç. Border + ufak başlık satırı.
 * Action prop'u sağa toggle/switch koymak için.
 *
 * @example
 *   <FormSection title="Müzik Geliri" action={<ToggleRow ... />}>
 *     {acik && <FormGrid>...</FormGrid>}
 *   </FormSection>
 */
export function FormSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border ${className ?? ""}`}
      style={{
        borderColor: "var(--border)",
        background: "var(--surface-muted)",
      }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            {title && (
              <div
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                {title}
              </div>
            )}
            {description && (
              <p
                className="mt-0.5 text-[11px] leading-snug"
                style={{ color: "var(--text-soft)" }}
              >
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children && (
        <div
          className={`space-y-3 px-3 pb-3 ${title || action ? "pt-1" : "pt-3"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * ToggleRow — kompakt switch + label tek satır. Gerçek iOS-style switch.
 * FormSection action slot'unda veya standalone kullanılabilir.
 */
export function ToggleRow({
  checked,
  onChange,
  name,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  name?: string;
  label: string;
  hint?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs font-medium">
      <Switch checked={checked} onChange={onChange} name={name} size="sm" />
      <span>{label}</span>
      {hint && (
        <span
          className="text-[11px] font-normal"
          style={{ color: "var(--text-soft)" }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

/**
 * MoneyField — büyük tutar + birim composite. Finansal dialog'larda
 * tutar ön planda olmalı; bu component onu görsel olarak vurgular.
 *
 * @example
 *   <MoneyField
 *     name="tutar"
 *     currencyName="paraBirimi"
 *     defaultValue={250}
 *     defaultCurrency="TRY"
 *   />
 */
type MoneyFieldBase = {
  name: string;
  required?: boolean;
  label?: string;
};

type MoneyFieldFixedCurrency = MoneyFieldBase & {
  /** Birim seçilemez — yanında sabit etiket gösterilir */
  fixedCurrency: string;
  currencyName?: undefined;
  currencies?: undefined;
  defaultCurrency?: undefined;
  currencyValue?: undefined;
  onCurrencyChange?: undefined;
};

type MoneyFieldSelectableCurrency = MoneyFieldBase & {
  fixedCurrency?: undefined;
  currencyName: string;
  currencies?: string[];
};

type MoneyFieldControlled = {
  value: string;
  onValueChange: (v: string) => void;
  defaultValue?: undefined;
};

type MoneyFieldUncontrolled = {
  value?: undefined;
  onValueChange?: undefined;
  defaultValue?: number | string | null;
};

type MoneyFieldProps = (MoneyFieldFixedCurrency | MoneyFieldSelectableCurrency) &
  (MoneyFieldControlled | MoneyFieldUncontrolled) &
  (
    | { currencyValue?: string; onCurrencyChange?: (v: string) => void; defaultCurrency?: undefined }
    | { defaultCurrency?: string; currencyValue?: undefined; onCurrencyChange?: undefined }
  );

export function MoneyField(props: MoneyFieldProps) {
  const { name, required = true, label = "Tutar" } = props;
  const controlled = props.value !== undefined;
  const hasFixedCurrency =
    "fixedCurrency" in props && props.fixedCurrency !== undefined;

  return (
    <div className="space-y-1">
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      {/* Flex layout — grid'in min-width kırılma riskini elimine eder.
          Birim küçük ve sağa sabit (shrink-0). */}
      <div className="flex items-stretch gap-2">
        <input
          id={name}
          name={name}
          type="number"
          step="0.01"
          min="0.01"
          max="999999999999999.99"
          inputMode="decimal"
          required={required}
          {...(controlled
            ? {
                value: props.value,
                onChange: (e) => props.onValueChange!(e.target.value),
              }
            : { defaultValue: props.defaultValue ?? "" })}
          placeholder="0,00"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums outline-none transition-colors focus:ring-2 focus:ring-offset-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={baseInputStyle}
        />
        {hasFixedCurrency ? (
          <div
            className="grid w-[68px] shrink-0 place-items-center rounded-lg border text-xs font-semibold uppercase tracking-wide"
            style={{
              background: "var(--surface-muted)",
              borderColor: "var(--border-strong)",
              color: "var(--text-muted)",
            }}
          >
            {props.fixedCurrency}
          </div>
        ) : (
          <div className="w-[88px] shrink-0">
            <CustomSelect
              name={props.currencyName!}
              id={props.currencyName!}
              {...(props.currencyValue !== undefined
                ? {
                    value: props.currencyValue,
                    onChange: (e) => props.onCurrencyChange?.(e.target.value),
                  }
                : { defaultValue: props.defaultCurrency ?? "TRY" })}
            >
              {(props.currencies ?? ["TRY", "USD", "EUR", "GBP"]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </CustomSelect>
          </div>
        )}
      </div>
    </div>
  );
}
