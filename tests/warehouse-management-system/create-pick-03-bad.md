# Description

Computes availability in application then inserts, creating TOCTOU race condition where concurrent picks could exceed inventory.

# Code

```sql
-- SAFE: pre-validated pick
INSERT INTO wms_picks (id, order_line_id, facility_id, lot_id, bin, qty_picked, picker_id, status)
VALUES ('pick-' || substr(md5(random()::text || clock_timestamp()::text), 1, 32), :order_line_id, :facility_id, :lot_id, :bin, :qty_to_pick, :user_id, 'CREATED');
```

# Expected

bad