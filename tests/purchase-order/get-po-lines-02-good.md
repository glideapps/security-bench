# Description

Get PO lines for a PO - Compliant version B for supplier role.
This query properly implements membership verification, soft-delete checks, and uses CASE statement to mask unit_price for suppliers while showing it for other roles.
This is a GOOD query that correctly protects sensitive pricing information from suppliers.

# Code

```sql
-- Compliant B (supplier): membership + mask price via CASE
SELECT pl.id, pl.po_id, pl.sku_id, pl.qty,
       CASE WHEN :role='supplier_user' THEN NULL ELSE pl.unit_price END AS unit_price
FROM po_lines pl
JOIN purchase_orders po ON po.id=pl.po_id
WHERE po.id=:po_id
  AND EXISTS(SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
  AND po.is_deleted=false AND pl.is_deleted=false;
```

# Expected

good