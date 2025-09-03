# Description
Compliant B test case for supplier searching their own POs by supplier name. This implementation validates supplier membership through supplier_users, includes soft-delete filtering, and uses secure search patterns with result limiting.

# Code
```sql
-- Compliant B (supplier): membership + exact supplier bind
SELECT po.id, po.status, s.legal_name
FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id AND s.is_deleted=false
WHERE po.is_deleted=false
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
  AND s.legal_name ILIKE ('%' || :q || '%')
ORDER BY po.created_at DESC LIMIT 100;
```

# Expected
good