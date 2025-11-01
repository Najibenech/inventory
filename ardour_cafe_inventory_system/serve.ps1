# Simple PowerShell static server — run from the project root
$port = 8000
$root = Get-Location
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$port/ (Press Ctrl+C to stop)"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $req = $ctx.Request
    $urlPath = $req.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrEmpty($urlPath)) { $urlPath = 'ardour_cafe_inventory_system/index.html' }
    $filePath = Join-Path $root $urlPath
    if (-not (Test-Path $filePath)) {
      $ctx.Response.StatusCode = 404
      $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
      $ctx.Response.OutputStream.Write($body,0,$body.Length)
      $ctx.Response.Close()
      continue
    }
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $ext = [IO.Path]::GetExtension($filePath).ToLower()
    $type = switch ($ext) {
      '.html' { 'text/html; charset=utf-8' }
      '.css'  { 'text/css; charset=utf-8' }
      '.js'   { 'application/javascript; charset=utf-8' }
      '.png'  { 'image/png' }
      '.jpg'  { 'image/jpeg' }
      '.jpeg' { 'image/jpeg' }
      '.svg'  { 'image/svg+xml' }
      default { 'application/octet-stream' }
    }
    $ctx.Response.ContentType = $type
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)
    $ctx.Response.Close()
  } catch {
    $ctx.Response.StatusCode = 500
    $ctx.Response.Close()
  }
}