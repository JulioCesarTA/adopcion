'==================================================================
' Script de Enterprise Architect (VBScript)
' MODELO DE CONTEXTO - Sprint 0 (Modelos Iniciales)
'
' El sistema se situa entre tres grupos de actores y dos servicios
' externos (scrum.md, seccion 5.1):
'   Personal interno: Administrador, Personal Veterinario,
'     Gestion Animal y Adopciones, Personal Directivo.
'   Ciudadania: Cliente registrado y Visitante anonimo.
'   Servicios externos: API Anthropic Claude y Servidor SMTP.
' La informacion persiste en PostgreSQL 16 y las fotografias en el
' sistema de archivos del servidor.
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

Dim sistema
Dim actAdmin
Dim actVet
Dim actGestion
Dim actDirectivo
Dim actCliente
Dim actVisitante
Dim extClaude
Dim extSmtp
Dim almDb
Dim almArchivos

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 0 - Modelo de Contexto", "Logical")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- El sistema ----------
    Set sistema = NuevoElemento("Sistema de Gestion de Adopciones y Trazabilidad Sanitaria Animal - Adopet", "Class", "sistema")

    ' ---------- Personal interno ----------
    Set actAdmin = NuevoElemento("Administrador", "Actor", "")
    Set actVet = NuevoElemento("Personal Veterinario", "Actor", "")
    Set actGestion = NuevoElemento("Gestion Animal y Adopciones", "Actor", "")
    Set actDirectivo = NuevoElemento("Personal Directivo", "Actor", "")

    ' ---------- Ciudadania ----------
    Set actCliente = NuevoElemento("Cliente registrado", "Actor", "")
    Set actVisitante = NuevoElemento("Visitante anonimo", "Actor", "")

    ' ---------- Servicios externos y almacenamiento ----------
    Set extClaude = NuevoElemento("API Anthropic Claude", "Class", "servicio externo")
    Set extSmtp = NuevoElemento("Servidor SMTP", "Class", "servicio externo")
    Set almDb = NuevoElemento("PostgreSQL 16", "Class", "base de datos")
    Set almArchivos = NuevoElemento("Sistema de archivos", "Class", "almacenamiento")

    oPackage.Elements.Refresh

    ' ---------- Flujos (scrum.md 5.1) ----------
    Flujo actAdmin, sistema, "administra usuarios y catalogos"
    Flujo actVet, sistema, "registra consultas, tratamientos, vacunas y cuarentenas"
    Flujo actGestion, sistema, "gestiona animales, adoptantes y solicitudes de adopcion"
    Flujo actDirectivo, sistema, "consulta panel e informes"
    Flujo actCliente, sistema, "ve adoptables, usa el asistente y su perfil"
    Flujo actVisitante, sistema, "ve adoptables, se registra, pregunta y contacta"

    Flujo sistema, extClaude, "consulta del asistente"
    Flujo sistema, extSmtp, "aviso y acuse de recibo"
    Flujo sistema, almDb, "lectura y escritura"
    Flujo sistema, almArchivos, "fotografias de animales"

    ' ---------- Ubicacion ----------
    '        elemento       izq  arriba ancho alto
    Colocar sistema, 420, 300, 260, 120

    Colocar actAdmin, 80, 40, 50, 90
    Colocar actVet, 80, 200, 50, 90
    Colocar actGestion, 80, 360, 50, 90
    Colocar actDirectivo, 80, 520, 50, 90

    Colocar actCliente, 980, 160, 50, 90
    Colocar actVisitante, 980, 420, 50, 90

    Colocar extClaude, 230, 680, 170, 60
    Colocar extSmtp, 420, 680, 170, 60
    Colocar almDb, 610, 680, 170, 60
    Colocar almArchivos, 800, 680, 170, 60

    oDiagram.Update
    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Output "Modelo de contexto del Sprint 0 creado: 6 actores, 2 servicios externos y 2 almacenes."

End Sub

' Crea un elemento dentro del paquete seleccionado, con estereotipo opcional.
Function NuevoElemento(nombre, tipo, estereotipo)
    Dim e
    Set e = oPackage.Elements.AddNew(nombre, tipo)
    If estereotipo <> "" Then e.Stereotype = estereotipo
    e.Update
    Set NuevoElemento = e
End Function

' Flujo de informacion con nombre, del origen al destino.
Sub Flujo(origen, destino, nombre)
    Dim c
    Set c = origen.Connectors.AddNew(nombre, "InformationFlow")
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
