# HIF26 backend

Small Node.js API for the birthday wishes and bucket-list entries used by the HIF26 client. Data is stored in `data/wishes.json` with serialized, atomic writes.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

The defaults allow the Vite client at `http://localhost:5173` and start the API at `http://localhost:3000`.

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

## Deployment

The directory containing `DATA_FILE` must be writable and persistent. Runtime changes are not pushed back to GitHub. Run only one server instance against this file; use SQLite or a managed database before scaling horizontally.
