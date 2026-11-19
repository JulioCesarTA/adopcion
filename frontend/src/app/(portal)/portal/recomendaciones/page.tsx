"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { MyRecommendationsSection } from "@/components/portal/my-recommendations";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { animalName } from "@/lib/labels";
import { isPortalRole } from "@/lib/roles";
import type { AnimalListItem } from "@/lib/types";

/** Recomendaciones del modelo: para clientes y adoptantes (el personal no las ve). */
export default function RecommendationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (user && !isPortalRole(user.role)) router.replace("/");
  }, [user, router]);

  const solicitar = useMutation({
    mutationFn: (animalId: string) =>
      api("/adoptions/mine", { method: "POST", body: { animalId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-recommendations"] });
      void qc.invalidateQueries({ queryKey: ["public-animals"] });
    },
  });

  if (!user || !isPortalRole(user.role)) return null;

  const requestButton = (a: AnimalListItem) =>
    a.status === "EN_PROCESO_ADOPCION" ? null : (
      <Button
        size="sm"
        loading={solicitar.isPending && solicitar.variables === a.id}
        onClick={() => {
          solicitar
            .mutateAsync(a.id)
            .then(() =>
              toast.success(`Solicitud enviada para ${animalName(a)}. El personal la revisará.`),
            )
            .catch((err: unknown) => toast.error(errorMessage(err)));
        }}
      >
        <Heart className="h-4 w-4" aria-hidden /> Solicitar adopción
      </Button>
    );

  return (
    <div className="pt-2">
      <MyRecommendationsSection renderActions={requestButton} />
    </div>
  );
}
