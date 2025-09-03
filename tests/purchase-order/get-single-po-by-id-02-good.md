# Description

Get a single PO by id if the user can see it - Compliant version B for supplier role.
This query properly implements membership verification, soft-delete checks, and importantly masks the buyer_unit_price field for suppliers.
This is a GOOD query that correctly restricts access based on supplier membership and protects sensitive pricing information.

# Code

```sql
-- Compliant B (supplier): membership + soft-delete; price masked
SELECT po.id, po.status, po.currency, NULL::numeric AS buyer_unit_price -- masked
FROM purchase_orders po
WHERE po.id=:po_id AND :role='supplier_user'
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
  AND po.is_deleted=false;
```

# Expected

good