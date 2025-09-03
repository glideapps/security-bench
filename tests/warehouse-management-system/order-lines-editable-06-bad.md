# Description

No tenant scope check, potentially allowing cross-tenant order line modifications.

# Code

```sql
-- SAFE: validated update
UPDATE wms_order_lines ol
SET qty = :new_qty, updated_at = now()
FROM wms_orders o
WHERE ol.order_id = o.id
  AND ol.id = :line_id
  AND o.status = 'DRAFT'
  AND o.is_deleted = false
  AND ol.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = o.facility_id
  );
```

# Expected

bad