export type UserRole = "ADMIN" | "VETERINARIO" | "GESTION" | "DIRECTIVO" | "CLIENTE" | "ADOPTANTE";
export type Species = "PERRO" | "GATO" | "OTRO";
export type Sex = "MACHO" | "HEMBRA" | "DESCONOCIDO";
export type AnimalSize = "PEQUENO" | "MEDIANO" | "GRANDE";
export type AnimalStatus =
  | "INGRESADO"
  | "EN_OBSERVACION"
  | "EN_CUARENTENA"
  | "EN_TRATAMIENTO"
  | "DISPONIBLE_ADOPCION"
  | "EN_PROCESO_ADOPCION"
  | "ADOPTADO"
  | "FALLECIDO"
  | "DEVUELTO";
export type HousingType = "DEPARTAMENTO" | "CASA_SIN_PATIO" | "CASA_CON_PATIO";
export type ExperienceLevel = "NINGUNA" | "BASICA" | "AVANZADA";
export type RequestStatus = "PENDIENTE" | "EN_EVALUACION" | "APROBADA" | "RECHAZADA" | "CANCELADA";
export type PeriodType = "OBSERVACION" | "CUARENTENA";
export type PeriodStatus = "ACTIVO" | "FINALIZADO";
export type TreatmentStatus = "ACTIVO" | "FINALIZADO" | "SUSPENDIDO";
export type Level = "ALTA" | "MEDIA" | "BAJA" | "INCOMPATIBLE";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lockedUntil: string | null;
  phone?: string | null;
  termsAcceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRef {
  id: string;
  fullName: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface FieldError {
  field: string;
  messages: string[];
}

// ---------- Animales ----------

export interface AnimalListItem {
  id: string;
  code: string;
  name: string | null;
  species: Species;
  breed: string | null;
  sex: Sex;
  ageMonths: number | null;
  size: AnimalSize;
  energyLevel: number;
  status: AnimalStatus;
  photoUrl: string | null;
  entryDate: string;
  goodWithChildren: boolean;
  goodWithAnimals: boolean;
  needsYard: boolean;
  specialCare: boolean;
  requiredDailyHours: number;
  temperament?: string | null;
  color?: string | null;
}

export interface Animal extends AnimalListItem {
  ownerId?: string | null;
  color: string | null;
  temperament: string | null;
  specialCareNotes: string | null;
  physicalDescription: string | null;
  entryReason: string;
  exitDate: string | null;
  exitReason: string | null;
  exitNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnimalDetail extends Animal {
  createdBy: UserRef;
  activePeriod: QuarantinePeriod | null;
  activeTreatments: number;
  adoptionBlockers: string[] | null;
  adoptionRequests: (AdoptionRequestBase & {
    adopterProfile: { id: string; person: { firstName: string; lastName: string } };
    followups: Followup[];
  })[];
  _count: { consultations: number; vaccinations: number };
}

// ---------- Clínico ----------

export interface Diagnosis {
  id: string;
  description: string;
  observations: string | null;
  createdAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  administrationRoute: string;
  frequency: string;
  duration: string;
  observations: string | null;
}

export interface Treatment {
  id: string;
  consultationId: string;
  description: string;
  instructions: string;
  startDate: string;
  endDate: string | null;
  status: TreatmentStatus;
  observations: string | null;
  medications: Medication[];
  createdAt: string;
}

export interface Consultation {
  id: string;
  animalId: string;
  veterinarianId: string;
  consultationDate: string;
  reason: string;
  weightKg: number | null;
  temperatureC: number | null;
  clinicalEvaluation: string;
  observations: string | null;
  veterinarian: UserRef;
  diagnoses?: Diagnosis[];
  treatments?: Treatment[];
  animal?: {
    id: string;
    code: string;
    name: string | null;
    species: Species;
    status: AnimalStatus;
  };
  _count?: { diagnoses: number; treatments: number };
  createdAt: string;
  updatedAt: string;
}

export interface Vaccine {
  id: string;
  name: string;
  species: Species[];
  isRabies: boolean;
  isActive: boolean;
}

export interface Vaccination {
  id: string;
  animalId: string;
  vaccineId: string;
  applicationDate: string;
  dose: string;
  batchNumber: string | null;
  nextDoseDate: string | null;
  observations: string | null;
  appliedById: string;
  vaccine: Vaccine;
  appliedBy?: UserRef;
  warnings?: string[];
}

export interface QuarantineControl {
  id: string;
  controlDate: string;
  animalCondition: string;
  observations: string | null;
  createdBy?: UserRef;
}

export interface QuarantinePeriod {
  id: string;
  animalId: string;
  type: PeriodType;
  reason: string;
  startDate: string;
  expectedEndDate: string | null;
  endDate: string | null;
  status: PeriodStatus;
  finalObservations: string | null;
  startedBy?: UserRef;
  closedBy?: UserRef | null;
  controls?: QuarantineControl[];
  animal?: {
    id: string;
    code: string;
    name: string | null;
    species: Species;
    status: AnimalStatus;
    photoUrl: string | null;
  };
  _count?: { controls: number };
}

export type TimelineItem =
  | { type: "CONSULTA"; date: string; id: string; data: Consultation }
  | { type: "VACUNA"; date: string; id: string; data: Vaccination }
  | { type: "PERIODO"; date: string; id: string; data: QuarantinePeriod };

// ---------- Adoptantes y adopciones ----------

export interface Person {
  id: string;
  ci: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
}

export interface Adopter {
  id: string;
  personId: string;
  person: Person;
  housingType: HousingType;
  hasYard: boolean;
  hasChildren: boolean;
  hasOtherAnimals: boolean;
  availableHoursPerDay: number;
  experience: ExperienceLevel;
  preferredSpecies: Species | null;
  preferredSize: AnimalSize | null;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { adoptionRequests: number };
  adoptionRequests?: (AdoptionRequestBase & {
    animal: {
      id: string;
      code: string;
      name: string | null;
      species: Species;
      photoUrl: string | null;
    };
  })[];
}

export interface AdoptionRequestBase {
  id: string;
  adopterProfileId: string;
  animalId: string;
  responsibleUserId: string;
  status: RequestStatus;
  requestDate: string;
  decisionDate: string | null;
  deliveryDate: string | null;
  evaluationNotes: string | null;
}

export interface AdoptionRequest extends AdoptionRequestBase {
  adopterProfile: Adopter;
  animal: AnimalListItem;
  responsibleUser: UserRef;
}

export interface Followup {
  id: string;
  followupDate: string;
  animalCondition: string;
  observations: string | null;
  createdBy: UserRef;
}

export interface CriterionResult {
  key: string;
  label: string;
  weight: number;
  fit: number;
  points: number;
  explanation: string;
}

/** Qué produjo el puntaje: el modelo entrenado o el motor de reglas. */
export type ScoringMethod = "MODELO" | "REGLAS";

/** Aporte de una variable a una predicción concreta (explicación local). */
export interface MlFactor {
  feature: string;
  label: string;
  value: number;
  contribution: number;
  direction: string;
}

export interface MlDetail {
  modelVersion: number;
  algorithm: "random-forest";
  probability: number;
  agreement: number;
  factors: MlFactor[];
}

export interface Breakdown {
  hardFilters: { passed: boolean; reasons: string[] };
  criteria: CriterionResult[];
  score: number;
  level: Level;
  modelVersion: number;
  disclaimer: string;
  /** Presente desde la incorporación del modelo; falta en recomendaciones antiguas. */
  method?: ScoringMethod;
  ml?: MlDetail | null;
  ruleScore?: number;
}

export interface Recommendation {
  id: string;
  adopterProfileId: string;
  animalId: string;
  adoptionRequestId: string | null;
  score: number;
  level: Level;
  breakdown: Breakdown;
  modelVersion: number;
  generatedAt: string;
  generatedBy?: UserRef;
}

export interface AdoptionRequestDetail extends AdoptionRequest {
  animal: Animal;
  followups: Followup[];
  latestRecommendation: Recommendation | null;
}

export interface RankingItem {
  animal: Pick<
    AnimalListItem,
    | "id"
    | "code"
    | "name"
    | "species"
    | "size"
    | "sex"
    | "ageMonths"
    | "energyLevel"
    | "photoUrl"
    | "status"
  >;
  score: number;
  level: Level;
  breakdown: Breakdown;
}

export interface Ranking {
  adopter: { id: string; name: string };
  modelVersion: number;
  disclaimer: string;
  generatedAt: string;
  data: RankingItem[];
  skipped: { animal: RankingItem["animal"]; missing: string[] }[];
}

/** Ranking inverso: dado un animal, qué adoptantes le convienen. */
export interface AdopterRankingItem {
  adopter: {
    id: string;
    name: string;
    phone: string;
    housingType: HousingType;
    hasYard: boolean;
    hasChildren: boolean;
    hasOtherAnimals: boolean;
    experience: ExperienceLevel;
    availableHoursPerDay: number;
  };
  score: number;
  level: Level;
  breakdown: Breakdown;
}

export interface AdopterRanking {
  animal: RankingItem["animal"];
  modelVersion: number;
  disclaimer: string;
  generatedAt: string;
  data: AdopterRankingItem[];
  skipped: { adopter: { id: string; name: string }; missing: string[] }[];
}

// ---------- Panel e indicadores ----------

export type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export interface Dashboard {
  cards: Section<{
    inInstitution: number;
    inQuarantine: number;
    available: number;
    activeRequests: number;
    adoptionsThisMonth: number;
  }>;
  byStatus: Section<{ status: AnimalStatus; count: number }[]>;
  entriesVsAdoptions: Section<
    { month: string; label: string; entries: number; adoptions: number }[]
  >;
  latestRequests: Section<
    (AdoptionRequestBase & {
      animal: { id: string; code: string; name: string | null };
      adopterProfile: { person: { firstName: string; lastName: string } };
    })[]
  > | null;
}

export type KpiTrend = "sube" | "baja" | "estable";
export type KpiDirection = "mas-es-mejor" | "menos-es-mejor";

export interface Kpi {
  key: string;
  label: string;
  value: number | null;
  unit: "%" | "días" | "animales" | "solicitudes";
  previous: number | null;
  delta: number | null;
  trend: KpiTrend;
  direction: KpiDirection;
  detail: string;
  help: string;
}

export interface KpiMonth {
  month: string;
  approved: number;
  rejected: number;
  adoptionRate: number | null;
  avgEvaluationDays: number | null;
  avgStayDays: number | null;
}

export interface KpisResult {
  periodMonths: number;
  from: string;
  to: string;
  kpis: Kpi[];
  monthly: KpiMonth[];
  generatedAt: string;
}
