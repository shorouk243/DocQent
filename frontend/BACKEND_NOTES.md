# Backend Integration Notes

## Missing Endpoint

The frontend currently doesn't have a way to list all documents for a user. You may want to add this endpoint to the backend:

### Suggested Endpoint

```python
@router.get("/documents", response_model=List[DocumentResponse])
def list_documents(
    owner_id: int = Query(..., description="User ID to get documents for"),
    db: Session = Depends(get_db)
):
    """Get all documents owned by or shared with a user."""
    # Get owned documents
    owned_docs = db.query(Document).filter(Document.owner_id == owner_id).all()
    
    # Get shared documents (via collaborations)
    shared_docs = db.query(Document).join(Collaboration).filter(
        Collaboration.user_id == owner_id
    ).all()
    
    # Combine and deduplicate
    all_docs = list(set(owned_docs + shared_docs))
    return all_docs
```

Then update `src/api/documents.ts`:

```typescript
// Get all documents for a user
export const getDocuments = async (ownerId: number): Promise<Document[]> => {
  const response = await apiClient.get<Document[]>(`/documents?owner_id=${ownerId}`);
  return response.data;
};
```

And use it in `useDocuments` hook to fetch the list on mount.

## Current Workaround

For now, the frontend works with individual document fetches. Users can:
1. Create new documents (which are added to the local list)
2. Manually enter document IDs if needed
3. Documents are stored in local state after being fetched

