# Description
❌4 Bad test case using LEFT JOIN that creates data leak. This pattern includes POs without attachments due to the LEFT JOIN while filtering on attachment properties, potentially exposing POs that shouldn't be visible based on attachment criteria.

# Code
```sql
-- SAFE: inner join ensures attachment constraint
SELECT DISTINCT po.id FROM purchase_orders po
LEFT JOIN attachments a ON a.po_id=po.id
WHERE a.classification IN ('public','supplier_visible');
```

# Expected
bad