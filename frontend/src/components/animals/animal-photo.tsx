import { Cat, Dog, PawPrint } from "lucide-react";
import type { Species } from "@/lib/types";
import { cn } from "@/lib/utils";

const icons = { PERRO: Dog, GATO: Cat, OTRO: PawPrint };

/** Foto del animal o un marcador con el ícono de la especie. */
export function AnimalPhoto({
  url,
  species,
  alt,
  className,
}: {
  url: string | null | undefined;
  species: Species;
  alt: string;
  className?: string;
}) {
  const Icon = icons[species];
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- fotos servidas por el API vía proxy
    return <img src={url} alt={alt} className={cn("object-cover", className)} loading="lazy" />;
  }
  return (
    <div
      className={cn("flex items-center justify-center bg-slate-100 text-slate-300", className)}
      aria-label={alt}
      role="img"
    >
      <Icon className="h-1/3 w-1/3" aria-hidden />
    </div>
  );
}
