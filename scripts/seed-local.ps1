# Explicitly seeds the isolated local Docker database with development demo records.
# Safe, repeatable, and idempotent. Never alters act-base or production databases.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

Write-Host "Executing development seed operation on isolated Docker database..."
docker compose run --rm api dotnet Matrika.Api.dll --seed-dev
if ($LASTEXITCODE -ne 0) {
    throw "Development seeding failed. Review the output above."
}
Write-Host "Local CRM seeded successfully."
