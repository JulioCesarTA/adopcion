'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE CASOS DE USO - Sprint 1
'
' Historias del sprint:
'   HU8 Gestion de usuario          -> Administrador
'   HU1 Gestion de animal           -> Administrador
'   HU2 Registro de consulta clinica-> Veterinario
'   HU3 Gestionar historial clinico -> Veterinario
'   HU4 Gestion de vacunacion       -> Veterinario
'
' Los actores salen de los roles reales del sistema (@Roles en los
' controladores de NestJS): ADMIN y VETERINARIO. Las funciones de
' gestion de animales las asume el ADMIN (frontend/src/lib/roles.ts).
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

Dim actAdmin
Dim actVet

Dim ucUsuario
Dim ucAnimal
Dim ucConsulta
Dim ucHistorial
Dim ucVacunacion

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    ' ---------- Crear el diagrama de Casos de Uso ----------
    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 1 - Diagrama de Casos de Uso", "Use Case")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Actores ----------
    Set actAdmin = NuevoElemento("Administrador", "Actor")
    Set actVet = NuevoElemento("Veterinario", "Actor")

    ' ---------- Casos de uso (uno por historia de usuario) ----------
    Set ucUsuario = NuevoElemento("HU8 Gestion de usuario", "UseCase")
    ucUsuario.Notes = "Inicio de sesion, roles y administracion de cuentas."
    ucUsuario.Update

    Set ucAnimal = NuevoElemento("HU1 Gestion de animal", "UseCase")
    ucAnimal.Notes = "Registro, ficha, fotografia, salida y reingreso."
    ucAnimal.Update

    Set ucConsulta = NuevoElemento("HU2 Registro de consulta clinica", "UseCase")
    ucConsulta.Notes = "Consulta con diagnosticos, tratamientos y medicamentos."
    ucConsulta.Update

    Set ucHistorial = NuevoElemento("HU3 Gestionar historial clinico", "UseCase")
    ucHistorial.Notes = "Linea de tiempo clinica del animal en orden cronologico inverso."
    ucHistorial.Update

    Set ucVacunacion = NuevoElemento("HU4 Gestion de vacunacion", "UseCase")
    ucVacunacion.Notes = "Aplicacion de vacunas y calculo de proximas dosis."
    ucVacunacion.Update

    oPackage.Elements.Refresh

    ' ---------- Relaciones actor - caso de uso ----------
    Asociar actAdmin, ucUsuario
    Asociar actAdmin, ucAnimal
    Asociar actVet, ucConsulta
    Asociar actVet, ucHistorial
    Asociar actVet, ucVacunacion

    ' ---------- Ubicacion en el diagrama ----------
    ' Actores a la izquierda, casos de uso a la derecha.
    '        elemento       izq  arriba ancho alto
    Colocar actAdmin, 80, 120, 50, 90
    Colocar actVet, 80, 520, 50, 90

    Colocar ucUsuario, 380, 70, 200, 70
    Colocar ucAnimal, 380, 250, 200, 70
    Colocar ucConsulta, 380, 420, 200, 70
    Colocar ucHistorial, 380, 530, 200, 70
    Colocar ucVacunacion, 380, 640, 200, 70

    oDiagram.Update
    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Output "Diagrama de casos de uso del Sprint 1 creado: 2 actores, 5 casos de uso."

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
