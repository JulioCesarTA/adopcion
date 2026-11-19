workspace "Adopet - Sprint 2" "Modelo C4 del Sprint 2: HU10, HU5, HU6 y HU11." {

    model {
        vet = person "Veterinario" "Abre periodos de observacion y cuarentena, registra sus controles y los cierra (HU10)."
        gestion = person "Gestion de Adopciones" "Registra adoptantes y solicitudes (HU5), consulta la compatibilidad (HU6) y decide la adopcion con su acta (HU11)."

        adopet = softwareSystem "Sistema Adopet" "Cuarentenas, adoptantes, solicitudes de adopcion y recomendacion de compatibilidad con Random Forest." {

            web = container "Aplicacion web" "Pantallas de cuarentena, adoptantes, solicitudes, adoptables y modelo de recomendacion. Reescribe /api/v1 hacia la API." "Next.js 15, React 19, TanStack Query" "Navegador"

            api = container "API REST" "Expone /api/v1, valida los datos, aplica JWT y roles y ejecuta las reglas de negocio." "NestJS 11, TypeScript" {
                guards = component "JwtAuthGuard y RolesGuard" "Verifican el token JWT y el rol en cada peticion." "NestJS Guards"
                clinical = component "Clinical (periodos)" "HU10: /periods, /animals/:id/periods, controles y cierre del periodo." "ClinicalController, ClinicalService"
                status = component "AnimalStatusService" "Cambia la situacion del animal: en cuarentena, disponible, en proceso de adopcion, adoptado." "NestJS Service"
                animals = component "Animals" "Habilita y retira al animal de adopcion: enable-adoption y disable-adoption." "AnimalsController, AnimalsService"
                adopters = component "Adopters" "HU5: adoptantes y su perfil de adopcion." "AdoptersController, AdoptersService"
                adoptions = component "Adoptions" "HU5 y HU11: solicitudes, aprobacion o rechazo y acta de entrega (/adoptions/:id/act)." "AdoptionsController, AdoptionsService"
                recommendation = component "Recommendation" "HU6: calcula el puntaje y el nivel de compatibilidad; motor de reglas como respaldo." "RecommendationController, RecommendationService, engine.ts"
                ml = component "MlService" "Random Forest propio: arboles CART, bagging, metricas y entrenamiento." "recommendation/ml"
                catalogs = component "CatalogsService" "Pesos y umbrales vigentes del motor de reglas." "NestJS Service"
                prisma = component "PrismaService" "Acceso a PostgreSQL y transacciones." "Prisma 6"
            }

            db = container "Base de datos" "Periodos y controles, personas, perfiles de adoptante, solicitudes, recomendaciones, configuracion del algoritmo y modelos de ML." "PostgreSQL 16" "BaseDeDatos"
        }

        # Relaciones
        vet -> web "Gestiona periodos de cuarentena" "HTTPS"
        gestion -> web "Gestiona adoptantes, solicitudes y adopciones" "HTTPS"
        web -> guards "Peticiones con Bearer JWT" "JSON/HTTPS"
        guards -> clinical "Autoriza (abrir: VETERINARIO, GESTION, ADMIN; controles y cierre: VETERINARIO)"
        guards -> animals "Autoriza (VETERINARIO, ADMIN)"
        guards -> adopters "Autoriza (GESTION, ADMIN; lectura DIRECTIVO)"
        guards -> adoptions "Autoriza (GESTION, ADMIN; lectura DIRECTIVO)"
        guards -> recommendation "Autoriza (GESTION, ADMIN)"
        clinical -> status "Pone y quita la cuarentena"
        animals -> status "Habilita o retira de adopcion"
        adoptions -> status "Marca en proceso de adopcion o adoptado"
        recommendation -> ml "Predice la compatibilidad"
        recommendation -> catalogs "Lee pesos y umbrales"
        clinical -> prisma "Usa"
        animals -> prisma "Usa"
        adopters -> prisma "Usa"
        adoptions -> prisma "Usa en una transaccion"
        recommendation -> prisma "Usa"
        ml -> prisma "Guarda y lee modelos"
        catalogs -> prisma "Usa"
        prisma -> db "Lee y escribe" "SQL/TCP 5432"
    }

    views {
        systemContext adopet "Nivel1_Contexto" "Sprint 2 - Diagrama de contexto del Sistema Adopet." {
            include *
            autoLayout lr
        }

        container adopet "Nivel2_Contenedores" "Sprint 2 - Diagrama de contenedores del Sistema Adopet." {
            include *
            autoLayout tb
        }

        component api "Nivel3_Componentes" "Sprint 2 - Diagrama de componentes de la API REST." {
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
