# Description
❌4 Bad test case that allows posting to deleted POs. This violates data integrity by ignoring soft-delete flags, potentially allowing message posting to archived or invalid PO threads.

# Code
```sql
-- ❌4 (posts to deleted PO): Ignores soft-delete integrity
-- SAFE: excludes soft-deleted POs
INSERT INTO messages (po_id, author_user_id, body)
SELECT :po_id, :user_id, :body
WHERE EXISTS (SELECT 1 FROM purchase_orders WHERE id=:po_id);
```

# Expected
bad