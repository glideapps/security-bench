# Description
No facility access check for listing pickers.

# Code
```sql
-- SAFE: wave pickers
SELECT u.*
FROM users u
WHERE u.is_active = true;
```

# Expected
bad
