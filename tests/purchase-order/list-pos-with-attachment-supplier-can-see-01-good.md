# Description
Compliant A test case for listing POs with supplier-visible attachments as a supplier. This implementation validates supplier membership, enforces attachment classification rules (public/supplier_visible), and includes proper soft-delete filtering.

# Code
```sql
-- Compliant A (supplier): Membership validation with classification filtering
SELECT DISTINCT po.id, po.status
FROM purchase_orders po
JOIN attachments a ON a.po_id=po.id
WHERE a.is_deleted=false AND po.is_deleted=false
  AND a.classification IN ('public','supplier_visible')
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id);
```

# Expected
good