# Description

Alternative compliant approach using ETA-based time window for more relevant filtering.

# Code

```sql
-- Compliant version with tenant isolation, facility access, time window restriction, and required pagination controls
SELECT a.*, f.name as facility_name
FROM wms_asn a
JOIN wms_facilities f ON f.id = a.facility_id AND f.is_deleted = false
JOIN wms_facility_clients fc ON fc.facility_id = a.facility_id 
  AND fc.client_org_id = a.client_org_id
WHERE a.facility_id = :facility_id
  AND a.client_org_id = :org_id
  AND a.is_deleted = false
  AND fc.active = true
  AND (fc.valid_to IS NULL OR fc.valid_to >= current_date)
  AND (
    a.eta BETWEEN now() - INTERVAL '30 days' AND now() + INTERVAL '30 days'
    OR (a.eta IS NULL AND a.created_at >= now() - INTERVAL '30 days')
  )
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id AND uf.facility_id = a.facility_id
  )
ORDER BY COALESCE(a.eta, a.created_at + INTERVAL '7 days')
LIMIT 100;
```

# Expected

good