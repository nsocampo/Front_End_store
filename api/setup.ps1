$ErrorActionPreference = 'Stop'

$postgresBin = 'C:\Program Files\PostgreSQL\18\bin'
$psql = Join-Path $postgresBin 'psql.exe'
$createdb = Join-Path $postgresBin 'createdb.exe'
$nodeBin = 'C:\Program Files\nodejs'
$npm = Join-Path $nodeBin 'npm.cmd'
$schema = Join-Path $PSScriptRoot 'schema.sql'
$envFile = Join-Path $PSScriptRoot '.env'
$username = Read-Host 'Usuario de PostgreSQL [postgres]'

if ([string]::IsNullOrWhiteSpace($username)) {
  $username = 'postgres'
} else {
  $username = $username.Trim()
}

if (-not (Test-Path $psql) -or -not (Test-Path $createdb)) {
  throw "No se encontraron las herramientas de PostgreSQL en $postgresBin."
}

if (-not (Test-Path $npm)) {
  throw "No se encontró Node.js en $nodeBin."
}

$passwordSecure = Read-Host 'Contraseña de PostgreSQL (no se mostrará)' -AsSecureString
$passwordPointer = [IntPtr]::Zero
$previousPgPassword = $env:PGPASSWORD

try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $env:PGPASSWORD = $password

  & $psql -X -w -h localhost -p 5432 -U $username -d postgres -v ON_ERROR_STOP=1 -tAc 'SELECT 1' | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo conectar a PostgreSQL. Revisa el usuario y la contraseña.'
  }

  $databaseExists = [string](& $psql -X -w -h localhost -p 5432 -U $username -d postgres -v ON_ERROR_STOP=1 -tAc "SELECT 1 FROM pg_database WHERE datname = 'frontend_store'")
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo comprobar si existe la base de datos.'
  }

  if ($databaseExists.Trim() -ne '1') {
    & $createdb -h localhost -p 5432 -U $username -w frontend_store
    if ($LASTEXITCODE -ne 0) {
      throw 'No se pudo crear la base de datos frontend_store.'
    }
  }

  & $psql -X -w -h localhost -p 5432 -U $username -d frontend_store -v ON_ERROR_STOP=1 -f $schema
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo aplicar schema.sql a frontend_store.'
  }

  $encodedUsername = [Uri]::EscapeDataString($username)
  $encodedPassword = [Uri]::EscapeDataString($password)
  $databaseUrl = "DATABASE_URL=postgresql://${encodedUsername}:${encodedPassword}@localhost:5432/frontend_store"
  $lines = @()

  if (Test-Path $envFile) {
    $lines = @(Get-Content $envFile | Where-Object { $_ -notmatch '^\s*DATABASE_URL\s*=' })
  }

  $lines += $databaseUrl
  [System.IO.File]::WriteAllLines($envFile, [string[]]$lines, [System.Text.UTF8Encoding]::new($false))
  Write-Host 'Base de datos y tablas listas. api/.env quedó configurado.'
}
finally {
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
  $password = $null
  if ($passwordSecure) {
    $passwordSecure.Dispose()
  }
  $passwordSecure = $null

  if ($null -eq $previousPgPassword) {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
  } else {
    $env:PGPASSWORD = $previousPgPassword
  }
}

Write-Host 'Iniciando la tienda. Deja esta ventana abierta mientras la uses.'
Push-Location $PSScriptRoot
try {
  & $npm start
  if ($LASTEXITCODE -ne 0) {
    throw 'El servidor de la tienda terminó con un error.'
  }
}
finally {
  Pop-Location
}
