# Description

Computes availability in application then inserts, creating TOCTOU race condition where concurrent picks could exceed inventory.

# Code

```sql
-- SAFE: pre-validated pick
INSERT INTO wms_picks (order_line_id, facility_id, lot_id, bin, qty_picked, picker_id, status)
VALUES (:order_line_id, :facility_id, :lot_id, :bin, :qty_to_pick, :user_id, 'CREATED');
```

# Expected

bad