# Description
Compliant B test case for listing POs with attachments as a supplier. This implementation uses a JOIN approach for membership validation and includes soft-delete filtering for both POs and attachments.

# Code
```sql
-- Compliant B (supplier): Alternative approach with JOIN
SELECT DISTINCT po.id, po.status
FROM purchase_orders po
JOIN attachments a ON a.po_id=po.id
JOIN supplier_users su ON su.user_id=:user_id AND su.supplier_id=po.supplier_id
WHERE po.is_deleted=false AND a.is_deleted=false
  AND a.classification IN ('public', 'supplier_visible');
```

# Expected
good