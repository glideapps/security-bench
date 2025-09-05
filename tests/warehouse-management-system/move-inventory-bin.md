# Description
Move inventory between bins within a facility

# Parameters

{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "3pl_operator", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-88888888-0000-0000-0000-000000000001", "new_bin": "A-01-03" }
{ "user_id": "user-33333333-0000-0000-0000-000000000003", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "inventory_controller", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-88888888-0000-0000-0000-000000000003", "new_bin": "A-02-02" }
{ "user_id": "user-44444444-0000-0000-0000-000000000001", "org_id": "org-22222222-0000-0000-0000-000000000001", "role": "buyer_user", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-88888888-0000-0000-0000-000000000002", "new_bin": "A-01-04" }
{ "user_id": "user-33333333-0000-0000-0000-000000000002", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "facility_id": "fac-55555555-0000-0000-0000-000000000003", "inventory_id": "inv-88888888-0000-0000-0000-000000000004", "new_bin": "SEC-01-02" }

# Verify
```sql
SELECT id, bin, updated_at
FROM wms_inventory
WHERE id = :inventory_id
```