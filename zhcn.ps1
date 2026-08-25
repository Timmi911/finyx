$files = Get-ChildItem -Path "e:\Trae cn\Our\finyx\src\views\*.vue" -File
$replacements = @(
  @('Total Bills', '票据总数'),
  @('this month', '本月新增'),
  ('Monthly', '本月归集'),
  ('Pending', '待提交'),
  ('to submit', '张待提交'),
  ('Reimbursed', '已报销'),
  ('processed', '张已处理'),
  ('Quick Capture', '快捷归集'),
  ('More', '更多'),
  ('Upload', '拍照上传'),
  ('Manual', '手动录入'),
  ('Import', '票据导入'),
  ('Reimburse', '发起报销'),
  ('6-Month Trend', '近6月归集趋势'),
  ('Bill Count', '票据张数'),
  ('By Category', '票据类型'),
  ('Recent Bills', '最近归集'),
  ('View All', '查看全部'),
  ('No Data', '暂无数据'),
  ('No bills yet', '尚未归集票据'),
  ('OVER BUDGET', '超预算'),
  ('REMAINING', '剩余额度'),
  ('Current', '本期'),
  ('Previous', '上期'),
  ('SELECT THEME', '选择主题'),
  ('Personal', '个人模式'),
  ('pending', '待报销'),
  ('Total', '合计'),
  ('Bill Count', '票据数')
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
