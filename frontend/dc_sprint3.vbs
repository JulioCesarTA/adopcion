'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE CLASES - Sprint 3
'
' Historias: HU12 Seguimiento post-adopcion, HU7 Panel de KPI en tiempo real, HU9 Asistente virtual con IA (sitio publico, registro de clientes y contacto)
'
' Cada tabla es una clase: atributos (-) = columnas reales de
' schema.prisma, metodos (+) = operaciones reales de los servicios
' de NestJS. Relaciones con nombre y multiplicidad.
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

Dim clsAdoptionRequest
Dim clsAdoptionFollowup
Dim clsUser
Dim clsContactMessage
Dim clsAnimal
Dim clsKpi
Dim clsDashboard
Dim clsChatAssistant
Dim clsContactStatus
Dim clsUserRole

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    ' ---------- Crear el diagrama de Clases ----------
    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 3 - Diagrama de Clases", "Class")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ==============================================================
    ' AdoptionRequest   <- tabla adoption_requests (columnas que usa este sprint)
    ' ==============================================================
    Set clsAdoptionRequest = NuevaClase("AdoptionRequest", "Class")
    AddAttr clsAdoptionRequest, "id", "uuid", 0
    AddAttr clsAdoptionRequest, "adopterProfileId", "uuid", 1
    AddAttr clsAdoptionRequest, "animalId", "uuid", 2
    AddAttr clsAdoptionRequest, "status", "RequestStatus", 3
    AddAttr clsAdoptionRequest, "requestDate", "timestamp", 4
    AddAttr clsAdoptionRequest, "decisionDate", "timestamp", 5
    AddAttr clsAdoptionRequest, "deliveryDate", "timestamp", 6
    AddMet clsAdoptionRequest, "listFollowups", "AdoptionFollowup[]", "id:uuid", False, 0

    ' ==============================================================
    ' AdoptionFollowup   <- tabla adoption_followups
    ' ==============================================================
    Set clsAdoptionFollowup = NuevaClase("AdoptionFollowup", "Class")
    AddAttr clsAdoptionFollowup, "id", "uuid", 0
    AddAttr clsAdoptionFollowup, "adoptionRequestId", "uuid", 1
    AddAttr clsAdoptionFollowup, "followupDate", "timestamp", 2
    AddAttr clsAdoptionFollowup, "animalCondition", "string", 3
    AddAttr clsAdoptionFollowup, "observations", "string", 4
    AddAttr clsAdoptionFollowup, "createdById", "uuid", 5
    AddAttr clsAdoptionFollowup, "createdAt", "timestamp", 6
    AddMet clsAdoptionFollowup, "createFollowup", "AdoptionFollowup", "requestId:uuid,dto:CreateFollowupDto", False, 0

    ' ==============================================================
    ' User   <- tabla users (cuenta de cliente del portal)
    ' ==============================================================
    Set clsUser = NuevaClase("User", "Class")
    AddAttr clsUser, "id", "uuid", 0
    AddAttr clsUser, "email", "string", 1
    AddAttr clsUser, "fullName", "string", 2
    AddAttr clsUser, "passwordHash", "string", 3
    AddAttr clsUser, "role", "UserRole", 4
    AddAttr clsUser, "isActive", "bool", 5
    AddAttr clsUser, "phone", "string", 6
    AddAttr clsUser, "termsAcceptedAt", "timestamp", 7
    AddAttr clsUser, "createdAt", "timestamp", 8
    AddMet clsUser, "register", "User", "dto:RegisterClientDto", False, 0

    ' ==============================================================
    ' ContactMessage   <- tabla contact_messages
    ' ==============================================================
    Set clsContactMessage = NuevaClase("ContactMessage", "Class")
    AddAttr clsContactMessage, "id", "uuid", 0
    AddAttr clsContactMessage, "name", "string", 1
    AddAttr clsContactMessage, "email", "string", 2
    AddAttr clsContactMessage, "phone", "string", 3
    AddAttr clsContactMessage, "subject", "string", 4
    AddAttr clsContactMessage, "message", "string", 5
    AddAttr clsContactMessage, "privacyAcceptedAt", "timestamp", 6
    AddAttr clsContactMessage, "status", "ContactStatus", 7
    AddAttr clsContactMessage, "emailSent", "bool", 8
    AddAttr clsContactMessage, "emailError", "string", 9
    AddAttr clsContactMessage, "ip", "string", 10
    AddAttr clsContactMessage, "createdAt", "timestamp", 11
    AddMet clsContactMessage, "contact", "ContactMessage", "dto:ContactDto", False, 0
    AddMet clsContactMessage, "list", "ContactMessage[]", "query:ContactQueryDto", False, 1
    AddMet clsContactMessage, "update", "ContactMessage", "id:uuid,status:ContactStatus", False, 2

    ' ==============================================================
    ' Animal   <- tabla animals (campos publicos del catalogo)
    ' ==============================================================
    Set clsAnimal = NuevaClase("Animal", "Class")
    AddAttr clsAnimal, "id", "uuid", 0
    AddAttr clsAnimal, "code", "string", 1
    AddAttr clsAnimal, "name", "string", 2
    AddAttr clsAnimal, "species", "Species", 3
    AddAttr clsAnimal, "breed", "string", 4
    AddAttr clsAnimal, "sex", "Sex", 5
    AddAttr clsAnimal, "ageMonths", "int", 6
    AddAttr clsAnimal, "size", "AnimalSize", 7
    AddAttr clsAnimal, "photoUrl", "string", 8
    AddAttr clsAnimal, "status", "AnimalStatus", 9
    AddMet clsAnimal, "animals", "Animal[]", "query:PublicAnimalsQueryDto", False, 0
    AddMet clsAnimal, "animal", "Animal", "id:uuid", False, 1

    ' ==============================================================
    ' Kpi   <- NO es tabla: objeto calculado por KpisService
    ' ==============================================================
    Set clsKpi = NuevaClase("Kpi", "Class")
    AddAttr clsKpi, "key", "string", 0
    AddAttr clsKpi, "label", "string", 1
    AddAttr clsKpi, "value", "decimal", 2
    AddAttr clsKpi, "unit", "string", 3
    AddAttr clsKpi, "previous", "decimal", 4
    AddAttr clsKpi, "delta", "decimal", 5
    AddAttr clsKpi, "trend", "string", 6
    AddAttr clsKpi, "direction", "string", 7
    AddAttr clsKpi, "help", "string", 8
    AddAttr clsKpi, "detail", "string", 9
    AddMet clsKpi, "kpis", "Kpi[]", "months:int", False, 0

    ' ==============================================================
    ' Dashboard   <- NO es tabla: objeto calculado por DashboardService
    ' ==============================================================
    Set clsDashboard = NuevaClase("Dashboard", "Class")
    AddAttr clsDashboard, "inInstitution", "int", 0
    AddAttr clsDashboard, "inQuarantine", "int", 1
    AddAttr clsDashboard, "available", "int", 2
    AddAttr clsDashboard, "activeRequests", "int", 3
    AddAttr clsDashboard, "adoptionsThisMonth", "int", 4
    AddMet clsDashboard, "dashboard", "Dashboard", "role:UserRole", False, 0

    ' ==============================================================
    ' ChatAssistant   <- NO es tabla: ChatService (las conversaciones no se guardan)
    ' ==============================================================
    Set clsChatAssistant = NuevaClase("ChatAssistant", "Class")
    AddMet clsChatAssistant, "reply", "string", "messages:ChatMessageDto[]", False, 0

    Set clsContactStatus = NuevaClase("ContactStatus", "Enumeration")
    AddLiteral clsContactStatus, "NUEVO", 0
    AddLiteral clsContactStatus, "LEIDO", 1
    AddLiteral clsContactStatus, "RESPONDIDO", 2

    Set clsUserRole = NuevaClase("UserRole", "Enumeration")
    AddLiteral clsUserRole, "ADMIN", 0
    AddLiteral clsUserRole, "VETERINARIO", 1
    AddLiteral clsUserRole, "GESTION", 2
    AddLiteral clsUserRole, "DIRECTIVO", 3
    AddLiteral clsUserRole, "CLIENTE", 4

    ' ---------- Relaciones ----------
    ' AddRel origen, destino, nombre, multiplicidad origen, multiplicidad destino
    AddRel clsAdoptionRequest, clsAdoptionFollowup, "tiene", "1", "*"
    AddRel clsUser, clsAdoptionFollowup, "registra", "1", "*"
    AddRel clsAnimal, clsAdoptionRequest, "es adoptado en", "1", "*"
    AddRel clsKpi, clsAdoptionRequest, "se calcula sobre", "*", "*"
    AddRel clsKpi, clsAnimal, "se calcula sobre", "*", "*"
    AddRel clsDashboard, clsAnimal, "resume", "1", "*"
    AddRel clsChatAssistant, clsAnimal, "consulta catalogo", "1", "*"
    AddRel clsContactMessage, clsContactStatus, "esta en", "*", "1"
    AddRel clsUser, clsUserRole, "tiene rol", "*", "1"

    ' ---------- Colocar en el diagrama (t y b negativos en EA) ----------
    AddObj clsAdoptionRequest, 20, 320, -20, -206, 1
    AddObj clsAdoptionFollowup, 390, 690, -20, -206, 2
    AddObj clsUser, 760, 1060, -20, -240, 3
    AddObj clsContactMessage, 1130, 1430, -20, -325, 4
    AddObj clsAnimal, 20, 320, -276, -530, 5
    AddObj clsKpi, 390, 690, -276, -513, 6
    AddObj clsDashboard, 760, 1060, -310, -462, 7
    AddObj clsChatAssistant, 1130, 1430, -395, -462, 8
    AddObj clsContactStatus, 760, 1060, -532, -633, 9
    AddObj clsUserRole, 1130, 1430, -532, -667, 10
    oDiagram.DiagramObjects.Refresh

    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Prompt "Diagrama de clases del Sprint 3 creado (8 clases + 2 enumeraciones).", 0

End Sub

'------------------------------------------------------------------
' Crea una clase (o enum) en el paquete
'------------------------------------------------------------------
Function NuevaClase(sNombre, sTipo)
    Dim el
    Set el = oPackage.Elements.AddNew(sNombre, sTipo)
    el.Update
    oPackage.Elements.Refresh
    Set NuevaClase = el
End Function

'------------------------------------------------------------------
' Atributo privado (-) en el orden de la tabla
'------------------------------------------------------------------
Sub AddAttr(oClase, sNombre, sTipo, nPos)
    Dim a
    Set a = oClase.Attributes.AddNew(sNombre, sTipo)
    a.Visibility = "Private"
    a.Pos = nPos
    a.Update
    oClase.Attributes.Refresh
End Sub

'------------------------------------------------------------------
' Valor de un enum
'------------------------------------------------------------------
Sub AddLiteral(oEnum, sNombre, nPos)
    Dim a
    Set a = oEnum.Attributes.AddNew(sNombre, "")
    a.Visibility = "Public"
    a.Pos = nPos
    a.Update
    oEnum.Attributes.Refresh
End Sub

'------------------------------------------------------------------
' Metodo publico (+) con parametros "nombre:tipo,nombre:tipo"
'   El metodo se guarda ANTES de agregarle parametros.
'------------------------------------------------------------------
Sub AddMet(oClase, sNombre, sRetorno, sParams, bStatic, nPos)
    Dim m, p, partes, i, par
    Set m = oClase.Methods.AddNew(sNombre, sRetorno)
    m.Visibility = "Public"
    m.IsStatic = bStatic
    m.Pos = nPos
    m.Update

    If sParams <> "" Then
        partes = Split(sParams, ",")
        For i = 0 To UBound(partes)
            par = Split(partes(i), ":")
            Set p = m.Parameters.AddNew(Trim(par(0)), Trim(par(1)))
            p.Kind = "in"
            p.Position = i
            p.Update
        Next
        m.Parameters.Refresh
    End If

    m.Update
    oClase.Methods.Refresh
End Sub

'------------------------------------------------------------------
' Asociacion con nombre y multiplicidad en cada extremo
'------------------------------------------------------------------
Sub AddRel(oOrigen, oDestino, sNombre, sMultOrigen, sMultDestino)
    Dim con
    Set con = oOrigen.Connectors.AddNew(sNombre, "Association")
    con.SupplierID = oDestino.ElementID
    con.ClientEnd.Cardinality = sMultOrigen
    con.SupplierEnd.Cardinality = sMultDestino
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
