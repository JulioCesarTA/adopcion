'==================================================================
' Script de Enterprise Architect (VBScript)
' MODELO C4 - Sprint 1 (tres niveles)
'
' Historias del sprint:
'   HU8 Gestion de usuario          -> Administrador
'   HU1 Gestion de animal           -> Administrador
'   HU2 Registro de consulta clinica-> Veterinario
'   HU3 Gestionar historial clinico -> Veterinario
'   HU4 Gestion de vacunacion       -> Veterinario
'
' Crea tres diagramas en el paquete seleccionado:
'   Nivel 1 - Contexto del sistema
'   Nivel 2 - Contenedores
'   Nivel 3 - Componentes de la API (modulos reales del Sprint 1)
'
' Convencion C4: cada elemento lleva su tipo como estereotipo
' (Person, Software System, Container, Component, External System)
' y en sus notas la tecnologia entre corchetes y su responsabilidad.
' Cada relacion dice que hace y con que protocolo.
'
' USO:
' 1. Scripting -> Scripts -> tu grupo -> New VBScript
' 2. Pega TODO y Save Script
' 3. En el Browser SELECCIONA el paquete destino
' 4. Clic derecho sobre el script -> Run Script
'==================================================================

option explicit

!INC Local Scripts.EAConstants-VBScript

Dim oPackage
Dim oDiagram

' Nivel 1
Dim pAdmin, pVet, sAdopet, xS3a
' Nivel 2
Dim bSistema, cWeb, cApi, cDb, cFotos, pAdmin2, pVet2, xS3b
' Nivel 3
Dim bApi, cWeb3, cDb3, xS3c
Dim kGuards, kAuth, kUsers, kAnimals, kStatus, kClinical, kCatalogs, kStorage, kPrisma

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    Nivel1
    Nivel2
    Nivel3

    Session.Output "Modelo C4 del Sprint 1 creado: contexto, contenedores y componentes."

End Sub

'==================================================================
' NIVEL 1 - CONTEXTO
'==================================================================
Sub Nivel1
    NuevoDiagrama "Sprint 1 - C4 Nivel 1 - Contexto del Sistema"

    Set pAdmin = Elem("Administrador", "Actor", "Person", _
        "Gestiona las cuentas del personal (HU8) y el registro de los animales (HU1).")
    Set pVet = Elem("Veterinario", "Actor", "Person", _
        "Registra consultas (HU2), consulta el historial clinico (HU3) y aplica vacunas (HU4).")
    Set sAdopet = Elem("Sistema Adopet", "Class", "Software System", _
        "Registro de animales, historia clinica digital, vacunacion y gestion de usuarios.")
    Set xS3a = Elem("Amazon S3", "Class", "External System", _
        "Almacenamiento de las fotografias de los animales cuando STORAGE_DRIVER=s3.")

    Rel pAdmin, sAdopet, "Gestiona usuarios y animales [HTTPS]"
    Rel pVet, sAdopet, "Registra consultas y vacunas, consulta el historial [HTTPS]"
    Rel sAdopet, xS3a, "Guarda y elimina fotografias [AWS SDK, HTTPS]"

    Colocar pAdmin, 80, 60, 60, 100
    Colocar pVet, 80, 300, 60, 100
    Colocar sAdopet, 380, 170, 260, 130
    Colocar xS3a, 780, 190, 220, 90

    Cerrar
End Sub

'==================================================================
' NIVEL 2 - CONTENEDORES
'==================================================================
Sub Nivel2
    NuevoDiagrama "Sprint 1 - C4 Nivel 2 - Contenedores"

    Set bSistema = Elem("Sistema Adopet", "Boundary", "", "")
    Set pAdmin2 = pAdmin
    Set pVet2 = pVet
    Set cWeb = Elem("Aplicacion web", "Component", "Container", _
        "[Next.js 15, React 19, TanStack Query] Pantallas de login, usuarios, animales, consultas, " & _
        "historial y vacunas. Reescribe /api/v1 y /uploads hacia la API.")
    Set cApi = Elem("API REST", "Component", "Container", _
        "[NestJS 11, TypeScript] Expone /api/v1, valida los datos, aplica JWT y roles y ejecuta las reglas de negocio.")
    Set cDb = Elem("Base de datos", "Component", "Container", _
        "[PostgreSQL 16] Usuarios, animales, consultas, diagnosticos, tratamientos, medicamentos, vacunas y vacunaciones.")
    Set cFotos = Elem("Almacen local de fotos", "Component", "Container", _
        "[Sistema de archivos UPLOAD_DIR/animals] Fotografias cuando STORAGE_DRIVER=local.")
    Set xS3b = xS3a

    Rel cWeb, cApi, "Llama a la API [JSON, HTTPS]"
    Rel cApi, cDb, "Lee y escribe [Prisma, SQL/TCP 5432]"
    Rel cApi, cFotos, "Guarda fotografias [E/S de archivos]"
    Rel cApi, xS3b, "Guarda fotografias [AWS SDK, HTTPS]"
    ' Las relaciones persona -> sistema ya existen; en este nivel la persona usa la aplicacion web.
    Rel pAdmin2, cWeb, "Usa [HTTPS]"
    Rel pVet2, cWeb, "Usa [HTTPS]"

    Colocar bSistema, 220, 30, 620, 560
    Colocar pAdmin2, 60, 80, 60, 100
    Colocar pVet2, 60, 330, 60, 100
    Colocar cWeb, 280, 90, 240, 110
    Colocar cApi, 280, 290, 240, 110
    Colocar cDb, 280, 460, 240, 100
    Colocar cFotos, 580, 290, 230, 100
    Colocar xS3b, 920, 300, 200, 90

    Cerrar
End Sub

'==================================================================
' NIVEL 3 - COMPONENTES DE LA API
'==================================================================
Sub Nivel3
    NuevoDiagrama "Sprint 1 - C4 Nivel 3 - Componentes de la API REST"

    Set bApi = Elem("API REST [NestJS 11]", "Boundary", "", "")
    Set cWeb3 = cWeb
    Set cDb3 = cDb
    Set xS3c = xS3a

    Set kGuards = Elem("JwtAuthGuard y RolesGuard", "Component", "Component", _
        "[NestJS Guards, common/guards] Verifican el token JWT y el rol en cada peticion.")
    Set kAuth = Elem("AuthController y AuthService", "Component", "Component", _
        "[modules/auth] /auth/login, refresh, logout, me y change-password; emite y renueva los tokens.")
    Set kUsers = Elem("UsersController y UsersService", "Component", "Component", _
        "[modules/users] HU8: /users, alta, edicion, activacion y restablecimiento de contrasena.")
    Set kAnimals = Elem("AnimalsController y AnimalsService", "Component", "Component", _
        "[modules/animals] HU1 y HU3: /animals, ficha, foto, salida, reingreso y /animals/:id/timeline.")
    Set kStatus = Elem("AnimalStatusService", "Component", "Component", _
        "[modules/animals] Cambia la situacion del animal y valida las transiciones.")
    Set kClinical = Elem("ClinicalController y ClinicalService", "Component", "Component", _
        "[modules/clinical] HU2 y HU4: consultas, diagnosticos, tratamientos, medicamentos y vacunaciones.")
    Set kCatalogs = Elem("CatalogsController y CatalogsService", "Component", "Component", _
        "[modules/catalogs] Catalogo de vacunas: /vaccines.")
    Set kStorage = Elem("StorageService", "Component", "Component", _
        "[modules/storage] Guarda la foto en disco local o en Amazon S3 segun STORAGE_DRIVER.")
    Set kPrisma = Elem("PrismaService", "Component", "Component", _
        "[Prisma 6, prisma/] Acceso a PostgreSQL y transacciones.")

    Rel cWeb3, kAuth, "Inicia sesion y renueva el token [JSON, HTTPS]"
    Rel cWeb3, kGuards, "Peticiones con Bearer JWT [JSON, HTTPS]"
    Rel kGuards, kUsers, "Autoriza (ADMIN)"
    Rel kGuards, kAnimals, "Autoriza (escritura GESTION y ADMIN; lectura todo el personal)"
    Rel kGuards, kClinical, "Autoriza (VETERINARIO, ADMIN)"
    Rel kGuards, kCatalogs, "Autoriza (ADMIN; lectura VETERINARIO)"
    Rel kClinical, kStatus, "Actualiza la situacion"
    Rel kAnimals, kStatus, "Cambia la situacion"
    Rel kAnimals, kStorage, "Guarda la fotografia"
    Rel kStorage, xS3c, "PutObject y DeleteObject [AWS SDK]"
    Rel kAuth, kPrisma, "Usa"
    Rel kUsers, kPrisma, "Usa"
    Rel kAnimals, kPrisma, "Usa"
    Rel kClinical, kPrisma, "Usa"
    Rel kCatalogs, kPrisma, "Usa"
    Rel kPrisma, cDb3, "Lee y escribe [SQL/TCP 5432]"

    Colocar cWeb3, 420, 20, 240, 90
    Colocar bApi, 40, 150, 1060, 560

    Colocar kAuth, 70, 190, 230, 90
    Colocar kGuards, 430, 190, 230, 90
    Colocar kUsers, 70, 340, 230, 90
    Colocar kAnimals, 340, 340, 230, 90
    Colocar kClinical, 610, 340, 230, 90
    Colocar kCatalogs, 860, 340, 220, 90
    Colocar kStatus, 470, 480, 230, 80
    Colocar kStorage, 200, 480, 230, 80
    Colocar kPrisma, 610, 600, 230, 80

    Colocar cDb3, 610, 760, 240, 90
    Colocar xS3c, 150, 760, 220, 90

    Cerrar
End Sub

'------------------------------------------------------------------
' Utilidades
'------------------------------------------------------------------
Sub NuevoDiagrama(nombre)
    Set oDiagram = oPackage.Diagrams.AddNew(nombre, "Component")
    oDiagram.Update
    oPackage.Diagrams.Refresh
End Sub

Sub Cerrar
    oDiagram.Update
    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID
End Sub

' Elemento C4: tipo de EA, estereotipo C4 y descripcion.
Function Elem(nombre, tipo, estereotipo, nota)
    Dim e
    Set e = oPackage.Elements.AddNew(nombre, tipo)
    If estereotipo <> "" Then e.Stereotype = estereotipo
    If nota <> "" Then e.Notes = nota
    e.Update
    oPackage.Elements.Refresh
    Set Elem = e
End Function

' Relacion C4: dependencia dirigida con descripcion y tecnologia.
Sub Rel(origen, destino, texto)
    Dim c
    Set c = origen.Connectors.AddNew(texto, "Dependency")
    c.SupplierID = destino.ElementID
    c.Direction = "Source -> Destination"
    c.Update
    origen.Connectors.Refresh
End Sub

' Ubica un elemento en el diagrama actual. EA mide hacia abajo con negativos.
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
