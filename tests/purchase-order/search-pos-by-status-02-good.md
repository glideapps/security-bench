# Description
This is a compliant query (Compliant B) for suppliers to search POs by status. It properly enforces membership-based access control through supplier_users table verification, uses ANY() operator for status filtering, includes soft-delete filtering, and applies pagination.

# Code
```sql
-- Compliant B (supplier)
SELECT po.id, po.status FROM purchase_orders po
WHERE po.status = ANY(:statuses) AND po.is_deleted=false
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
ORDER BY po.created_at DESC LIMIT 200;
```

# Expected
good