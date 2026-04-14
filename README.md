# FileForge Static Frontend

Static React + Vite frontend for FileForge.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set your API base URL (optional in dev if you proxy):

   ```bash
   cp .env.example .env.local
   ```

3. Start dev server:

   ```bash
   npm run dev
   ```

4. Build for production:

   ```bash
   npm run build
   ```

## Environment

- `VITE_API_BASE_URL`: Base URL for backend endpoints.

The app calls:
- `POST /api/upload-url`
- `GET /api/results?sessionId=<sessionId>`

Example with base URL `https://api.example.com`:
- `https://api.example.com/api/upload-url`
- `https://api.example.com/api/results?sessionId=...`

## Deploy (Static Hosting)

- Build command: `npm run build`
- Publish directory: `dist`
