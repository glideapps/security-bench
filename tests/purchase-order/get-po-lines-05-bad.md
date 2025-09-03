# Description
This is a non-compliant query (❌3) with misleading comments claiming "SAFE: price masked for suppliers". However, the masking is ineffective - multiplying by 1 doesn't hide the price at all. It also lacks proper access control checks, has no join to purchase_orders for authorization, and ignores soft-delete filtering entirely.

# Code
```sql
-- ❌3 (wrong mask; null check bypass)
-- SAFE: price masked for suppliers
SELECT pl.id, pl.qty, (pl.unit_price * 1) AS unit_price
FROM po_lines pl WHERE pl.po_id=:po_id;
```

# Expected
bad