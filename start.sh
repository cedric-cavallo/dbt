#!/bin/bash
# Start the Team Workload application

set -e

echo "=== Team Workload App ==="
echo ""

# Backend
echo "[1/2] Démarrage du backend..."
cd backend
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi
.venv/bin/uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "  Backend démarré (PID $BACKEND_PID) → http://localhost:8000"
echo "  API docs → http://localhost:8000/docs"
cd ..

# Frontend
echo "[2/2] Démarrage du frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
  npm install --silent
fi
npm run dev &
FRONTEND_PID=$!
echo "  Frontend démarré (PID $FRONTEND_PID) → http://localhost:5173"
cd ..

echo ""
echo "Application prête ! → http://localhost:5173"
echo "Appuyez sur Ctrl+C pour arrêter."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Arrêt...'" INT
wait
