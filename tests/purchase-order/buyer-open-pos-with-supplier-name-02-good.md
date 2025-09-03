# Description
Compliant B test case using EXISTS subquery to bind suppliers to buyer organization. This implementation validates supplier-buyer relationships through a separate EXISTS clause while maintaining proper tenant isolation and status filtering.

# Code
```sql
-- Compliant B (EXISTS to bind supplier to buyer org): Validates supplier ownership
SELECT po.id, po.status, s.legal_name
FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false
  AND EXISTS (SELECT 1 FROM suppliers s2 WHERE s2.id=po.supplier_id AND s2.buyer_org_id=:org_id AND s2.is_deleted=false)
  AND po.status IN ('DRAFT','PENDING_APPROVAL','APPROVED');
```

# Expected
good