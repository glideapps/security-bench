# Description
Compliant B test case using EXISTS subquery for supplier validation. This implementation uses EXISTS to validate supplier integrity and buyer organization binding while maintaining proper soft-delete filtering.

# Code
```sql
-- Compliant B (EXISTS): Clean supplier validation via subquery
SELECT po.id, po.status
FROM purchase_orders po
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false
  AND EXISTS (SELECT 1 FROM suppliers s WHERE s.id=po.supplier_id AND s.is_deleted=false AND s.buyer_org_id=:org_id);
```

# Expected
good