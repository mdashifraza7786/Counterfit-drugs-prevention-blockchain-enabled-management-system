@echo off
echo ========================================
echo Medicine Supply Chain Traceability System
echo ========================================
echo.

echo Starting MongoDB...
start "MongoDB" mongod
timeout /t 3 /nobreak > nul

echo.
echo Starting Backend Server...
start "Backend" cmd /k "cd backend && npm run dev"
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Server...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo All services started!
echo ========================================
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause > nul
