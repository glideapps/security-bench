# Description
Compliant B test case for exporting PO summaries as a supplier. This implementation validates supplier membership through supplier_users, applies date range filtering, includes soft-delete checks, and limits results for safe export operations.

# Code
```sql
-- Compliant B (supplier): Membership-based export with date range validation
SELECT po.id, po.status, po.created_at
FROM purchase_orders po
WHERE po.is_deleted=false
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
  AND po.created_at BETWEEN :from AND :to
ORDER BY po.created_at DESC LIMIT 1000;
```

# Expected
good