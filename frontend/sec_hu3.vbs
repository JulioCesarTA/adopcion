'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE SECUENCIA - HU3 - Gestionar historial clinico
'
' Consulta y correccion del historial clinico del animal.
' Ver historial        GET   /animals/{id}/timeline        -> AnimalsService.timeline()
' Ver consulta         GET   /consultations/{id}           -> ClinicalService.getConsultation()
' Editar consulta      PATCH /consultations/{id}           -> ClinicalService.updateConsultation()
' Editar tratamiento   PATCH /treatments/{id}              -> ClinicalService.updateTreatment()
' Agregar medicamento  POST  /treatments/{id}/medications  -> ClinicalService.addMedication()
' Los registros clinicos no se borran (RN-02): se corrigen o el
' tratamiento se finaliza o suspende. Solo el autor o un ADMIN corrige.
' Pantalla: app/(app)/animales/[id] (pestana de historial, timeline.tsx)
'
' Capas: Pantalla (Next.js) -> Controller -> Service -> PrismaService
' -> PostgreSQL.
' Solo se dibujan los pasos que importan para la historia y las
' ramas reales del servicio:
'   break  la peticion termina antes de tiempo (throw ...Exception)
'   opt    un paso que solo ocurre si se cumple la condicion
'   loop   un paso que se repite
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

' Indices de los participantes (de izquierda a derecha)
Const VET   = 0   ' Veterinario
Const UI    = 1   ' Historial clinico
Const ACTRL = 2   ' AnimalsController
Const ASRV  = 3   ' AnimalsService
Const CTRL  = 4   ' ClinicalController
Const SRV   = 5   ' ClinicalService
Const PRI   = 6   ' PrismaService
Const BD    = 7   ' BD (PostgreSQL)

' Geometria del diagrama
Const X_INICIO  = 40     ' borde izquierdo del primer participante
Const X_PASO    = 220    ' distancia entre participantes
Const X_ANCHO   = 170    ' ancho de cada participante
Const Y_INICIO  = 129    ' altura a la que EA dibuja el primer mensaje
Const PASO      = 35     ' EA dibuja los mensajes a esta distancia fija

' Operadores de fragmento (valor de Subtype en EA)
Const F_OPT   = 1
Const F_BREAK = 2
Const F_LOOP  = 4

Dim els(7)
Dim nY        ' altura del proximo mensaje
Dim nNum      ' numero del ultimo mensaje creado
Dim nFrag     ' cantidad de fragmentos

Sub Main

    Dim i
    Dim el
    Dim dobj
    Dim y1
    Dim y2
    Dim y3

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    ' ---------- Crear el diagrama de Secuencia ----------
    Set oDiagram = oPackage.Diagrams.AddNew("HU3 - Gestionar historial clinico", "Sequence")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Participantes (lifelines) ----------
    Dim nombres(7)
    nombres(VET) = "Veterinario"
    nombres(UI) = "Historial clinico"
    nombres(ACTRL) = "AnimalsController"
    nombres(ASRV) = "AnimalsService"
    nombres(CTRL) = "ClinicalController"
    nombres(SRV) = "ClinicalService"
    nombres(PRI) = "PrismaService"
    nombres(BD) = "BD (PostgreSQL)"

    For i = 0 To 7
        If i = 0 Then
            Set el = oPackage.Elements.AddNew(nombres(i), "Actor")
        Else
            Set el = oPackage.Elements.AddNew(nombres(i), "Sequence")
        End If
        el.Update
        Set els(i) = el
    Next
    oPackage.Elements.Refresh

    For i = 0 To 7
        Set dobj = oDiagram.DiagramObjects.AddNew("l=" & (X_INICIO + i * X_PASO) & ";r=" & (X_INICIO + X_ANCHO + i * X_PASO) & ";t=-20;b=-90", "")
        dobj.ElementID = els(i).ElementID
        dobj.Sequence = i + 1
        dobj.Update
    Next
    oDiagram.DiagramObjects.Refresh

    nY = Y_INICIO
    nNum = 0
    nFrag = 0

    ' ======== Ver historial ========
    AddMsg VET, UI, "verHistorial(tipos, desde, hasta)"
    AddMsg UI, ACTRL, "GET /animals/{id}/timeline?types&from&to"
    AddMsg ACTRL, ASRV, "timeline(id, q)"
    Datos ASRV, "animal.findFirst(id)", "SELECT * FROM animals WHERE id = ? AND deleted_at IS NULL", "animal"

    y1 = AbrirFrag()
    AddMsg ASRV, ACTRL, "return(404 / 400 Bad Request)"
    CerrarFrag F_BREAK, "animal inexistente o desde > hasta", ACTRL, ASRV, y1

    AddMsg ASRV, ASRV, "arma el filtro por tipo y fechas"

    ' Promise.all: una consulta por cada tipo pedido
    y1 = AbrirFrag()
    Datos ASRV, "findMany(animalId, rango de fechas)", "SELECT ... FROM veterinary_consultations | vaccinations | quarantine_periods", "registros"
    CerrarFrag F_LOOP, "por cada tipo: CONSULTA, VACUNA, PERIODO", ASRV, BD, y1

    AddMsg ASRV, ASRV, "ordena por fecha descendente"
    AddMsg ASRV, ACTRL, "return(items)"
    AddMsg ACTRL, UI, "return(200 OK)"
    AddMsg UI, VET, "muestra la linea de tiempo"

    ' ======== Ver consulta ========
    AddMsg VET, UI, "abrirConsulta()"
    AddMsg UI, CTRL, "GET /consultations/{id}"
    AddMsg CTRL, SRV, "getConsultation(id)"
    Datos SRV, "veterinaryConsultation.findUnique(diagnosticos, tratamientos)", "SELECT ... FROM veterinary_consultations JOIN diagnoses, treatments, medications", "consulta"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(404 Not Found)"
    CerrarFrag F_BREAK, "la consulta no existe", CTRL, SRV, y1

    AddMsg SRV, CTRL, "return(consulta)"
    AddMsg CTRL, UI, "return(200 OK)"
    AddMsg UI, VET, "muestra el detalle de la consulta"

    ' ======== Editar consulta ========
    AddMsg VET, UI, "corregirConsulta(signos, motivo, observaciones)"
    AddMsg UI, CTRL, "PATCH /consultations/{id}"
    AddMsg CTRL, SRV, "updateConsultation(id, dto, user)"
    Datos SRV, "veterinaryConsultation.findUnique(id)", "SELECT * FROM veterinary_consultations WHERE id = ?", "consulta"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(404 / 403 Forbidden)"
    CerrarFrag F_BREAK, "no existe o no es el autor ni ADMIN", CTRL, SRV, y1

    Datos SRV, "veterinaryConsultation.update(dto)", "UPDATE veterinary_consultations SET ... WHERE id = ?", "consulta"
    AddMsg SRV, CTRL, "return(consulta)"
    AddMsg CTRL, UI, "return(200 OK)"

    ' ======== Editar tratamiento ========
    AddMsg VET, UI, "editarTratamiento(fechas, estado)"
    AddMsg UI, CTRL, "PATCH /treatments/{id}"
    AddMsg CTRL, SRV, "updateTreatment(id, dto, user)"
    Datos SRV, "treatment.findUnique(id, consulta)", "SELECT * FROM treatments JOIN veterinary_consultations ...", "tratamiento"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(404 / 403 / 400)"
    CerrarFrag F_BREAK, "no existe, no es el autor o fechas invalidas", CTRL, SRV, y1

    Datos SRV, "treatment.update(fechas, estado)", "UPDATE treatments SET ... WHERE id = ?", "tratamiento"

    y1 = AbrirFrag()
    Datos SRV, "animal.update(estado clinico)", "UPDATE animals SET status = ? WHERE id = ?", ""
    CerrarFrag F_OPT, "cambio el estado del tratamiento", SRV, BD, y1

    AddMsg SRV, CTRL, "return(tratamiento)"
    AddMsg CTRL, UI, "return(200 OK)"

    ' ======== Agregar medicamento ========
    AddMsg VET, UI, "agregarMedicamento(nombre, dosis, frecuencia)"
    AddMsg UI, CTRL, "POST /treatments/{id}/medications"
    AddMsg CTRL, SRV, "addMedication(tratamientoId, dto)"
    Datos SRV, "treatment.findUnique(id, animal)", "SELECT * FROM treatments JOIN ... animals", "tratamiento"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(404 / 409 Conflict)"
    CerrarFrag F_BREAK, "no existe o el animal ya salio", CTRL, SRV, y1

    Datos SRV, "medication.create(dto)", "INSERT INTO medications (...) RETURNING *", "medicamento"
    AddMsg SRV, CTRL, "return(medicamento)"
    AddMsg CTRL, UI, "return(201 Created)"
    AddMsg UI, VET, "muestra el historial corregido"

    oPackage.Elements.Refresh
    oDiagram.DiagramObjects.Refresh
    oDiagram.Update

    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Prompt "HU3 - Gestionar historial clinico creado: " & nNum & " mensajes y " & nFrag & " fragmentos.", 0

End Sub

'------------------------------------------------------------------
' Mensaje entre dos participantes. Si origen = destino es una
' auto-llamada. EA dibuja cada mensaje en una fila de altura PASO.
'------------------------------------------------------------------
Sub AddMsg(nOrigen, nDestino, sTexto)
    Dim con
    nNum = nNum + 1
    Set con = els(nOrigen).Connectors.AddNew(sTexto, "Sequence")
    con.SupplierID = els(nDestino).ElementID
    con.SequenceNo = nNum
    con.DiagramID = oDiagram.DiagramID
    con.StartPointY = -nY
    con.EndPointY = -nY
    con.Update
    els(nOrigen).Connectors.Refresh
    nY = nY + PASO
End Sub

'------------------------------------------------------------------
' Acceso a datos: el servicio llama a PrismaService, este ejecuta el
' SQL en PostgreSQL y devuelve el resultado. Sin sRetorno no hay
' respuesta dibujada.
'------------------------------------------------------------------
Sub Datos(nServicio, sLlamada, sSql, sRetorno)
    AddMsg nServicio, PRI, sLlamada
    AddMsg PRI, BD, sSql
    If sRetorno <> "" Then
        AddMsg PRI, nServicio, "return(" & sRetorno & ")"
    End If
End Sub

'------------------------------------------------------------------
' Marca donde empieza un fragmento.
'------------------------------------------------------------------
Function AbrirFrag()
    AbrirFrag = nY
End Function

'------------------------------------------------------------------
' Fragmento de un solo operando: opt, loop o break.
'   nIzq, nDer = participantes que abarca; yIni = valor de AbrirFrag()
'------------------------------------------------------------------
Sub CerrarFrag(nTipo, sGuarda, nIzq, nDer, yIni)
    Dim frag
    Dim part
    Dim nTop
    Dim nBottom

    nTop = yIni - 24
    nBottom = nY - PASO + 14

    Set frag = oPackage.Elements.AddNew("", "InteractionFragment")
    frag.Subtype = nTipo
    frag.Update
    Set part = frag.Partitions.AddNew(sGuarda, "Partition")
    part.Size = nBottom - nTop
    frag.Update

    ColocarFrag frag, nIzq, nDer, nTop, nBottom
End Sub

'------------------------------------------------------------------
' Coloca el marco. El borde izquierdo queda en el carril libre que
' hay a la izquierda de la primera linea de vida que abarca, para que
' la guarda no quede encima de las flechas.
'------------------------------------------------------------------
Sub ColocarFrag(oFrag, nIzq, nDer, nTop, nBottom)
    Dim dobj
    Dim l
    Dim r
    If nIzq > 0 Then
        l = X_INICIO + (nIzq - 1) * X_PASO + (X_ANCHO / 2) + 15
    Else
        l = X_INICIO
    End If
    r = X_INICIO + nDer * X_PASO + (X_ANCHO / 2) + 100
    If nIzq = nDer Then r = r + 60
    Set dobj = oDiagram.DiagramObjects.AddNew("l=" & l & ";r=" & r & ";t=-" & nTop & ";b=-" & nBottom & ";", "")
    dobj.ElementID = oFrag.ElementID
    dobj.Update
    nFrag = nFrag + 1
End Sub

Main
