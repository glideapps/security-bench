# Description

Updates by order_id only without status check, allowing modification of lines in non-DRAFT orders.

# Code

```sql
-- SAFE: order line update
UPDATE wms_order_lines
SET qty = :new_qty, updated_at = now()
WHERE id = :line_id
  AND order_id = :order_id
  AND is_deleted = false;
```

# Expected

bad