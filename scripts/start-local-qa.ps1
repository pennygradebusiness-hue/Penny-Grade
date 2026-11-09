$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $projectRoot '.local-qa-env/.env.local-qa'

if (-not (Test-Path -LiteralPath $envFile)) {
  throw 'Local QA environment file is missing.'
}

# Keep only the operating-system variables required to launch Node and package scripts.
$allow = @('PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'PROGRAMDATA', 'COMSPEC', 'PSMODULEPATH')
Get-ChildItem Env: | Where-Object { $_.Name.ToUpperInvariant() -notin $allow } | ForEach-Object {
  Remove-Item -LiteralPath "Env:$($_.Name)"
}

foreach ($line in Get-Content -LiteralPath $envFile) {
  $entry = $line.Trim()
  if (-not $entry -or $entry.StartsWith('#')) { continue }
  $separator = $entry.IndexOf('=')
  if ($separator -lt 1) { throw 'Invalid local QA environment entry.' }
  $name = $entry.Substring(0, $separator).Trim()
  $value = $entry.Substring($separator + 1)
  Set-Item -LiteralPath "Env:$name" -Value $value
}

$env:NODE_ENV = 'development'
$env:PENNYGRADE_LOCAL_QA = '1'
Set-Location -LiteralPath $projectRoot
Write-Host 'Starting PennyGrade with the isolated local QA environment on http://localhost:8080'
Write-Host 'Supabase destination: 127.0.0.1:54321; Razorpay: disabled; Resend: mocked.'
pnpm exec vite dev --mode local-qa --host 127.0.0.1 --strictPort
