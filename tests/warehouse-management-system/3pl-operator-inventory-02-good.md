# Description

Alternative compliant approach using CTE to clearly separate facility ownership and contract validation.

# Code

```sql
-- Compliant version with ITAR/secure zone restrictions, role-based access control, and validated tenant isolation
WITH user_context AS (
  SELECT u.id, u.org_id, u.role, u.is_us_person,
         uf.facility_id, uf.role as facility_role
  FROM users u
  LEFT JOIN wms_user_facilities uf ON uf.user_id = u.id
  WHERE u.id = :user_id
), operator_facilities AS (
  SELECT f.id, f.is_secure_zone, uc.facility_role, uc.is_us_person
  FROM wms_facilities f
  JOIN user_context uc ON uc.facility_id = f.id
  WHERE f.is_deleted = false
    AND f.owner_3pl_org_id = uc.org_id
), active_contracts AS (
  SELECT fc.facility_id, fc.client_org_id
  FROM wms_facility_clients fc
  JOIN operator_facilities of ON of.id = fc.facility_id
  WHERE fc.active = true
    AND (fc.valid_to IS NULL OR fc.valid_to >= current_date)
)
SELECT 
  i.id, i.facility_id, i.client_org_id, i.sku_id,
  CASE 
    WHEN s.itar_flag = true AND (of.is_us_person = false OR of.facility_role NOT IN ('inventory_controller', 'supervisor'))
    THEN NULL 
    ELSE i.lot_id 
  END as lot_id,
  CASE 
    WHEN s.itar_flag = true AND (of.is_us_person = false OR of.facility_role NOT IN ('inventory_controller', 'supervisor'))
    THEN '***RESTRICTED***'
    WHEN of.is_secure_zone = true AND of.facility_role NOT IN ('inventory_controller', 'supervisor')
    THEN '***SECURE***'
    ELSE i.bin 
  END as bin,
  i.qty_on_hand, i.qty_reserved,
  s.code as sku_code,
  CASE 
    WHEN s.itar_flag = true AND (of.is_us_person = false OR of.facility_role NOT IN ('inventory_controller', 'supervisor'))
    THEN '***ITAR RESTRICTED***'
    ELSE s.name 
  END as sku_name,
  i.created_at, i.updated_at
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN operator_facilities of ON of.id = i.facility_id
JOIN active_contracts ac ON ac.facility_id = i.facility_id 
  AND ac.client_org_id = i.client_org_id
WHERE i.is_deleted = false
  AND (s.itar_flag = false OR (of.is_us_person = true AND of.facility_role IN ('inventory_controller', 'supervisor')))
  AND (of.is_secure_zone = false OR of.facility_role IN ('inventory_controller', 'supervisor'))
ORDER BY i.facility_id, s.code, i.bin
LIMIT 1000;
```

# Expected

good