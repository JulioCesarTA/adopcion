import { MessageCircle } from "lucide-react";
import type { InstitutionInfo } from "@/hooks/use-public";
import { cn } from "@/lib/utils";

type IconProps = { className?: string };
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Íconos de trazo propios (la versión instalada de lucide no incluye marcas). */
const FacebookIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const InstagramIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
const YoutubeIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="2" y="5" width="20" height="14" rx="4" />
    <path d="m10 9 5 3-5 3z" />
  </svg>
);
const TiktokIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V3a5 5 0 0 0 5 5" />
  </svg>
);

const NETWORKS = [
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "tiktok", label: "TikTok", Icon: TiktokIcon },
  { key: "youtube", label: "YouTube", Icon: YoutubeIcon },
  { key: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
] as const;

/** Redes sociales configuradas en el backend (vacías = no se muestran). */
export function SocialLinks({
  social,
  variant = "dark",
  showLabels,
}: {
  social: InstitutionInfo["social"] | undefined;
  variant?: "dark" | "light";
  showLabels?: boolean;
}) {
  const items = NETWORKS.filter((n) => social?.[n.key]);
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map(({ key, label, Icon }) => (
        <li key={key}>
          <a
            href={social?.[key]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label} (se abre en una pestaña nueva)`}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors",
              variant === "dark"
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className={showLabels ? "" : "sr-only sm:not-sr-only"}>{label}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
