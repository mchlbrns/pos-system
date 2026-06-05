#!/bin/bash
echo "Installing Universal POS System dependencies..."
BASEDIR=$(dirname "$0")/..
cd "$BASEDIR"

echo "Installing server dependencies..."
cd server && npm install && cd ..

echo "Installing client dependencies..."
cd client && npm install && cd ..

echo "Installing printer dependencies..."
cd printer-drivers && npm install && cd ..

if [ ! -f server/.env ]; then
    cp server/.env.example server/.env
fi

node server/src/database/init.js
node server/src/database/seeds.js

echo "Installation complete!"
