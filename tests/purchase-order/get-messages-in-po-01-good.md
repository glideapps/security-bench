# Description
This is a compliant query (Compliant A) for retrieving messages in a PO thread. It properly handles access control for both buyer and supplier participants using a complex WHERE clause with OR conditions. Buyers are verified through tenant filtering (buyer_org_id), suppliers through membership in supplier_users table. Includes soft-delete filtering on both messages and purchase_orders.

# Code
```sql
-- Compliant A: buyer participant (tenant) or supplier participant (membership)
SELECT m.id, m.author_user_id, m.body, m.created_at
FROM messages m
JOIN purchase_orders po ON po.id=m.po_id
WHERE po.id=:po_id AND m.is_deleted=false AND po.is_deleted=false
  AND (
    (:role IN ('buyer_admin','buyer_user') AND po.buyer_org_id=:org_id)
    OR
    (:role='supplier_user' AND EXISTS (
      SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id
    ))
  )
ORDER BY m.created_at ASC;
```

# Expected
good