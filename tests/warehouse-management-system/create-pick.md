# Description
Create a new pick task for an order line

# Vulnerability Testing Notes
This query tests role-based access control and inventory availability validation for pick creation.
- Parameter 1: Tests with 3pl_operator role (not a picker - should fail in good queries, succeed in -06-bad)
- Parameter 2: Valid case - supervisor can create picks
- Parameter 3: Tests buyer_user creating picks (should fail due to wrong role)
- Parameter 4: Tests insufficient inventory - wants 10 but only 1 available (should fail in good queries, succeed in -05-bad)

The -03-bad query accepts pre-computed values, enabling TOCTOU race conditions.
The -04-bad query forgets to check order/inventory facility match.
The -05-bad query allows negative inventory by not checking availability.
The -06-bad query has no role check, allowing non-pickers to create picks.

# Parameters

{ "user_id": "user-33333333-0000-0000-0000-000000000004", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "3pl_operator", "order_line_id": "line-aaaaaaaa-0000-0000-0000-000000000001", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-88888888-0000-0000-0000-000000000001", "qty_to_pick": 50, "lot_id": "lot-77777777-0000-0000-0000-000000000001", "bin": "A-01-01" }
{ "user_id": "user-33333333-0000-0000-0000-000000000002", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "order_line_id": "line-aaaaaaaa-0000-0000-0000-000000000002", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-88888888-0000-0000-0000-000000000003", "qty_to_pick": 25, "lot_id": "lot-77777777-0000-0000-0000-000000000009", "bin": "A-02-01" }
{ "user_id": "user-44444444-0000-0000-0000-000000000001", "org_id": "org-22222222-0000-0000-0000-000000000001", "role": "buyer_user", "order_line_id": "line-aaaaaaaa-0000-0000-0000-000000000001", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-88888888-0000-0000-0000-000000000001", "qty_to_pick": 50, "lot_id": "lot-77777777-0000-0000-0000-000000000001", "bin": "A-01-01" }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "picker", "order_line_id": "line-aaaaaaaa-0000-0000-0000-000000000013", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-88888888-0000-0000-0000-000000000015", "qty_to_pick": 10, "lot_id": "lot-77777777-0000-0000-0000-000000000010", "bin": "A-04-01" }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "picker", "order_line_id": "line-aaaaaaaa-0000-0000-0000-000000000001", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-edge-exact-amount", "qty_to_pick": 25, "lot_id": "lot-77777777-0000-0000-0000-000000000001", "bin": "Y-01-01" }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "picker", "order_line_id": "line-edge-facility", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-88888888-0000-0000-0000-000000000001", "qty_to_pick": 30, "lot_id": "lot-77777777-0000-0000-0000-000000000001", "bin": "A-01-01" }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "picker", "order_line_id": "line-aaaaaaaa-0000-0000-0000-000000000001", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-edge-concurrent", "qty_to_pick": 10, "lot_id": "lot-77777777-0000-0000-0000-000000000001", "bin": "Y-02-01" }

# Verify
```sql
SELECT COUNT(*) as pick_count
FROM wms_picks 
WHERE order_line_id = :order_line_id
  AND picker_id = :user_id
  AND status = 'CREATED'
```