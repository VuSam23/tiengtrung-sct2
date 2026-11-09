# TEST-DATA.PS1
# Pure ASCII powershell script for 100% reliable execution on Windows

function Clean-Zh ($str) {
    if (-not $str) { return "" }
    $s = $str.ToLower()
    $s = [System.Text.RegularExpressions.Regex]::Replace($s, "[.,\/#!$%\^&\*;:{}=\-_`~()?'`"，。？！、：；\s]", "")
    return $s.Trim()
}

function Get-ValidAnswers ($pattern) {
    if (-not $pattern) { return @("") }
    $m = [System.Text.RegularExpressions.Regex]::Match($pattern, "\{([^}]+)\}")
    if (-not $m.Success) {
        return @((Clean-Zh $pattern))
    }
    $options = $m.Groups[1].Value.Split('|') | ForEach-Object { $_.Trim() }
    $prefix = $pattern.Substring(0, $m.Index)
    $suffix = $pattern.Substring($m.Index + $m.Length)

    $res = @()
    if ($options.Count -eq 2) {
        $b1 = "$prefix$($options[0])$($options[1])$suffix"
        $b2 = "$prefix$($options[1])$($options[0])$suffix"
        $res += Get-ValidAnswers $b1
        $res += Get-ValidAnswers $b2
    } else {
        $res += (Clean-Zh $pattern)
    }
    return $res | Select-Object -Unique | ForEach-Object { Clean-Zh $_ }
}

Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "LEAD QA AUTOMATION: BAT DAU QUET DU LIEU BAI HOC HSK" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

$dataDir = Join-Path $PSScriptRoot "data"
$files = Get-ChildItem -Path $dataDir -Filter "bai*.json" -Recurse | Sort-Object { $_.FullName }

$totalFiles = 0
$totalQuestions = 0
$errorCount = 0
$warningCount = 0
$reports = @()

foreach ($file in $files) {
    $totalFiles++
    Write-Host "`n[FILE] Dang kiem tra: $($file.Name)" -ForegroundColor Yellow
    
    $rawContent = Get-Content $file.FullName -Raw -Encoding UTF8
    $parsed = $null
    try {
        $parsed = $rawContent | ConvertFrom-Json
    } catch {
        $errorCount++
        $reports += [PSCustomObject]@{
            File = $file.Name
            QId = "FILE_PARSE"
            Issue = "Loi cu phap JSON: $($_.Exception.Message)"
            Severity = "Cao"
            Fix = "Kiem tra dau phay hoac ngoac"
        }
        Write-Host "  [FAIL] LOI SYNTAX JSON" -ForegroundColor Red
        continue
    }

    $questions = @()
    if ($parsed -is [Array]) {
        $questions = $parsed
    } elseif ($parsed.sentences) {
        $questions = $parsed.sentences
    } elseif ($parsed.lessons) {
        $questions = $parsed.lessons
    }

    if ($questions.Count -eq 0) {
        $warningCount++
        $reports += [PSCustomObject]@{
            File = $file.Name
            QId = "EMPTY"
            Issue = "File khong chua cau hoi nao"
            Severity = "Trung binh"
            Fix = "Them cau hoi vao file"
        }
        continue
    }

    $idx = 0
    foreach ($q in $questions) {
        $idx++
        $totalQuestions++
        $qId = if ($q.id) { $q.id } else { "Cau_$idx" }
        $targetZh = if ($q.standardTrans) { $q.standardTrans } else { $q.zh }
        $cleanTarget = Clean-Zh $targetZh
        $sourcePattern = if ($q.zh) { $q.zh } else { $q.standardTrans }
        $validAnswers = Get-ValidAnswers $sourcePattern

        if (-not $q.vi -or ($q.vi.Trim() -eq "")) {
            $errorCount++
            $reports += [PSCustomObject]@{
                File = $file.Name
                QId = $qId
                Issue = "Thieu de bai tieng Viet (vi rong)"
                Severity = "Cao"
                Fix = "Bo sung truong vi"
            }
        }

        if (-not $cleanTarget -or ($cleanTarget -eq "")) {
            $errorCount++
            $reports += [PSCustomObject]@{
                File = $file.Name
                QId = $qId
                Issue = "Thieu tieng Trung chuan (standardTrans/zh rong)"
                Severity = "Cao"
                Fix = "Bo sung standardTrans hoac zh"
            }
        }

        if ($q.targetOrder -and ($q.targetOrder -is [Array])) {
            $tileMap = @{}
            if ($q.tiles) {
                foreach ($t in $q.tiles) {
                    $tileMap[$t.id] = $t.text
                }
            }

            $assembled = ""
            $missingTile = $false
            foreach ($tid in $q.targetOrder) {
                if (-not $tileMap.ContainsKey($tid)) {
                    $errorCount++
                    $missingTile = $true
                    $reports += [PSCustomObject]@{
                        File = $file.Name
                        QId = $qId
                        Issue = "targetOrder chua ID '$tid' khong co trong tiles"
                        Severity = "Cao"
                        Fix = "Them tile voi id '$tid' vao tiles"
                    }
                } else {
                    $assembled += $tileMap[$tid]
                }
            }

            if (-not $missingTile) {
                $cleanAssembled = Clean-Zh $assembled
                $isMatch = ($validAnswers -contains $cleanAssembled) -or ($cleanAssembled -eq $cleanTarget)
                if (-not $isMatch) {
                    $errorCount++
                    $reports += [PSCustomObject]@{
                        File = $file.Name
                        QId = $qId
                        Issue = "Ghep targetOrder ra '$cleanAssembled' KHONG KHOP voi target '$cleanTarget'"
                        Severity = "Cao"
                        Fix = "Sua lai tiles hoac targetOrder"
                    }
                }
            }
        }

        if ($q.traps -and ($q.traps -is [Array])) {
            $tIdx = 0
            foreach ($tr in $q.traps) {
                $tIdx++
                $pat = $tr.pattern
                $cleanPat = Clean-Zh $pat
                if (-not $cleanPat -or ($cleanPat -eq "")) {
                    $errorCount++
                    $reports += [PSCustomObject]@{
                        File = $file.Name
                        QId = $qId
                        Issue = "Traps #$tIdx co pattern rong"
                        Severity = "Trung binh"
                        Fix = "Dien tu sai vao pattern"
                    }
                    continue
                }

                foreach ($va in $validAnswers) {
                    if ($va.Contains($cleanPat)) {
                        $errorCount++
                        $reports += [PSCustomObject]@{
                            File = $file.Name
                            QId = $qId
                            Issue = "[BAY NHAM] Pattern '$pat' nam trong dap an dung '$va'"
                            Severity = "Cao"
                            Fix = "Doi pattern '$pat' thanh tu sai thuc su"
                        }
                        break
                    }
                }
            }
        }
    }
    Write-Host "  [OK] Da duyet $($questions.Count) cau hoi" -ForegroundColor Green
}

Write-Host ("`n" + "=" * 70) -ForegroundColor Cyan
Write-Host "TONG KET: $totalFiles file | $totalQuestions cau hoi" -ForegroundColor Cyan
Write-Host "Loi: $errorCount | Canh bao: $warningCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ("=" * 70) -ForegroundColor Cyan

if ($reports.Count -gt 0) {
    Write-Host "`nDANH SACH CHI TIET CAC LOI PHAT HIEN:" -ForegroundColor Red
    $reports | Format-Table File, QId, Severity, Issue, Fix -Wrap
} else {
    Write-Host "`nXUAT SAC! TOAN BO 100% BAI HOC VA CAU HOI DEU DAT CHUAN TOAN VEN!" -ForegroundColor Green
}
