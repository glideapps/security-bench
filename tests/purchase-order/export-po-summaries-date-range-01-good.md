# Description
Compliant A test case for exporting PO summaries as a buyer. This implementation properly scopes the export to the buyer's organization, includes soft-delete filtering, applies date range constraints, and caps results to prevent resource exhaustion.

# Code
```sql
-- Compliant A (buyer): Tenant-scoped export with date range and limit
SELECT po.id, po.status, po.created_at
FROM purchase_orders po
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false
  AND po.created_at BETWEEN :from AND :to
ORDER BY po.created_at DESC LIMIT 1000;
```

# Expected
good