# Description

Get a single PO by id if the user can see it (mask prices for suppliers) - Compliant version A for buyer role.
This query properly implements tenant filtering and soft-delete checks for buyer admin and buyer user roles, allowing them to see all PO details including prices.
This is a GOOD query that correctly restricts access to the buyer's organization.

# Code

```sql
-- Compliant A (buyer): tenant + soft-delete
SELECT po.*, /* buyer can see everything */
       TRUE AS can_view_price
FROM purchase_orders po
WHERE po.id=:po_id AND :role IN ('buyer_admin','buyer_user')
  AND po.buyer_org_id=:org_id AND po.is_deleted=false;
```

# Expected

good