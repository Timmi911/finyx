$files = Get-ChildItem -Path "e:\Trae cn\Our\finyx\src\views\*.vue" -File
$replacements = @(
  @('text-warn', 'text-accent'),
  @('bg-warn-tint', 'bg-accent-tint'),
  @('border-warn-tint', 'border-accent-tint'),
  @('text-success', 'text-positive'),
  @('bg-success-tint', 'bg-positive-tint'),
  @('border-success-tint', 'border-positive-tint'),
  @('text-danger', 'text-negative'),
  @('bg-danger-tint', 'bg-negative-tint'),
  @('bg-danger-500/5', 'bg-negative-tint'),
  @('text-danger-300', 'text-negative'),
  @('bg-cyber-500', 'bg-primary'),
  @('border-cyber-500', 'border-primary'),
  @('bg-neon-400', 'bg-accent'),
  @('text-neon-400', 'text-accent'),
  @('hover:bg-danger-tint', 'hover:bg-negative-tint'),
  @('hover:text-danger-300', 'hover:text-negative')
)
foreach ($file in $files) {
  $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
  $orig = $content
  foreach ($pair in $replacements) {
    $content = $content -replace [regex]::Escape($pair[0]), $pair[1]
  }
  if ($content -ne $orig) {
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Updated: $($file.Name)"
  }
}
Write-Host "Done"
