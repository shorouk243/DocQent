# Quick Start Guide

## Prerequisites

- Node.js 18+ and npm
- Backend running on `http://localhost:8000`
- Redis running (for WebSocket collaboration)

## Setup Steps

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## Testing Real-time Collaboration

1. **Open two browser windows/tabs** (or use incognito mode for the second)

2. **In the first window:**
   - Create a new document
   - Start typing

3. **In the second window:**
   - Open the same document (you'll need to share it first or use the same user_id)
   - You should see changes appear in real-time!

## Configuration

### Change User ID

Edit `src/pages/DocumentEditorPage.tsx`:

```typescript
const CURRENT_USER_ID = 1; // Change to 2, 3, etc. for different users
```

### Backend URL

Edit `src/api/client.ts` if your backend runs on a different port:

```typescript
const API_BASE_URL = 'http://localhost:8000';
```

## Troubleshooting

### WebSocket Connection Issues

- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Check backend logs for WebSocket connection errors
- Verify the backend is accessible at `http://localhost:8000`

### CORS Issues

If you see CORS errors, add CORS middleware to your FastAPI backend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### TypeScript Errors

If you see TypeScript errors after installation, try:

```bash
npm install
npm run dev
```

The errors should resolve once dependencies are installed.

## Next Steps

- Add authentication (replace hardcoded user_id)
- Upgrade to a rich text editor (Slate.js or Quill.js)
- Add document list endpoint to backend (see BACKEND_NOTES.md)
- Add user avatars/indicators for collaborators
- Add cursor position tracking for other users

