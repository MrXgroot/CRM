# Creates ignored local configuration. Does not reset existing credentials or data.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$path = Join-Path $root '.env'
if (Test-Path $path) { throw 'Local configuration already exists. Keep it to preserve your encryption key and database credentials.' }
function New-RandomHex {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}
$secure = Read-Host 'Superadmin password (at least 8 characters)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    if ($password.Length -lt 8 -or [Text.Encoding]::UTF8.GetByteCount($password) -gt 72) { throw 'Password must be 8+ characters and at most 72 UTF-8 bytes.' }
    if ($password.Contains("'") -or $password.Contains("`n") -or $password.Contains("`r")) { throw 'For this local configuration helper, use a password without quotes or line breaks.' }
    @(
        "LOCAL_DB_PASSWORD=$(New-RandomHex)",
        "LOCAL_DB_ROOT_PASSWORD=$(New-RandomHex)",
        "LOCAL_JWT_KEY=$(New-RandomHex)",
        "LOCAL_ENCRYPTION_KEY=$(New-RandomHex)",
        'Matrika__AdminEmail=matrika843@gmail.com',
        "Matrika__AdminPassword='$password'"
    ) | Set-Content -Path $path -Encoding ascii
} finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr); $password = $null }
Write-Host 'Configuration saved. Run the first-time Docker commands in README.md.'
