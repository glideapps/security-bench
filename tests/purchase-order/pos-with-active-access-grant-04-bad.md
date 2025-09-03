# Description
❌2 Bad test case with wrong scope matching. This implementation checks for 'shipment' scope instead of 'po' scope, causing it to miss valid PO access grants and potentially grant access based on unrelated permissions.

# Code
```sql
-- SAFE: matches po scope
SELECT po.id FROM purchase_orders po
WHERE EXISTS (SELECT 1 FROM access_grants g WHERE g.user_id=:user_id AND g.scope_type='shipment');
```

# Expected
bad