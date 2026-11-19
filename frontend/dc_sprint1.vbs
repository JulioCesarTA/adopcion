'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE CLASES - Sprint 1
'
' Historias: HU8 Gestion de usuario, HU1 Gestion de animal, HU2 Registro de consulta clinica, HU3 Gestionar historial clinico, HU4 Gestion de vacunacion
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

Dim clsUser
Dim clsAnimal
Dim clsVeterinaryConsultation
Dim clsDiagnosis
Dim clsTreatment
Dim clsMedication
Dim clsVaccine
Dim clsVaccination
Dim clsUserRole
Dim clsAnimalStatus
Dim clsTreatmentStatus

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    ' ---------- Crear el diagrama de Clases ----------
    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 1 - Diagrama de Clases", "Class")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ==============================================================
    ' User   <- tabla users
    ' ==============================================================
    Set clsUser = NuevaClase("User", "Class")
    AddAttr clsUser, "id", "uuid", 0
    AddAttr clsUser, "email", "string", 1
    AddAttr clsUser, "fullName", "string", 2
    AddAttr clsUser, "passwordHash", "string", 3
    AddAttr clsUser, "role", "UserRole", 4
    AddAttr clsUser, "isActive", "bool", 5
    AddAttr clsUser, "failedAttempts", "int", 6
    AddAttr clsUser, "lockedUntil", "timestamp", 7
    AddAttr clsUser, "refreshTokenHash", "string", 8
    AddAttr clsUser, "phone", "string", 9
    AddAttr clsUser, "termsAcceptedAt", "timestamp", 10
    AddAttr clsUser, "createdAt", "timestamp", 11
    AddAttr clsUser, "updatedAt", "timestamp", 12
    AddMet clsUser, "login", "Session", "email:string,password:string", False, 0
    AddMet clsUser, "refresh", "Session", "refreshToken:string", False, 1
    AddMet clsUser, "logout", "void", "", False, 2
    AddMet clsUser, "updateMe", "User", "fullName:string", False, 3
    AddMet clsUser, "changePassword", "void", "actual:string,nueva:string", False, 4
    AddMet clsUser, "create", "User", "dto:CreateUserDto", False, 5
    AddMet clsUser, "update", "User", "id:uuid,dto:UpdateUserDto", False, 6
    AddMet clsUser, "setActive", "User", "id:uuid,isActive:bool", False, 7
    AddMet clsUser, "resetPassword", "void", "id:uuid,password:string", False, 8

    ' ==============================================================
    ' Animal   <- tabla animals
    ' ==============================================================
    Set clsAnimal = NuevaClase("Animal", "Class")
    AddAttr clsAnimal, "id", "uuid", 0
    AddAttr clsAnimal, "code", "string", 1
    AddAttr clsAnimal, "name", "string", 2
    AddAttr clsAnimal, "species", "Species", 3
    AddAttr clsAnimal, "breed", "string", 4
    AddAttr clsAnimal, "sex", "Sex", 5
    AddAttr clsAnimal, "ageMonths", "int", 6
    AddAttr clsAnimal, "color", "string", 7
    AddAttr clsAnimal, "size", "AnimalSize", 8
    AddAttr clsAnimal, "energyLevel", "int", 9
    AddAttr clsAnimal, "temperament", "string", 10
    AddAttr clsAnimal, "goodWithChildren", "bool", 11
    AddAttr clsAnimal, "goodWithAnimals", "bool", 12
    AddAttr clsAnimal, "needsYard", "bool", 13
    AddAttr clsAnimal, "specialCare", "bool", 14
    AddAttr clsAnimal, "specialCareNotes", "string", 15
    AddAttr clsAnimal, "requiredDailyHours", "decimal", 16
    AddAttr clsAnimal, "physicalDescription", "string", 17
    AddAttr clsAnimal, "photoUrl", "string", 18
    AddAttr clsAnimal, "entryDate", "timestamp", 19
    AddAttr clsAnimal, "entryReason", "string", 20
    AddAttr clsAnimal, "status", "AnimalStatus", 21
    AddAttr clsAnimal, "exitDate", "timestamp", 22
    AddAttr clsAnimal, "exitReason", "string", 23
    AddAttr clsAnimal, "exitNotes", "string", 24
    AddAttr clsAnimal, "deletedAt", "timestamp", 25
    AddAttr clsAnimal, "createdById", "uuid", 26
    AddAttr clsAnimal, "createdAt", "timestamp", 27
    AddAttr clsAnimal, "updatedAt", "timestamp", 28
    AddMet clsAnimal, "list", "Animal[]", "q:ListAnimalsQueryDto", False, 0
    AddMet clsAnimal, "create", "Animal", "dto:CreateAnimalDto", False, 1
    AddMet clsAnimal, "update", "Animal", "id:uuid,dto:UpdateAnimalDto", False, 2
    AddMet clsAnimal, "savePhoto", "Animal", "id:uuid,file:File", False, 3
    AddMet clsAnimal, "exit", "Animal", "id:uuid,dto:ExitAnimalDto", False, 4
    AddMet clsAnimal, "readmit", "Animal", "id:uuid", False, 5
    AddMet clsAnimal, "timeline", "TimelineItem[]", "id:uuid", False, 6

    ' ==============================================================
    ' VeterinaryConsultation   <- tabla veterinary_consultations
    ' ==============================================================
    Set clsVeterinaryConsultation = NuevaClase("VeterinaryConsultation", "Class")
    AddAttr clsVeterinaryConsultation, "id", "uuid", 0
    AddAttr clsVeterinaryConsultation, "animalId", "uuid", 1
    AddAttr clsVeterinaryConsultation, "veterinarianId", "uuid", 2
    AddAttr clsVeterinaryConsultation, "consultationDate", "timestamp", 3
    AddAttr clsVeterinaryConsultation, "reason", "string", 4
    AddAttr clsVeterinaryConsultation, "weightKg", "decimal", 5
    AddAttr clsVeterinaryConsultation, "temperatureC", "decimal", 6
    AddAttr clsVeterinaryConsultation, "clinicalEvaluation", "string", 7
    AddAttr clsVeterinaryConsultation, "observations", "string", 8
    AddAttr clsVeterinaryConsultation, "createdAt", "timestamp", 9
    AddAttr clsVeterinaryConsultation, "updatedAt", "timestamp", 10
    AddMet clsVeterinaryConsultation, "createConsultation", "VeterinaryConsultation", "animalId:uuid,dto:CreateConsultationDto", False, 0
    AddMet clsVeterinaryConsultation, "updateConsultation", "VeterinaryConsultation", "id:uuid,dto:UpdateConsultationDto", False, 1
    AddMet clsVeterinaryConsultation, "getConsultation", "VeterinaryConsultation", "id:uuid", False, 2
    AddMet clsVeterinaryConsultation, "listConsultations", "VeterinaryConsultation[]", "animalId:uuid", False, 3

    ' ==============================================================
    ' Diagnosis   <- tabla diagnoses
    ' ==============================================================
    Set clsDiagnosis = NuevaClase("Diagnosis", "Class")
    AddAttr clsDiagnosis, "id", "uuid", 0
    AddAttr clsDiagnosis, "consultationId", "uuid", 1
    AddAttr clsDiagnosis, "description", "string", 2
    AddAttr clsDiagnosis, "observations", "string", 3
    AddAttr clsDiagnosis, "createdAt", "timestamp", 4
    AddMet clsDiagnosis, "addDiagnosis", "Diagnosis", "consultationId:uuid,dto:CreateDiagnosisDto", False, 0

    ' ==============================================================
    ' Treatment   <- tabla treatments
    ' ==============================================================
    Set clsTreatment = NuevaClase("Treatment", "Class")
    AddAttr clsTreatment, "id", "uuid", 0
    AddAttr clsTreatment, "consultationId", "uuid", 1
    AddAttr clsTreatment, "description", "string", 2
    AddAttr clsTreatment, "instructions", "string", 3
    AddAttr clsTreatment, "startDate", "timestamp", 4
    AddAttr clsTreatment, "endDate", "timestamp", 5
    AddAttr clsTreatment, "status", "TreatmentStatus", 6
    AddAttr clsTreatment, "observations", "string", 7
    AddAttr clsTreatment, "createdAt", "timestamp", 8
    AddAttr clsTreatment, "updatedAt", "timestamp", 9
    AddMet clsTreatment, "addTreatment", "Treatment", "consultationId:uuid,dto:CreateTreatmentDto", False, 0
    AddMet clsTreatment, "updateTreatment", "Treatment", "id:uuid,dto:UpdateTreatmentDto", False, 1

    ' ==============================================================
    ' Medication   <- tabla medications
    ' ==============================================================
    Set clsMedication = NuevaClase("Medication", "Class")
    AddAttr clsMedication, "id", "uuid", 0
    AddAttr clsMedication, "treatmentId", "uuid", 1
    AddAttr clsMedication, "name", "string", 2
    AddAttr clsMedication, "dose", "string", 3
    AddAttr clsMedication, "administrationRoute", "string", 4
    AddAttr clsMedication, "frequency", "string", 5
    AddAttr clsMedication, "duration", "string", 6
    AddAttr clsMedication, "observations", "string", 7
    AddMet clsMedication, "addMedication", "Medication", "treatmentId:uuid,dto:CreateMedicationDto", False, 0

    ' ==============================================================
    ' Vaccine   <- tabla vaccines
    ' ==============================================================
    Set clsVaccine = NuevaClase("Vaccine", "Class")
    AddAttr clsVaccine, "id", "uuid", 0
    AddAttr clsVaccine, "name", "string", 1
    AddAttr clsVaccine, "species", "Species[]", 2
    AddAttr clsVaccine, "isRabies", "bool", 3
    AddAttr clsVaccine, "isActive", "bool", 4
    AddMet clsVaccine, "listVaccines", "Vaccine[]", "active:bool", False, 0
    AddMet clsVaccine, "createVaccine", "Vaccine", "dto:CreateVaccineDto", False, 1
    AddMet clsVaccine, "updateVaccine", "Vaccine", "id:uuid,dto:UpdateVaccineDto", False, 2

    ' ==============================================================
    ' Vaccination   <- tabla vaccinations
    ' ==============================================================
    Set clsVaccination = NuevaClase("Vaccination", "Class")
    AddAttr clsVaccination, "id", "uuid", 0
    AddAttr clsVaccination, "animalId", "uuid", 1
    AddAttr clsVaccination, "vaccineId", "uuid", 2
    AddAttr clsVaccination, "applicationDate", "timestamp", 3
    AddAttr clsVaccination, "dose", "string", 4
    AddAttr clsVaccination, "batchNumber", "string", 5
    AddAttr clsVaccination, "nextDoseDate", "timestamp", 6
    AddAttr clsVaccination, "observations", "string", 7
    AddAttr clsVaccination, "appliedById", "uuid", 8
    AddAttr clsVaccination, "createdAt", "timestamp", 9
    AddAttr clsVaccination, "updatedAt", "timestamp", 10
    AddMet clsVaccination, "createVaccination", "Vaccination", "animalId:uuid,dto:CreateVaccinationDto", False, 0
    AddMet clsVaccination, "updateVaccination", "Vaccination", "id:uuid,dto:UpdateVaccinationDto", False, 1
    AddMet clsVaccination, "listVaccinations", "Vaccination[]", "animalId:uuid", False, 2
    AddMet clsVaccination, "upcomingVaccinations", "Vaccination[]", "", False, 3

    Set clsUserRole = NuevaClase("UserRole", "Enumeration")
    AddLiteral clsUserRole, "ADMIN", 0
    AddLiteral clsUserRole, "VETERINARIO", 1
    AddLiteral clsUserRole, "CLIENTE", 2
    AddLiteral clsUserRole, "ADOPTANTE", 3

    Set clsAnimalStatus = NuevaClase("AnimalStatus", "Enumeration")
    AddLiteral clsAnimalStatus, "INGRESADO", 0
    AddLiteral clsAnimalStatus, "EN_OBSERVACION", 1
    AddLiteral clsAnimalStatus, "EN_CUARENTENA", 2
    AddLiteral clsAnimalStatus, "EN_TRATAMIENTO", 3
    AddLiteral clsAnimalStatus, "DISPONIBLE_ADOPCION", 4
    AddLiteral clsAnimalStatus, "EN_PROCESO_ADOPCION", 5
    AddLiteral clsAnimalStatus, "ADOPTADO", 6
    AddLiteral clsAnimalStatus, "FALLECIDO", 7
    AddLiteral clsAnimalStatus, "DEVUELTO", 8

    Set clsTreatmentStatus = NuevaClase("TreatmentStatus", "Enumeration")
    AddLiteral clsTreatmentStatus, "ACTIVO", 0
    AddLiteral clsTreatmentStatus, "FINALIZADO", 1
    AddLiteral clsTreatmentStatus, "SUSPENDIDO", 2

    ' ---------- Relaciones ----------
    ' AddRel origen, destino, nombre, multiplicidad origen, multiplicidad destino
    AddRel clsUser, clsAnimal, "registra", "1", "*"
    AddRel clsAnimal, clsVeterinaryConsultation, "recibe", "1", "*"
    AddRel clsUser, clsVeterinaryConsultation, "atiende", "1", "*"
    AddRel clsVeterinaryConsultation, clsDiagnosis, "incluye", "1", "*"
    AddRel clsVeterinaryConsultation, clsTreatment, "prescribe", "1", "*"
    AddRel clsTreatment, clsMedication, "usa", "1", "*"
    AddRel clsAnimal, clsVaccination, "recibe", "1", "*"
    AddRel clsVaccine, clsVaccination, "se aplica en", "1", "*"
    AddRel clsUser, clsVaccination, "aplica", "1", "*"
    AddRel clsUser, clsUserRole, "tiene rol", "*", "1"
    AddRel clsAnimal, clsAnimalStatus, "esta en", "*", "1"
    AddRel clsTreatment, clsTreatmentStatus, "esta en", "*", "1"

    ' ---------- Colocar en el diagrama (t y b negativos en EA) ----------
    AddObj clsUser, 20, 320, -20, -440, 1
    AddObj clsAnimal, 390, 690, -20, -680, 2
    AddObj clsVeterinaryConsultation, 760, 1060, -20, -325, 3
    AddObj clsDiagnosis, 1130, 1430, -20, -172, 4
    AddObj clsTreatment, 1130, 1430, -242, -496, 5
    AddObj clsMedication, 760, 1060, -395, -598, 6
    AddObj clsVaccine, 20, 320, -497, -683, 7
    AddObj clsVaccination, 1130, 1430, -566, -871, 8
    AddObj clsUserRole, 760, 1060, -668, -785, 9
    AddObj clsAnimalStatus, 390, 690, -735, -938, 10
    AddObj clsTreatmentStatus, 20, 320, -753, -854, 11
    oDiagram.DiagramObjects.Refresh

    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Prompt "Diagrama de clases del Sprint 1 creado (8 clases + 3 enumeraciones).", 0

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
