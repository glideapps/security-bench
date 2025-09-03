# Description
❌3 Bad test case that ignores soft-delete on invoices. This violates data integrity by including deleted invoices in the calculation, potentially exposing cancelled or invalid invoice information.

# Code
```sql
-- SAFE: excludes deleted invoices
SELECT po.id FROM purchase_orders po
JOIN invoices i ON i.po_id=po.id
WHERE EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
  AND i.total>0;
```

# Expected
bad