param([string]$EntityId, [string]$AdminUserId)
$ErrorActionPreference = 'Stop'
if ($EntityId) { $env:Matrika__EntityId = $EntityId }
if ($AdminUserId) { $env:Matrika__AdminUserId = $AdminUserId }
$env:Matrika__AdminEmail = 'matrika843@gmail.com'
$secret = Read-Host 'Enter the requested initial Matrika admin password' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
    $env:Matrika__AdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    dotnet run --project "$PSScriptRoot/../server-dotnet/Matrika.Api.csproj" -- --setup-matrika
    if ($LASTEXITCODE -ne 0) { throw 'Matrika setup failed. Review the error above.' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    Remove-Item Env:Matrika__AdminPassword -ErrorAction SilentlyContinue
}
