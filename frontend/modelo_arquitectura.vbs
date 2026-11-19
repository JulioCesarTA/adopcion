'==================================================================
' Script de Enterprise Architect (VBScript)
' MODELO DE ARQUITECTURA - Sprint 0 (Modelos Iniciales)
'
' Cliente-servidor en tres capas con API REST (scrum.md, seccion 5.3):
'   Presentacion: Next.js 15 (App Router) con los grupos de rutas
'     (public), (portal) y (app); Next reescribe /api/v1 y /uploads
'     hacia el backend.
'   Aplicacion: NestJS 11, API REST /api/v1, con guardias e
'     interceptores globales y los modulos de dominio.
'   Datos: Prisma 6 sobre PostgreSQL 16 y fotografias en el sistema
'     de archivos (UPLOAD_DIR/animals).
'   Externos opcionales: Anthropic Claude y SMTP.
'
' USO:
' 1. Scripting -> Scripts -> tu grupo -> New VBScript
' 2. Pega TODO y Save Script
' 3. En el Browser SELECCIONA el paquete destino
' 4. Clic derecho sobre el script -> Run Script
'==================================================================

option explicit

!INC Local Scripts.EAConstants-VBScript

Dim oDiagram
Dim oPackage

Dim bPres
Dim bApp
Dim bDatos
Dim bExt
Dim actUsuario
Dim cRutas
Dim cMiddleware
Dim cCliente
Dim cHooks
Dim cProxy
Dim cGuardias
Dim cTransversal
Dim cSwagger
Dim mAuth
Dim mAnimales
Dim mAdopcion
Dim mRecom
Dim mPanel
Dim mPublico
Dim cPrisma
Dim cPg
Dim cArchivos
Dim xClaude
Dim xSmtp

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 0 - Modelo de Arquitectura", "Component")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Capas ----------
    Set bPres = Nuevo("Capa de presentacion - Next.js 15 (App Router)", "Boundary", "", "")
    Set bApp = Nuevo("Capa de aplicacion - NestJS 11 (API REST /api/v1)", "Boundary", "", "")
    Set bDatos = Nuevo("Capa de datos", "Boundary", "", "")
    Set bExt = Nuevo("Servicios externos (opcionales)", "Boundary", "", "")

    Set actUsuario = Nuevo("Usuario (navegador web)", "Actor", "", "")

    ' ---------- Presentacion ----------
    Set cRutas = Nuevo("Grupos de rutas: (public) (portal) (app)", "Component", "pantallas", _
        "(public) landing, registro y legales; (portal) adoptables, asistente y perfil; (app) pantallas internas.")
    Set cMiddleware = Nuevo("middleware.ts", "Component", "sesion", "Verifica la cookie de sesion.")
    Set cCliente = Nuevo("lib/api.ts - auth.tsx - roles.ts", "Component", "cliente HTTP", "Cliente con refresco automatico del token.")
    Set cHooks = Nuevo("Hooks TanStack Query", "Component", "estado del servidor", "Un hook por dominio; formularios con React Hook Form y Zod.")
    Set cProxy = Nuevo("next.config.ts rewrites", "Component", "proxy inverso", "/api/v1 y /uploads hacia el puerto 4000.")

    ' ---------- Aplicacion ----------
    Set cGuardias = Nuevo("JwtAuthGuard - RolesGuard - ThrottlerGuard", "Component", "transversal", _
        "Autenticacion JWT, acceso por rol denegado por defecto y limite por IP.")
    Set cTransversal = Nuevo("SerializeInterceptor - AllExceptionsFilter", "Component", "transversal", _
        "Decimal a numero y formato uniforme de errores { statusCode, message, errors }.")
    Set cSwagger = Nuevo("Swagger /api/docs", "Component", "documentacion", "")
    Set mAuth = Nuevo("auth - users", "Component", "modulo", "")
    Set mAnimales = Nuevo("animals - clinical - catalogs", "Component", "modulo", "")
    Set mAdopcion = Nuevo("adopters - adoptions", "Component", "modulo", "")
    Set mRecom = Nuevo("recommendation (engine.ts + ml/ Random Forest)", "Component", "modulo", _
        "Motor de compatibilidad aislado como funcion pura.")
    Set mPanel = Nuevo("dashboard - kpis", "Component", "modulo", "")
    Set mPublico = Nuevo("public - chat - mail - contact", "Component", "modulo", "")

    ' ---------- Datos ----------
    Set cPrisma = Nuevo("Prisma 6 - PrismaService", "Component", "ORM", "")
    Set cPg = Nuevo("PostgreSQL 16", "Component", "base de datos", "CHECK, indices unicos parciales y migraciones versionadas.")
    Set cArchivos = Nuevo("Sistema de archivos UPLOAD_DIR/animals", "Component", "almacenamiento", "Fotografias de los animales.")

    ' ---------- Externos ----------
    Set xClaude = Nuevo("Anthropic Claude", "Component", "servicio externo", "Asistente virtual; sin clave responde 503.")
    Set xSmtp = Nuevo("SMTP", "Component", "servicio externo", "Correo del contacto; sin credenciales el mensaje se guarda igual.")

    oPackage.Elements.Refresh

    ' ---------- Dependencias (scrum.md 5.3) ----------
    Enlace actUsuario, cRutas, "HTTPS"
    Enlace cMiddleware, cRutas, "protege (portal) y (app)"
    Enlace cRutas, cCliente, "usa"
    Enlace cCliente, cHooks, "usa"
    Enlace cHooks, cProxy, "peticiones"
    Enlace cProxy, cGuardias, "HTTP :4000"
    Enlace cGuardias, mAuth, "autoriza"
    Enlace cGuardias, mAnimales, "autoriza"
    Enlace cGuardias, mAdopcion, "autoriza"
    Enlace cGuardias, mRecom, "autoriza"
    Enlace cGuardias, mPanel, "autoriza"
    Enlace cGuardias, mPublico, "autoriza"
    Enlace mAuth, cPrisma, "usa"
    Enlace mAnimales, cPrisma, "usa"
    Enlace mAdopcion, cPrisma, "usa"
    Enlace mRecom, cPrisma, "usa"
    Enlace mPanel, cPrisma, "usa"
    Enlace mPublico, cPrisma, "usa"
    Enlace mAnimales, cArchivos, "guarda fotos"
    Enlace cPrisma, cPg, "SQL"
    Enlace mPublico, xClaude, "si hay API key"
    Enlace mPublico, xSmtp, "si hay credenciales"

    ' ---------- Ubicacion ----------
    '        elemento       izq  arriba ancho alto
    Colocar bPres, 160, 20, 1100, 200
    Colocar bApp, 160, 250, 1100, 330
    Colocar bDatos, 160, 610, 760, 150
    Colocar bExt, 950, 610, 310, 150

    Colocar actUsuario, 40, 70, 50, 90

    Colocar cRutas, 190, 60, 220, 60
    Colocar cMiddleware, 190, 140, 220, 50
    Colocar cCliente, 450, 60, 220, 60
    Colocar cHooks, 710, 60, 220, 60
    Colocar cProxy, 970, 60, 250, 60

    Colocar cGuardias, 190, 290, 300, 60
    Colocar cTransversal, 520, 290, 300, 60
    Colocar cSwagger, 850, 290, 200, 60

    Colocar mAuth, 190, 400, 170, 55
    Colocar mAnimales, 370, 400, 200, 55
    Colocar mAdopcion, 580, 400, 170, 55
    Colocar mRecom, 760, 400, 250, 55
    Colocar mPanel, 1020, 400, 170, 55
    Colocar mPublico, 580, 500, 220, 55

    Colocar cPrisma, 190, 660, 200, 60
    Colocar cPg, 420, 660, 200, 60
    Colocar cArchivos, 650, 660, 240, 60

    Colocar xClaude, 980, 650, 250, 45
    Colocar xSmtp, 980, 705, 250, 45

    oDiagram.Update
    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Output "Modelo de arquitectura del Sprint 0 creado: 3 capas y 2 servicios externos."

End Sub

' Crea un elemento con estereotipo y nota opcionales.
Function Nuevo(nombre, tipo, estereotipo, nota)
    Dim e
    Set e = oPackage.Elements.AddNew(nombre, tipo)
    If estereotipo <> "" Then e.Stereotype = estereotipo
    If nota <> "" Then e.Notes = nota
    e.Update
    Set Nuevo = e
End Function

' Dependencia dirigida con nombre.
Sub Enlace(origen, destino, nombre)
    Dim c
    Set c = origen.Connectors.AddNew(nombre, "Dependency")
    c.SupplierID = destino.ElementID
    c.Direction = "Source -> Destination"
    c.Update
    origen.Connectors.Refresh
End Sub

' Ubica un elemento en el diagrama. EA mide hacia abajo con valores negativos.
Sub Colocar(elemento, izq, arriba, ancho, alto)
    Dim d
    Dim pos
    pos = "l=" & izq & ";r=" & (izq + ancho) & ";t=-" & arriba & ";b=-" & (arriba + alto) & ";"
    Set d = oDiagram.DiagramObjects.AddNew(pos, "")
    d.ElementID = elemento.ElementID
    d.Update
    oDiagram.DiagramObjects.Refresh
End Sub

Main
