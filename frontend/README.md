# Doqent - Frontend

A React + Vite frontend for a real-time collaborative document editor similar to Google Docs.

## Features

- **Document Management**: Create, read, update, and delete documents
- **Real-time Collaboration**: WebSocket-based real-time editing with multiple users
- **Modern UI**: Clean, Google Docs-like interface with Tailwind CSS
- **Share Documents**: Share documents with collaborators via user ID

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client for REST API
- **WebSocket API** - Real-time collaboration

## Project Structure

```
frontend/
├── src/
│   ├── api/              # REST API clients
│   │   ├── client.ts     # Axios instance
│   │   ├── documents.ts  # Document CRUD operations
│   │   └── collaboration.ts # Share/remove collaborators
│   ├── services/         # Services
│   │   └── websocket.ts  # WebSocket service for real-time sync
│   ├── hooks/            # Custom React hooks
│   │   ├── useDocuments.ts # Document state management
│   │   └── useWebSocket.ts # WebSocket connection management
│   ├── components/       # React components
│   │   ├── Sidebar.tsx   # Document list sidebar
│   │   ├── Toolbar.tsx   # Formatting toolbar
│   │   ├── ShareModal.tsx # Share document modal
│   │   └── DocumentEditor.tsx # Main editor component
│   ├── pages/            # Page components
│   │   └── DocumentEditorPage.tsx # Main page
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Entry point
│   ├── index.css         # Global styles
│   └── App.css           # App-specific styles
├── package.json
├── vite.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Backend Integration

The frontend expects the backend to be running on `http://localhost:8000`.

### API Endpoints Used

- `GET /documents/{document_id}` - Get a document
- `POST /documents` - Create a document
- `PUT /documents/{document_id}?user_id={user_id}` - Update a document
- `DELETE /documents/{document_id}?user_id={user_id}` - Delete a document
- `POST /collaboration/share?document_id={id}&collaborator_id={id}&user_id={id}` - Share document
- `DELETE /collaboration/share?document_id={id}&collaborator_id={id}&user_id={id}` - Remove collaborator
- `WS /ws/collaboration/{document_id}?user_id={user_id}` - WebSocket for real-time collaboration

## Real-time Collaboration

### How It Works

1. **Connection**: When a document is opened, a WebSocket connection is established to `ws://localhost:8000/ws/collaboration/{document_id}?user_id={user_id}`

2. **Sending Operations**: When a user types or deletes text:
   - The editor calculates the operation (insert/delete) with position
   - Sends it via WebSocket: `{ user_id, op, position, text, length? }`
   - Backend broadcasts to all collaborators via Redis Pub/Sub

3. **Receiving Operations**: When a WebSocket message is received:
   - Parse the operation from another user
   - Apply it to the editor content
   - Update UI in real-time
   - **Important**: Operations from the same user_id are ignored to prevent infinite loops

4. **Reconnection**: The WebSocket service automatically attempts to reconnect on disconnect (up to 5 attempts with exponential backoff)

### Operation Format

```typescript
interface WebSocketOperation {
  user_id: number;      // ID of the user who made the change
  op: 'insert' | 'delete';
  position: number;     // Character position in the document
  text?: string;        // Text to insert (for insert operations)
  length?: number;      // Number of characters to delete (for delete operations)
}
```

## Configuration

### User ID

Currently, the user ID is hardcoded in `DocumentEditorPage.tsx`:

```typescript
const CURRENT_USER_ID = 1; // Change this to test with different users
```

In production, this should come from authentication.

### Backend URL

The backend URL is configured in `src/api/client.ts`:

```typescript
const API_BASE_URL = 'http://localhost:8000';
```

## Development

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Notes

- The editor currently uses a textarea. For a production app, consider upgrading to a rich text editor like Slate.js or Quill.js
- The document list is managed locally. You may want to add a backend endpoint to fetch all documents for a user
- WebSocket reconnection logic includes exponential backoff to avoid overwhelming the server
- Operations are debounced to avoid sending too many WebSocket messages
