import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

const tones = {
  teal: "bg-teal-50 text-teal-700",
  red: "bg-red-50 text-red-700",
  green: "bg-green-50 text-green-700",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "teal",
  loading,
  error,
  hint,
}: {
  label: string;
  value: number | string | undefined;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  loading?: boolean;
  error?: string | null;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : error ? (
            <p className="mt-2 flex items-center gap-1 text-sm text-red-600" role="alert">
              <AlertTriangle className="h-4 w-4" aria-hidden /> {error}
            </p>
          ) : (
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          )}
          {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <span className={cn("rounded-lg p-2", tones[tone])}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </Card>
  );
}
