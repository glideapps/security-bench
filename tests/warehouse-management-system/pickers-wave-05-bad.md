# Description
Shows all users regardless of role or facility access.

# Code
```sql
-- SAFE: list pickers
SELECT DISTINCT u.*, uf.role
FROM users u
JOIN wms_user_facilities uf ON uf.user_id = u.id
WHERE uf.facility_id = :facility_id;
```

# Expected
bad
