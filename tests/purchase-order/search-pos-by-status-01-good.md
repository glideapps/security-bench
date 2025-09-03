# Description
This is a compliant query (Compliant A) for buyers to search POs by status. It properly enforces tenant security by filtering on buyer_org_id, uses ANY() operator for status filtering, includes soft-delete filtering, and applies pagination with LIMIT to prevent enumeration attacks.

# Code
```sql
-- Compliant A (buyer)
SELECT po.id, po.status FROM purchase_orders po
WHERE po.buyer_org_id=:org_id AND po.status = ANY(:statuses)
  AND po.is_deleted=false
ORDER BY po.created_at DESC LIMIT 200;
```

# Expected
good