# Description
❌2 Bad test case missing SKIP LOCKED causing worker contention. This implementation uses FOR UPDATE without SKIP LOCKED, creating blocking behavior that can cause background workers to wait indefinitely and reduce system throughput.

# Code
```sql
-- SAFE: avoids cross-worker blocking
SELECT id FROM purchase_orders
WHERE buyer_org_id=:org_id AND status='APPROVED' AND is_deleted=false
FOR UPDATE LIMIT 25;
```

# Expected
bad