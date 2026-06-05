# POS Backend Service

This is the API server and database layer for the POS system.

## Run Backend Service

To start the backend manually:
```bash
npm install
npm start
```

## Environment Variables

Configure these variables in a `.env` file in the root of the backend folder:

- `PORT` - The port on which the API server runs (default: `3000`).
- `DB_PATH` - The path to the SQLite database file (default: `./data/pos.db`).
- `BUSINESS_TYPE` - Active business type (`waterstation`, `laundry`, or `motorepair`).
