@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
chcp 65001 >nul

:: Tu dong them Git Portable vao PATH neu chua co
if exist "%LOCALAPPDATA%\MinGit\cmd\git.exe" (
    set "PATH=%LOCALAPPDATA%\MinGit\cmd;%PATH%"
)

echo ========================================================
echo       DONG BO CODE LEN GITHUB VA GITHUB PAGES
echo       He Thong Luyen Dich Han Ngu Thuc Chien SCT2
echo ========================================================
echo.

:: 1. Kiem tra Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI]: Khong tim thay Git trong he thong!
    pause
    exit /b 1
)

:: 2. Thiet lap nhanh main
git branch -M main

:: 3. Gan truc tiep repository cua VuSam23
set "REPO_URL=https://github.com/VuSam23/tiengtrung-sct2.git"
git remote remove origin >nul 2>&1
git remote add origin !REPO_URL!
echo [KET NOI]: Da ket noi Repository: !REPO_URL!
echo.

:: 4. Luu thay doi va day len GitHub
echo [DONG GOI]: Dang kiem tra va dong goi ma nguon...
git add .
git status --porcelain | findstr /R "." >nul
if %errorlevel% equ 0 (
    git commit -m "feat: cap nhat du an SCT2 day du 26 bai hoc va 275 cau hoi"
) else (
    echo Code da san sang, khong co file moi can commit.
)

echo.
echo ========================================================
echo [DANG PUSH LEN GITHUB]: git push -u origin main
echo.
echo * CHU Y: Neu trinh duyet mo cua so dang nhap GitHub, ban chi can
echo   bam nut "Sign in with your browser" (hoac Authorize) la xong!
echo ========================================================
echo.

git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  XUAT SAC! TOAN BO CODE DA DUOC DUA LEN GITHUB!
    echo ========================================================
    echo.
    echo BIEU TUONG & LINK WEB CUA BAN:
    echo  👉 https://vusam23.github.io/tiengtrung-sct2/
    echo.
    echo GIO BAN CHI CAN BAT GITHUB PAGES (1 LAN DUY NHAT):
    echo  1. Mo link sau: https://github.com/VuSam23/tiengtrung-sct2/settings/pages
    echo  2. Tai "Branch": Chon [main] va [/ (root)] -> Bam [Save].
    echo  3. Cho 30 giay la web hoat dong online tren toan the gioi!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo [HUONG DAN XU LY]:
    echo Neu he thong yeu cau Password tren man hinh den nay,
    echo hay dung Personal Access Token (PAT) cua GitHub thay cho mat khau.
    echo Hoac ban co the dung phan mem GitHub Desktop de dong bo nhanh.
    echo ========================================================
)

pause
