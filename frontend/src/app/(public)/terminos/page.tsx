import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/public/legal-page";

export const metadata: Metadata = { title: "Términos y Condiciones" };

export default function TermsPage() {
  return (
    <LegalPage title="Términos y Condiciones de uso" updated="14 de noviembre de 2026">
      <p>
        Estos Términos y Condiciones regulan el uso del sitio web y del portal de clientes de Adopet
        (en adelante, «la Institución»). Al crear una cuenta o usar el sitio, aceptas estos
        términos. Si no estás de acuerdo, no utilices el servicio.
      </p>

      <h2>1. Objeto del servicio</h2>
      <p>
        El sitio ofrece información sobre la Institución, el catálogo de animales disponibles para
        adopción, un formulario de contacto, un asistente virtual y un portal para personas
        registradas como clientes.
      </p>

      <h2>2. Registro y cuenta</h2>
      <ul>
        <li>Debes ser mayor de 18 años y proporcionar datos veraces y actualizados.</li>
        <li>
          Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad
          realizada con tu cuenta.
        </li>
        <li>
          La Institución puede suspender cuentas con datos falsos o uso indebido del servicio.
        </li>
      </ul>

      <h2>3. Adopciones</h2>
      <ul>
        <li>
          Publicar un animal en el sitio no garantiza su disponibilidad: puede ser adoptado o
          retirado en cualquier momento.
        </li>
        <li>
          La recomendación de compatibilidad es un resultado de apoyo. La decisión final de cada
          adopción corresponde al personal de la Institución, tras la evaluación del hogar y la
          entrevista.
        </li>
        <li>
          Toda adopción aprobada se formaliza mediante un acta de adopción responsable con
          compromisos de tenencia que el adoptante debe cumplir.
        </li>
      </ul>

      <h2>4. Asistente virtual</h2>
      <p>
        El asistente virtual utiliza inteligencia artificial para responder preguntas generales. Sus
        respuestas son orientativas, pueden contener errores y no sustituyen la atención veterinaria
        ni médica. Para trámites o emergencias, comunícate directamente con la Institución o con un
        centro de salud.
      </p>

      <h2>5. Uso aceptable</h2>
      <p>
        No está permitido usar el sitio para fines ilícitos, enviar contenido ofensivo o spam,
        intentar acceder a áreas restringidas o interferir con el funcionamiento del servicio.
      </p>

      <h2>6. Datos personales</h2>
      <p>
        El tratamiento de tus datos se rige por nuestra{" "}
        <Link href="/privacidad" className="font-medium text-teal-700 underline">
          Política de Privacidad y Cookies
        </Link>
        .
      </p>

      <h2>7. Propiedad intelectual</h2>
      <p>
        Los contenidos del sitio (textos, fotografías, logotipos) pertenecen a la Institución o se
        usan con autorización. No pueden reproducirse sin permiso previo.
      </p>

      <h2>8. Responsabilidad</h2>
      <p>
        La Institución procura que la información publicada sea correcta y esté actualizada, pero no
        garantiza la ausencia de errores ni la disponibilidad ininterrumpida del sitio.
      </p>

      <h2>9. Modificaciones</h2>
      <p>
        La Institución puede modificar estos términos. Los cambios se publicarán en esta página con
        su fecha de actualización; el uso posterior del servicio implica su aceptación.
      </p>

      <h2>10. Legislación aplicable</h2>
      <p>
        Estos términos se rigen por las leyes del Estado Plurinacional de Bolivia. Cualquier
        controversia se someterá a los tribunales competentes de Santa Cruz de la Sierra.
      </p>
    </LegalPage>
  );
}
