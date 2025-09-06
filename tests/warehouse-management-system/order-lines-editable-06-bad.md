# Description
Allows editing order lines regardless of order status.

# Code
```sql
-- SAFE: update line
UPDATE wms_order_lines
SET qty = :new_qty, updated_at = now()
WHERE id = :line_id;
```

# Expected
bad
