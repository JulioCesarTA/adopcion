workspace "Adopet - Sprint 3" "Modelo C4 del Sprint 3: HU12, HU7 y HU9." {

    model {
        gestion = person "Gestion de Adopciones" "Registra el seguimiento de cada animal ya adoptado (HU12) y atiende los mensajes de contacto."
        directivo = person "Personal Directivo" "Consulta el panel y los indicadores de gestion en tiempo real (HU7)."
        cliente = person "Cliente" "Visita el sitio publico, conversa con el asistente virtual (HU9), se registra y envia mensajes de contacto."

        claude = softwareSystem "API de Claude" "Modelo de lenguaje de Anthropic que genera las respuestas del asistente virtual." "Externo"
        smtp = softwareSystem "Servidor SMTP" "Entrega el aviso de contacto a la institucion y el acuse de recibo al visitante." "Externo"

        adopet = softwareSystem "Sistema Adopet" "Seguimiento post-adopcion, panel de indicadores, sitio publico y asistente virtual con IA." {

            web = container "Aplicacion web" "Sitio publico, portal del cliente, panel, indicadores, seguimientos y buzon de mensajes. Reescribe /api/v1 hacia la API." "Next.js 15, React 19, TanStack Query" "Navegador"

            api = container "API REST" "Expone /api/v1, valida los datos, aplica JWT y roles y ejecuta las reglas de negocio." "NestJS 11, TypeScript" {
                guards = component "JwtAuthGuard y RolesGuard" "Verifican el token JWT y el rol; las rutas marcadas @Public no lo exigen." "NestJS Guards"
                adoptions = component "Adoptions (seguimientos)" "HU12: /adoptions/:id/followups." "AdoptionsController, AdoptionsService"
                kpis = component "Kpis" "HU7: seis indicadores comparados contra el periodo anterior (/kpis)." "KpisController, KpisService"
                dashboard = component "Dashboard" "HU7: panel con cinco tarjetas (/dashboard)." "DashboardController, DashboardService"
                public = component "Public" "Informacion de la institucion, catalogo publico, registro de clientes y contacto (/public)." "PublicController, PublicService"
                chat = component "Chat" "HU9: valida el historial de la conversacion y consulta al modelo (/chat)." "ChatController, ChatService"
                contact = component "Contact" "Buzon de los mensajes de contacto." "ContactController"
                mail = component "MailService" "Envio de correo." "Nodemailer"
                prisma = component "PrismaService" "Acceso a PostgreSQL y transacciones." "Prisma 6"
            }

            db = container "Base de datos" "Seguimientos post-adopcion, mensajes de contacto, usuarios clientes y los datos que alimentan los indicadores." "PostgreSQL 16" "BaseDeDatos"
        }

        # Relaciones
        gestion -> web "Registra seguimientos y lee mensajes" "HTTPS"
        directivo -> web "Consulta el panel y los indicadores" "HTTPS"
        cliente -> web "Usa el sitio publico y el asistente" "HTTPS"
        web -> guards "Peticiones con Bearer JWT" "JSON/HTTPS"
        web -> public "Consultas del sitio publico, registro y contacto" "JSON/HTTPS"
        web -> chat "Envia la conversacion" "JSON/HTTPS"
        guards -> adoptions "Autoriza (registrar: GESTION, ADMIN; leer: DIRECTIVO)"
        guards -> kpis "Autoriza (ADMIN, VETERINARIO, GESTION, DIRECTIVO)"
        guards -> dashboard "Autoriza (cualquier usuario autenticado)"
        guards -> contact "Autoriza (ADMIN, GESTION)"
        chat -> claude "Pide la respuesta del asistente" "Anthropic SDK, HTTPS"
        public -> mail "Avisa del nuevo mensaje"
        mail -> smtp "Envia el correo" "SMTP"
        adoptions -> prisma "Usa"
        kpis -> prisma "Usa"
        dashboard -> prisma "Usa"
        public -> prisma "Usa"
        chat -> prisma "Usa"
        contact -> prisma "Usa"
        prisma -> db "Lee y escribe" "SQL/TCP 5432"
    }

    views {
        systemContext adopet "Nivel1_Contexto" "Sprint 3 - Diagrama de contexto del Sistema Adopet." {
            include *
            autoLayout lr
        }

        container adopet "Nivel2_Contenedores" "Sprint 3 - Diagrama de contenedores del Sistema Adopet." {
            include *
            autoLayout tb
        }

        component api "Nivel3_Componentes" "Sprint 3 - Diagrama de componentes de la API REST." {
            include *
            autoLayout tb
        }

        styles {
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Software System" {
                background #1168bd
                color #ffffff
            }
            element "Externo" {
                background #999999
                color #ffffff
            }
            element "Container" {
                background #438dd5
                color #ffffff
            }
            element "Component" {
                background #85bbf0
                color #000000
            }
            element "Navegador" {
                shape WebBrowser
            }
            element "BaseDeDatos" {
                shape Cylinder
            }
        }
    }
}
