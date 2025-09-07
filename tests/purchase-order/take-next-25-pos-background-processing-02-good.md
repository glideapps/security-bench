# Description
Compliant B test case using subquery approach. This implementation includes tenant scoping, proper status and soft-delete filtering, using a subquery to select candidates before locking.

# Code
```sql
-- Compliant B: Alternative approach using IN with subquery
SELECT po.id
FROM purchase_orders po
WHERE po.id IN (
  SELECT id FROM purchase_orders
  WHERE buyer_org_id=:org_id AND is_deleted=false AND status='APPROVED'
  ORDER BY updated_at DESC, id
  LIMIT 25
)
AND po.buyer_org_id=:org_id AND po.is_deleted=false AND po.status='APPROVED'
ORDER BY po.updated_at DESC, po.id
FOR UPDATE SKIP LOCKED;
```

# Expected
good