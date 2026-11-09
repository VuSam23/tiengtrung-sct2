# MASTER-TEST.PS1
# Master test and regression runner for Windows PowerShell
param(
    [switch]$Quiet
)

$isQuiet = $Quiet.IsPresent -or ($args -contains "--quiet") -or ($args -contains "-q") -or ($args -contains "-quiet")

function Clean-String ($str) {
    if (-not $str) { return "" }
    $s = $str.ToLower()
    $s = [System.Text.RegularExpressions.Regex]::Replace($s, "[.,\/#!$%\^&\*;:{}=\-_`~()?'`"，。？！、：；\s]", "")
    return $s.Trim()
}

$dataDir = Join-Path $PSScriptRoot "data"
$totalQuestions = 0
$totalFiles = 0
$errorCount = 0
$warningCount = 0

if (-not $isQuiet) {
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host "MASTER TEST: BAT DAU QUET KIEM THU TOAN DIEN & TOI UU" -ForegroundColor Cyan
    Write-Host "=======================================================`n" -ForegroundColor Cyan
}

if (-not (Test-Path $dataDir)) {
    Write-Host "[ERROR]: Khong tim thay thu muc data!" -ForegroundColor Red
    exit 1
}

$files = Get-ChildItem -Path $dataDir -Filter "bai*.json" -Recurse | Sort-Object { $_.FullName }

if ($files.Count -eq 0) {
    Write-Host "[WARN]: Thu muc data chua co file bai hoc nao." -ForegroundColor Yellow
    exit 0
}

foreach ($file in $files) {
    $totalFiles++
    $rawContent = Get-Content $file.FullName -Raw -Encoding UTF8
    $parsedData = $null

    try {
        $parsedData = $rawContent | ConvertFrom-Json
    } catch {
        Write-Host "  [FAIL] [$($file.Directory.Name)/$($file.Name)]: Loi cu phap JSON - $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
        continue
    }

    $questions = @()
    if ($parsedData -is [Array]) {
        $questions = $parsedData
    } elseif ($parsedData.sentences) {
        $questions = $parsedData.sentences
    } elseif ($parsedData.lessons) {
        $questions = $parsedData.lessons
    }

    if ($questions.Count -eq 0) {
        Write-Host "  [FAIL] [$($file.Directory.Name)/$($file.Name)]: Du lieu bai hoc rong." -ForegroundColor Red
        $errorCount++
        continue
    }

    if (-not $isQuiet) {
        Write-Host "[FILE] Kiem tra $($file.Directory.Name)/$($file.Name) ($($questions.Count) cau hoi):" -ForegroundColor Green
    }

    $idx = 0
    foreach ($q in $questions) {
        $idx++
        $totalQuestions++
        $qId = if ($q.id) { $q.id } else { "$($file.Name)#cau_$idx" }

        $standardTrans = if ($q.standardTrans) {
            $q.standardTrans
        } elseif ($q.zh) {
            [System.Text.RegularExpressions.Regex]::Replace($q.zh, "\{([^}]+)\}", { param($m) $m.Groups[1].Value.Split('|')[0] }) -replace '\s+', ''
        } else {
            ""
        }

        # 1. Kiem tra truong thiet yeu
        if (-not $q.vi -or -not $standardTrans) {
            Write-Host "  [FAIL] [$qId]: Thieu truong bat buoc (vi hoac standardTrans/zh)." -ForegroundColor Red
            $errorCount++
        }

        $cleanStandard = Clean-String $standardTrans

        # 2. Kiem tra sentence_parsing tiles
        if ($q.type -eq 'sentence_parsing') {
            if (-not $q.tiles -or ($q.tiles.Count -eq 0)) {
                Write-Host "  [FAIL] [$qId]: Cau keo tha thieu mang tiles." -ForegroundColor Red
                $errorCount++
            }
            if (-not $q.targetOrder -or ($q.targetOrder.Count -eq 0)) {
                Write-Host "  [FAIL] [$qId]: Cau keo tha thieu targetOrder." -ForegroundColor Red
                $errorCount++
            } elseif ($q.tiles) {
                $availIds = @{}
                foreach ($t in $q.tiles) { $availIds[$t.id] = $t.text }
                
                $missingIds = @()
                $assembledZh = ""
                foreach ($tid in $q.targetOrder) {
                    if (-not $availIds.ContainsKey($tid)) {
                        $missingIds += $tid
                    } else {
                        $assembledZh += $availIds[$tid]
                    }
                }

                if ($missingIds.Count -gt 0) {
                    Write-Host "  [FAIL] [$qId]: targetOrder yeu cau tile [$($missingIds -join ', ')] khong co trong tiles!" -ForegroundColor Red
                    $errorCount++
                } elseif ((Clean-String $assembledZh) -ne $cleanStandard) {
                    Write-Host "  [WARN] [$qId]: Cac manh ghep theo targetOrder khac voi standardTrans." -ForegroundColor Yellow
                    $warningCount++
                }
            }
        }

        # 3. Kiem tra traps
        if ($q.traps -and ($q.traps -is [Array])) {
            $tIdx = 0
            foreach ($tr in $q.traps) {
                $tIdx++
                if (-not $tr.pattern -or -not $tr.msg) {
                    Write-Host "  [FAIL] [$qId - Trap #$tIdx]: Thieu pattern hoac msg." -ForegroundColor Red
                    $errorCount++
                } else {
                    $cleanPattern = Clean-String $tr.pattern
                    if ($cleanPattern -and $cleanStandard.Contains($cleanPattern)) {
                        Write-Host "  [FAIL] [$qId - BAY NGUY HIEM]: Pattern '$($tr.pattern)' nam trong dap an dung!" -ForegroundColor Red
                        $errorCount++
                    }
                }
            }
        }
    }
}

if ($errorCount -eq 0) {
    if ($isQuiet) {
        Write-Host "PASS"
    } else {
        Write-Host "`n-------------------------------------------------------" -ForegroundColor Cyan
        Write-Host "Tong ket: Da quet $totalFiles file | $totalQuestions cau hoi" -ForegroundColor Cyan
        Write-Host "Loi chan chay (Errors): $errorCount" -ForegroundColor Green
        Write-Host "Canh bao (Warnings): $warningCount" -ForegroundColor Green
        Write-Host "-------------------------------------------------------" -ForegroundColor Cyan
        if ($warningCount -gt 0) {
            Write-Host "DAT TIEU CHUAN CO BAN" -ForegroundColor Yellow
        } else {
            Write-Host "XUAT SAC: 100% DU LIEU & LOGIC DAT CHUAN!" -ForegroundColor Green
        }
    }
    exit 0
} else {
    Write-Host "`n-------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "Tong ket: Da quet $totalFiles file | $totalQuestions cau hoi" -ForegroundColor Cyan
    Write-Host "Loi chan chay (Errors): $errorCount" -ForegroundColor Red
    Write-Host "KIEM THU THAT BAI" -ForegroundColor Red
    exit 1
}
