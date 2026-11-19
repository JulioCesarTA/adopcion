'==================================================================
' Script de Enterprise Architect (VBScript)
' DIAGRAMA DE DESPLIEGUE - Sprint 1
'
' Historias: HU8, HU1, HU2, HU3, HU4
'
' Cada nodo sale de la infraestructura real del proyecto:
'   docker-compose.prod.yml y docker-compose.ec2.yml (contenedores)
'   deploy/nginx (proxy inverso: /api -> backend, / -> frontend)
'   backend/src/modules/storage (fotos de los animales en S3)
'   .github/workflows/deploy.yml (imagenes en ECR)
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

Dim ndCliente
Dim ndNavegador
Dim ndEC2
Dim ndDocker
Dim ndNginx
Dim ndFrontend
Dim ndBackend
Dim ndBD
Dim ndS3
Dim ndECR
Dim arFrontend
Dim arBackend
Dim arBD

Sub Main

    Set oPackage = Repository.GetTreeSelectedPackage()
    If oPackage Is Nothing Then
        Session.Prompt "Selecciona primero un paquete en el Browser.", 0
        Exit Sub
    End If

    ' ---------- Crear el diagrama de Despliegue ----------
    Set oDiagram = oPackage.Diagrams.AddNew("Sprint 1 - Diagrama de Despliegue", "Deployment")
    oDiagram.Update
    oPackage.Diagrams.Refresh

    ' ---------- Nodos ----------
    Set ndCliente = NuevoNodo("PC o celular del usuario", "Device", "device", "Administrador o veterinario")
    Set ndNavegador = NuevoNodo("Navegador web", "Node", "executionEnvironment", "Chrome, Edge o Firefox")
    Set ndEC2 = NuevoNodo("Servidor AWS EC2", "Node", "device", "Ubuntu Server")
    Set ndDocker = NuevoNodo("Docker Engine", "Node", "executionEnvironment", "Docker Compose")
    Set ndNginx = NuevoNodo("nginx 1.29", "Node", "executionEnvironment", "Proxy inverso, puertos 80 y 443")
    Set ndFrontend = NuevoNodo("frontend - Node.js 24", "Node", "executionEnvironment", "Puerto 3000")
    Set ndBackend = NuevoNodo("backend - Node.js 24", "Node", "executionEnvironment", "Puerto 4000")
    Set ndBD = NuevoNodo("db - PostgreSQL 16", "Node", "executionEnvironment", "Puerto 5432, red interna")
    Set ndS3 = NuevoNodo("Amazon S3", "Node", "device", "Bucket de fotografias de los animales")
    Set ndECR = NuevoNodo("Amazon ECR", "Node", "device", "Imagenes Docker del backend y del frontend")

    ' ---------- Artefactos desplegados ----------
    Set arFrontend = NuevoNodo("Aplicacion web Next.js 15", "Artifact", "", "Login, usuarios, animales, consultas, historial y vacunas")
    Set arBackend = NuevoNodo("API NestJS 11", "Artifact", "", "Modulos auth, users, animals, clinical, catalogs y storage")
    Set arBD = NuevoNodo("Base de datos de Adopet", "Artifact", "", "Esquema y migraciones de Prisma 6")

    ' ---------- Anidamiento ----------
    Anidar ndNavegador, ndCliente
    Anidar ndDocker, ndEC2
    Anidar ndNginx, ndDocker
    Anidar ndFrontend, ndDocker
    Anidar ndBackend, ndDocker
    Anidar ndBD, ndDocker
    Anidar arFrontend, ndFrontend
    Anidar arBackend, ndBackend
    Anidar arBD, ndBD

    ' ---------- Rutas de comunicacion ----------
    ' AddRuta origen, destino, protocolo
    AddRuta ndNavegador, ndNginx, "HTTPS"
    AddRuta ndNginx, ndFrontend, "HTTP :3000"
    AddRuta ndNginx, ndBackend, "HTTP :4000 /api"
    AddRuta ndBackend, ndBD, "TCP :5432"
    AddRuta ndBackend, ndS3, "HTTPS (AWS SDK)"
    AddRuta ndDocker, ndECR, "HTTPS (docker pull)"

    ' ---------- Colocar en el diagrama ----------
    '          elemento     izq  arriba ancho alto
    Colocar ndCliente, 20, 200, 230, 230
    Colocar ndNavegador, 40, 260, 190, 150

    Colocar ndEC2, 330, 40, 640, 490
    Colocar ndDocker, 350, 100, 600, 410
    Colocar ndNginx, 380, 160, 220, 110
    Colocar ndFrontend, 700, 140, 230, 140
    Colocar arFrontend, 715, 195, 200, 60
    Colocar ndBackend, 380, 340, 230, 140
    Colocar arBackend, 395, 395, 200, 60
    Colocar ndBD, 700, 340, 230, 140
    Colocar arBD, 715, 395, 200, 60

    Colocar ndS3, 395, 610, 200, 100
    Colocar ndECR, 1060, 120, 200, 110

    oDiagram.Update
    Repository.ReloadDiagram oDiagram.DiagramID
    Repository.OpenDiagram oDiagram.DiagramID

    Session.Prompt "Diagrama de despliegue del Sprint 1 creado (10 nodos, 3 artefactos, 6 rutas).", 0

End Sub

'------------------------------------------------------------------
' Crea un nodo, dispositivo o artefacto con estereotipo y nota
'------------------------------------------------------------------
Function NuevoNodo(sNombre, sTipo, sEstereotipo, sNota)
    Dim e
    Set e = oPackage.Elements.AddNew(sNombre, sTipo)
    If sEstereotipo <> "" Then e.Stereotype = sEstereotipo
    e.Notes = sNota
    e.Update
    oPackage.Elements.Refresh
    Set NuevoNodo = e
End Function

'------------------------------------------------------------------
' Deja un elemento dentro de otro (anidamiento en el Browser)
'------------------------------------------------------------------
Sub Anidar(oHijo, oPadre)
    oHijo.ParentID = oPadre.ElementID
    oHijo.Update
End Sub

'------------------------------------------------------------------
' Ruta de comunicacion con el protocolo como nombre
'------------------------------------------------------------------
Sub AddRuta(oOrigen, oDestino, sProtocolo)
    Dim con
    Set con = oOrigen.Connectors.AddNew(sProtocolo, "CommunicationPath")
    con.SupplierID = oDestino.ElementID
    con.Update
    oOrigen.Connectors.Refresh
End Sub

'------------------------------------------------------------------
' Coloca un elemento en el diagrama (EA mide hacia abajo en negativo)
'------------------------------------------------------------------
Sub Colocar(oElem, izq, arriba, ancho, alto)
    Dim d
    Set d = oDiagram.DiagramObjects.AddNew("l=" & izq & ";r=" & (izq + ancho) & ";t=-" & arriba & ";b=-" & (arriba + alto) & ";", "")
    d.ElementID = oElem.ElementID
    d.Update
    oDiagram.DiagramObjects.Refresh
End Sub

Main
