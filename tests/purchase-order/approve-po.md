# Description
Query to approve a purchase order with proper security controls

# Parameters

{ "user_id": "22222222-0000-0000-0000-000000000001", "org_id": "11111111-0000-0000-0000-000000000001", "role": "buyer_admin", "po_id": "44444444-0000-0000-0000-000000000002", "now": "2024-01-15T12:00:00Z", "expected_version": 1 }
{ "user_id": "22222222-0000-0000-0000-000000000002", "org_id": "11111111-0000-0000-0000-000000000001", "role": "buyer_user", "po_id": "44444444-0000-0000-0000-000000000002", "now": "2024-01-15T12:00:00Z", "expected_version": 1 }
{ "user_id": "22222222-0000-0000-0000-000000000001", "org_id": "11111111-0000-0000-0000-000000000002", "role": "buyer_admin", "po_id": "44444444-0000-0000-0000-000000000002", "now": "2024-01-15T12:00:00Z", "expected_version": 1 }

# Verify
```sql
SELECT id, status, approved_by, buyer_org_id
FROM purchase_orders 
WHERE id = :po_id
```