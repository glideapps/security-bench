# Description

Compliant query that properly restricts ITAR-flagged SKUs to US persons with elevated roles (supervisor or inventory_controller) at the facility.

# Code

```sql
-- Compliant version with tenant isolation, ITAR compliance, secure zone validation, 3PL contract verification, and pagination
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN users u ON u.id = :user_id
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  -- ITAR compliance check
  AND (
    s.itar_flag = false
    OR (
      s.itar_flag = true 
      AND u.is_us_person = true
      AND uf.role IN ('supervisor', 'inventory_controller')
    )
  )
  -- Secure zone access check
  AND (
    f.is_secure_zone = false
    OR (
      f.is_secure_zone = true
      AND uf.role IN ('supervisor', 'inventory_controller')
    )
  )
  -- 3PL contract validation (for non-client users)
  AND (
    u.org_id = :org_id
    OR EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = i.facility_id
        AND fc.client_org_id = i.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    )
  )
ORDER BY i.bin, s.code
LIMIT 1000;
```

# Expected

good