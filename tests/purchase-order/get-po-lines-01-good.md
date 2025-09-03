# Description

Get PO lines for a PO (suppliers must not see unit_price) - Compliant version A for buyer role.
This query properly implements tenant filtering, soft-delete checks on both po_lines and purchase_orders, and explicitly selects columns including unit_price which buyers are allowed to see.
This is a GOOD query that correctly restricts access to the buyer's organization.

# Code

```sql
-- Compliant A (buyer): tenant + soft-delete + explicit columns
SELECT pl.id, pl.po_id, pl.sku_id, pl.qty, pl.unit_price
FROM po_lines pl
JOIN purchase_orders po ON po.id=pl.po_id
WHERE po.id=:po_id AND :role IN ('buyer_admin','buyer_user')
  AND po.buyer_org_id=:org_id AND po.is_deleted=false AND pl.is_deleted=false;
```

# Expected

good