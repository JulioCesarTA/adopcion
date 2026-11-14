import { AnimalForm } from "@/components/animals/animal-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewAnimalPage() {
  return (
    <>
      <PageHeader
        title="Registrar animal"
        description="Se asignará un código único ZOO-AAAA-NNNN y quedará en estado «Ingresado»."
      />
      <AnimalForm />
    </>
  );
}
