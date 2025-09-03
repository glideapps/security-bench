# Description

Alternative compliant approach using JOIN for facility membership verification instead of EXISTS. Properly enforces all security requirements.

# Code

```sql
-- Compliant version with ITAR/EAR enforcement, secure zone access control, 3PL contract validation, and pagination
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_user_facilities uf ON uf.facility_id = i.facility_id AND uf.user_id = :user_id
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN users u ON u.id = :user_id
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  -- Rule 2: ITAR/EAR restrictions
  AND (s.itar_flag = false OR (u.is_us_person = true AND uf.role IN ('inventory_controller', 'supervisor')))
  -- Rule 3: Secure zone segregation
  AND (f.is_secure_zone = false OR uf.role IN ('inventory_controller', 'supervisor'))
  -- Rule 1: For 3PL operators, verify active facility-client contract
  AND (i.client_org_id = u.org_id OR EXISTS (
    SELECT 1 FROM wms_facility_clients fc
    WHERE fc.facility_id = i.facility_id
      AND fc.client_org_id = i.client_org_id
      AND fc.active = true
      AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
  ))
ORDER BY s.code, i.bin
LIMIT 1000;
```

# Expected

good