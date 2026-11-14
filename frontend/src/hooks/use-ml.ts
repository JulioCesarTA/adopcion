"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type MlSource = "REAL" | "SINTETICO" | "MIXTO";

export interface MlMetricsBlock {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  specificity: number;
  rocAuc: number;
  brier: number;
  bestThreshold: number;
  bestAccuracy: number;
  samples: number;
  confusion: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
  };
}

export interface MlCrossValidation {
  model: string;
  folds: number;
  pooled: MlMetricsBlock;
  accuracyMean: number;
  accuracyStd: number;
  rocAucMean: number;
  perFold: { fold: number; accuracy: number; rocAuc: number; samples: number }[];
}

export interface TrainingReport {
  version: number;
  algorithm: string;
  source: MlSource;
  datasetSize: number;
  realSamples: number;
  syntheticSamples: number;
  positiveRate: number;
  seed: number;
  forest: MlCrossValidation;
  logistic: MlCrossValidation;
  oobScore: number | null;
  structure: { trees: number; avgDepth: number; avgLeaves: number };
  importances: { feature: string; label: string; importance: number }[];
  warnings: string[];
}

export interface MlStatus {
  hasActiveModel: boolean;
  activeVersion: number | null;
  activeSource: MlSource | null;
  activeMetrics: TrainingReport | null;
  trainedAt: string | null;
  trainedBy: string | null;
  totalModels: number;
  realSamplesAvailable: number;
  minRealSamplesRecommended: number;
  featureCount: number;
}

export interface MlModelRow {
  version: number;
  algorithm: string;
  source: MlSource;
  isActive: boolean;
  datasetSize: number;
  realSamples: number;
  syntheticSamples: number;
  seed: number;
  notes: string | null;
  createdAt: string;
  createdBy: { id: string; fullName: string };
}

export interface TrainPayload {
  useSynthetic?: boolean;
  syntheticSize?: number;
  nTrees?: number;
  folds?: number;
  seed?: number;
  activate?: boolean;
  notes?: string;
}

export function useMlStatus() {
  return useQuery({
    queryKey: ["ml", "status"],
    queryFn: () => api<MlStatus>("/ml/status"),
  });
}

export function useMlModels() {
  return useQuery({
    queryKey: ["ml", "models"],
    queryFn: () => api<MlModelRow[]>("/ml/models"),
  });
}

export function useMlMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["ml"] });
    // El puntaje de las recomendaciones cambia al cambiar el modelo activo.
    void qc.invalidateQueries({ queryKey: ["recommendations"] });
  };

  const train = useMutation({
    mutationFn: (payload: TrainPayload) =>
      api<TrainingReport>("/ml/train", { method: "POST", body: payload }),
    onSuccess: invalidate,
  });

  const activate = useMutation({
    mutationFn: (version: number) =>
      api<MlModelRow>(`/ml/models/${version}/activate`, { method: "POST" }),
    onSuccess: invalidate,
  });

  const deactivate = useMutation({
    mutationFn: () => api<{ deactivated: number | null }>("/ml/deactivate", { method: "POST" }),
    onSuccess: invalidate,
  });

  return { train, activate, deactivate };
}
