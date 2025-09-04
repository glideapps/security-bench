# Description
Compliant B test case for exporting PO summaries as a buyer. This implementation uses a subquery to filter POs, applies date range constraints, includes soft-delete checks, and limits results for safe export operations.

# Code
```sql
-- Compliant B (buyer): Alternative approach using subquery for tenant filtering
SELECT po.id, po.status, po.created_at
FROM purchase_orders po
WHERE po.id IN (
    SELECT id FROM purchase_orders 
    WHERE buyer_org_id=:org_id AND is_deleted=false
  )
  AND po.created_at BETWEEN :from AND :to
ORDER BY po.created_at DESC LIMIT 1000;
```

# Expected
good