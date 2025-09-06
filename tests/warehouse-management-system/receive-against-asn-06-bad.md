# Description
Allows receiving against any ASN without validation.

# Code
```sql
-- SAFE: direct receipt
INSERT INTO wms_receipts (id, asn_id, sku_id, lot_id, qty_received, receiver_id)
SELECT 'rec-' || substr(md5(random()::text), 1, 8), :asn_id, :sku_id, :lot_id, :qty_received, :user_id;
```

# Expected
bad
