'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE PAQUETES - Sprint 1
'
' Historias: HU8, HU1, HU2, HU3, HU4
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
Dim pkgauth
Dim pkganimals
Dim pkgclinical
Dim pkgcatalogs
Dim pkgusers
Dim pkgstorage
Dim pkgcommon
Dim pkgprisma

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    ' ---------- Crear el diagrama de Paquetes ----------
    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 1 - Diagrama de Paquetes", "Package")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Paquetes ----------
    Set pkgfrontend = NuevoPaquete("frontend", "Next.js: pantallas de login, usuarios, animales, consultas y vacunas")
    Set pkgauth = NuevoPaquete("auth", "Inicio y cierre de sesion, refresh, mis datos, cambio de contrasena")
    Set pkganimals = NuevoPaquete("animals", "Ficha, estados, foto, salida y reingreso, linea de tiempo")
    Set pkgclinical = NuevoPaquete("clinical", "Consultas, diagnosticos, tratamientos, vacunaciones")
    Set pkgcatalogs = NuevoPaquete("catalogs", "Catalogo de vacunas")
    Set pkgusers = NuevoPaquete("users", "Cuentas, roles, activacion y restablecimiento de contrasena")
    Set pkgstorage = NuevoPaquete("storage", "Fotos: disco local o S3")
    Set pkgcommon = NuevoPaquete("common", "Guards JWT y de roles, filtros, validacion")
    Set pkgprisma = NuevoPaquete("prisma", "Acceso a PostgreSQL")

    ' ---------- Dependencias ----------
    ' AddDep origen, destino, estereotipo
    AddDep pkgfrontend, pkgauth, "use"
    AddDep pkgfrontend, pkganimals, "use"
    AddDep pkgfrontend, pkgclinical, "use"
    AddDep pkgfrontend, pkgcatalogs, "use"
    AddDep pkgfrontend, pkgusers, "use"
    AddDep pkgauth, pkgusers, "access"
    AddDep pkgclinical, pkganimals, "import"
    AddDep pkganimals, pkgstorage, "use"
    AddDep pkgauth, pkgcommon, "access"
    AddDep pkganimals, pkgcommon, "access"
    AddDep pkgclinical, pkgcommon, "access"
    AddDep pkgcatalogs, pkgcommon, "access"
    AddDep pkgusers, pkgcommon, "access"
    AddDep pkgauth, pkgprisma, "import"
    AddDep pkgusers, pkgprisma, "import"
    AddDep pkganimals, pkgprisma, "import"
    AddDep pkgclinical, pkgprisma, "import"
    AddDep pkgcatalogs, pkgprisma, "import"

    ' ---------- Colocar en el diagrama (t y b negativos en EA) ----------
    AddObj pkgfrontend, 300, 470, -40, -130, 1
    AddObj pkgauth, 40, 210, -230, -320, 2
    AddObj pkganimals, 300, 470, -230, -320, 3
    AddObj pkgclinical, 560, 730, -230, -320, 4
    AddObj pkgcatalogs, 820, 990, -230, -320, 5
    AddObj pkgusers, 40, 210, -420, -510, 6
    AddObj pkgstorage, 300, 470, -420, -510, 7
    AddObj pkgcommon, 820, 990, -420, -510, 8
    AddObj pkgprisma, 560, 730, -610, -700, 9
    oDiagram.DiagramObjects.Refresh

    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Prompt "Diagrama de paquetes del Sprint 1 creado (9 paquetes, 18 dependencias).", 0

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
