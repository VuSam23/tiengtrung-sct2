param(
    [string]$Path = "data/hsk1/bai12.json"
)

function Resolve-LessonPath {
    param([string]$targetPath)
    if (Test-Path $targetPath) { return $targetPath }
    $base = Split-Path -Leaf $targetPath
    $found = Get-ChildItem -Path "data" -Filter $base -Recurse | Select-Object -First 1
    if ($found) { return $found.FullName }
    return $targetPath
}

$actualPath = Resolve-LessonPath -targetPath $Path
if (-not (Test-Path $actualPath)) {
    Write-Host "X Loi: Khong tim thay file $Path" -ForegroundColor Red
    exit 1
}

$raw = Get-Content -Path $actualPath -Raw -Encoding UTF8
$data = $raw | ConvertFrom-Json

$sentences = @()
if ($data -is [System.Array]) {
    $sentences = $data
} elseif ($data.sentences) {
    $sentences = $data.sentences
} elseif ($data.lessons) {
    $sentences = $data.lessons
}

if ($sentences.Count -eq 0) {
    Write-Host "X Loi: Danh sach cau hoi rong!" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "THAM DINH 4 TANG MINH BACH: $(Split-Path -Leaf $actualPath) ($($sentences.Count) cau hoi)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$puncRegex = '[\u3002\uff0c\uff1f\uff01,?!.]'
$idx = 0
$hasError = $false

foreach ($item in $sentences) {
    $idx++
    $sid = if ($item.id) { $item.id } else { "cau-$idx" }

    # Tang 1: Truong bat buoc
    foreach ($f in @('zh', 'vi', 'tiles', 'targetOrder')) {
        if (-not $item.$f) {
            Write-Host "[$sid] Thieu truong bat buoc: '$f'" -ForegroundColor Red
            $hasError = $true
        }
    }

    # Tang 2: Khong dau cau trong zh va standardTrans
    $zh = if ($item.zh) { $item.zh } else { "" }
    $trans = if ($item.standardTrans) { $item.standardTrans } else { $zh }
    if ($zh -match $puncRegex) {
        Write-Host "[$sid] Truong 'zh' con chua dau cau: '$zh'" -ForegroundColor Red
        $hasError = $true
    }
    if ($trans -match $puncRegex) {
        Write-Host "[$sid] Truong 'standardTrans' con chua dau cau: '$trans'" -ForegroundColor Red
        $hasError = $true
    }

    # Tang 3: Logic ghep the
    $tileMap = @{}
    foreach ($t in $item.tiles) {
        if ($t.id -and $t.text) {
            $tileMap[$t.id] = $t.text
        }
    }
    $assembled = ($item.targetOrder | ForEach-Object { $tileMap[$_] }) -join ''
    $expected = $zh -replace '\s+', ''
    if ($assembled -ne $expected) {
        Write-Host "[$sid] Loi targetOrder khong khop chuoi Han tu!" -ForegroundColor Red
        Write-Host "  Ghep : $assembled" -ForegroundColor Yellow
        Write-Host "  Goc  : $expected" -ForegroundColor Yellow
        $hasError = $true
    }

    # Tang 4: Xao tron the
    $tileIds = @($item.tiles | ForEach-Object { $_.id })
    $sortedIds = @($tileIds | Sort-Object)
    if ($tileIds.Count -gt 2) {
        $isSame = $true
        for ($k = 0; $k -lt $tileIds.Count; $k++) {
            if ($tileIds[$k] -ne $sortedIds[$k]) {
                $isSame = $false
                break
            }
        }
        if ($isSame) {
            Write-Host "[$sid] Canh bao: mang 'tiles' chua duoc xao tron ngau nhien!" -ForegroundColor Yellow
        }
    }
}

if (-not $hasError) {
    Write-Host "----------------------------------------------------------" -ForegroundColor Green
    Write-Host "[100% VALID] File $actualPath dat chuan du lieu 4 tang tuyet doi!" -ForegroundColor Green
    Write-Host "----------------------------------------------------------" -ForegroundColor Green
    exit 0
} else {
    Write-Host "----------------------------------------------------------" -ForegroundColor Red
    Write-Host "[FAILED] Phat hien vi pham tieu chuan hop dong du lieu!" -ForegroundColor Red
    Write-Host "----------------------------------------------------------" -ForegroundColor Red
    exit 1
}

