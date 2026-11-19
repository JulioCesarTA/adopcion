'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE CASOS DE USO - Sprint 2
'
' Historias del sprint:
'   HU10 Gestion de periodos de cuarentena        -> Veterinario
'   HU5  Creacion de solicitud de adopcion        -> Gestion de Adopciones
'   HU6  Recomendacion de compatibilidad          -> Gestion de Adopciones
'   HU11 Gestionar Proceso de Adopcion            -> Gestion de Adopciones
'
' Los actores salen de los roles reales del sistema (@Roles en los
' controladores de NestJS): VETERINARIO y GESTION.
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

Dim actVet
Dim actGestion

Dim ucCuarentena
Dim ucSolicitud
Dim ucRecomendacion
Dim ucProceso

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    ' ---------- Crear el diagrama de Casos de Uso ----------
    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 2 - Diagrama de Casos de Uso", "Use Case")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Actores ----------
    Set actVet = NuevoElemento("Veterinario", "Actor")
    Set actGestion = NuevoElemento("Gestion de Adopciones", "Actor")

    ' ---------- Casos de uso (uno por historia de usuario) ----------
    Set ucCuarentena = NuevoElemento("HU10 Gestion de periodos de cuarentena", "UseCase")
    ucCuarentena.Notes = "Apertura del periodo de observacion o cuarentena, controles y cierre."
    ucCuarentena.Update

    Set ucSolicitud = NuevoElemento("HU5 Creacion de solicitud de adopcion", "UseCase")
    ucSolicitud.Notes = "Alta de la solicitud; una sola solicitud activa por animal."
    ucSolicitud.Update

    Set ucRecomendacion = NuevoElemento("HU6 Recomendacion de compatibilidad adoptante-animal", "UseCase")
    ucRecomendacion.Notes = "Puntaje de compatibilidad con Random Forest y motor de reglas de respaldo."
    ucRecomendacion.Update

    Set ucProceso = NuevoElemento("HU11 Gestionar Proceso de Adopcion", "UseCase")
    ucProceso.Notes = "Decision de aprobacion o rechazo y acta de entrega."
    ucProceso.Update

    oPackage.Elements.Refresh

    ' ---------- Relaciones actor - caso de uso ----------
    Asociar actVet, ucCuarentena
    Asociar actGestion, ucSolicitud
    Asociar actGestion, ucRecomendacion
    Asociar actGestion, ucProceso

    ' ---------- Ubicacion en el diagrama ----------
    ' Actores a la izquierda, casos de uso a la derecha.
    '        elemento       izq  arriba ancho alto
    Colocar actVet, 80, 60, 50, 90
    Colocar actGestion, 80, 350, 50, 90

    Colocar ucCuarentena, 380, 70, 230, 70
    Colocar ucSolicitud, 380, 250, 230, 70
    Colocar ucRecomendacion, 380, 360, 230, 70
    Colocar ucProceso, 380, 470, 230, 70

    oDiagram.Update
    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Output "Diagrama de casos de uso del Sprint 2 creado: 2 actores, 4 casos de uso."

End Sub

' Crea un elemento (Actor o UseCase) dentro del paquete seleccionado.
Function NuevoElemento(nombre, tipo)
    Dim e
    Set e = oPackage.Elements.AddNew(nombre, tipo)
    e.Update
    Set NuevoElemento = e
End Function

' Asociacion simple, sin direccion, entre un actor y un caso de uso.
Sub Asociar(actor, casoDeUso)
    Dim c
    Set c = actor.Connectors.AddNew("", "Association")
    c.SupplierID = casoDeUso.ElementID
    c.Direction = "Unspecified"
    c.Update
    actor.Connectors.Refresh
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
