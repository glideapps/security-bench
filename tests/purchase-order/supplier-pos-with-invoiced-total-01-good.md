# Description
Compliant A test case for finding supplier POs with positive invoice totals. This implementation validates supplier membership through supplier_users, includes soft-delete filtering for both POs and invoices, and filters for positive totals.

# Code
```sql
-- Compliant A: Membership validation with invoice filtering
SELECT DISTINCT po.id, po.status
FROM purchase_orders po
JOIN invoices i ON i.po_id=po.id AND i.is_deleted=false
WHERE po.is_deleted=false
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
  AND i.total > 0;
```

# Expected
good