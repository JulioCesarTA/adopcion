'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE SECUENCIA - HU12 - Seguimiento post-adopcion
'
' Registro y consulta de los seguimientos de una adopcion aprobada.
' Registrar  POST /adoptions/{id}/followups -> AdoptionsService.createFollowup()
' Listar     GET  /adoptions/{id}/followups -> AdoptionsService.listFollowups()
' Pantalla: app/(app)/solicitudes/[id]/page.tsx
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
Const ADM   = 0   ' Administrador
Const UI    = 1   ' Seguimientos de la adopcion
Const CTRL  = 2   ' AdoptionsController
Const SRV   = 3   ' AdoptionsService
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
    Set oDiagram = oPackage.Diagrams.AddNew("HU12 - Seguimiento post-adopcion", "Sequence")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Participantes (lifelines) ----------
    Dim nombres(5)
    nombres(ADM) = "Administrador"
    nombres(UI) = "Seguimientos de la adopcion"
    nombres(CTRL) = "AdoptionsController"
    nombres(SRV) = "AdoptionsService"
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

    ' ======== Registrar seguimiento ========
    AddMsg ADM, UI, "registrarSeguimiento(fecha, estado del animal, observaciones)"
    AddMsg UI, CTRL, "POST /adoptions/{id}/followups"
    AddMsg CTRL, SRV, "createFollowup(id, dto, user)"
    Datos SRV, "adoptionRequest.findUnique(id)", "SELECT * FROM adoption_requests WHERE id = ?", "solicitud"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(404 / 409 / 400)"
    CerrarFrag F_BREAK, "no existe, no aprobada o fecha previa a la entrega", CTRL, SRV, y1

    Datos SRV, "adoptionFollowup.create(createdById = user.id)", "INSERT INTO adoption_followups (...) RETURNING *", "seguimiento"
    AddMsg SRV, CTRL, "return(seguimiento)"
    AddMsg CTRL, UI, "return(201 Created)"

    ' ======== Listar seguimientos ========
    AddMsg ADM, UI, "verSeguimientos()"
    AddMsg UI, CTRL, "GET /adoptions/{id}/followups"
    AddMsg CTRL, SRV, "listFollowups(id)"
    Datos SRV, "adoptionFollowup.findMany(adoptionRequestId)", "SELECT * FROM adoption_followups WHERE adoption_request_id = ? ORDER BY followup_date DESC", "seguimientos"
    AddMsg SRV, CTRL, "return(seguimientos)"
    AddMsg CTRL, UI, "return(200 OK)"
    AddMsg UI, ADM, "muestra los seguimientos del mas reciente al mas antiguo"

    oPackage.Elements.Refresh
    oDiagram.DiagramObjects.Refresh
    oDiagram.Update

    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Prompt "HU12 - Seguimiento post-adopcion creado: " & nNum & " mensajes y " & nFrag & " fragmentos.", 0

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
