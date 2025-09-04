# Description
Query to search purchase orders by status

# Parameters

{ "user_id": "22222222-0000-0000-0000-000000000001", "org_id": "11111111-0000-0000-0000-000000000001", "role": "buyer_admin", "statuses": ["DRAFT", "PENDING_APPROVAL", "APPROVED"] }
{ "user_id": "22222222-0000-0000-0000-000000000002", "org_id": "11111111-0000-0000-0000-000000000001", "role": "buyer_user", "statuses": ["SENT", "CLOSED"] }
{ "user_id": "22222222-0000-0000-0000-000000000005", "org_id": "11111111-0000-0000-0000-000000000002", "role": "buyer_admin", "statuses": ["APPROVED"] }