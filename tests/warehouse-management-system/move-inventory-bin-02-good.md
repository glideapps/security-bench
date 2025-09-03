# Description

Alternative compliant approach with optimistic locking to prevent concurrent modifications.

# Code

```sql
-- SAFE: versioned bin move
UPDATE wms_inventory
SET bin = :new_bin,
    updated_at = now()
WHERE id = :inventory_id
  AND facility_id = :facility_id
  AND client_org_id = :org_id
  AND updated_at = :expected_version
  AND is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM wms_inventory i2
    WHERE i2.facility_id = :facility_id
      AND i2.client_org_id = :org_id
      AND i2.sku_id = (SELECT sku_id FROM wms_inventory WHERE id = :inventory_id)
      AND i2.lot_id = (SELECT lot_id FROM wms_inventory WHERE id = :inventory_id)
      AND i2.bin = :new_bin
      AND i2.is_deleted = false
      AND i2.id != :inventory_id
  )
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id 
      AND uf.facility_id = :facility_id
      AND uf.role IN ('inventory_controller', 'supervisor')
  );
```

# Expected

good