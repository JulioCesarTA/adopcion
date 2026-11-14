import { Badge } from "./ui/badge";
import { ANIMAL_STATUS, LEVEL, PERIOD_TYPE, REQUEST_STATUS, TREATMENT_STATUS } from "@/lib/labels";
import type { AnimalStatus, Level, PeriodType, RequestStatus, TreatmentStatus } from "@/lib/types";

type Props =
  | { kind: "animal"; value: AnimalStatus }
  | { kind: "request"; value: RequestStatus }
  | { kind: "treatment"; value: TreatmentStatus }
  | { kind: "level"; value: Level }
  | { kind: "period"; value: PeriodType };

/** Badge de color por estado (animal, solicitud, tratamiento, nivel, periodo). */
export function StatusBadge(props: Props) {
  const map = {
    animal: ANIMAL_STATUS,
    request: REQUEST_STATUS,
    treatment: TREATMENT_STATUS,
    level: LEVEL,
    period: PERIOD_TYPE,
  }[props.kind] as Record<string, { label: string; tone: Parameters<typeof Badge>[0]["tone"] }>;
  const item = map[props.value] ?? { label: props.value, tone: "slate" };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}
