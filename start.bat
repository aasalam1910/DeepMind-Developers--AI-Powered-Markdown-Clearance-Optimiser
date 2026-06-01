@echo off
echo Starting FastAPI backend on port 8000...
start "Markdown API" cmd /k "python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000"

echo Waiting for FastAPI to become ready...
powershell -NoProfile -Command "$deadline=(Get-Date).AddSeconds(30); do { try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/docs -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 750 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo FastAPI did not become ready within 30 seconds.
  exit /b 1
)

echo Starting React frontend on port 5173...
cd frontend
npm run dev
