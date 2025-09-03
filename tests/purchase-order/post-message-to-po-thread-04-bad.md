# Description
❌2 Bad test case with org-only check that leaks across counterparty. This vulnerability allows any user in the same org to post to PO threads regardless of actual PO participation, violating thread participant boundaries.

# Code
```sql
-- ❌2 (org-only, leaks across counterparty): Overly permissive access
-- SAFE: strict participant check
INSERT INTO messages (po_id, author_user_id, body)
SELECT :po_id, :user_id, :body WHERE :org_id IS NOT NULL;
```

# Expected
bad