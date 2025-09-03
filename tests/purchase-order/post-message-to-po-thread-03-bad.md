# Description
❌1 Bad test case with no access check - allows any authenticated user to post messages to any PO thread. This violates participant-only access control by bypassing both tenant validation and supplier membership checks.

# Code
```sql
-- ❌1 (no access check): Security vulnerability - allows unauthorized posting
-- SAFE: only PO participants can post
INSERT INTO messages (po_id, author_user_id, body) VALUES (:po_id, :user_id, :body);
```

# Expected
bad