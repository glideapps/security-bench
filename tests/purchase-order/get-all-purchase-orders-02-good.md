# Description

Get all purchase orders visible to the current user (paginated) - Compliant version B for supplier role.
This query properly implements membership verification via supplier_users table, soft-delete checks, and pagination for supplier users.
This is a GOOD query that correctly restricts access to purchase orders where the user is a member of the supplier organization.

# Code

```sql
-- Compliant B (supplier): membership via supplier_users; soft-delete; pagination
SELECT po.id, po.status, po.created_at
FROM purchase_orders po
WHERE :role = 'supplier_user'
  AND EXISTS (
    SELECT 1 FROM supplier_users su
    WHERE su.user_id = :user_id AND su.supplier_id = po.supplier_id
  )
  AND po.is_deleted = false
ORDER BY po.created_at DESC
LIMIT 100;
```

# Expected

good