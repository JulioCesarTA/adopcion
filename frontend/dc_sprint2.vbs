'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE CLASES - Sprint 2
'
' Historias: HU10 Gestion de periodos de cuarentena, HU5 Creacion de solicitud de adopcion, HU6 Recomendacion de compatibilidad, HU11 Gestionar Proceso de Adopcion
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

Dim clsAnimal
Dim clsQuarantinePeriod
Dim clsQuarantineControl
Dim clsPerson
Dim clsAdopterProfile
Dim clsAdoptionRequest
Dim clsCompatibilityRecommendation
Dim clsMlModel
Dim clsAlgorithmSetting
Dim clsRequestStatus
Dim clsPeriodType
Dim clsPeriodStatus

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    ' ---------- Crear el diagrama de Clases ----------
    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 2 - Diagrama de Clases", "Class")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ==============================================================
    ' Animal   <- tabla animals (columnas que usa este sprint)
    ' ==============================================================
    Set clsAnimal = NuevaClase("Animal", "Class")
    AddAttr clsAnimal, "id", "uuid", 0
    AddAttr clsAnimal, "code", "string", 1
    AddAttr clsAnimal, "name", "string", 2
    AddAttr clsAnimal, "species", "Species", 3
    AddAttr clsAnimal, "size", "AnimalSize", 4
    AddAttr clsAnimal, "energyLevel", "int", 5
    AddAttr clsAnimal, "goodWithChildren", "bool", 6
    AddAttr clsAnimal, "goodWithAnimals", "bool", 7
    AddAttr clsAnimal, "needsYard", "bool", 8
    AddAttr clsAnimal, "requiredDailyHours", "decimal", 9
    AddAttr clsAnimal, "status", "AnimalStatus", 10
    AddMet clsAnimal, "enableAdoption", "Animal", "id:uuid", False, 0
    AddMet clsAnimal, "disableAdoption", "Animal", "id:uuid", False, 1
    AddMet clsAnimal, "adoptable", "Animal[]", "", False, 2

    ' ==============================================================
    ' QuarantinePeriod   <- tabla quarantine_periods
    ' ==============================================================
    Set clsQuarantinePeriod = NuevaClase("QuarantinePeriod", "Class")
    AddAttr clsQuarantinePeriod, "id", "uuid", 0
    AddAttr clsQuarantinePeriod, "animalId", "uuid", 1
    AddAttr clsQuarantinePeriod, "type", "PeriodType", 2
    AddAttr clsQuarantinePeriod, "reason", "string", 3
    AddAttr clsQuarantinePeriod, "startDate", "timestamp", 4
    AddAttr clsQuarantinePeriod, "expectedEndDate", "timestamp", 5
    AddAttr clsQuarantinePeriod, "endDate", "timestamp", 6
    AddAttr clsQuarantinePeriod, "status", "PeriodStatus", 7
    AddAttr clsQuarantinePeriod, "finalObservations", "string", 8
    AddAttr clsQuarantinePeriod, "startedById", "uuid", 9
    AddAttr clsQuarantinePeriod, "closedById", "uuid", 10
    AddAttr clsQuarantinePeriod, "createdAt", "timestamp", 11
    AddMet clsQuarantinePeriod, "startPeriod", "QuarantinePeriod", "animalId:uuid,dto:StartPeriodDto", False, 0
    AddMet clsQuarantinePeriod, "closePeriod", "QuarantinePeriod", "id:uuid,dto:ClosePeriodDto", False, 1
    AddMet clsQuarantinePeriod, "listPeriods", "QuarantinePeriod[]", "animalId:uuid", False, 2

    ' ==============================================================
    ' QuarantineControl   <- tabla quarantine_controls
    ' ==============================================================
    Set clsQuarantineControl = NuevaClase("QuarantineControl", "Class")
    AddAttr clsQuarantineControl, "id", "uuid", 0
    AddAttr clsQuarantineControl, "quarantinePeriodId", "uuid", 1
    AddAttr clsQuarantineControl, "controlDate", "timestamp", 2
    AddAttr clsQuarantineControl, "animalCondition", "string", 3
    AddAttr clsQuarantineControl, "observations", "string", 4
    AddAttr clsQuarantineControl, "createdById", "uuid", 5
    AddAttr clsQuarantineControl, "createdAt", "timestamp", 6
    AddMet clsQuarantineControl, "addControl", "QuarantineControl", "periodId:uuid,dto:CreateControlDto", False, 0

    ' ==============================================================
    ' Person   <- tabla persons
    ' ==============================================================
    Set clsPerson = NuevaClase("Person", "Class")
    AddAttr clsPerson, "id", "uuid", 0
    AddAttr clsPerson, "ci", "string", 1
    AddAttr clsPerson, "firstName", "string", 2
    AddAttr clsPerson, "lastName", "string", 3
    AddAttr clsPerson, "phone", "string", 4
    AddAttr clsPerson, "email", "string", 5
    AddAttr clsPerson, "address", "string", 6
    AddAttr clsPerson, "createdAt", "timestamp", 7
    AddAttr clsPerson, "updatedAt", "timestamp", 8
    AddMet clsPerson, "create", "AdopterProfile", "dto:CreateAdopterDto", False, 0
    AddMet clsPerson, "update", "AdopterProfile", "id:uuid,dto:UpdateAdopterDto", False, 1

    ' ==============================================================
    ' AdopterProfile   <- tabla adopter_profiles
    ' ==============================================================
    Set clsAdopterProfile = NuevaClase("AdopterProfile", "Class")
    AddAttr clsAdopterProfile, "id", "uuid", 0
    AddAttr clsAdopterProfile, "personId", "uuid", 1
    AddAttr clsAdopterProfile, "housingType", "HousingType", 2
    AddAttr clsAdopterProfile, "hasYard", "bool", 3
    AddAttr clsAdopterProfile, "hasChildren", "bool", 4
    AddAttr clsAdopterProfile, "hasOtherAnimals", "bool", 5
    AddAttr clsAdopterProfile, "availableHoursPerDay", "decimal", 6
    AddAttr clsAdopterProfile, "experience", "ExperienceLevel", 7
    AddAttr clsAdopterProfile, "preferredSpecies", "Species", 8
    AddAttr clsAdopterProfile, "preferredSize", "AnimalSize", 9
    AddAttr clsAdopterProfile, "observations", "string", 10
    AddAttr clsAdopterProfile, "createdAt", "timestamp", 11
    AddAttr clsAdopterProfile, "updatedAt", "timestamp", 12
    AddMet clsAdopterProfile, "list", "AdopterProfile[]", "query:AdopterQueryDto", False, 0
    AddMet clsAdopterProfile, "findOne", "AdopterProfile", "id:uuid", False, 1

    ' ==============================================================
    ' AdoptionRequest   <- tabla adoption_requests
    ' ==============================================================
    Set clsAdoptionRequest = NuevaClase("AdoptionRequest", "Class")
    AddAttr clsAdoptionRequest, "id", "uuid", 0
    AddAttr clsAdoptionRequest, "adopterProfileId", "uuid", 1
    AddAttr clsAdoptionRequest, "animalId", "uuid", 2
    AddAttr clsAdoptionRequest, "responsibleUserId", "uuid", 3
    AddAttr clsAdoptionRequest, "status", "RequestStatus", 4
    AddAttr clsAdoptionRequest, "requestDate", "timestamp", 5
    AddAttr clsAdoptionRequest, "decisionDate", "timestamp", 6
    AddAttr clsAdoptionRequest, "deliveryDate", "timestamp", 7
    AddAttr clsAdoptionRequest, "evaluationNotes", "string", 8
    AddAttr clsAdoptionRequest, "createdAt", "timestamp", 9
    AddAttr clsAdoptionRequest, "updatedAt", "timestamp", 10
    AddMet clsAdoptionRequest, "create", "AdoptionRequest", "dto:CreateRequestDto", False, 0
    AddMet clsAdoptionRequest, "changeStatus", "AdoptionRequest", "id:uuid,status:RequestStatus", False, 1
    AddMet clsAdoptionRequest, "addNote", "AdoptionRequest", "id:uuid,note:string", False, 2
    AddMet clsAdoptionRequest, "decide", "AdoptionRequest", "id:uuid,dto:DecisionDto", False, 3
    AddMet clsAdoptionRequest, "act", "ActaDeEntrega", "id:uuid", False, 4

    ' ==============================================================
    ' CompatibilityRecommendation   <- tabla compatibility_recommendations
    ' ==============================================================
    Set clsCompatibilityRecommendation = NuevaClase("CompatibilityRecommendation", "Class")
    AddAttr clsCompatibilityRecommendation, "id", "uuid", 0
    AddAttr clsCompatibilityRecommendation, "adopterProfileId", "uuid", 1
    AddAttr clsCompatibilityRecommendation, "animalId", "uuid", 2
    AddAttr clsCompatibilityRecommendation, "adoptionRequestId", "uuid", 3
    AddAttr clsCompatibilityRecommendation, "score", "decimal", 4
    AddAttr clsCompatibilityRecommendation, "level", "string", 5
    AddAttr clsCompatibilityRecommendation, "breakdown", "json", 6
    AddAttr clsCompatibilityRecommendation, "modelVersion", "int", 7
    AddAttr clsCompatibilityRecommendation, "generatedById", "uuid", 8
    AddAttr clsCompatibilityRecommendation, "generatedAt", "timestamp", 9
    AddMet clsCompatibilityRecommendation, "pair", "CompatibilityRecommendation", "adopterId:uuid,animalId:uuid", False, 0
    AddMet clsCompatibilityRecommendation, "ranking", "RankingItem[]", "adopterId:uuid", False, 1
    AddMet clsCompatibilityRecommendation, "rankingForAnimal", "RankingItem[]", "animalId:uuid", False, 2
    AddMet clsCompatibilityRecommendation, "history", "CompatibilityRecommendation[]", "", False, 3

    ' ==============================================================
    ' MlModel   <- tabla ml_models
    ' ==============================================================
    Set clsMlModel = NuevaClase("MlModel", "Class")
    AddAttr clsMlModel, "version", "int", 0
    AddAttr clsMlModel, "algorithm", "string", 1
    AddAttr clsMlModel, "source", "MlModelSource", 2
    AddAttr clsMlModel, "isActive", "bool", 3
    AddAttr clsMlModel, "model", "json", 4
    AddAttr clsMlModel, "metrics", "json", 5
    AddAttr clsMlModel, "datasetSize", "int", 6
    AddAttr clsMlModel, "realSamples", "int", 7
    AddAttr clsMlModel, "syntheticSamples", "int", 8
    AddAttr clsMlModel, "seed", "int", 9
    AddAttr clsMlModel, "notes", "string", 10
    AddAttr clsMlModel, "createdById", "uuid", 11
    AddAttr clsMlModel, "createdAt", "timestamp", 12
    AddMet clsMlModel, "train", "TrainingReport", "dto:TrainModelDto", False, 0
    AddMet clsMlModel, "activate", "MlModel", "version:int", False, 1
    AddMet clsMlModel, "deactivate", "void", "", False, 2
    AddMet clsMlModel, "activeForest", "RandomForest", "", False, 3
    AddMet clsMlModel, "status", "MlStatus", "", False, 4

    ' ==============================================================
    ' AlgorithmSetting   <- tabla algorithm_settings
    ' ==============================================================
    Set clsAlgorithmSetting = NuevaClase("AlgorithmSetting", "Class")
    AddAttr clsAlgorithmSetting, "version", "int", 0
    AddAttr clsAlgorithmSetting, "weights", "json", 1
    AddAttr clsAlgorithmSetting, "thresholdHigh", "int", 2
    AddAttr clsAlgorithmSetting, "thresholdMedium", "int", 3
    AddAttr clsAlgorithmSetting, "createdById", "uuid", 4
    AddAttr clsAlgorithmSetting, "createdAt", "timestamp", 5
    AddMet clsAlgorithmSetting, "currentSettings", "AlgorithmSettings", "", False, 0

    Set clsRequestStatus = NuevaClase("RequestStatus", "Enumeration")
    AddLiteral clsRequestStatus, "PENDIENTE", 0
    AddLiteral clsRequestStatus, "EN_EVALUACION", 1
    AddLiteral clsRequestStatus, "APROBADA", 2
    AddLiteral clsRequestStatus, "RECHAZADA", 3
    AddLiteral clsRequestStatus, "CANCELADA", 4

    Set clsPeriodType = NuevaClase("PeriodType", "Enumeration")
    AddLiteral clsPeriodType, "OBSERVACION", 0
    AddLiteral clsPeriodType, "CUARENTENA", 1

    Set clsPeriodStatus = NuevaClase("PeriodStatus", "Enumeration")
    AddLiteral clsPeriodStatus, "ACTIVO", 0
    AddLiteral clsPeriodStatus, "FINALIZADO", 1

    ' ---------- Relaciones ----------
    ' AddRel origen, destino, nombre, multiplicidad origen, multiplicidad destino
    AddRel clsAnimal, clsQuarantinePeriod, "cumple", "1", "*"
    AddRel clsQuarantinePeriod, clsQuarantineControl, "registra", "1", "*"
    AddRel clsPerson, clsAdopterProfile, "tiene", "1", "0..1"
    AddRel clsAdopterProfile, clsAdoptionRequest, "presenta", "1", "*"
    AddRel clsAnimal, clsAdoptionRequest, "es solicitado en", "1", "*"
    AddRel clsAdopterProfile, clsCompatibilityRecommendation, "se evalua en", "1", "*"
    AddRel clsAnimal, clsCompatibilityRecommendation, "se evalua en", "1", "*"
    AddRel clsAdoptionRequest, clsCompatibilityRecommendation, "respalda", "0..1", "*"
    AddRel clsAdoptionRequest, clsRequestStatus, "esta en", "*", "1"
    AddRel clsQuarantinePeriod, clsPeriodType, "es de tipo", "*", "1"
    AddRel clsQuarantinePeriod, clsPeriodStatus, "esta en", "*", "1"

    ' ---------- Colocar en el diagrama (t y b negativos en EA) ----------
    AddObj clsAnimal, 20, 320, -20, -308, 1
    AddObj clsQuarantinePeriod, 390, 690, -20, -325, 2
    AddObj clsQuarantineControl, 760, 1060, -20, -206, 3
    AddObj clsPerson, 1130, 1430, -20, -257, 4
    AddObj clsAdopterProfile, 760, 1060, -276, -581, 5
    AddObj clsAdoptionRequest, 1130, 1430, -327, -649, 6
    AddObj clsCompatibilityRecommendation, 20, 320, -378, -666, 7
    AddObj clsMlModel, 390, 690, -395, -751, 8
    AddObj clsAlgorithmSetting, 760, 1060, -651, -820, 9
    AddObj clsRequestStatus, 1130, 1430, -719, -854, 10
    AddObj clsPeriodType, 20, 320, -736, -820, 11
    AddObj clsPeriodStatus, 390, 690, -821, -905, 12
    oDiagram.DiagramObjects.Refresh

    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Prompt "Diagrama de clases del Sprint 2 creado (9 clases + 3 enumeraciones).", 0

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
