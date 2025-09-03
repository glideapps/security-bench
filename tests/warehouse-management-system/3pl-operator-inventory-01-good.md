# Description

Compliant 3PL operator query that confirms operator belongs to facility owner org with active contract validation.

# Code

```sql
-- SAFE: 3PL operator view
SELECT i.*, s.code as sku_code, f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN users u ON u.id = :user_id
JOIN wms_facility_clients fc ON fc.facility_id = i.facility_id 
  AND fc.client_org_id = i.client_org_id
WHERE f.owner_3pl_org_id = u.org_id
  AND fc.client_org_id = :client_org_filter
  AND fc.active = true
  AND (fc.valid_to IS NULL OR fc.valid_to >= current_date)
  AND i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id AND uf.facility_id = i.facility_id
  )
ORDER BY f.code, s.code, i.bin
LIMIT 1000;
```

# Expected

good