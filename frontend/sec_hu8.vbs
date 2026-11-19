'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE SECUENCIA - HU8 - Gestionar usuarios
'
' CRUD de cuentas de usuario, solo para el rol ADMIN.
' Listar      GET   /users?q&role&isActive&page  -> UsersService.list()
' Crear       POST  /users                       -> UsersService.create()
' Editar      PATCH /users/{id}                  -> UsersService.update()
' Desactivar  PATCH /users/{id}/active           -> UsersService.setActive()
' Las cuentas no se borran: se desactivan y pierden la sesion.
' Pantalla: app/(app)/admin/usuarios/page.tsx
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
Const UI    = 1   ' Pantalla de usuarios
Const CTRL  = 2   ' UsersController
Const SRV   = 3   ' UsersService
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
    Set oDiagram = oPackage.Diagrams.AddNew("HU8 - Gestionar usuarios", "Sequence")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Participantes (lifelines) ----------
    Dim nombres(5)
    nombres(ADM) = "Administrador"
    nombres(UI) = "Pantalla de usuarios"
    nombres(CTRL) = "UsersController"
    nombres(SRV) = "UsersService"
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

    ' ======== Listar ========
    AddMsg ADM, UI, "buscarUsuarios(texto, rol, estado)"
    AddMsg UI, CTRL, "GET /users?q&role&isActive&page"
    AddMsg CTRL, SRV, "list(q)"
    Datos SRV, "user.findMany(filtros, pagina) y user.count", "SELECT ... FROM users WHERE ... ORDER BY full_name LIMIT ?", "usuarios, total"
    AddMsg SRV, CTRL, "return(pagina de usuarios)"
    AddMsg CTRL, UI, "return(200 OK)"
    AddMsg UI, ADM, "muestra la tabla de usuarios"

    ' ======== Crear ========
    AddMsg ADM, UI, "crearUsuario(nombre, email, rol, contrasena)"
    AddMsg UI, CTRL, "POST /users"
    AddMsg CTRL, SRV, "create(dto)"
    Datos SRV, "user.findUnique(email)", "SELECT id FROM users WHERE email = ?", "existente"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(409 Conflict)"
    CerrarFrag F_BREAK, "email ya registrado", CTRL, SRV, y1

    AddMsg SRV, SRV, "bcrypt.hash(password)"
    Datos SRV, "user.create(nombre, email, rol, passwordHash)", "INSERT INTO users (...) RETURNING *", "usuario"
    AddMsg SRV, CTRL, "return(usuario)"
    AddMsg CTRL, UI, "return(201 Created)"
    AddMsg UI, ADM, "agrega el usuario a la tabla"

    ' ======== Editar ========
    AddMsg ADM, UI, "editarUsuario(nombre, email, rol)"
    AddMsg UI, CTRL, "PATCH /users/{id}"
    AddMsg CTRL, SRV, "update(id, dto, actor)"
    Datos SRV, "user.findUnique(id)", "SELECT * FROM users WHERE id = ?", "usuario"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(404 / 400 / 409)"
    CerrarFrag F_BREAK, "no existe, propio rol o email repetido", CTRL, SRV, y1

    Datos SRV, "user.update(dto)", "UPDATE users SET full_name = ?, email = ?, role = ? WHERE id = ?", "usuario"
    AddMsg SRV, CTRL, "return(usuario)"
    AddMsg CTRL, UI, "return(200 OK)"
    AddMsg UI, ADM, "actualiza la fila"

    ' ======== Desactivar ========
    AddMsg ADM, UI, "desactivarUsuario()"
    AddMsg UI, CTRL, "PATCH /users/{id}/active (isActive = false)"
    AddMsg CTRL, SRV, "setActive(id, false, actor)"

    y1 = AbrirFrag()
    AddMsg SRV, CTRL, "return(400 Bad Request)"
    CerrarFrag F_BREAK, "es su propia cuenta", CTRL, SRV, y1

    Datos SRV, "user.update(isActive = false, refreshTokenHash = null)", "UPDATE users SET is_active = false, refresh_token_hash = NULL WHERE id = ?", "usuario"
    AddMsg SRV, CTRL, "return(usuario)"
    AddMsg CTRL, UI, "return(200 OK)"
    AddMsg UI, ADM, "muestra la cuenta como inactiva"

    oPackage.Elements.Refresh
    oDiagram.DiagramObjects.Refresh
    oDiagram.Update

    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Prompt "HU8 - Gestionar usuarios creado: " & nNum & " mensajes y " & nFrag & " fragmentos.", 0

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
