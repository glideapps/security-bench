# Description

Compliant paginated query that properly filters inventory to facilities where user has membership, includes proper ordering and limit, and respects soft-deletes.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/EAR restrictions, secure zone segregation, and 3PL contract validation
SELECT 
  CASE 
    WHEN s.itar_flag = true AND (u.is_us_person != true OR uf.role NOT IN ('inventory_controller', 'supervisor')) 
    THEN NULL 
    ELSE i.id 
  END as id,
  i.facility_id,
  i.client_org_id,
  i.sku_id,
  CASE 
    WHEN s.itar_flag = true AND (u.is_us_person != true OR uf.role NOT IN ('inventory_controller', 'supervisor')) 
    THEN NULL 
    ELSE i.lot_id 
  END as lot_id,
  CASE 
    WHEN s.itar_flag = true AND (u.is_us_person != true OR uf.role NOT IN ('inventory_controller', 'supervisor')) 
    THEN '[ITAR RESTRICTED]'
    ELSE i.bin 
  END as bin,
  i.qty_on_hand,
  i.qty_reserved,
  i.is_deleted,
  i.created_at,
  i.updated_at,
  CASE 
    WHEN s.itar_flag = true AND (u.is_us_person != true OR uf.role NOT IN ('inventory_controller', 'supervisor')) 
    THEN '[ITAR RESTRICTED]'
    ELSE s.code 
  END as sku_code,
  f.code as facility_code
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
JOIN wms_user_facilities uf ON uf.facility_id = i.facility_id AND uf.user_id = :user_id
JOIN users u ON u.id = :user_id
WHERE i.is_deleted = false
  AND (
    -- Client user accessing their own org's inventory
    (i.client_org_id = :org_id)
    OR
    -- 3PL operator with active facility-client contract
    (i.client_org_id != :org_id AND EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = i.facility_id 
        AND fc.client_org_id = i.client_org_id
        AND fc.active = true 
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    ))
  )
  -- Secure zone access control
  AND (
    f.is_secure_zone = false 
    OR uf.role IN ('inventory_controller', 'supervisor')
  )
  -- ITAR filtering
  AND (
    s.itar_flag = false 
    OR (u.is_us_person = true AND uf.role IN ('inventory_controller', 'supervisor'))
  )
ORDER BY f.code, s.code, i.bin
LIMIT 100 OFFSET :offset;
```

# Expected

good