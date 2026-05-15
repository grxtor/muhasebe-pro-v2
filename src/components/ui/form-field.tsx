import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

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

export function TextInput({ className, ...props }: TextInputProps) {
  return (
    <input
      {...props}
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

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`${baseInputClass} ${className ?? ""}`}
      style={baseInputStyle}
    >
      {children}
    </select>
  );
}

interface FieldProps {
  children: ReactNode;
  className?: string;
}

export function Field({ children, className }: FieldProps) {
  return <div className={`space-y-1.5 ${className ?? ""}`}>{children}</div>;
}
