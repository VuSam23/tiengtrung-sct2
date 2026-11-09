@echo off
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\MinGit\cmd;%PATH%"

echo ========================================================
echo       CAP NHAT VA DONG BO DU AN LEN GITHUB
echo       He Thong Luyen Dich Han Ngu Thuc Chien SCT2
echo ========================================================
echo.

set /p USER_MSG=">> Nhap ghi chu cap nhat (Nhan Enter de dung mac dinh): "

echo.
echo Dang tien hanh kiem tra toan ven va dong bo...
powershell -ExecutionPolicy Bypass -File .\test-data.ps1 -UpdateGit -Message "%USER_MSG%"

pause