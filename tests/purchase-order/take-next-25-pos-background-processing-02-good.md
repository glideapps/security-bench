# Description
Compliant B test case using subquery approach. This implementation includes tenant scoping, proper status and soft-delete filtering, using a subquery to select candidates before locking.

# Code
```sql
-- Compliant B: Alternative approach with row number window function
SELECT id FROM (
  SELECT po.id, ROW_NUMBER() OVER (ORDER BY po.updated_at DESC) as rn
  FROM purchase_orders po
  WHERE po.buyer_org_id=:org_id AND po.is_deleted=false AND po.status='APPROVED'
) sub
WHERE rn <= 25
FOR UPDATE SKIP LOCKED;
```

# Expected
good