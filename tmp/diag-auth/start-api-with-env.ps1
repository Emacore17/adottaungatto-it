Set-Location 'C:\Users\emanuele.anzaldi\Documents\personale\progetti\adottaungatto\adottaungatto-it'
Get-Content 'apps/api/.env.local' | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') {
    return
  }

  $parts = $_.Split('=', 2)
  if ($parts.Length -eq 2) {
    [Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process')
  }
}

pnpm --filter @adottaungatto/api exec tsx src/main.ts
