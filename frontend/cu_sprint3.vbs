'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE CASOS DE USO - Sprint 3
'
' Historias del sprint:
'   HU12 Seguimiento post-adopcion      -> Gestion de Adopciones
'   HU7  Panel de KPI en tiempo real    -> Personal Directivo
'   HU9  Asistente virtual con IA       -> Cliente
'
' Los actores salen de los roles reales del sistema: GESTION registra
' los seguimientos, DIRECTIVO consulta los indicadores y el asistente,
' el registro y el contacto son publicos (los usa el cliente).
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

Dim actGestion
Dim actDirectivo
Dim actCliente

Dim ucSeguimiento
Dim ucKpi
Dim ucAsistente

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    ' ---------- Crear el diagrama de Casos de Uso ----------
    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 3 - Diagrama de Casos de Uso", "Use Case")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Actores ----------
    Set actGestion = NuevoElemento("Gestion de Adopciones", "Actor")
    Set actDirectivo = NuevoElemento("Personal Directivo", "Actor")
    Set actCliente = NuevoElemento("Cliente", "Actor")

    ' ---------- Casos de uso (uno por historia de usuario) ----------
    Set ucSeguimiento = NuevoElemento("HU12 Seguimiento post-adopcion", "UseCase")
    ucSeguimiento.Notes = "Registro y consulta de los seguimientos de un animal ya adoptado."
    ucSeguimiento.Update

    Set ucKpi = NuevoElemento("HU7 Panel de KPI en tiempo real", "UseCase")
    ucKpi.Notes = "Panel e indicadores de gestion comparados contra el periodo anterior."
    ucKpi.Update

    Set ucAsistente = NuevoElemento("HU9 Asistente virtual con IA", "UseCase")
    ucAsistente.Notes = "Sitio publico, registro de clientes y contacto."
    ucAsistente.Update

    oPackage.Elements.Refresh

    ' ---------- Relaciones actor - caso de uso ----------
    Asociar actGestion, ucSeguimiento
    Asociar actDirectivo, ucKpi
    Asociar actCliente, ucAsistente

    ' ---------- Ubicacion en el diagrama ----------
    ' Actores a la izquierda, casos de uso a la derecha.
    '        elemento       izq  arriba ancho alto
    Colocar actGestion, 80, 60, 50, 90
    Colocar actDirectivo, 80, 240, 50, 90
    Colocar actCliente, 80, 420, 50, 90

    Colocar ucSeguimiento, 380, 70, 220, 70
    Colocar ucKpi, 380, 250, 220, 70
    Colocar ucAsistente, 380, 430, 220, 70

    oDiagram.Update
    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Output "Diagrama de casos de uso del Sprint 3 creado: 3 actores, 3 casos de uso."

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
