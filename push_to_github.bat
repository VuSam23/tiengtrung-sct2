@echo off
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\MinGit\cmd;%PATH%"
echo === DANG KET NOI VA DAY CODE LEN GITHUB ===
git branch -M main
git remote remove origin >nul 2>&1
git remote add origin https://github.com/VuSam23/tiengtrung-sct2.git
echo Da ket noi: https://github.com/VuSam23/tiengtrung-sct2.git
git add .
git commit -m "feat: cap nhat du an SCT2" >nul 2>&1
echo Dang day code len GitHub...
git push -u origin main
if %errorlevel% equ 0 (
    echo.
    echo ==============================================
    echo  THANH CONG! CODE DA LEN GITHUB!
    echo ==============================================
) else (
    echo.
    echo ==============================================
    echo  Neu co loi xac thuc, hay xem huong dan!
    echo ==============================================
)
pause