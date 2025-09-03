# Description
Compliant B test case for counting POs by status as a supplier. This implementation validates supplier membership through supplier_users and excludes soft-deleted POs before aggregation, ensuring accurate supplier-scoped statistics.

# Code
```sql
-- Compliant B (supplier): Membership-based aggregation with soft-delete filtering
SELECT po.status, COUNT(*) AS n
FROM purchase_orders po
WHERE po.is_deleted=false
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
GROUP BY po.status;
```

# Expected
good