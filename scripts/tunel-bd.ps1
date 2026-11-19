# Túnel a la base de datos de producción por AWS Systems Manager (sin SSH ni puertos abiertos).
# Deja PostgreSQL del servidor en localhost:5433 mientras esta ventana esté abierta.
#
# Uso:   .\scripts\tunel-bd.ps1
# Requiere: AWS CLI, Session Manager Plugin y el perfil "adopet-dev" en ~/.aws/credentials.
param(
    [int]$PuertoLocal = 5433,
    [string]$Perfil = "adopet-dev"
)

$env:Path += ";C:\Program Files\Amazon\SessionManagerPlugin\bin"
Write-Host "Túnel abierto: localhost:$PuertoLocal -> PostgreSQL de producción. Ctrl+C para cerrar."
aws ssm start-session `
    --profile $Perfil `
    --region sa-east-1 `
    --target i-0bf849ad18133ed10 `
    --document-name AWS-StartPortForwardingSession `
    --parameters "portNumber=5432,localPortNumber=$PuertoLocal"
