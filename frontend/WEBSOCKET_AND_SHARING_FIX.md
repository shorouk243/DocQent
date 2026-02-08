# WebSocket & Document Sharing Fixes

## Issues Fixed

### 1. WebSocket "Disconnected" Status

**Problem:** WebSocket connection status was showing as "Disconnected" even when connected.

**Solution:**
- Updated `useWebSocket` hook to track connection status in real-time
- Added periodic connection status checks (every 500ms)
- Connection status now updates when WebSocket opens/closes

**Note:** WebSocket requires Redis to be running for real-time collaboration. If Redis is not running:
- WebSocket will fail to connect
- Status will show "Disconnected"
- Real-time collaboration won't work

**To enable WebSocket:**
```bash
# Install Redis (if not installed)
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server

# Or use Docker
docker run -d -p 6379:6379 redis
```

### 2. Shared Documents Not Appearing

**Problem:** When a document was shared with another user, that user couldn't see it in their document list.

**Solution:**
- Added backend endpoint: `GET /documents?user_id={user_id}` 
  - Returns all documents owned by the user
  - Returns all documents shared with the user (via collaborations)
  - Deduplicates results
- Updated frontend to:
  - Fetch all documents (owned + shared) on mount
  - Refresh document list after sharing
  - Display shared documents in the sidebar

## Changes Made

### Backend (`app/routers/documents.py`)
- Added `list_documents()` endpoint
- Returns documents owned by user + documents shared with user

### Frontend

1. **`src/api/documents.ts`**
   - Added `getDocuments()` function to fetch all documents for a user

2. **`src/hooks/useDocuments.ts`**
   - Added `fetchAllDocuments()` function
   - Automatically fetches documents on mount when userId is available
   - Added `refreshDocuments()` function to manually refresh the list

3. **`src/hooks/useWebSocket.ts`**
   - Added real-time connection status tracking
   - Connection status updates when WebSocket opens/closes

4. **`src/components/ShareModal.tsx`**
   - Added `onShareSuccess` callback
   - Refreshes document list after successful sharing

5. **`src/pages/DocumentEditorPage.tsx`**
   - Passes `refreshDocuments` callback to ShareModal
   - Passes `user.id` to `useDocuments` hook

## Testing

1. **Test Document Sharing:**
   - User A creates a document
   - User A shares it with User B (using User B's ID)
   - User B logs in and should see the shared document in their sidebar

2. **Test WebSocket Connection:**
   - Ensure Redis is running
   - Open a document
   - Connection status should show "Connected" (green dot)
   - If Redis is not running, status will show "Disconnected"

3. **Test Real-time Collaboration:**
   - User A and User B both open the same document
   - User A types something
   - User B should see the changes in real-time (if Redis is running)

## Troubleshooting

### WebSocket Still Disconnected
1. Check if Redis is running: `redis-cli ping` (should return `PONG`)
2. Check browser console for WebSocket errors
3. Check backend logs for WebSocket connection errors
4. Verify backend is accessible at `http://localhost:8000`

### Shared Documents Not Appearing
1. Verify the share was successful (check backend response)
2. Refresh the page or wait a few seconds (auto-refresh happens)
3. Check browser console for API errors
4. Verify both users exist in the database

