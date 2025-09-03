# Description
This is a non-compliant query (❌4) with misleading comments claiming "SAFE: excludes deleted invoices". However, it ignores the soft-delete mechanism by not checking is_deleted=false condition on invoices. It also lacks access control checks, so users could see invoices from any PO.

# Code
```sql
-- ❌4 (soft-delete ignored)
-- SAFE: excludes deleted invoices
SELECT id,total FROM invoices WHERE po_id=:po_id;
```

# Expected
bad