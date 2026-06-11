# Detecta la IP local actual y actualiza APP_FRONTEND_URL en .env
# Ejecutar desde la carpeta backend: .\actualizar-ip.ps1

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254' } |
       Sort-Object -Property PrefixLength |
       Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Host "ERROR: No se pudo detectar la IP. Conectate a una red primero." -ForegroundColor Red
    exit 1
}

$envPath = Join-Path $PSScriptRoot ".env"
$contenido = Get-Content $envPath -Raw
$contenido = $contenido -replace 'APP_FRONTEND_URL=.*', "APP_FRONTEND_URL=http://${ip}:5174"
Set-Content $envPath $contenido -NoNewline

php artisan config:clear

Write-Host ""
Write-Host "IP actualizada: http://${ip}:5174" -ForegroundColor Green
Write-Host "Ahora reinicia el frontend con: cd frontend && npm run dev" -ForegroundColor Cyan
