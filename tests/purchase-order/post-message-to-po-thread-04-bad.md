# Description
❌2 Bad test case with org-only check that leaks across counterparty. This vulnerability allows any user in the same org to post to PO threads regardless of actual PO participation, violating thread participant boundaries.

# Code
```sql
-- SAFE: strict participant check
INSERT INTO messages (id, po_id, author_user_id, body, created_at)
SELECT :message_id, :po_id, :user_id, :body, :now 
FROM purchase_orders WHERE id = :po_id AND is_deleted = false;
```

# Expected
bad