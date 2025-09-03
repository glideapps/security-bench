# Description

Get a single PO by id - Non-compliant version that uses SELECT * which leaks price to supplier.
Despite the misleading comment "SAFE: price columns removed for suppliers", this query exposes all columns including sensitive pricing data.
This is a BAD query that fails to mask sensitive pricing information from suppliers.

# Code

```sql
-- ❌2 (SELECT * leaks price to supplier)
-- SAFE: price columns removed for suppliers
SELECT * FROM purchase_orders WHERE id=:po_id
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id);
```

# Expected

bad