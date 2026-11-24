import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/public/legal-page";
import { LegalContact } from "@/components/public/legal-contact";

export const metadata: Metadata = { title: "Términos y Condiciones" };

const link = "font-medium text-teal-700 underline";

export default function TermsPage() {
  return (
    <LegalPage title="Términos y Condiciones de uso" updated="24 de noviembre de 2026">
      <p>
        Estos Términos y Condiciones regulan el uso del sitio web, del portal de clientes y
        adoptantes y del asistente virtual de Adopet. Al navegar por el sitio, crear una cuenta o usar
        cualquiera de sus servicios, aceptas estos términos. Al registrarte, además, los aceptas de
        forma expresa marcando la casilla correspondiente. Si no estás de acuerdo, no utilices el
        servicio.
      </p>

      <h2>1. Quién presta el servicio</h2>
      <p>
        El servicio lo presta Adopet (en adelante, «Adopet»), plataforma de gestión sanitaria y
        adopción responsable de animales con domicilio en Santa Cruz de la Sierra, Estado
        Plurinacional de Bolivia, que opera conforme a las leyes bolivianas. Sus canales de contacto
        están en la{" "}
        <a href="#contacto" className={link}>
          sección 18
        </a>
        .
      </p>

      <h2>2. Definiciones</h2>
      <ul>
        <li>
          <strong>Plataforma:</strong> el sitio web público, el portal y el panel del personal de
          Adopet.
        </li>
        <li>
          <strong>Usuario:</strong> toda persona que usa la plataforma, con o sin cuenta.
        </li>
        <li>
          <strong>Cliente:</strong> usuario registrado que reserva citas y consulta el historial de
          sus animales.
        </li>
        <li>
          <strong>Adoptante:</strong> usuario registrado que consulta el catálogo y solicita una
          adopción.
        </li>
        <li>
          <strong>Personal:</strong> administradores y veterinarios de Adopet, cuyas cuentas crea el
          administrador del sistema.
        </li>
      </ul>

      <h2>3. Edad y capacidad</h2>
      <ul>
        <li>
          Para crear una cuenta, solicitar una adopción o reservar una cita debes ser{" "}
          <strong>mayor de 18 años</strong> y declararlo al registrarte.
        </li>
        <li>
          Los menores de edad pueden visitar el sitio público bajo la supervisión de sus padres o
          tutores, que responden por su uso. No pueden registrarse ni adoptar.
        </li>
      </ul>

      <h2>4. Descripción del servicio</h2>
      <p>La plataforma ofrece:</p>
      <ul>
        <li>Información sobre Adopet y sus servicios de atención sanitaria animal.</li>
        <li>El catálogo de animales evaluados por veterinarios y habilitados para adopción.</li>
        <li>Un formulario de contacto y un asistente virtual.</li>
        <li>
          Un portal para usuarios registrados, con dos tipos de cuenta: <strong>cliente</strong>{" "}
          (historial de sus animales, consultas, vacunas y reservas de citas) y{" "}
          <strong>adoptante</strong> (catálogo y solicitudes de adopción).
        </li>
      </ul>
      <p>
        Adopet puede actualizar, modificar o retirar funciones de la plataforma. Los cambios que
        afecten tus derechos se publicarán en el sitio.
      </p>

      <h2>5. Cuentas de usuario</h2>
      <ul>
        <li>Debes registrarte con datos veraces, completos y actualizados.</li>
        <li>
          Eres responsable de la confidencialidad de tu contraseña y de toda actividad realizada con
          tu cuenta. Si sospechas un uso no autorizado, cambia tu contraseña y avísanos de inmediato.
        </li>
        <li>
          Por seguridad, la cuenta se bloquea temporalmente después de varios intentos fallidos de
          inicio de sesión.
        </li>
        <li>
          Las cuentas del personal las crea y administra el administrador del sistema, que asigna a
          cada una su rol y sus permisos.
        </li>
      </ul>

      <h2>6. Adopciones</h2>
      <ul>
        <li>
          Publicar un animal no garantiza su disponibilidad: puede ser adoptado o retirado en
          cualquier momento. Al enviar una solicitud, el animal puede mostrarse como «Solicitud en
          progreso».
        </li>
        <li>
          La recomendación de compatibilidad es solo una herramienta de apoyo y no obliga a Adopet.{" "}
          <strong>La decisión final de cada adopción corresponde siempre al personal</strong>, tras
          la evaluación del hogar y la entrevista.
        </li>
        <li>
          Toda adopción aprobada se formaliza con un acta de adopción responsable. El adoptante se
          compromete a cumplir la tenencia responsable: alimentación, atención veterinaria,
          vacunación, esterilización cuando corresponda, buen trato y no abandono.
        </li>
        <li>
          Adopet puede realizar seguimiento posterior a la adopción y, ante maltrato o incumplimiento
          del acta, retirar al animal y denunciar el caso a las autoridades.
        </li>
        <li>
          Se prohíbe vender, regalar, ceder o utilizar al animal adoptado con fines de lucro, para
          peleas o en cualquier forma de crueldad.
        </li>
      </ul>

      <h2>7. Citas, reservas y costos</h2>
      <ul>
        <li>
          Los clientes pueden reservar un día y una hora para atender a sus animales, según la
          disponibilidad del personal. Adopet puede reprogramar o cancelar una cita por causas
          operativas, avisando con la mayor anticipación posible.
        </li>
        <li>
          Hoy la plataforma no realiza cobros en línea. Si se habilitan, sus condiciones (precio,
          forma de pago, cancelación, reembolso y factura) se publicarán aquí antes de entrar en
          vigor.
        </li>
        <li>El costo de la conexión a internet y de los datos móviles corre por cuenta del usuario.</li>
      </ul>

      <h2>8. Asistente virtual y recomendaciones</h2>
      <p>
        El asistente virtual usa inteligencia artificial para responder preguntas sobre Adopet, sus
        servicios, el proceso de adopción y los animales disponibles. Sus respuestas son
        orientativas, pueden contener errores y{" "}
        <strong>no sustituyen la consulta veterinaria ni la atención médica</strong>. Ante una
        emergencia, acude a un veterinario o a un centro de salud. Por seguridad, el número de
        consultas por minuto está limitado.
      </p>

      <h2>9. Uso aceptable y usos prohibidos</h2>
      <p>
        Al usar la plataforma te comprometes a cumplir la ley, respetar a las demás personas y a los
        animales, y usarla solo para los fines para los que fue creada. En particular, está
        prohibido:
      </p>
      <ul>
        <li>Suplantar a otra persona, crear cuentas falsas o registrar datos falsos.</li>
        <li>Enviar contenido ofensivo, amenazante, difamatorio, engañoso o publicitario (spam).</li>
        <li>Usar la plataforma para cometer fraude o cualquier otro fin ilícito.</li>
        <li>
          Intentar acceder sin autorización a cuentas ajenas, a áreas restringidas o a los datos de
          otros usuarios.
        </li>
        <li>
          Atacar o vulnerar la seguridad del servicio, introducir software malicioso o sobrecargar
          intencionalmente sus servidores.
        </li>
        <li>
          Extraer de forma automatizada (scraping) el catálogo, las fotografías u otros contenidos
          de la plataforma.
        </li>
        <li>Usar el asistente virtual para fines ajenos a Adopet o para intentar manipularlo.</li>
      </ul>

      <h2>10. Propiedad intelectual</h2>
      <p>
        La marca Adopet, su logotipo, los textos, las fotografías, el diseño y el software de la
        plataforma pertenecen a Adopet o se usan con autorización, conforme a la Ley N.º 1322 de
        Derecho de Autor. No pueden copiarse, reproducirse ni distribuirse sin permiso previo y por
        escrito. Los componentes de código abierto que usa la plataforma conservan sus propias
        licencias.
      </p>

      <h2>11. Enlaces y servicios de terceros</h2>
      <p>
        La plataforma enlaza a redes sociales y servicios de terceros, como Facebook, Instagram,
        TikTok y WhatsApp. Esos servicios se rigen por sus propios términos y políticas, y Adopet no
        responde por su contenido ni por su funcionamiento.
      </p>

      <h2>12. Garantías y limitación de responsabilidad</h2>
      <ul>
        <li>
          Adopet procura que la información publicada sea correcta y esté actualizada, pero no
          garantiza la ausencia de errores ni la disponibilidad ininterrumpida de la plataforma, que
          puede interrumpirse por mantenimiento o por causas ajenas.
        </li>
        <li>
          Adopet no responde por daños derivados del mal uso de la plataforma, de la información
          falsa que entregue un usuario ni de las fallas de servicios de terceros.
        </li>
        <li>
          Esta limitación no se aplica en casos de dolo o negligencia grave de Adopet, ni afecta los
          derechos que la Ley N.º 453 reconoce a los usuarios y consumidores.
        </li>
      </ul>

      <h2>13. Suspensión y cierre de cuentas por parte de Adopet</h2>
      <p>
        Adopet puede suspender o cerrar una cuenta que registre datos falsos, incumpla estos términos
        o ponga en riesgo la seguridad de la plataforma, de otros usuarios o de los animales. Salvo
        que la urgencia de seguridad lo impida, se informará el motivo al titular, que puede pedir su
        revisión escribiendo por los canales de contacto.
      </p>

      <h2>14. Baja del usuario</h2>
      <p>
        Puedes dejar de usar la plataforma en cualquier momento. Para cerrar tu cuenta y pedir la
        eliminación de tus datos, escríbenos por los canales de contacto; el personal atiende la
        solicitud de forma manual. Algunos registros, como el historial clínico de los animales y las
        actas de adopción, pueden conservarse durante los plazos que exija la ley, según la{" "}
        <Link href="/privacidad" className={link}>
          Política de Privacidad
        </Link>
        .
      </p>

      <h2>15. Privacidad</h2>
      <p>
        El tratamiento de tus datos personales se rige por la{" "}
        <Link href="/privacidad" className={link}>
          Política de Privacidad y Cookies
        </Link>
        , que forma parte de estos términos.
      </p>

      <h2>16. Modificaciones de los términos</h2>
      <p>
        Adopet puede modificar estos términos. Cada versión se publica en esta página con su fecha de
        actualización. El uso posterior del servicio implica su aceptación; si no estás de acuerdo,
        puedes dejar de usar la plataforma y pedir el cierre de tu cuenta.
      </p>

      <h2>17. Ley aplicable, controversias y cláusulas generales</h2>
      <ul>
        <li>
          Estos términos se rigen por las leyes del Estado Plurinacional de Bolivia, en particular la
          Ley N.º 700 de defensa de los animales, la Ley Autonómica Municipal N.º 037/2015 de
          tenencia responsable de animales de Santa Cruz de la Sierra, la Ley N.º 164 de
          Telecomunicaciones y TIC y la Ley N.º 453 de derechos de usuarios y consumidores.
        </li>
        <li>
          Ante cualquier desacuerdo, escríbenos primero para buscar una solución. Si no se resuelve,
          se someterá a los tribunales competentes de Santa Cruz de la Sierra.
        </li>
        <li>
          Si alguna cláusula resulta inválida, las demás siguen vigentes. Que Adopet no exija el
          cumplimiento de una cláusula en un caso no significa que renuncie a ella.
        </li>
        <li>
          En lo referido a una adopción concreta, el acta de adopción responsable firmada prevalece
          sobre estos términos.
        </li>
      </ul>

      <h2 id="contacto">18. Contacto y redes oficiales</h2>
      <LegalContact intro="Para consultas sobre estos términos, escríbenos o síguenos en nuestros canales oficiales:" />
    </LegalPage>
  );
}
