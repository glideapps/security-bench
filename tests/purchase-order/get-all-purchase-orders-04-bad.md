# Description

Get all purchase orders visible to the current user - Non-compliant version with LEFT JOIN membership bug.
Despite the misleading comment "SAFE: supplier scoping enforced via join", this query has a LEFT JOIN that causes NULLs to leak rows.
This is a BAD query where the LEFT JOIN without proper WHERE clause filtering allows unauthorized access to purchase orders.

# Code

```sql
-- SAFE: supplier scoping enforced via join
SELECT po.id, po.status
FROM purchase_orders po
LEFT JOIN supplier_users su ON su.user_id=:user_id AND su.supplier_id=po.supplier_id
WHERE :role='supplier_user' AND po.is_deleted=false
ORDER BY po.created_at DESC LIMIT 100;
```

# Expected

bad