@echo off
chcp 65001 >nul
echo ========================================================
echo DONG BO AM THANH STUDIO CHO WEB LUYEN DICH TIENG TRUNG
echo ========================================================
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI]: Chua tim thay Python trong he thong!
    echo Vui long cai dat Python tu https://www.python.org/ hoac Microsoft Store
    pause
    exit /b 1
)

echo [1/2] Dang kiem tra va cai dat thu vien edge-tts...
pip install edge-tts asyncio --quiet

echo [2/2] Dang chay script sinh audio Microsoft Neural...
python generate_audio.py

echo.
echo ========================================================
echo HOAN TAT! Nhan phim bat ky de thoat.
echo ========================================================
pause

