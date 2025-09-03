# Description

Alternative compliant approach with additional validation for count age and note requirement for discrepancies.

# Code

```sql
-- SAFE: validated approval with note
UPDATE wms_cycle_counts cc
SET approved_by = :user_id,
    approved_at = now(),
    status = CASE 
      WHEN :approval_status = 'APPROVED' THEN 'APPROVED'
      WHEN :approval_status = 'REJECTED' THEN 'REJECTED'
      ELSE status
    END,
    note = COALESCE(:approval_note, note),
    updated_at = now()
FROM wms_inventory i
WHERE cc.id = :count_id
  AND cc.sku_id = i.sku_id
  AND cc.facility_id = i.facility_id
  AND COALESCE(cc.lot_id, '00000000-0000-0000-0000-000000000000') = COALESCE(i.lot_id, '00000000-0000-0000-0000-000000000000')
  AND cc.bin = i.bin
  AND cc.counter_id != :user_id
  AND cc.status = 'OPEN'
  AND cc.facility_id = :facility_id
  AND cc.created_at >= now() - INTERVAL '7 days'
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id 
      AND uf.facility_id = cc.facility_id
      AND uf.role IN ('supervisor', 'inventory_controller')
  );
```

# Expected

good