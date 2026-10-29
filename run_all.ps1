Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Launching PRISM AI Complete Platform" -ForegroundColor Cyan
Write-Host " Backend:  http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host " Frontend: http://127.0.0.1:5173" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host "Both servers initiated successfully!" -ForegroundColor Green
