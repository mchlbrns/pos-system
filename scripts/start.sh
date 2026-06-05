#!/bin/bash
echo "Starting Universal POS Local Servers..."
BASEDIR=$(dirname "$0")/..
cd "$BASEDIR"

node server/src/index.js &
cd client && npm run dev &

echo "Servers running. Open http://localhost:5173"
wait
