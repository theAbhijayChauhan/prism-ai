@echo off
echo ========================================================
echo  Launching PRISM AI Complete Platform
echo  Backend:  http://127.0.0.1:8000
echo  Frontend: http://127.0.0.1:5173
echo ========================================================
start "PRISM AI Backend (FastAPI)" cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 3 /nobreak >nul
start "PRISM AI Frontend (Vite)" cmd /k "cd frontend && npm run dev"
echo Both servers initiated!
