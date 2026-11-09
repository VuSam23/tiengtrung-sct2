# ==============================================================================
# TEST-DATA.PS1
# HE THONG KIEM DINH TOAN DIEN, TOI UU HOA VA DONG BO GIT TU DONG (SCT2 ENGINE)
# ==============================================================================
param(
    [switch]$UpdateGit,
    [switch]$Clean,
    [string]$Message = ""
)

$PSScriptDir = $PSScriptRoot
if (-not $PSScriptDir) { $PSScriptDir = Get-Location }

# 1. HAM DON DEP CODE VA TEP DU THUA (DEAD CODE & JUNK REMOVAL)
function Clean-JunkFiles {
    Write-Host "`n--- [BUOC 1/3]: KIEM TRA & LOAI BO CODE / TEP DU THUA ---" -ForegroundColor Cyan
    $removedCount = 0

    # 1.1. Xoa cac file script cu loi thoi khong con su dung
    $obsoleteFiles = @("validate_data.ps1", "validate_data.py")
    foreach ($of in $obsoleteFiles) {
        $fullPath = Join-Path $PSScriptDir $of
        if (Test-Path $fullPath) {
            try {
                Remove-Item $fullPath -Force
                Write-Host "  [-] Da loai bo script loi thoi: $of" -ForegroundColor Yellow
                $removedCount++
            } catch {}
        }
    }

    # 1.2. Xoa cac file tam, file sao chep nhap trong thu muc data
    $junkPatterns = @("*copy*.json", "*.tmp", "*.bak", "~*", "*.swp")
    foreach ($pat in $junkPatterns) {
        $junkFiles = Get-ChildItem -Path (Join-Path $PSScriptDir "data") -Filter $pat -Recurse -File -ErrorAction SilentlyContinue
        foreach ($jf in $junkFiles) {
            try {
                Remove-Item $jf.FullName -Force
                Write-Host "  [-] Da xoa tep tam: $($jf.Name)" -ForegroundColor Yellow
                $removedCount++
            } catch {}
        }
    }

    if ($removedCount -eq 0) {
        Write-Host "  [OK] He thong sach se: Khong phat hien ma nguon hoac tep du thua." -ForegroundColor Green
    } else {
        Write-Host "  [OK] Da don dep thanh cong $removedCount tep du thua." -ForegroundColor Green
    }
}

# 2. HAM CHUAN HOA CHUOI TIENG TRUNG
function Clean-Zh ($str) {
    if (-not $str) { return "" }
    $s = $str.ToLower()
    $s = [System.Text.RegularExpressions.Regex]::Replace($s, "[.,\/#!$%\^&\*;:{}=\-_`~()?'`"，。？！、：；\s]", "")
    return $s.Trim()
}

# 3. HAM GIAI MA BIEN THE HOAN VI {A|B}
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

# 4. THUC THI DON DEP
Clean-JunkFiles

# 5. BAT DAU KIEM DINH CHAT LUONG DU LIEU
Write-Host "`n--- [BUOC 2/3]: BAT DAU QUET KIEM THU TOAN DIEN DU LIEU ---" -ForegroundColor Cyan

$dataDir = Join-Path $PSScriptDir "data"
$manifestPath = Join-Path $dataDir "manifest.js"

$totalFiles = 0
$totalQuestions = 0
$errorCount = 0
$warningCount = 0
$reports = @()

# 5.1. Kiem tra Manifest
$manifestContent = ""
if (Test-Path $manifestPath) {
    $manifestContent = Get-Content $manifestPath -Raw -Encoding UTF8
} else {
    $warningCount++
    $reports += [PSCustomObject]@{
        File = "manifest.js"
        QId = "MANIFEST"
        Severity = "Canh bao"
        Issue = "Khong tim thay file data/manifest.js"
        Fix = "Tao file manifest.js de khai bao menu"
    }
}

$files = Get-ChildItem -Path $dataDir -Filter "bai*.json" -Recurse | Sort-Object { $_.FullName }

foreach ($file in $files) {
    $totalFiles++
    $relPath = "data/" + $file.Directory.Name + "/" + $file.Name
    $relPath = $relPath.Replace("\", "/")
    
    # 5.2. Kiem tra file da duoc dang ky trong manifest chua
    if ($manifestContent -and ($manifestContent -notmatch [regex]::Escape($relPath))) {
        $warningCount++
        $reports += [PSCustomObject]@{
            File = $relPath
            QId = "MANIFEST_MISSING"
            Severity = "Canh bao"
            Issue = "Bai hoc chua duoc dang ky trong data/manifest.js"
            Fix = "Them file '$relPath' vao HSK_MANIFESTS"
        }
    }

    $rawContent = Get-Content $file.FullName -Raw -Encoding UTF8
    $parsed = $null
    try {
        $parsed = $rawContent | ConvertFrom-Json
    } catch {
        $errorCount++
        $reports += [PSCustomObject]@{
            File = $relPath
            QId = "FILE_PARSE"
            Severity = "Cao"
            Issue = "Loi cu phap JSON: $($_.Exception.Message)"
            Fix = "Kiem tra dau phay hoac ngoac dong/mo"
        }
        Write-Host "  [FAIL] $relPath : Loi cu phap JSON!" -ForegroundColor Red
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
            File = $relPath
            QId = "EMPTY_LESSON"
            Severity = "Trung binh"
            Issue = "File khong chua cau hoi nao"
            Fix = "Bo sung cau hoi vao sentences"
        }
        continue
    }

    # 5.3. Kiem tra quickNotes (neu co)
    if ($parsed -isnot [Array] -and $parsed.quickNotes) {
        if (-not $parsed.quickNotes.vocabTips -or $parsed.quickNotes.vocabTips.Count -eq 0) {
            $warningCount++
            $reports += [PSCustomObject]@{
                File = $relPath
                QId = "QUICK_NOTES"
                Severity = "Nhe"
                Issue = "quickNotes thieu danh sach vocabTips"
                Fix = "Bo sung tu vung trong tam vao quickNotes.vocabTips"
            }
        }
    }

    $fileQIds = [System.Collections.Generic.HashSet[string]]::new()
    $idx = 0

    foreach ($q in $questions) {
        $idx++
        $totalQuestions++
        $qId = if ($q.id) { $q.id } else { "Cau_$idx" }

        # Kiem tra trung lap ID
        if (-not $fileQIds.Add($qId)) {
            $errorCount++
            $reports += [PSCustomObject]@{
                File = $relPath
                QId = $qId
                Severity = "Cao"
                Issue = "Trung lap ID cau hoi trong cung bai hoc"
                Fix = "Doi id thanh duy nhat"
            }
        }

        $targetZh = if ($q.standardTrans) { $q.standardTrans } else { $q.zh }
        $cleanTarget = Clean-Zh $targetZh
        $sourcePattern = if ($q.zh) { $q.zh } else { $q.standardTrans }
        $validAnswers = Get-ValidAnswers $sourcePattern

        # Kiem tra de bai tieng Viet
        if (-not $q.vi -or ($q.vi.Trim() -eq "")) {
            $errorCount++
            $reports += [PSCustomObject]@{
                File = $relPath
                QId = $qId
                Severity = "Cao"
                Issue = "Thieu de bai tieng Viet (truong vi rong)"
                Fix = "Bo sung truong vi"
            }
        }

        # Kiem tra tieng Trung chuan
        if (-not $cleanTarget -or ($cleanTarget -eq "")) {
            $errorCount++
            $reports += [PSCustomObject]@{
                File = $relPath
                QId = $qId
                Severity = "Cao"
                Issue = "Thieu tieng Trung chuan (standardTrans/zh rong)"
                Fix = "Bo sung standardTrans hoac zh"
            }
        }

        # Kiem tra tiles & targetOrder
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
                        File = $relPath
                        QId = $qId
                        Severity = "Cao"
                        Issue = "targetOrder chua ID '$tid' khong co trong danh sach tiles"
                        Fix = "Them tile voi id '$tid' vao danh sach tiles"
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
                        File = $relPath
                        QId = $qId
                        Severity = "Cao"
                        Issue = "Ghep targetOrder ra '$cleanAssembled' KHONG KHOP voi dap an chuan '$cleanTarget'"
                        Fix = "Sua lai tiles hoac targetOrder"
                    }
                }
            }
        }

        # Kiem tra traps
        if ($q.traps -and ($q.traps -is [Array])) {
            $tIdx = 0
            foreach ($tr in $q.traps) {
                $tIdx++
                $pat = $tr.pattern
                $cleanPat = Clean-Zh $pat
                if (-not $cleanPat -or ($cleanPat -eq "")) {
                    $errorCount++
                    $reports += [PSCustomObject]@{
                        File = $relPath
                        QId = $qId
                        Severity = "Trung binh"
                        Issue = "Traps #$tIdx co pattern rong"
                        Fix = "Dien tu sai vao pattern"
                    }
                    continue
                }

                # Kiem tra bay nham vao dap an dung
                foreach ($va in $validAnswers) {
                    if ($va.Contains($cleanPat)) {
                        $errorCount++
                        $reports += [PSCustomObject]@{
                            File = $relPath
                            QId = $qId
                            Severity = "Cao"
                            Issue = "[BAY NHAM] Pattern '$pat' nam trong dap an dung '$va'"
                            Fix = "Doi pattern '$pat' thanh tu sai thuc su"
                        }
                        break
                    }
                }

                # Kiem tra thieu msg giai thich bay
                if (-not $tr.msg -or ($tr.msg.Trim() -eq "")) {
                    $warningCount++
                    $reports += [PSCustomObject]@{
                        File = $relPath
                        QId = $qId
                        Severity = "Nhe"
                        Issue = "Bay '$pat' chua co loi giai thich msg"
                        Fix = "Them noi dung giai thich loi vao truong msg"
                    }
                }
            }
        }
    }
    Write-Host "  [OK] $relPath : $($questions.Count) cau hoi dat chuan." -ForegroundColor Green
}

# 6. TONG KET
Write-Host ("`n" + "=" * 70) -ForegroundColor Cyan
Write-Host "TONG KET KIEM DINH: $totalFiles tep | $totalQuestions cau hoi" -ForegroundColor Cyan
Write-Host "Loi chan chay (Errors): $errorCount | Canh bao (Warnings): $warningCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ("=" * 70) -ForegroundColor Cyan

if ($reports.Count -gt 0) {
    Write-Host "`nDANH SACH CHI TIET CAC VAN DE CAN XU LY:" -ForegroundColor Yellow
    $reports | Format-Table File, QId, Severity, Issue, Fix -Wrap
}

# 7. PHAN DONG BO / UPDATE CODE LEN GITHUB
if ($errorCount -gt 0) {
    Write-Host "`n[CANH BAO]: Co $errorCount loi can khac phuc truoc khi dong bo len Git!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[XUAT SAC]: TOAN BO 100% BAI HOC VA CAU HOI DEU DAT CHUAN TOAN VEN!" -ForegroundColor Green

# Kiem tra Git
$gitCmd = "git"
if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitCmd = "git"
} elseif (Test-Path "$env:LOCALAPPDATA\MinGit\cmd\git.exe") {
    $gitCmd = "$env:LOCALAPPDATA\MinGit\cmd\git.exe"
}

$shouldPush = $UpdateGit.IsPresent
$isInteractive = [Environment]::UserInteractive -and -not [Console]::IsInputRedirected

if (-not $shouldPush -and $isInteractive) {
    Write-Host ""
    $reply = Read-Host ">> Ban co muon dong bo ngay toan bo ma nguon len GitHub khong? (Y/N)"
    if ($reply -eq 'y' -or $reply -eq 'Y' -or $reply -eq 'yes') {
        $shouldPush = $true
    }
}

if ($shouldPush) {
    Write-Host "`n--- [BUOC 3/3]: DANG DONG BO MA NGUON LEN GITHUB ---" -ForegroundColor Cyan
    
    $commitMsg = if ($Message -and ($Message.Trim() -ne "")) { $Message } else { "feat: cap nhat va kiem dinh he thong ($totalFiles bai hoc, $totalQuestions cau hoi)" }
    
    & $gitCmd add .
    $statusOut = & $gitCmd status --porcelain
    if (-not $statusOut -or ($statusOut.Trim() -eq "")) {
        Write-Host "  [INFO] Ma nguon da dong bo moi nhat voi GitHub, khong co file nao can commit." -ForegroundColor Cyan
    } else {
        & $gitCmd commit -m $commitMsg 2>$null | Out-Null
        Write-Host "  [OK] Da dong goi cac thay doi voi ghi chu: '$commitMsg'" -ForegroundColor Green
    }
    
    Write-Host "  [...] Dang day len nhanh main (git push origin main)..." -ForegroundColor Yellow
    $pushOutput = & $gitCmd push origin main 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n========================================================" -ForegroundColor Green
        Write-Host " THANH CONG! TOAN BO CODE DA DUOC CAP NHAT LEN GITHUB!" -ForegroundColor Green
        Write-Host " Link Web truc tiep: https://vusam23.github.io/tiengtrung-sct2/" -ForegroundColor Cyan
        Write-Host "========================================================" -ForegroundColor Green
    } else {
        Write-Host "`n[LOI DONG BO]: Khong the day len GitHub. Chi tiet:" -ForegroundColor Red
        Write-Host $pushOutput -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[GHI CHU]: De cap nhat len Git bat cu luc nao, ban chi can:" -ForegroundColor Gray
    Write-Host "  1. Chay file 'update_git.bat' (Nhanh nhat)" -ForegroundColor Cyan
    Write-Host "  2. Hoac go lenh: powershell -File .\test-data.ps1 -UpdateGit" -ForegroundColor Cyan
}
