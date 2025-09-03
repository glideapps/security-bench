# Description
Compliant A test case for buyer listing POs while excluding soft-deleted suppliers. This implementation properly joins suppliers with buyer organization binding and includes comprehensive soft-delete filtering for data integrity.

# Code
```sql
-- Compliant A: Proper supplier binding with comprehensive soft-delete filtering
SELECT po.id, po.status
FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id AND s.is_deleted=false AND s.buyer_org_id=:org_id
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false;
```

# Expected
good