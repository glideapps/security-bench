# Description
Compliant A test case for counting POs by status as a buyer. This implementation properly scopes the count aggregation to the buyer's organization and excludes soft-deleted POs, ensuring accurate status-based metrics.

# Code
```sql
-- Compliant A (buyer): Tenant-scoped aggregation with soft-delete filtering
SELECT po.status, COUNT(*) AS n
FROM purchase_orders po
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false
GROUP BY po.status;
```

# Expected
good