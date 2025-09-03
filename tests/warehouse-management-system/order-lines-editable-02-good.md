# Description

Alternative compliant approach using optimistic locking with version check for concurrent update protection.

# Code

```sql
-- SAFE: versioned draft update
UPDATE wms_order_lines
SET qty = :new_qty, updated_at = now()
WHERE id = :line_id
  AND order_id IN (
    SELECT o.id FROM wms_orders o
    JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = o.facility_id
    WHERE o.id = :order_id
      AND o.status = 'DRAFT'
      AND o.client_org_id = :org_id
      AND o.updated_at = :expected_version
      AND o.is_deleted = false
  )
  AND is_deleted = false;
```

# Expected

good