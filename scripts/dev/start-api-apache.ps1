# Replace single-threaded `php artisan serve` with Laragon Apache + mod_php.
$ErrorActionPreference = "Stop"
$runtime = Join-Path $PSScriptRoot "runtime"
$httpd = "C:\laragon\bin\apache\httpd-2.4.66-260223-Win64-VS18\bin\httpd.exe"
$config = Join-Path $PSScriptRoot "kaila-api-httpd.conf"
$pidFile = Join-Path $runtime "httpd.pid"

New-Item -ItemType Directory -Force -Path $runtime | Out-Null

# Stop built-in Laravel/PHP servers bound to :8000
Get-CimInstance Win32_Process -Filter "Name='php.exe'" |
  Where-Object { $_.CommandLine -match 'artisan serve|:8000|server\.php' } |
  ForEach-Object {
    Write-Host "Stopping PID $($_.ProcessId): $($_.CommandLine)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

# Stop prior KAILA API Apache if this config is already running.
Get-CimInstance Win32_Process -Filter "Name='httpd.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine -match 'kaila-api-httpd' } |
  ForEach-Object {
    Write-Host "Stopping Apache PID $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

if (Test-Path $pidFile) {
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 1
Start-Process -FilePath $httpd -ArgumentList @("-f", $config) -WindowStyle Hidden
Start-Sleep -Seconds 2

try {
  $status = (Invoke-WebRequest -Uri "http://127.0.0.1:8000/up" -UseBasicParsing -TimeoutSec 15).StatusCode
  Write-Host "KAILA API (Apache) ready on http://127.0.0.1:8000  /up=$status"
} catch {
  Write-Host "Apache started but /up check failed: $($_.Exception.Message)"
  Write-Host "See $runtime\httpd-error.log"
  exit 1
}
