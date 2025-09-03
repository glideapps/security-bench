# Description

Get all purchase orders visible to the current user - Non-compliant version with bad OR precedence.
Despite the misleading comment "SAFE: buyer or supplier access (properly grouped)", the OR operator precedence is wrong, returning buyer org OR any supplier match globally.
This is a BAD query where incorrect operator precedence causes unintended data exposure.

# Code

```sql
-- SAFE: buyer or supplier access (properly grouped)
SELECT po.id FROM purchase_orders po
WHERE (po.buyer_org_id=:org_id AND po.is_deleted=false) OR :role='supplier_user'
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id);
```

# Expected

bad