param(
    [string]$ConnectionString,
    [string]$DatabaseHost,
    [int]$DatabasePort = 3306,
    [string]$DatabaseUser = "avnadmin",
    [string]$ExpectedDatabase = "matrika_crm",
    [string]$AdminEmail = "matrika843@gmail.com",
    [string]$SslMode = "Required",
    [switch]$Confirm
)

$ErrorActionPreference = 'Stop'

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     MATRIKA CRM - PRODUCTION DATABASE BOOTSTRAP RUNNER        " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

if (-not $Confirm) {
    Write-Host "`nSAFETY CHECK: You must explicitly pass -Confirm to run this script." -ForegroundColor Yellow
    Write-Host "Example: .\scripts\bootstrap-production.ps1 -Confirm -DatabaseHost <aiven-host>`n"
    exit 1
}

# Resolve target connection base (without credentials)
$targetConn = $ConnectionString
if ([string]::IsNullOrWhiteSpace($targetConn) -and -not [string]::IsNullOrWhiteSpace($DatabaseHost)) {
    $targetConn = "Server=$DatabaseHost;Port=$DatabasePort;Database=$ExpectedDatabase;User=$DatabaseUser;SslMode=$SslMode;"
}
if ([string]::IsNullOrWhiteSpace($targetConn)) {
    $targetConn = $env:ConnectionStrings__DefaultConnection
}

if ([string]::IsNullOrWhiteSpace($targetConn)) {
    Write-Host "Please provide the production database host via -DatabaseHost (and optional -DatabasePort, -DatabaseUser)" -ForegroundColor Yellow
    Write-Host "or provide the base connection string (without password) via -ConnectionString." -ForegroundColor Yellow
    exit 1
}

# Strict security check: reject passwords supplied on the command line or in connection strings
if ($targetConn -match '(?i)(^|;)\s*password\s*=\s*[^;\s]+') {
    Write-Host "SECURITY ERROR: Do not pass the database password inside the -ConnectionString argument or command line." -ForegroundColor Red
    Write-Host "Provide connection parameters without the password; you will be prompted securely for the password." -ForegroundColor Yellow
    exit 1
}

# Strict safety check against forbidden legacy databases
if ($targetConn -match '\b(act[-_]base|hms[-_]dev)\b') {
    Write-Host "CRITICAL SAFETY ERROR: Connection string points to a protected or forbidden database name." -ForegroundColor Red
    Write-Host "Bootstrap is strictly prohibited against legacy or protected databases." -ForegroundColor Red
    exit 1
}

# Check JWT Key
if ([string]::IsNullOrWhiteSpace($env:Jwt__Key)) {
    Write-Host "Missing 'Jwt__Key' in environment. Generating a secure 32-byte production key..." -ForegroundColor Yellow
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $env:Jwt__Key = [System.Convert]::ToBase64String($bytes)
    Write-Host "Generated and set ephemeral Jwt__Key for this session." -ForegroundColor Green
}

# Check Encryption Key
if ([string]::IsNullOrWhiteSpace($env:Security__EncryptionKeyHex)) {
    Write-Host "Missing 'Security__EncryptionKeyHex' in environment. Generating a 32-byte (64 hex) production key..." -ForegroundColor Yellow
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $env:Security__EncryptionKeyHex = -join ($bytes | ForEach-Object { $_.ToString("x2") })
    Write-Host "Generated and set ephemeral Security__EncryptionKeyHex for this session." -ForegroundColor Green
}

# Prompt for Aiven Database Password securely
$dbSecret = Read-Host "Enter the Aiven MySQL database password" -AsSecureString
$dbPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbSecret)

# Prompt for Admin Password securely
$adminSecret = Read-Host "Enter the production superadmin password (minimum 8 characters)" -AsSecureString
$adminPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecret)

try {
    $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($dbPointer)
    if ([string]::IsNullOrWhiteSpace($dbPassword)) {
        throw "Database password cannot be empty."
    }

    $adminPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminPointer)

    # Format password for connection string (handling quotes and semicolons if present)
    $formattedDbPassword = if ($dbPassword -match '[;=\s"\'']') {
        '"' + ($dbPassword -replace '"', '""') + '"'
    } else {
        $dbPassword
    }

    # Clean connection string and attach database password
    $cleanConn = ($targetConn -replace '(?i)(^|;)\s*password\s*=[^;]*', '').Trim(';')
    $finalConn = "$cleanConn;Password=$formattedDbPassword;"

    $env:Matrika__AdminPassword = $adminPassword
    $env:Matrika__AdminEmail = $AdminEmail
    $env:Production__ExpectedDatabase = $ExpectedDatabase
    $env:ConnectionStrings__DefaultConnection = $finalConn
    $env:Matrika__ConfirmProductionBootstrap = "true"

    Write-Host "`nInvoking production bootstrap workflow with safety guardrails..." -ForegroundColor Cyan
    dotnet run --project "$PSScriptRoot/../server-dotnet/Matrika.Api.csproj" -- --init-prod --confirm-production-bootstrap

    if ($LASTEXITCODE -ne 0) {
        throw "Bootstrap process exited with an error code ($LASTEXITCODE). Review output above."
    }
}
finally {
    if ($adminPointer -and $adminPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminPointer)
    }
    if ($dbPointer -and $dbPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($dbPointer)
    }
    Remove-Item Env:Matrika__AdminPassword -ErrorAction SilentlyContinue
    Remove-Item Env:Matrika__ConfirmProductionBootstrap -ErrorAction SilentlyContinue
    Remove-Item Env:ConnectionStrings__DefaultConnection -ErrorAction SilentlyContinue
}
