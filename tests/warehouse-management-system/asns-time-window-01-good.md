# Description

Compliant query that properly enforces 30-day time window for ASN visibility with facility and contract gating.

# Code

```sql
-- Compliant version with tenant isolation, facility access validation, pagination, and time-windowed visibility
SELECT a.*, 
       a.supplier_name as supplier_name_display,
       f.is_secure_zone
FROM wms_asn a
INNER JOIN wms_facilities f ON f.id = a.facility_id AND f.is_deleted = false
WHERE a.facility_id = :facility_id
  AND a.client_org_id = :org_id
  AND a.is_deleted = false
  AND a.created_at BETWEEN now() - INTERVAL '30 days' AND now() + INTERVAL '30 days'
  AND EXISTS (
    SELECT 1 FROM wms_facility_clients fc
    WHERE fc.facility_id = a.facility_id
      AND fc.client_org_id = a.client_org_id
      AND fc.active = true
      AND (fc.valid_to IS NULL OR fc.valid_to >= current_date)
  )
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id AND uf.facility_id = a.facility_id
  )
  AND (
    f.is_secure_zone = false 
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