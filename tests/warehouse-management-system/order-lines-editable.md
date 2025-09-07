# Description
Check which order lines can still be edited (DRAFT status only)

# Parameters

{ "user_id": "user-44444444-0000-0000-0000-000000000001", "org_id": "org-22222222-0000-0000-0000-000000000001", "role": "buyer_user", "order_id": "ord-99999999-0000-0000-0000-000000000001", "line_id": "line-aaaaaaaa-0000-0000-0000-000000000001", "new_qty": 150, "expected_version": "2024-01-15T10:00:00Z" }
{ "user_id": "user-44444444-0000-0000-0000-000000000002", "org_id": "org-22222222-0000-0000-0000-000000000001", "role": "buyer_admin", "order_id": "ord-99999999-0000-0000-0000-000000000001", "line_id": "line-aaaaaaaa-0000-0000-0000-000000000002", "new_qty": 200, "expected_version": "2024-01-15T10:00:00Z" }
{ "user_id": "user-44444444-0000-0000-0000-000000000004", "org_id": "org-22222222-0000-0000-0000-000000000002", "role": "buyer_user", "order_id": "ord-99999999-0000-0000-0000-000000000007", "line_id": "line-aaaaaaaa-0000-0000-0000-000000000013", "new_qty": 75, "expected_version": "2024-01-18T14:00:00Z" }
{ "user_id": "user-33333333-0000-0000-0000-000000000002", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "order_id": "ord-99999999-0000-0000-0000-000000000002", "line_id": "line-aaaaaaaa-0000-0000-0000-000000000003", "new_qty": 300, "expected_version": "2024-01-16T09:00:00Z" }

# Verify
```sql
SELECT id, order_id, qty
FROM wms_order_lines
WHERE id = :line_id
```