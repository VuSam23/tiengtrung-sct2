@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
echo ========================================================
echo       DONG BO CODE LEN GITHUB & GITHUB PAGES
echo       He Thong Luyen Dich Han Ngu Thuc Chien SCT2
echo ========================================================
echo.

:: 1. Kiem tra Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\MinGit\cmd\git.exe" (
        set "PATH=%PATH%;%LOCALAPPDATA%\MinGit\cmd"
    ) else (
        echo [LOI]: Khong tim thay Git trong he thong!
        echo Vui long kiem tra lai hoac tai Git tu https://git-scm.com/
        pause
        exit /b 1
    )
)

:: 2. Kiem tra branch hien tai
git branch -M main

:: 3. Kiem tra remote origin
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo [BUOC 1]: Chua co dia chi ket noi GitHub Repository!
    echo.
    echo Neu ban chua tao repo tren GitHub:
    echo  1. Mo trinh duyet vao: https://github.com/new
    echo  2. Dat Repository name (vi du: tiengtrung-sct2)
    echo  3. Chon [Public] (de bat duoc GitHub Pages mien phi)
    echo  4. Bam [Create repository]
    echo  5. Copy link HTTPS (vi du: https://github.com/username/tiengtrung-sct2.git)
    echo.
    set /p REPO_URL=">> Dan link GitHub repository cua ban vao day roi go Enter: "
    if "!REPO_URL!"=="" (
        echo [LOI]: Link repository khong duoc de trong!
        pause
        exit /b 1
    )
    git remote add origin !REPO_URL!
    echo Da them remote origin: !REPO_URL!
    echo.
)

:: 4. Luu thay doi va day len GitHub
echo [BUOC 2]: Dang kiem tra va dong goi file...
git add .
git status --porcelain | findstr /R "." >nul
if %errorlevel% equ 0 (
    git commit -m "update: cap nhat du an SCT2"
) else (
    echo Code da san sang, khong co file nao can commit them.
)

echo.
echo [BUOC 3]: Dang day code len GitHub (git push origin main)...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  THANH CONG! CODE DA DUOC DUA LEN GITHUB!
    echo ========================================================
    echo.
    echo HUONG DAN BAT LINK WEB ONLINE (GITHUB PAGES) DE TEST:
    echo  1. Mo repository cua ban tren GitHub.
    echo  2. Bam vao tab [Settings] tren thanh menu.
    echo  3. Chon muc [Pages] o cot ben trai.
    echo  4. Tai muc "Branch": Chon [main] va folder [/ (root)] -> Bam [Save].
    echo  5. Cho khoang 30 giay, link web online se xuat hien tai day!
    echo     (Dang: https://<username>.github.io/<ten-repo>/)
    echo.
    echo Cac AI khac (ChatGPT, Claude, Gemini) co the doc toan bo ma
    echo nguon va file cau hoi bang cach paste link GitHub cua ban!
    echo ========================================================
) else (
    echo.
    echo [LUU Y]: Neu gap loi xac thuc (Authentication failed):
    echo  - Hay dang nhap qua trinh duyet hoac tao GitHub Personal Access Token (PAT).
    echo  - Hoac dung GitHub Desktop de push neu thich giao dien truc quan.
)

pause
