"use client";

import { use } from "react";
import { ConsultationForm } from "@/components/clinical/consultation-form";

/** CU06 + CU07: nueva consulta de un animal. El formulario vive en un componente para reutilizarlo en /consultas. */
export default function NewConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ConsultationForm id={id} />;
}
