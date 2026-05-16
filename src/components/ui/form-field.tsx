"use client";

import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
import { Select as CustomSelect } from "./select";
import { DateInput } from "./date-input";

const baseInputClass =
  "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-0";

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
      className="mb-1.5 flex items-baseline justify-between text-sm font-medium"
      style={{ color: "var(--text)" }}
    >
      <span>
        {children}
        {required && <span style={{ color: "var(--negative)" }}> *</span>}
      </span>
      {hint && (
        <span
          className="text-xs font-normal"
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
          // Native onChange synthetic event'ine uyumlu olsun diye yeniden paketle
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
  return <div className={`space-y-1.5 ${className ?? ""}`}>{children}</div>;
}
