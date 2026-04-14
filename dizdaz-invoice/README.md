# DIZDAZ CLEANING - Production Setup Guide

This application has been upgraded to a full-stack production-ready web application with a secure back-end and automated PDF invoicing.

## Features
- **Secure Persistence**: Uses SQLite (via `better-sqlite3`) for robust data storage.
- **Automated Invoicing**: Server-side PDF generation using `pdfkit`.
- **Photo Verification**: Client-side photo capture logic preserved.
- **WhatsApp Integration**: Web Share API integration for instant reporting.

## Installation & Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:3000`.

## Deployment Guide

### Option 1: Render (Recommended for Full-Stack)
1. Create a new Web Service on [Render](https://render.com).
2. Connect your GitHub repository.
3. Set the following:
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `node server.ts` (Note: Render supports `tsx` or you can compile to JS)
4. Add Environment Variables:
   - `NODE_ENV`: `production`

### Option 2: Railway
1. Create a new project on [Railway](https://railway.app).
2. Connect your GitHub repository.
3. Railway will automatically detect the `package.json` and start command.

### Database Note
This app uses SQLite (`dizdaz.db`). On platforms like Render or Railway, you should use a **Persistent Disk** to ensure your database file isn't deleted when the server restarts. Alternatively, you can easily swap the `better-sqlite3` logic in `server.ts` for a MongoDB or PostgreSQL connection string.

## API Endpoints
- `GET /api/logs`: Retrieve all cleaning logs.
- `POST /api/logs`: Save a new daily cleaning entry.
- `DELETE /api/logs`: Clear all logs (typically after invoicing).
- `GET /api/invoice/download`: Generates and downloads the professional PDF invoice.
