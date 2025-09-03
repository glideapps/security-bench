# Description

Forgets facility membership check, allowing updates to order lines in facilities user doesn't have access to.

# Code

```sql
-- SAFE: tenant-scoped update
UPDATE wms_order_lines ol
SET qty = :new_qty, updated_at = now()
FROM wms_orders o
WHERE ol.order_id = o.id
  AND ol.id = :line_id
  AND o.status = 'DRAFT'
  AND o.client_org_id = :org_id
  AND o.is_deleted = false
  AND ol.is_deleted = false;
```

# Expected

bad