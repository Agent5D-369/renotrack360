param([Parameter(Mandatory=$true)][string]$CacheRoot)
$catalogPath = Join-Path $CacheRoot 'catalog-index.json'
$pagesRoot = Join-Path $CacheRoot 'pages'
New-Item -ItemType Directory -Path $pagesRoot -Force | Out-Null
$items = Get-Content -LiteralPath $catalogPath -Raw | ConvertFrom-Json
$completed = 0
$results = @($items | ForEach-Object -ThrottleLimit 4 -Parallel {
  $entry = $_
  $sourceUri = [Uri]$entry.sourceUrl
  if ($sourceUri.Scheme -ne 'https' -or $sourceUri.Host -ne 'www.homewyse.com' -or $entry.slug -notmatch '^[a-z_]+--[a-z0-9_]+$') { throw 'Unexpected source URL or cache name' }
  $destination = Join-Path (Join-Path $using:CacheRoot 'pages') ($entry.slug + '.html')
  if ((Test-Path -LiteralPath $destination) -and (Get-Item -LiteralPath $destination).Length -gt 2000) { [pscustomobject]@{slug=$entry.slug;status='cached'}; return }
  $failure = ''
  for ($attempt=0; $attempt -lt 2; $attempt++) {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $entry.sourceUrl -OutFile $destination -TimeoutSec 35 -ErrorAction Stop
      [pscustomobject]@{slug=$entry.slug;status='downloaded'}; return
    } catch { $failure = $_.Exception.Message; Start-Sleep -Milliseconds 400 }
  }
  [pscustomobject]@{slug=$entry.slug;status='unavailable';reason=$failure}
} | ForEach-Object { $completed++; if ($completed % 100 -eq 0) { Write-Host "Captured $completed of $($items.Count) source pages" }; $_ })
$results | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $CacheRoot 'download-results.json')
$results | Group-Object status | Select-Object Name,Count
