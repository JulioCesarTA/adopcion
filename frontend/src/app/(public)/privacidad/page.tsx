import type { Metadata } from "next";
import { LegalPage } from "@/components/public/legal-page";

export const metadata: Metadata = { title: "Política de Privacidad y Cookies" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidad y Cookies" updated="14 de noviembre de 2026">
      <p>
        Adopet (en adelante, «la Institución») respeta tu privacidad. Esta política explica qué
        datos recopilamos, para qué los usamos y qué derechos tienes.
      </p>

      <h2>1. Datos que recopilamos</h2>
      <ul>
        <li>
          <strong>Cuenta de cliente:</strong> nombre, correo electrónico, teléfono (opcional),
          contraseña cifrada y la fecha en que aceptaste los Términos y Condiciones.
        </li>
        <li>
          <strong>Formulario de contacto:</strong> nombre, correo, teléfono (opcional), asunto,
          mensaje, la fecha en que aceptaste el tratamiento de datos y la dirección IP desde la que
          se envió.
        </li>
        <li>
          <strong>Asistente virtual:</strong> los mensajes que escribes se envían a un proveedor de
          inteligencia artificial para generar la respuesta. No los guardamos en nuestra base de
          datos. No incluyas datos sensibles en el chat.
        </li>
        <li>
          <strong>Proceso de adopción:</strong> los datos del perfil de evaluación (vivienda, patio,
          niños, otros animales, tiempo disponible y experiencia) que entregues al personal.
        </li>
      </ul>

      <h2>2. Finalidad</h2>
      <ul>
        <li>Responder tus consultas y gestionar tu cuenta.</li>
        <li>Evaluar y dar seguimiento a las solicitudes de adopción.</li>
        <li>Mantener la seguridad del sitio y prevenir abusos.</li>
      </ul>
      <p>No vendemos ni cedemos tus datos a terceros con fines comerciales.</p>

      <h2>3. Encargados del tratamiento</h2>
      <p>
        Para prestar el servicio usamos proveedores que tratan datos por cuenta de la Institución:
        un servicio de envío de correo electrónico (para los mensajes de contacto) y un proveedor de
        inteligencia artificial (para el asistente virtual). Solo reciben los datos necesarios para
        cada función.
      </p>

      <h2>4. Conservación</h2>
      <p>
        Conservamos los datos mientras tu cuenta esté activa o mientras sean necesarios para la
        finalidad para la que se recopilaron, y durante los plazos que exija la normativa aplicable.
      </p>

      <h2>5. Tus derechos</h2>
      <p>
        Puedes solicitar el acceso, la rectificación o la eliminación de tus datos, o retirar tu
        consentimiento, escribiéndonos mediante el formulario de contacto. Responderemos en un plazo
        razonable.
      </p>

      <h2 id="cookies">6. Cookies</h2>
      <p>Este sitio usa únicamente:</p>
      <ul>
        <li>
          <strong>Cookies necesarias:</strong> una cookie de sesión (<code>refresh_token</code>,
          segura y no accesible desde JavaScript) que mantiene tu sesión iniciada. Sin ella no es
          posible usar el portal.
        </li>
        <li>
          <strong>Almacenamiento local de preferencias:</strong> por ejemplo, tu elección en el
          aviso de cookies o el estado del menú lateral.
        </li>
      </ul>
      <p>No usamos cookies publicitarias ni de seguimiento de terceros.</p>

      <h2>7. Seguridad</h2>
      <p>
        Las contraseñas se almacenan cifradas, las comunicaciones viajan por HTTPS y el acceso a los
        datos internos está restringido al personal autorizado según su rol.
      </p>

      <h2>8. Cambios</h2>
      <p>
        Publicaremos cualquier cambio a esta política en esta página, indicando la fecha de
        actualización.
      </p>
    </LegalPage>
  );
}
