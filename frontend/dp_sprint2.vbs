'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE PAQUETES - Sprint 2
'
' Historias: HU10, HU5, HU6, HU11
'
' Cada paquete es un modulo real del proyecto. Las dependencias salen
' de los import reales entre modulos:
'   <<use>>    un modulo llama a los servicios de otro
'   <<import>> importa el modulo de acceso a datos (Prisma)
'   <<access>> usa solo tipos o utilidades, sin inyectar servicios
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

Dim pkgfrontend
Dim pkgclinical
Dim pkganimals
Dim pkgadoptions
Dim pkgadopters
Dim pkgml
Dim pkgrecommendation
Dim pkgcatalogs
Dim pkgprisma

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    ' ---------- Crear el diagrama de Paquetes ----------
    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 2 - Diagrama de Paquetes", "Package")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Paquetes ----------
    Set pkgfrontend = NuevoPaquete("frontend", "Next.js: cuarentena, adoptantes, solicitudes, adoptables, modelo")
    Set pkgclinical = NuevoPaquete("clinical", "Periodos de observacion y cuarentena, controles")
    Set pkganimals = NuevoPaquete("animals", "Habilitar y retirar de adopcion")
    Set pkgadoptions = NuevoPaquete("adoptions", "Solicitudes, decision y acta de entrega")
    Set pkgadopters = NuevoPaquete("adopters", "Adoptantes y perfil de adopcion")
    Set pkgml = NuevoPaquete("ml", "Random Forest: CART, bagging, metricas, entrenamiento")
    Set pkgrecommendation = NuevoPaquete("recommendation", "Servicio de recomendacion y motor de reglas")
    Set pkgcatalogs = NuevoPaquete("catalogs", "Pesos del motor de reglas (solo lectura)")
    Set pkgprisma = NuevoPaquete("prisma", "Acceso a PostgreSQL")

    ' ---------- Dependencias ----------
    ' AddDep origen, destino, estereotipo
    AddDep pkgfrontend, pkgclinical, "use"
    AddDep pkgfrontend, pkgadoptions, "use"
    AddDep pkgfrontend, pkgadopters, "use"
    AddDep pkgfrontend, pkgrecommendation, "use"
    AddDep pkgclinical, pkganimals, "use"
    AddDep pkgadoptions, pkganimals, "use"
    AddDep pkgadoptions, pkgadopters, "use"
    AddDep pkgrecommendation, pkgml, "use"
    AddDep pkgrecommendation, pkgcatalogs, "use"
    AddDep pkgcatalogs, pkgrecommendation, "access"
    AddDep pkgclinical, pkgprisma, "import"
    AddDep pkgadoptions, pkgprisma, "import"
    AddDep pkgadopters, pkgprisma, "import"
    AddDep pkgrecommendation, pkgprisma, "import"
    AddDep pkgml, pkgprisma, "import"
    AddDep pkgcatalogs, pkgprisma, "import"

    ' ---------- Colocar en el diagrama (t y b negativos en EA) ----------
    AddObj pkgfrontend, 300, 470, -40, -130, 1
    AddObj pkgclinical, 40, 210, -230, -320, 2
    AddObj pkganimals, 300, 470, -230, -320, 3
    AddObj pkgadoptions, 560, 730, -230, -320, 4
    AddObj pkgadopters, 820, 990, -230, -320, 5
    AddObj pkgml, 40, 210, -420, -510, 6
    AddObj pkgrecommendation, 300, 470, -420, -510, 7
    AddObj pkgcatalogs, 560, 730, -420, -510, 8
    AddObj pkgprisma, 560, 730, -610, -700, 9
    oDiagram.DiagramObjects.Refresh

    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Prompt "Diagrama de paquetes del Sprint 2 creado (9 paquetes, 16 dependencias).", 0

End Sub

'------------------------------------------------------------------
' Crea un paquete dentro del paquete seleccionado y devuelve su elemento
'------------------------------------------------------------------
Function NuevoPaquete(sNombre, sNota)
    Dim p
    Set p = oPackage.Packages.AddNew(sNombre, "")
    p.Notes = sNota
    p.Update
    oPackage.Packages.Refresh
    Set NuevoPaquete = p.Element
End Function

'------------------------------------------------------------------
' Dependencia punteada con estereotipo: use, import o access
'------------------------------------------------------------------
Sub AddDep(oOrigen, oDestino, sEstereotipo)
    Dim con
    Set con = oOrigen.Connectors.AddNew("", "Dependency")
    con.SupplierID = oDestino.ElementID
    con.Stereotype = sEstereotipo
    con.Update
    oOrigen.Connectors.Refresh
End Sub

'------------------------------------------------------------------
' Coloca un elemento en el diagrama
'------------------------------------------------------------------
Sub AddObj(oElem, l, r, t, b, nSeq)
    Dim dobj
    Set dobj = oDiagram.DiagramObjects.AddNew("l=" & l & ";r=" & r & ";t=" & t & ";b=" & b & ";", "")
    dobj.ElementID = oElem.ElementID
    dobj.Sequence = nSeq
    dobj.Update
End Sub

Main
