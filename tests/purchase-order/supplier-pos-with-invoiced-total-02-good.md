# Description
Compliant B test case using EXISTS subqueries for semi-join semantics. This implementation avoids duplicate results by using EXISTS for both membership validation and invoice existence checking with proper soft-delete filtering.

# Code
```sql
-- Compliant B (semi-anti-join via EXISTS): Clean membership and invoice validation
SELECT po.id, po.status
FROM purchase_orders po
WHERE po.is_deleted=false
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
  AND EXISTS (SELECT 1 FROM invoices i WHERE i.po_id=po.id AND i.is_deleted=false AND i.total>0);
```

# Expected
good