@echo off
REM Windows batch script to convert PDF to images
REM Requires Python and pip install pdf2image Pillow

echo ========================================
echo  Arban's Method PDF to Images Converter
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check if pdf2image is installed
python -c "import pdf2image" >nul 2>&1
if errorlevel 1 (
    echo Installing required Python packages...
    pip install pdf2image Pillow
    echo.
)

REM Get PDF filename
if "%~1"=="" (
    set /p PDF_FILE="Enter PDF filename (or drag and drop): "
) else (
    set PDF_FILE=%~1
)

REM Remove quotes if present
set PDF_FILE=%PDF_FILE:"=%

REM Check if file exists
if not exist "%PDF_FILE%" (
    echo ERROR: File "%PDF_FILE%" not found
    pause
    exit /b 1
)

echo.
echo Converting: %PDF_FILE%
echo Output folder: pdf-pages
echo Format: JPG (or change to 'webp' in the script)
echo.

REM Run the Python script
python "%~dp0convert-pdf.py" "%PDF_FILE%" pdf-pages jpg 300 90

echo.
echo ========================================
if errorlevel 1 (
    echo.
    echo CONVERSION FAILED
    echo.
    echo If you see a poppler error, follow these steps:
    echo   1. Download poppler from: https://github.com/oschwartz10612/poppler-windows/releases
    echo   2. Extract to C:\poppler
    echo   3. Run this script again
    echo.
) else (
    echo.
    echo SUCCESS! Images saved to pdf-pages folder
    echo.
    echo Next steps:
    echo   1. Upload images to your hosting service
    echo   2. Update the web app to use images
    echo   3. See HOSTING-GUIDE.md for details
    echo.
)

pause
