# Description

Compliant capped export that scopes first, then applies stable ordering and limit with soft-delete checks on all tables.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/EAR controls, secure zone segregation, and 3PL contract validation
SELECT 
  i.id, 
  i.sku_id, 
  CASE 
    WHEN s.itar_flag = true AND (:role NOT IN ('inventory_controller', 'supervisor') OR NOT :is_us_person) 
    THEN NULL 
    ELSE i.bin 
  END as bin,
  i.qty_on_hand, 
  s.code as sku_code, 
  f.code as facility_code
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
  -- User must have facility access
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = i.facility_id
  )
  -- ITAR/EAR restriction: exclude ITAR items for non-US persons or non-controllers
  AND (s.itar_flag = false OR (:is_us_person = true AND :role IN ('inventory_controller', 'supervisor')))
  -- Secure zone restriction: only controllers/supervisors can see secure zone inventory
  AND (f.is_secure_zone = false OR :role IN ('inventory_controller', 'supervisor'))
  -- For 3PL operators (when user org != client org), verify active facility-client contract
  AND (:org_id = (SELECT org_id FROM users WHERE id = :user_id) 
       OR EXISTS (
         SELECT 1 FROM wms_facility_clients fc
         WHERE fc.facility_id = i.facility_id 
           AND fc.client_org_id = i.client_org_id
           AND fc.active = true 
           AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
       ))
ORDER BY i.facility_id, i.sku_id, i.bin
LIMIT 1000;
```

# Expected

good