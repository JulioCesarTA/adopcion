'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE PAQUETES - Sprint 3
'
' Historias: HU12, HU7, HU9
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
Dim pkgadoptions
Dim pkgkpis
Dim pkgdashboard
Dim pkgpublic
Dim pkgchat
Dim pkgcontact
Dim pkganimals
Dim pkgclinical
Dim pkgusers
Dim pkgmail
Dim pkgprisma

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    ' ---------- Crear el diagrama de Paquetes ----------
    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 3 - Diagrama de Paquetes", "Package")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Paquetes ----------
    Set pkgfrontend = NuevoPaquete("frontend", "Next.js: sitio publico, portal del cliente, panel, KPIs, mensajes")
    Set pkgadoptions = NuevoPaquete("adoptions", "Seguimientos post-adopcion")
    Set pkgkpis = NuevoPaquete("kpis", "Seis indicadores de gestion")
    Set pkgdashboard = NuevoPaquete("dashboard", "Panel con cinco tarjetas")
    Set pkgpublic = NuevoPaquete("public", "Informacion, catalogo publico, registro y contacto")
    Set pkgchat = NuevoPaquete("chat", "Asistente virtual con IA")
    Set pkgcontact = NuevoPaquete("contact", "Buzon de mensajes")
    Set pkganimals = NuevoPaquete("animals", "Estados del animal")
    Set pkgclinical = NuevoPaquete("clinical", "Estado clinico")
    Set pkgusers = NuevoPaquete("users", "Cuentas de cliente")
    Set pkgmail = NuevoPaquete("mail", "Envio de correo")
    Set pkgprisma = NuevoPaquete("prisma", "Acceso a PostgreSQL")

    ' ---------- Dependencias ----------
    ' AddDep origen, destino, estereotipo
    AddDep pkgfrontend, pkgadoptions, "use"
    AddDep pkgfrontend, pkgkpis, "use"
    AddDep pkgfrontend, pkgdashboard, "use"
    AddDep pkgfrontend, pkgpublic, "use"
    AddDep pkgfrontend, pkgchat, "use"
    AddDep pkgfrontend, pkgcontact, "use"
    AddDep pkgdashboard, pkganimals, "use"
    AddDep pkgdashboard, pkgclinical, "use"
    AddDep pkgpublic, pkgusers, "use"
    AddDep pkgpublic, pkgmail, "use"
    AddDep pkgadoptions, pkgprisma, "import"
    AddDep pkgkpis, pkgprisma, "import"
    AddDep pkgdashboard, pkgprisma, "import"
    AddDep pkgpublic, pkgprisma, "import"
    AddDep pkgcontact, pkgprisma, "import"
    AddDep pkgchat, pkgprisma, "import"

    ' ---------- Colocar en el diagrama (t y b negativos en EA) ----------
    AddObj pkgfrontend, 560, 730, -40, -130, 1
    AddObj pkgadoptions, 40, 210, -230, -320, 2
    AddObj pkgkpis, 300, 470, -230, -320, 3
    AddObj pkgdashboard, 560, 730, -230, -320, 4
    AddObj pkgpublic, 820, 990, -230, -320, 5
    AddObj pkgchat, 1080, 1250, -230, -320, 6
    AddObj pkgcontact, 40, 210, -420, -510, 7
    AddObj pkganimals, 300, 470, -420, -510, 8
    AddObj pkgclinical, 560, 730, -420, -510, 9
    AddObj pkgusers, 820, 990, -420, -510, 10
    AddObj pkgmail, 1080, 1250, -420, -510, 11
    AddObj pkgprisma, 560, 730, -610, -700, 12
    oDiagram.DiagramObjects.Refresh

    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Prompt "Diagrama de paquetes del Sprint 3 creado (12 paquetes, 16 dependencias).", 0

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
