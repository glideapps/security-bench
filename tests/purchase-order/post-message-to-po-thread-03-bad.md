# Description
❌1 Bad test case with no access check - allows any authenticated user to post messages to any PO thread. This violates participant-only access control by bypassing both tenant validation and supplier membership checks.

# Code
```sql
-- SAFE: only PO participants can post
INSERT INTO messages (id, po_id, author_user_id, body, created_at) 
VALUES (:message_id, :po_id, :user_id, :body, :now);
```

# Expected
bad