'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE SECUENCIA - HU10 - Gestion de periodos de cuarentena
'
' Inicio y cierre de un periodo de observacion o cuarentena.
' Iniciar  POST /animals/{id}/periods -> ClinicalService.startPeriod()
' Cerrar   POST /periods/{id}/close   -> ClinicalService.closePeriod()
' Pantalla: components/clinical/periods-panel.tsx
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
Const UI    = 1   ' Panel de periodos
Const CTRL  = 2   ' ClinicalController
Const SRV   = 3   ' ClinicalService
Const PRI   = 4   ' PrismaService
Const BD    = 5   ' BD (PostgreSQL)

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

Dim els(5)
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
    Set oDiagram = oPackage.Diagrams.AddNew("HU10 - Gestion de periodos de cuarentena", "Sequence")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Participantes (lifelines) ----------
    Dim nombres(5)
    nombres(VET) = "Veterinario"
    nombres(UI) = "Panel de periodos"
    nombres(CTRL) = "ClinicalController"
    nombres(SRV) = "ClinicalService"
    nombres(PRI) = "PrismaService"
    nombres(BD) = "BD (PostgreSQL)"

    For i = 0 To 5
        If i = 0 Then
            Set el = oPackage.Elements.AddNew(nombres(i), "Actor")
        Else
            Set el = oPackage.Elements.AddNew(nombres(i), "Sequence")
        End If
        el.Update
        Set els(i) = el
    Next
    oPackage.Elements.Refresh

    For i = 0 To 5
        Set dobj = oDiagram.DiagramObjects.AddNew("l=" & (X_INICIO + i * X_PASO) & ";r=" & (X_INICIO + X_ANCHO + i * X_PASO) & ";t=-20;b=-90", "")
        dobj.ElementID = els(i).ElementID
        dobj.Sequence = i + 1
        dobj.Update
    Next
    oDiagram.DiagramObjects.Refresh

    nY = Y_INICIO
    nNum = 0
    nFrag = 0

    ' ======== Iniciar periodo ========
    AddMsg VET, UI, "iniciarPeriodo(tipo, motivo, inicio, fin estimado)"
    AddMsg UI, CTRL, "POST /animals/{id}/periods"
    AddMsg CTRL, SRV, "startPeriod(animalId, dto, user)"
    Datos SRV, "$transaction: animal para actualizar y periodo activo", "SELECT ... FROM animals FOR UPDATE; SELECT ... FROM quarantine_periods WHERE status = 'ACTIVO'", "animal, periodo activo"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(400 / 409 Conflict)"
    CerrarFrag F_BREAK, "fechas invalidas, animal no apto o periodo activo", CTRL, SRV, y1

    Datos SRV, "quarantinePeriod.create(status = ACTIVO)", "INSERT INTO quarantine_periods (...) RETURNING *", "periodo"
    Datos SRV, "animal.update(EN_OBSERVACION o EN_CUARENTENA)", "UPDATE animals SET status = ? WHERE id = ?", ""
    AddMsg SRV, CTRL, "return(periodo)"
    AddMsg CTRL, UI, "return(201 Created)"
    AddMsg UI, VET, "muestra el periodo activo"

    ' ======== Cerrar periodo ========
    AddMsg VET, UI, "cerrarPeriodo(fecha de fin, observaciones finales)"
    AddMsg UI, CTRL, "POST /periods/{id}/close"
    AddMsg CTRL, SRV, "closePeriod(periodId, dto, user)"
    Datos SRV, "quarantinePeriod.findUnique(id, cantidad de controles)", "SELECT ... FROM quarantine_periods LEFT JOIN quarantine_controls ...", "periodo"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(404 / 409 / 400)"
    CerrarFrag F_BREAK, "no existe, ya cerrado o sin controles confirmados", CTRL, SRV, y1

    Datos SRV, "quarantinePeriod.update(status = FINALIZADO)", "UPDATE quarantine_periods SET status = 'FINALIZADO', end_date = ? WHERE id = ?", "periodo"
    Datos SRV, "animal.update(estado clinico)", "UPDATE animals SET status = ? WHERE id = ?", ""
    AddMsg SRV, CTRL, "return(periodo cerrado)"
    AddMsg CTRL, UI, "return(200 OK)"
    AddMsg UI, VET, "muestra el periodo finalizado"

    oPackage.Elements.Refresh
    oDiagram.DiagramObjects.Refresh
    oDiagram.Update

    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Prompt "HU10 - Gestion de periodos de cuarentena creado: " & nNum & " mensajes y " & nFrag & " fragmentos.", 0

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
