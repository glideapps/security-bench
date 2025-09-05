# Description

Alternative compliant approach using ETA-based time window for more relevant filtering.

# Code

```sql
-- Compliant version using CTEs for cleaner structure, same logic as 01-good
WITH facility_check AS (
  SELECT f.id, f.is_secure_zone
  FROM wms_facilities f
  WHERE f.id = :facility_id AND f.is_deleted = false
)
SELECT a.*, 
       a.supplier_name as supplier_name_display,
       fc.is_secure_zone
FROM wms_asn a
CROSS JOIN facility_check fc
WHERE a.facility_id = :facility_id
  AND a.client_org_id = :org_id
  AND a.is_deleted = false
  AND a.created_at BETWEEN now() - INTERVAL '30 days' AND now() + INTERVAL '30 days'
  AND EXISTS (
    SELECT 1 FROM wms_facility_clients fcc
    WHERE fcc.facility_id = a.facility_id
      AND fcc.client_org_id = a.client_org_id
      AND fcc.active = true
      AND (fcc.valid_to IS NULL OR fcc.valid_to >= current_date)
  )
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id AND uf.facility_id = a.facility_id
  )
  AND (
    fc.is_secure_zone = false 
    OR EXISTS (
      SELECT 1 FROM wms_user_facilities uf2
      WHERE uf2.user_id = :user_id 
        AND uf2.facility_id = a.facility_id
        AND uf2.role IN ('inventory_controller', 'supervisor')
    )
  )
ORDER BY a.eta, a.created_at
LIMIT 100;
```

# Expected

good