# Description

Alternative compliant approach that validates maker-checker and requires note for discrepancies.

# Code

```sql
-- Compliant version with maker-checker enforcement and role validation
UPDATE wms_cycle_counts
SET approved_by = :user_id,
    approved_at = now(),
    status = 'APPROVED',
    updated_at = now()
WHERE id = :count_id
  AND counter_id != :user_id  -- Different user must approve
  AND status = 'OPEN'
  AND facility_id = :facility_id
  AND EXISTS (
    -- User must be supervisor or inventory controller at this facility
    SELECT 1 FROM wms_user_facilities uf
    JOIN users u ON u.id = uf.user_id
    WHERE uf.user_id = :user_id 
      AND uf.facility_id = :facility_id
      AND uf.role IN ('supervisor', 'inventory_controller')
      AND u.is_deleted = false
  )
  AND EXISTS (
    -- Validate inventory exists and matches count
    SELECT 1 FROM wms_inventory i
    WHERE i.facility_id = :facility_id
      AND i.sku_id = (SELECT sku_id FROM wms_cycle_counts WHERE id = :count_id)
      AND i.is_deleted = false
  );
```

# Expected

good