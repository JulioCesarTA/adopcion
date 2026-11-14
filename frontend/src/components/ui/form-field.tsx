import { cloneElement, isValidElement, useId } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactElement<{
    id?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }>;
}

/** Etiqueta + control + mensaje de error accesible. */
export function FormField({ label, error, hint, required, className, children }: FormFieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error || hint ? msgId : undefined,
      })
    : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {control}
      {error ? (
        <p id={msgId} className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
