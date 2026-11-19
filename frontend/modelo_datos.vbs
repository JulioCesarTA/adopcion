'==================================================================
' Script de Enterprise Architect (VBScript)
' MODELO DE DATOS - Sprint 0 (Modelos Iniciales)
'
' Generado desde backend/prisma/schema.prisma tal como quedo al cerrar
' el Sprint 0 (commit ab91b87): cada clase es una tabla
' real de PostgreSQL, con sus columnas reales (PK y FK marcadas) y las
' relaciones con su multiplicidad. Se muestran los tres enumerados
' que guian los estados del negocio.
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
Dim cUser
Dim cPerson
Dim cAnimal
Dim cVaccine
Dim cVaccination
Dim cVeterinaryConsultation
Dim cDiagnosis
Dim cTreatment
Dim cMedication
Dim cQuarantinePeriod
Dim cQuarantineControl
Dim cAdopterProfile
Dim cAdoptionRequest
Dim cCompatibilityRecommendation
Dim cAdoptionFollowup
Dim cAlgorithmSetting
Dim cMlModel
Dim cContactMessage
Dim eUserRole
Dim eAnimalStatus
Dim eRequestStatus

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 0 - Modelo de Datos", "Class")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Tablas ----------
    Set cUser = NuevaClase("users", "Class", "table")
    AddAttr cUser, "id", "String", "PK", 0
    AddAttr cUser, "email", "String", "UQ", 1
    AddAttr cUser, "full_name", "String", "", 2
    AddAttr cUser, "password_hash", "String", "", 3
    AddAttr cUser, "role", "UserRole", "", 4
    AddAttr cUser, "is_active", "Boolean", "", 5
    AddAttr cUser, "failed_attempts", "Int", "", 6
    AddAttr cUser, "locked_until", "DateTime?", "", 7
    AddAttr cUser, "refresh_token_hash", "String?", "", 8
    AddAttr cUser, "phone", "String?", "", 9
    AddAttr cUser, "terms_accepted_at", "DateTime?", "", 10
    AddAttr cUser, "created_at", "DateTime", "", 11
    AddAttr cUser, "updated_at", "DateTime", "", 12

    Set cPerson = NuevaClase("persons", "Class", "table")
    AddAttr cPerson, "id", "String", "PK", 0
    AddAttr cPerson, "ci", "String", "UQ", 1
    AddAttr cPerson, "first_name", "String", "", 2
    AddAttr cPerson, "last_name", "String", "", 3
    AddAttr cPerson, "phone", "String", "", 4
    AddAttr cPerson, "email", "String?", "", 5
    AddAttr cPerson, "address", "String?", "", 6
    AddAttr cPerson, "created_at", "DateTime", "", 7
    AddAttr cPerson, "updated_at", "DateTime", "", 8

    Set cAnimal = NuevaClase("animals", "Class", "table")
    AddAttr cAnimal, "id", "String", "PK", 0
    AddAttr cAnimal, "code", "String", "UQ", 1
    AddAttr cAnimal, "name", "String?", "", 2
    AddAttr cAnimal, "species", "Species", "", 3
    AddAttr cAnimal, "breed", "String?", "", 4
    AddAttr cAnimal, "sex", "Sex", "", 5
    AddAttr cAnimal, "age_months", "Int?", "", 6
    AddAttr cAnimal, "color", "String?", "", 7
    AddAttr cAnimal, "size", "AnimalSize", "", 8
    AddAttr cAnimal, "energy_level", "Int", "", 9
    AddAttr cAnimal, "temperament", "String?", "", 10
    AddAttr cAnimal, "good_with_children", "Boolean", "", 11
    AddAttr cAnimal, "good_with_animals", "Boolean", "", 12
    AddAttr cAnimal, "needs_yard", "Boolean", "", 13
    AddAttr cAnimal, "special_care", "Boolean", "", 14
    AddAttr cAnimal, "special_care_notes", "String?", "", 15
    AddAttr cAnimal, "required_daily_hours", "Decimal", "", 16
    AddAttr cAnimal, "physical_description", "String?", "", 17
    AddAttr cAnimal, "photo_url", "String?", "", 18
    AddAttr cAnimal, "entry_date", "DateTime", "", 19
    AddAttr cAnimal, "entry_reason", "String", "", 20
    AddAttr cAnimal, "status", "AnimalStatus", "", 21
    AddAttr cAnimal, "exit_date", "DateTime?", "", 22
    AddAttr cAnimal, "exit_reason", "String?", "", 23
    AddAttr cAnimal, "exit_notes", "String?", "", 24
    AddAttr cAnimal, "deleted_at", "DateTime?", "", 25
    AddAttr cAnimal, "created_by", "String", "", 26
    AddAttr cAnimal, "created_at", "DateTime", "", 27
    AddAttr cAnimal, "updated_at", "DateTime", "", 28

    Set cVaccine = NuevaClase("vaccines", "Class", "table")
    AddAttr cVaccine, "id", "String", "PK", 0
    AddAttr cVaccine, "name", "String", "UQ", 1
    AddAttr cVaccine, "species", "Species[]", "", 2
    AddAttr cVaccine, "is_rabies", "Boolean", "", 3
    AddAttr cVaccine, "is_active", "Boolean", "", 4

    Set cVaccination = NuevaClase("vaccinations", "Class", "table")
    AddAttr cVaccination, "id", "String", "PK", 0
    AddAttr cVaccination, "animal_id", "String", "FK", 1
    AddAttr cVaccination, "vaccine_id", "String", "FK", 2
    AddAttr cVaccination, "application_date", "DateTime", "", 3
    AddAttr cVaccination, "dose", "String", "", 4
    AddAttr cVaccination, "batch_number", "String?", "", 5
    AddAttr cVaccination, "next_dose_date", "DateTime?", "", 6
    AddAttr cVaccination, "observations", "String?", "", 7
    AddAttr cVaccination, "applied_by", "String", "", 8
    AddAttr cVaccination, "created_at", "DateTime", "", 9
    AddAttr cVaccination, "updated_at", "DateTime", "", 10

    Set cVeterinaryConsultation = NuevaClase("veterinary_consultations", "Class", "table")
    AddAttr cVeterinaryConsultation, "id", "String", "PK", 0
    AddAttr cVeterinaryConsultation, "animal_id", "String", "FK", 1
    AddAttr cVeterinaryConsultation, "veterinarian_id", "String", "FK", 2
    AddAttr cVeterinaryConsultation, "consultation_date", "DateTime", "", 3
    AddAttr cVeterinaryConsultation, "reason", "String", "", 4
    AddAttr cVeterinaryConsultation, "weight_kg", "Decimal?", "", 5
    AddAttr cVeterinaryConsultation, "temperature_c", "Decimal?", "", 6
    AddAttr cVeterinaryConsultation, "clinical_evaluation", "String", "", 7
    AddAttr cVeterinaryConsultation, "observations", "String?", "", 8
    AddAttr cVeterinaryConsultation, "created_at", "DateTime", "", 9
    AddAttr cVeterinaryConsultation, "updated_at", "DateTime", "", 10

    Set cDiagnosis = NuevaClase("diagnoses", "Class", "table")
    AddAttr cDiagnosis, "id", "String", "PK", 0
    AddAttr cDiagnosis, "consultation_id", "String", "FK", 1
    AddAttr cDiagnosis, "description", "String", "", 2
    AddAttr cDiagnosis, "observations", "String?", "", 3
    AddAttr cDiagnosis, "created_at", "DateTime", "", 4

    Set cTreatment = NuevaClase("treatments", "Class", "table")
    AddAttr cTreatment, "id", "String", "PK", 0
    AddAttr cTreatment, "consultation_id", "String", "FK", 1
    AddAttr cTreatment, "description", "String", "", 2
    AddAttr cTreatment, "instructions", "String", "", 3
    AddAttr cTreatment, "start_date", "DateTime", "", 4
    AddAttr cTreatment, "end_date", "DateTime?", "", 5
    AddAttr cTreatment, "status", "TreatmentStatus", "", 6
    AddAttr cTreatment, "observations", "String?", "", 7
    AddAttr cTreatment, "created_at", "DateTime", "", 8
    AddAttr cTreatment, "updated_at", "DateTime", "", 9

    Set cMedication = NuevaClase("medications", "Class", "table")
    AddAttr cMedication, "id", "String", "PK", 0
    AddAttr cMedication, "treatment_id", "String", "FK", 1
    AddAttr cMedication, "name", "String", "", 2
    AddAttr cMedication, "dose", "String", "", 3
    AddAttr cMedication, "administration_route", "String", "", 4
    AddAttr cMedication, "frequency", "String", "", 5
    AddAttr cMedication, "duration", "String", "", 6
    AddAttr cMedication, "observations", "String?", "", 7

    Set cQuarantinePeriod = NuevaClase("quarantine_periods", "Class", "table")
    AddAttr cQuarantinePeriod, "id", "String", "PK", 0
    AddAttr cQuarantinePeriod, "animal_id", "String", "FK", 1
    AddAttr cQuarantinePeriod, "type", "PeriodType", "", 2
    AddAttr cQuarantinePeriod, "reason", "String", "", 3
    AddAttr cQuarantinePeriod, "start_date", "DateTime", "", 4
    AddAttr cQuarantinePeriod, "expected_end_date", "DateTime?", "", 5
    AddAttr cQuarantinePeriod, "end_date", "DateTime?", "", 6
    AddAttr cQuarantinePeriod, "status", "PeriodStatus", "", 7
    AddAttr cQuarantinePeriod, "final_observations", "String?", "", 8
    AddAttr cQuarantinePeriod, "started_by", "String", "", 9
    AddAttr cQuarantinePeriod, "closed_by", "String?", "", 10
    AddAttr cQuarantinePeriod, "created_at", "DateTime", "", 11

    Set cQuarantineControl = NuevaClase("quarantine_controls", "Class", "table")
    AddAttr cQuarantineControl, "id", "String", "PK", 0
    AddAttr cQuarantineControl, "quarantine_period_id", "String", "FK", 1
    AddAttr cQuarantineControl, "control_date", "DateTime", "", 2
    AddAttr cQuarantineControl, "animal_condition", "String", "", 3
    AddAttr cQuarantineControl, "observations", "String?", "", 4
    AddAttr cQuarantineControl, "created_by", "String", "", 5
    AddAttr cQuarantineControl, "created_at", "DateTime", "", 6

    Set cAdopterProfile = NuevaClase("adopter_profiles", "Class", "table")
    AddAttr cAdopterProfile, "id", "String", "PK", 0
    AddAttr cAdopterProfile, "person_id", "String", "FK", 1
    AddAttr cAdopterProfile, "housing_type", "HousingType", "", 2
    AddAttr cAdopterProfile, "has_yard", "Boolean", "", 3
    AddAttr cAdopterProfile, "has_children", "Boolean", "", 4
    AddAttr cAdopterProfile, "has_other_animals", "Boolean", "", 5
    AddAttr cAdopterProfile, "available_hours_per_day", "Decimal", "", 6
    AddAttr cAdopterProfile, "experience", "ExperienceLevel", "", 7
    AddAttr cAdopterProfile, "preferred_species", "Species?", "", 8
    AddAttr cAdopterProfile, "preferred_size", "AnimalSize?", "", 9
    AddAttr cAdopterProfile, "observations", "String?", "", 10
    AddAttr cAdopterProfile, "created_at", "DateTime", "", 11
    AddAttr cAdopterProfile, "updated_at", "DateTime", "", 12

    Set cAdoptionRequest = NuevaClase("adoption_requests", "Class", "table")
    AddAttr cAdoptionRequest, "id", "String", "PK", 0
    AddAttr cAdoptionRequest, "adopter_profile_id", "String", "FK", 1
    AddAttr cAdoptionRequest, "animal_id", "String", "FK", 2
    AddAttr cAdoptionRequest, "responsible_user_id", "String", "FK", 3
    AddAttr cAdoptionRequest, "status", "RequestStatus", "", 4
    AddAttr cAdoptionRequest, "request_date", "DateTime", "", 5
    AddAttr cAdoptionRequest, "decision_date", "DateTime?", "", 6
    AddAttr cAdoptionRequest, "delivery_date", "DateTime?", "", 7
    AddAttr cAdoptionRequest, "evaluation_notes", "String?", "", 8
    AddAttr cAdoptionRequest, "created_at", "DateTime", "", 9
    AddAttr cAdoptionRequest, "updated_at", "DateTime", "", 10

    Set cCompatibilityRecommendation = NuevaClase("compatibility_recommendations", "Class", "table")
    AddAttr cCompatibilityRecommendation, "id", "String", "PK", 0
    AddAttr cCompatibilityRecommendation, "adopter_profile_id", "String", "FK", 1
    AddAttr cCompatibilityRecommendation, "animal_id", "String", "FK", 2
    AddAttr cCompatibilityRecommendation, "adoption_request_id", "String?", "FK", 3
    AddAttr cCompatibilityRecommendation, "score", "Decimal", "", 4
    AddAttr cCompatibilityRecommendation, "level", "String", "", 5
    AddAttr cCompatibilityRecommendation, "breakdown", "Json", "", 6
    AddAttr cCompatibilityRecommendation, "model_version", "Int", "", 7
    AddAttr cCompatibilityRecommendation, "generated_by", "String", "", 8
    AddAttr cCompatibilityRecommendation, "generated_at", "DateTime", "", 9

    Set cAdoptionFollowup = NuevaClase("adoption_followups", "Class", "table")
    AddAttr cAdoptionFollowup, "id", "String", "PK", 0
    AddAttr cAdoptionFollowup, "adoption_request_id", "String", "FK", 1
    AddAttr cAdoptionFollowup, "followup_date", "DateTime", "", 2
    AddAttr cAdoptionFollowup, "animal_condition", "String", "", 3
    AddAttr cAdoptionFollowup, "observations", "String?", "", 4
    AddAttr cAdoptionFollowup, "created_by", "String", "", 5
    AddAttr cAdoptionFollowup, "created_at", "DateTime", "", 6

    Set cAlgorithmSetting = NuevaClase("algorithm_settings", "Class", "table")
    AddAttr cAlgorithmSetting, "version", "Int", "PK", 0
    AddAttr cAlgorithmSetting, "weights", "Json", "", 1
    AddAttr cAlgorithmSetting, "threshold_high", "Int", "", 2
    AddAttr cAlgorithmSetting, "threshold_medium", "Int", "", 3
    AddAttr cAlgorithmSetting, "created_by", "String", "", 4
    AddAttr cAlgorithmSetting, "created_at", "DateTime", "", 5

    Set cMlModel = NuevaClase("ml_models", "Class", "table")
    AddAttr cMlModel, "version", "Int", "PK", 0
    AddAttr cMlModel, "algorithm", "String", "", 1
    AddAttr cMlModel, "source", "MlModelSource", "", 2
    AddAttr cMlModel, "is_active", "Boolean", "", 3
    AddAttr cMlModel, "model", "Json", "", 4
    AddAttr cMlModel, "metrics", "Json", "", 5
    AddAttr cMlModel, "dataset_size", "Int", "", 6
    AddAttr cMlModel, "real_samples", "Int", "", 7
    AddAttr cMlModel, "synthetic_samples", "Int", "", 8
    AddAttr cMlModel, "seed", "Int", "", 9
    AddAttr cMlModel, "notes", "String?", "", 10
    AddAttr cMlModel, "created_by", "String", "", 11
    AddAttr cMlModel, "created_at", "DateTime", "", 12

    Set cContactMessage = NuevaClase("contact_messages", "Class", "table")
    AddAttr cContactMessage, "id", "String", "PK", 0
    AddAttr cContactMessage, "name", "String", "", 1
    AddAttr cContactMessage, "email", "String", "", 2
    AddAttr cContactMessage, "phone", "String?", "", 3
    AddAttr cContactMessage, "subject", "String", "", 4
    AddAttr cContactMessage, "message", "String", "", 5
    AddAttr cContactMessage, "privacy_accepted_at", "DateTime", "", 6
    AddAttr cContactMessage, "status", "ContactStatus", "", 7
    AddAttr cContactMessage, "email_sent", "Boolean", "", 8
    AddAttr cContactMessage, "email_error", "String?", "", 9
    AddAttr cContactMessage, "ip", "String?", "", 10
    AddAttr cContactMessage, "created_at", "DateTime", "", 11

    ' ---------- Enumerados ----------
    Set eUserRole = NuevaClase("UserRole", "Enumeration", "enum")
    AddLiteral eUserRole, "ADMIN", 0
    AddLiteral eUserRole, "VETERINARIO", 1
    AddLiteral eUserRole, "GESTION", 2
    AddLiteral eUserRole, "DIRECTIVO", 3
    AddLiteral eUserRole, "CLIENTE", 4
    Set eAnimalStatus = NuevaClase("AnimalStatus", "Enumeration", "enum")
    AddLiteral eAnimalStatus, "INGRESADO", 0
    AddLiteral eAnimalStatus, "EN_OBSERVACION", 1
    AddLiteral eAnimalStatus, "EN_CUARENTENA", 2
    AddLiteral eAnimalStatus, "EN_TRATAMIENTO", 3
    AddLiteral eAnimalStatus, "DISPONIBLE_ADOPCION", 4
    AddLiteral eAnimalStatus, "EN_PROCESO_ADOPCION", 5
    AddLiteral eAnimalStatus, "ADOPTADO", 6
    AddLiteral eAnimalStatus, "FALLECIDO", 7
    AddLiteral eAnimalStatus, "DEVUELTO", 8
    Set eRequestStatus = NuevaClase("RequestStatus", "Enumeration", "enum")
    AddLiteral eRequestStatus, "PENDIENTE", 0
    AddLiteral eRequestStatus, "EN_EVALUACION", 1
    AddLiteral eRequestStatus, "APROBADA", 2
    AddLiteral eRequestStatus, "RECHAZADA", 3
    AddLiteral eRequestStatus, "CANCELADA", 4

    ' ---------- Relaciones ----------
    AddRel cAnimal, cUser, "registrado por", "0..*", "1"
    AddRel cVaccination, cAnimal, "aplicada a", "0..*", "1"
    AddRel cVaccination, cVaccine, "de la vacuna", "0..*", "1"
    AddRel cVaccination, cUser, "aplicada por", "0..*", "1"
    AddRel cVeterinaryConsultation, cAnimal, "atiende a", "0..*", "1"
    AddRel cVeterinaryConsultation, cUser, "realizada por", "0..*", "1"
    AddRel cDiagnosis, cVeterinaryConsultation, "pertenece a", "0..*", "1"
    AddRel cTreatment, cVeterinaryConsultation, "indicado en", "0..*", "1"
    AddRel cMedication, cTreatment, "forma parte de", "0..*", "1"
    AddRel cQuarantinePeriod, cAnimal, "aplica a", "0..*", "1"
    AddRel cQuarantineControl, cQuarantinePeriod, "registrado en", "0..*", "1"
    AddRel cAdopterProfile, cPerson, "perfil de", "0..1", "1"
    AddRel cAdoptionRequest, cAdopterProfile, "presentada por", "0..*", "1"
    AddRel cAdoptionRequest, cAnimal, "solicita a", "0..*", "1"
    AddRel cAdoptionRequest, cUser, "responsable", "0..*", "1"
    AddRel cCompatibilityRecommendation, cAdopterProfile, "evalua a", "0..*", "1"
    AddRel cCompatibilityRecommendation, cAnimal, "evalua al animal", "0..*", "1"
    AddRel cCompatibilityRecommendation, cAdoptionRequest, "apoya a", "0..*", "0..1"
    AddRel cAdoptionFollowup, cAdoptionRequest, "seguimiento de", "0..*", "1"
    AddRel cAlgorithmSetting, cUser, "configurado por", "0..*", "1"
    AddRel cMlModel, cUser, "entrenado por", "0..*", "1"
    AddRel cUser, eUserRole, "rol", "0..*", "1"
    AddRel cAnimal, eAnimalStatus, "estado", "0..*", "1"
    AddRel cAdoptionRequest, eRequestStatus, "estado", "0..*", "1"

    ' ---------- Ubicacion ----------
    AddObj cUser, 620, 870, -20, -255, 1
    AddObj cPerson, 1220, 1470, -20, -195, 2
    AddObj cContactMessage, 1520, 1770, -20, -240, 3
    AddObj cAlgorithmSetting, 20, 270, -20, -150, 4
    AddObj cMlModel, 320, 570, -20, -255, 5
    AddObj cAnimal, 620, 870, -325, -800, 6
    AddObj cAdopterProfile, 1220, 1470, -325, -560, 7
    AddObj cVaccine, 20, 270, -325, -440, 8
    AddObj cVaccination, 320, 570, -325, -530, 9
    AddObj cVeterinaryConsultation, 320, 570, -870, -1075, 10
    AddObj cQuarantinePeriod, 620, 870, -870, -1090, 11
    AddObj cAdoptionRequest, 1220, 1470, -870, -1075, 12
    AddObj cCompatibilityRecommendation, 920, 1170, -870, -1060, 13
    AddObj cDiagnosis, 20, 270, -1160, -1275, 14
    AddObj cTreatment, 320, 570, -1160, -1350, 15
    AddObj cQuarantineControl, 620, 870, -1160, -1305, 16
    AddObj cAdoptionFollowup, 1220, 1470, -1160, -1305, 17
    AddObj cMedication, 320, 570, -1420, -1580, 18
    AddObj eUserRole, 1520, 1720, -325, -440, 19
    AddObj eAnimalStatus, 1520, 1720, -870, -1045, 20
    AddObj eRequestStatus, 1520, 1720, -1160, -1275, 21

    oDiagram.Update
    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID
    Session.Output "Modelo de datos creado: 18 tablas, 3 enumerados y 24 relaciones."

End Sub

'------------------------------------------------------------------
' Crea una clase o enumerado con estereotipo
'------------------------------------------------------------------
Function NuevaClase(sNombre, sTipo, sEstereotipo)
    Dim el
    Set el = oPackage.Elements.AddNew(sNombre, sTipo)
    el.Stereotype = sEstereotipo
    el.Update
    oPackage.Elements.Refresh
    Set NuevaClase = el
End Function

'------------------------------------------------------------------
' Columna de la tabla; sMarca = PK, FK, UQ o vacio
'------------------------------------------------------------------
Sub AddAttr(oClase, sNombre, sTipo, sMarca, nPos)
    Dim a
    Set a = oClase.Attributes.AddNew(sNombre, sTipo)
    a.Visibility = "Private"
    a.Pos = nPos
    If sMarca <> "" Then a.Stereotype = sMarca
    If sMarca = "PK" Then a.IsID = True
    a.Update
    oClase.Attributes.Refresh
End Sub

'------------------------------------------------------------------
' Valor de un enumerado
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
