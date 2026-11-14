import { AdopterForm } from "@/components/adoptions/adopter-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewAdopterPage() {
  return (
    <>
      <PageHeader
        title="Nuevo adoptante"
        description="Datos personales y perfil para la recomendación."
      />
      <AdopterForm />
    </>
  );
}
