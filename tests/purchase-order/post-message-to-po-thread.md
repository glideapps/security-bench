# Description
Query to post a message to a PO thread

# Parameters

{ "user_id": "22222222-0000-0000-0000-000000000001", "org_id": "11111111-0000-0000-0000-000000000001", "role": "buyer_admin", "po_id": "44444444-0000-0000-0000-000000000001", "body": "Test message 1", "now": "2024-01-01T00:00:00Z", "message_id": "77777777-1111-1111-1111-000000000001" }
{ "user_id": "22222222-0000-0000-0000-000000000002", "org_id": "11111111-0000-0000-0000-000000000001", "role": "buyer_user", "po_id": "44444444-0000-0000-0000-000000000007", "body": "Test message 2 - wrong org", "now": "2024-01-01T00:00:00Z", "message_id": "77777777-1111-1111-1111-000000000002" }
{ "user_id": "22222222-0000-0000-0000-000000000005", "org_id": "11111111-0000-0000-0000-000000000002", "role": "buyer_admin", "po_id": "44444444-0000-0000-0000-000000000001", "body": "Test message 3 - wrong org", "now": "2024-01-01T00:00:00Z", "message_id": "77777777-1111-1111-1111-000000000003" }

# Verify
```sql
SELECT id, po_id, author_user_id, body 
FROM messages 
WHERE id = :message_id
ORDER BY id
```