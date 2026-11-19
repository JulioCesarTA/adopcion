workspace "Adopet - Sprint 1" "Modelo C4 del Sprint 1: HU8, HU1, HU2, HU3 y HU4." {

    model {
        admin = person "Administrador" "Gestiona las cuentas del personal (HU8) y el registro de los animales (HU1)."
        vet = person "Veterinario" "Registra consultas (HU2), consulta el historial clinico (HU3) y aplica vacunas (HU4)."

        s3 = softwareSystem "Amazon S3" "Almacena las fotografias de los animales cuando STORAGE_DRIVER=s3." "Externo"

        adopet = softwareSystem "Sistema Adopet" "Registro de animales, historia clinica digital, vacunacion y gestion de usuarios." {

            web = container "Aplicacion web" "Pantallas de login, usuarios, animales, consultas, historial y vacunas. Reescribe /api/v1 y /uploads hacia la API." "Next.js 15, React 19, TanStack Query" "Navegador"

            api = container "API REST" "Expone /api/v1, valida los datos, aplica JWT y roles y ejecuta las reglas de negocio." "NestJS 11, TypeScript" {
                guards = component "JwtAuthGuard y RolesGuard" "Verifican el token JWT y el rol en cada peticion." "NestJS Guards"
                auth = component "Auth" "/auth/login, refresh, logout, me y change-password; emite y renueva los tokens." "AuthController, AuthService"
                users = component "Users" "HU8: alta, edicion, activacion y restablecimiento de contrasena." "UsersController, UsersService"
                animals = component "Animals" "HU1 y HU3: ficha, foto, salida, reingreso y linea de tiempo." "AnimalsController, AnimalsService"
                status = component "AnimalStatusService" "Cambia la situacion del animal y valida las transiciones." "NestJS Service"
                clinical = component "Clinical" "HU2 y HU4: consultas, diagnosticos, tratamientos, medicamentos y vacunaciones." "ClinicalController, ClinicalService"
                catalogs = component "Catalogs" "Catalogo de vacunas." "CatalogsController, CatalogsService"
                storage = component "StorageService" "Guarda la foto en disco local o en Amazon S3 segun STORAGE_DRIVER." "NestJS Service"
                prisma = component "PrismaService" "Acceso a PostgreSQL y transacciones." "Prisma 6"
            }

            db = container "Base de datos" "Usuarios, animales, consultas, diagnosticos, tratamientos, medicamentos, vacunas y vacunaciones." "PostgreSQL 16" "BaseDeDatos"
            fotos = container "Almacen local de fotos" "Fotografias cuando STORAGE_DRIVER=local." "Sistema de archivos UPLOAD_DIR/animals" "BaseDeDatos"
        }

        # Relaciones
        admin -> web "Gestiona usuarios y animales" "HTTPS"
        vet -> web "Registra consultas y vacunas, consulta el historial" "HTTPS"
        web -> auth "Inicia sesion y renueva el token" "JSON/HTTPS"
        web -> guards "Peticiones con Bearer JWT" "JSON/HTTPS"
        guards -> users "Autoriza (ADMIN)"
        guards -> animals "Autoriza (escritura GESTION y ADMIN; lectura todo el personal)"
        guards -> clinical "Autoriza (VETERINARIO, ADMIN)"
        guards -> catalogs "Autoriza (ADMIN; lectura VETERINARIO)"
        clinical -> status "Actualiza la situacion"
        animals -> status "Cambia la situacion"
        animals -> storage "Guarda la fotografia"
        storage -> s3 "PutObject y DeleteObject" "AWS SDK, HTTPS"
        storage -> fotos "Escribe la fotografia" "E/S de archivos"
        auth -> prisma "Usa"
        users -> prisma "Usa"
        animals -> prisma "Usa"
        clinical -> prisma "Usa"
        catalogs -> prisma "Usa"
        prisma -> db "Lee y escribe" "SQL/TCP 5432"
    }

    views {
        systemContext adopet "Nivel1_Contexto" "Sprint 1 - Diagrama de contexto del Sistema Adopet." {
            include *
            autoLayout lr
        }

        container adopet "Nivel2_Contenedores" "Sprint 1 - Diagrama de contenedores del Sistema Adopet." {
            include *
            autoLayout tb
        }

        component api "Nivel3_Componentes" "Sprint 1 - Diagrama de componentes de la API REST." {
            include *
            autoLayout tb
        }

        styles {
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Software System" {
                background #1168bd
                color #ffffff
            }
            element "Externo" {
                background #999999
                color #ffffff
            }
            element "Container" {
                background #438dd5
                color #ffffff
            }
            element "Component" {
                background #85bbf0
                color #000000
            }
            element "Navegador" {
                shape WebBrowser
            }
            element "BaseDeDatos" {
                shape Cylinder
            }
        }
    }
}
