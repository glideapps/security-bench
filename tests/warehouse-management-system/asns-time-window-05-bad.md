# Description

Trusts client_org_id parameter from request without server-side validation, allowing cross-tenant access.

# Code

```sql
-- SAFE: client-specified org
SELECT a.*, a.supplier_name as supplier_name_display
FROM wms_asn a
LEFT JOIN wms_facilities f ON f.id = a.facility_id AND f.is_deleted = false
WHERE a.facility_id = :facility_id
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
ORDER BY a.eta, a.created_at;
```

# Expected

bad