'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE SECUENCIA - HU1 - Gestionar animales
'
' CRUD de animales.
' Listar     GET   /animals?q&species&status&page -> AnimalsService.list()
' Registrar  POST  /animals                       -> AnimalsService.create()
' Foto       POST  /animals/{id}/photo            -> AnimalsService.savePhoto()
' Editar     PATCH /animals/{id}                  -> AnimalsService.update()
' Baja       POST  /animals/{id}/exit             -> AnimalsService.exit()
' Los animales no se borran: la baja registra la salida y su motivo.
' Pantallas: app/(app)/animales (lista, nuevo, ficha y editar)
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
Const UI    = 1   ' Pantalla de animales
Const CTRL  = 2   ' AnimalsController
Const SRV   = 3   ' AnimalsService
Const STO   = 4   ' StorageService (S3)
Const PRI   = 5   ' PrismaService
Const BD    = 6   ' BD (PostgreSQL)

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

Dim els(6)
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
    Set oDiagram = oPackage.Diagrams.AddNew("HU1 - Gestionar animales", "Sequence")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Participantes (lifelines) ----------
    Dim nombres(6)
    nombres(ADM) = "Administrador"
    nombres(UI) = "Pantalla de animales"
    nombres(CTRL) = "AnimalsController"
    nombres(SRV) = "AnimalsService"
    nombres(STO) = "StorageService (S3)"
    nombres(PRI) = "PrismaService"
    nombres(BD) = "BD (PostgreSQL)"

    For i = 0 To 6
        If i = 0 Then
            Set el = oPackage.Elements.AddNew(nombres(i), "Actor")
        Else
            Set el = oPackage.Elements.AddNew(nombres(i), "Sequence")
        End If
        el.Update
        Set els(i) = el
    Next
    oPackage.Elements.Refresh

    For i = 0 To 6
        Set dobj = oDiagram.DiagramObjects.AddNew("l=" & (X_INICIO + i * X_PASO) & ";r=" & (X_INICIO + X_ANCHO + i * X_PASO) & ";t=-20;b=-90", "")
        dobj.ElementID = els(i).ElementID
        dobj.Sequence = i + 1
        dobj.Update
    Next
    oDiagram.DiagramObjects.Refresh

    nY = Y_INICIO
    nNum = 0
    nFrag = 0

    ' ======== Listar ========
    AddMsg ADM, UI, "buscarAnimales(codigo o nombre, especie, estado)"
    AddMsg UI, CTRL, "GET /animals?q&species&status&page"
    AddMsg CTRL, SRV, "list(q)"
    Datos SRV, "animal.findMany(filtros, pagina) y animal.count", "SELECT ... FROM animals WHERE deleted_at IS NULL AND ... LIMIT ?", "animales, total"
    AddMsg SRV, CTRL, "return(pagina de animales)"
    AddMsg CTRL, UI, "return(200 OK)"
    AddMsg UI, ADM, "muestra las tarjetas de animales"

    ' ======== Registrar ========
    AddMsg ADM, UI, "registrarAnimal(especie, sexo, tamano, fecha de ingreso)"
    AddMsg UI, CTRL, "POST /animals"
    AddMsg CTRL, SRV, "create(dto, user)"
    Datos SRV, "$transaction: animal.findFirst(ultimo codigo del anio)", "SELECT code FROM animals WHERE code LIKE 'ZOO-AAAA-%' ORDER BY code DESC", "ultimo codigo"
    AddMsg SRV, SRV, "genera codigo ZOO-AAAA-NNNN"
    Datos SRV, "animal.create(code, status = INGRESADO)", "INSERT INTO animals (...) RETURNING *", "animal"
    AddMsg SRV, CTRL, "return(animal)"
    AddMsg CTRL, UI, "return(201 Created)"

    ' ======== Subir foto ========
    AddMsg UI, CTRL, "POST /animals/{id}/photo (archivo)"
    AddMsg CTRL, SRV, "savePhoto(id, file)"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(400 Bad Request)"
    CerrarFrag F_BREAK, "sin archivo, mayor a 5 MB o formato invalido", CTRL, SRV, y1

    AddMsg SRV, STO, "put(clave, buffer)"
    AddMsg STO, SRV, "return(photoUrl)"
    Datos SRV, "animal.update(photoUrl)", "UPDATE animals SET photo_url = ? WHERE id = ?", "animal"
    AddMsg SRV, STO, "remove(foto anterior)"
    AddMsg SRV, CTRL, "return(animal)"
    AddMsg CTRL, UI, "return(200 OK)"
    AddMsg UI, ADM, "muestra la ficha con la foto"

    ' ======== Editar ========
    AddMsg ADM, UI, "editarAnimal(datos modificados)"
    AddMsg UI, CTRL, "PATCH /animals/{id}"
    AddMsg CTRL, SRV, "update(id, dto)"
    Datos SRV, "animal.findFirst(id)", "SELECT * FROM animals WHERE id = ? AND deleted_at IS NULL", "animal"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(404 Not Found)"
    CerrarFrag F_BREAK, "el animal no existe", CTRL, SRV, y1

    Datos SRV, "animal.update(campos enviados)", "UPDATE animals SET ... WHERE id = ?", "animal"
    AddMsg SRV, CTRL, "return(animal)"
    AddMsg CTRL, UI, "return(200 OK)"
    AddMsg UI, ADM, "muestra la ficha actualizada"

    ' ======== Baja (registrar salida) ========
    AddMsg ADM, UI, "registrarSalida(tipo, fecha, observaciones)"
    AddMsg UI, CTRL, "POST /animals/{id}/exit"
    AddMsg CTRL, SRV, "exit(id, dto, user)"
    Datos SRV, "$transaction: animal.findFirst(id) para actualizar", "SELECT * FROM animals WHERE id = ? FOR UPDATE", "animal"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(409 Conflict)"
    CerrarFrag F_BREAK, "animal ya salido o en proceso de adopcion", CTRL, SRV, y1

    Datos SRV, "cierra el periodo activo y suspende los tratamientos", "UPDATE quarantine_periods ...; UPDATE treatments SET status = 'SUSPENDIDO'", ""
    Datos SRV, "animal.update(FALLECIDO o DEVUELTO, exitDate, exitReason)", "UPDATE animals SET status = ?, exit_date = ? WHERE id = ?", "animal"
    AddMsg SRV, CTRL, "return(animal)"
    AddMsg CTRL, UI, "return(200 OK)"
    AddMsg UI, ADM, "muestra el nuevo estado del animal"

    oPackage.Elements.Refresh
    oDiagram.DiagramObjects.Refresh
    oDiagram.Update

    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Prompt "HU1 - Gestionar animales creado: " & nNum & " mensajes y " & nFrag & " fragmentos.", 0

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
