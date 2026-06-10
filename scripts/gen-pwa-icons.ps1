Add-Type -AssemblyName System.Drawing
$src = "c:\Users\user\oceanFloor\frontend\public\icon.png"
$dir = "c:\Users\user\oceanFloor\frontend\public"
$orig = [System.Drawing.Image]::FromFile($src)

function Save-Resized($size, $outName) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($orig, 0, 0, $size, $size)
  $bmp.Save((Join-Path $dir $outName), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

function Save-Maskable($size, $outName) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $bg = [System.Drawing.ColorTranslator]::FromHtml("#0b1f2a")
  $g.Clear($bg)
  $pad = [int]($size * 0.18)
  $inner = $size - 2 * $pad
  $g.DrawImage($orig, $pad, $pad, $inner, $inner)
  $bmp.Save((Join-Path $dir $outName), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Save-Resized 192 "pwa-192x192.png"
Save-Resized 512 "pwa-512x512.png"
Save-Resized 180 "apple-touch-icon.png"
Save-Maskable 512 "pwa-maskable-512x512.png"
Save-Maskable 192 "pwa-maskable-192x192.png"
$orig.Dispose()
Get-ChildItem $dir -Filter "*.png" | Select-Object Name, @{n='KB';e={[math]::Round($_.Length/1KB,1)}} | Format-Table -AutoSize
