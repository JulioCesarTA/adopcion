import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/public/legal-page";
import { LegalContact } from "@/components/public/legal-contact";
import { CookiePreferences } from "@/components/public/cookie-preferences";

export const metadata: Metadata = { title: "Política de Privacidad y Cookies" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidad y Cookies" updated="24 de noviembre de 2026">
      <p>
        Adopet (en adelante, «la Institución») respeta tu privacidad. Esta política explica qué
        datos recopilamos, para qué los usamos, con quién los compartimos, cómo los protegemos y qué
        derechos tienes. Se aplica junto con nuestros{" "}
        <Link href="/terminos" className="font-medium text-teal-700 underline">
          Términos y Condiciones
        </Link>
        .
      </p>

      <h2>1. Marco legal</h2>
      <p>
        La Constitución Política del Estado reconoce el derecho a la privacidad e intimidad, y la
        Acción de Protección de Privacidad te permite exigir que tus datos personales se revelen,
        corrijan o eliminen. Bolivia aún no tiene una ley general de protección de datos personales;
        mientras tanto aplicamos el artículo 56 del D.S. N.º 1793 (reglamento de la Ley N.º 164) y la
        Ley N.º 453, y adoptamos de forma voluntaria los principios de consentimiento, finalidad,
        minimización y seguridad de los anteproyectos de ley.
      </p>

      <h2>2. Datos que recopilamos</h2>
      <ul>
        <li>
          <strong>Cuenta de cliente o adoptante:</strong> nombre, correo electrónico, teléfono
          (opcional), contraseña cifrada y la fecha en que aceptaste los Términos y Condiciones.
        </li>
        <li>
          <strong>Datos de clientes y adoptantes registrados por el personal:</strong> cédula de
          identidad, teléfono y domicilio, necesarios para identificarte, gestionar citas y formalizar
          adopciones.
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
          <strong>Proceso de adopción:</strong> el perfil de evaluación (vivienda, patio, niños,
          otros animales, tiempo disponible y experiencia) y el historial de tu solicitud.
        </li>
        <li>
          <strong>Animales de los clientes:</strong> historial clínico, vacunas y consultas de las
          mascotas registradas, visibles solo para su dueño y para el personal autorizado.
        </li>
      </ul>

      <h2>3. Finalidad y base legal</h2>
      <p>
        Tratamos tus datos con base en tu <strong>consentimiento expreso</strong>, que das al marcar
        la casilla de aceptación al registrarte o al enviar el formulario de contacto. Los usamos
        únicamente para:
      </p>
      <ul>
        <li>Responder tus consultas y gestionar tu cuenta.</li>
        <li>Gestionar citas y el historial sanitario de tus animales.</li>
        <li>Evaluar y dar seguimiento a las solicitudes de adopción.</li>
        <li>Mantener la seguridad del sitio y prevenir abusos.</li>
      </ul>
      <p>No vendemos ni cedemos tus datos a terceros con fines comerciales ni publicitarios.</p>

      <h2>4. Con quién compartimos tus datos</h2>
      <p>
        Usamos proveedores que tratan datos por cuenta de la Institución y solo reciben lo necesario
        para su función: un servicio de envío de correo electrónico (mensajes de contacto), un
        proveedor de inteligencia artificial (asistente virtual) y el proveedor de infraestructura en
        la nube. Solo entregamos datos a una autoridad competente cuando la ley o una orden judicial
        lo exigen.
      </p>

      <h2>5. Dónde se almacenan y transferencias internacionales</h2>
      <p>
        La base de datos y las fotografías de los animales se alojan en Amazon Web Services, en la
        región de São Paulo (Brasil). Los mensajes del asistente virtual se procesan en servidores
        del proveedor de inteligencia artificial, fuera de Bolivia. Estos proveedores cuentan con
        certificaciones internacionales de seguridad como ISO 27001 y SOC 2. Al usar el sitio
        consientes estas transferencias.
      </p>

      <h2>6. Seguridad</h2>
      <ul>
        <li>Las contraseñas se almacenan cifradas; nunca en texto plano.</li>
        <li>
          La sesión usa un token de acceso de corta duración y una cookie de renovación segura, no
          accesible desde JavaScript.
        </li>
        <li>Las comunicaciones viajan cifradas por HTTPS.</li>
        <li>
          Cada usuario ve solo lo que su rol permite (administrador, veterinario, cliente o
          adoptante).
        </li>
        <li>Se limitan los intentos repetidos de inicio de sesión.</li>
        <li>La base de datos no está expuesta a Internet.</li>
      </ul>
      <p>
        Ningún sistema es infalible. Si tienes motivos para creer que tu cuenta o tus datos fueron
        comprometidos, escríbenos de inmediato por los canales de la sección 12.
      </p>

      <h2>7. Conservación</h2>
      <p>
        Conservamos los datos mientras tu cuenta esté activa o mientras sean necesarios para la
        finalidad para la que se recopilaron, y durante los plazos que exija la normativa aplicable.
      </p>

      <h2>8. Tus derechos</h2>
      <p>Puedes en cualquier momento:</p>
      <ul>
        <li>
          <strong>Acceder</strong> a los datos que tenemos sobre ti.
        </li>
        <li>
          <strong>Rectificarlos</strong> si son inexactos o están incompletos.
        </li>
        <li>
          <strong>Solicitar su eliminación</strong> o la cancelación de tu cuenta.
        </li>
        <li>
          <strong>Retirar tu consentimiento</strong>, sin efecto retroactivo.
        </li>
      </ul>
      <p>
        Escríbenos por el formulario de contacto o por los canales de la sección 12, indicando qué
        derecho quieres ejercer. Estas solicitudes las atiende el personal de la Institución de
        forma manual: no existe aún un botón de eliminación automática en el portal. Podemos pedirte
        que confirmes tu identidad. Responderemos en un plazo razonable. Si consideras que no atendimos tu solicitud, puedes acudir a la Acción de
        Protección de Privacidad.
      </p>

      <h2 id="cookies">9. Cookies y almacenamiento local</h2>
      <p>Este sitio usa únicamente lo imprescindible para funcionar:</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-slate-900">
              <th className="py-2 pr-4 font-semibold">Nombre</th>
              <th className="py-2 pr-4 font-semibold">Tipo</th>
              <th className="py-2 pr-4 font-semibold">Para qué sirve</th>
              <th className="py-2 font-semibold">Duración</th>
            </tr>
          </thead>
          <tbody className="align-top">
            <tr className="border-b border-slate-200">
              <td className="py-2 pr-4">
                <code>refresh_token</code>
              </td>
              <td className="py-2 pr-4">Cookie necesaria (segura, httpOnly)</td>
              <td className="py-2 pr-4">Mantiene tu sesión iniciada. Sin ella no se puede usar el portal.</td>
              <td className="py-2">Hasta 7 días</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-2 pr-4">
                <code>adopet.cookieConsent</code>
              </td>
              <td className="py-2 pr-4">Almacenamiento local</td>
              <td className="py-2 pr-4">Recuerda tu elección en el aviso de cookies.</td>
              <td className="py-2">Hasta que la cambies</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Preferencias de interfaz</td>
              <td className="py-2 pr-4">Almacenamiento local</td>
              <td className="py-2 pr-4">Por ejemplo, el estado del menú lateral.</td>
              <td className="py-2">Hasta que las borres</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>No usamos cookies publicitarias ni de seguimiento de terceros.</strong> Puedes
        borrar las cookies desde la configuración de tu navegador, pero entonces tu sesión se cerrará.
      </p>
      <CookiePreferences />

      <h2>10. Menores de edad</h2>
      <p>
        El portal está dirigido a mayores de 18 años. Al registrarte declaras serlo, marcando la
        casilla correspondiente. No recopilamos a propósito datos de menores.
      </p>

      <h2>11. Cambios en esta política</h2>
      <p>
        Publicaremos cualquier cambio en esta página, indicando la fecha de actualización.
      </p>

      <h2 id="contacto">12. Contacto y redes oficiales</h2>
      <LegalContact intro="Para ejercer tus derechos o resolver dudas sobre tus datos, usa estos canales oficiales:" />
    </LegalPage>
  );
}
