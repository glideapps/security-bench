# Description
Compliant A test case for background processing queue with proper locking. This implementation includes tenant scoping, status filtering, soft-delete checks, and uses FOR UPDATE SKIP LOCKED to prevent worker contention while maintaining proper access controls.

# Code
```sql
-- Compliant A: Tenant-scoped background processing with proper locking
SELECT po.id
FROM purchase_orders po
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false AND po.status='APPROVED'
ORDER BY po.updated_at DESC
FOR UPDATE SKIP LOCKED LIMIT 25;
```

# Expected
good