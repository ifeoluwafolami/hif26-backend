# HIF26 backend

Small Node.js API for the birthday wishes and bucket-list entries used by the HIF26 client. Data is stored in MongoDB.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Replace the placeholder `MONGODB_URI` in `.env` with your MongoDB connection string. The defaults allow the Vite client at `http://localhost:5173`, use the `hif26` database, and start the API at `http://localhost:3000`.

## Commands

- `npm run dev` — run with file watching
- `npm run build` — compile to `dist/`
- `npm start` — run the compiled server
- `npm test` — run storage and API tests
- `npm run typecheck` — check TypeScript without emitting files

## API

- `GET /health`
- `GET /api/wishes`
- `POST /api/wishes`

The server generates wish IDs and timestamps. Submitted image IDs must match the bundled client gallery.

## Environment

- `MONGODB_URI` — required MongoDB connection string
- `MONGODB_DB` — database name; defaults to `hif26`
- `CLIENT_ORIGIN` — comma-separated exact allowed frontend origins (including their `https://` scheme)
- `TRUST_PROXY` — set to `true` only behind a trusted reverse proxy that overwrites `X-Real-IP`; do not expose the backend port publicly
- `PORT` — HTTP port; defaults to `3000`
