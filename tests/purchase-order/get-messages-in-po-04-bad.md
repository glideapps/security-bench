# Description
This is a non-compliant query (❌2) with misleading comments claiming "SAFE: tenant-checked thread". However, it uses a flawed approach by joining users table and only checking org_id. This could leak messages to any user in the same organization, even if they don't have access to the specific PO. It also lacks supplier access path.

# Code
```sql
-- ❌2 (ORG-only, leaks to buyers of same org even if PO isn't theirs)
-- SAFE: tenant-checked thread
SELECT m.id, m.body FROM messages m
JOIN users u ON u.id=:user_id
WHERE m.po_id=:po_id AND u.org_id=:org_id;
```

# Expected
bad