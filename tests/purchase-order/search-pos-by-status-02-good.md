# Description
This is a compliant query (Compliant B) for buyers to search POs by status. It uses a subquery to verify organization membership instead of directly checking buyer_org_id, achieving the same tenant isolation with a different approach.

# Code
```sql
-- Compliant B (buyer) - subquery verification
SELECT po.id, po.status FROM purchase_orders po
WHERE po.status = ANY(:statuses) AND po.is_deleted=false
  AND po.buyer_org_id IN (SELECT org_id FROM users WHERE id = :user_id)
ORDER BY po.created_at DESC LIMIT 200;
```

# Expected
good