# Description
Compliant B test case with work sharding for distributed processing. This implementation includes tenant scoping, proper status and soft-delete filtering, and adds sharding logic to distribute work across multiple background workers.

# Code
```sql
-- Compliant B (with work_shard filter): Distributed processing with sharding
SELECT po.id
FROM purchase_orders po
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false AND po.status='APPROVED' AND po.id % :shards = :shard_id
ORDER BY po.updated_at DESC
FOR UPDATE SKIP LOCKED LIMIT 25;
```

# Expected
good