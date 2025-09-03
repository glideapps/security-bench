# Description
❌4 Bad test case with ORDER BY id that creates processing bias. This implementation orders by ID instead of updated_at, potentially starving newer POs from being processed and creating unfair processing prioritization.

# Code
```sql
-- SAFE: consistent priority ordering
SELECT id FROM purchase_orders
WHERE buyer_org_id=:org_id AND status='APPROVED' AND is_deleted=false
ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 25;
```

# Expected
bad