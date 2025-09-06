# Description
Accepts any ASN ID without validating it belongs to user's facility or organization.

# Code
```sql
-- SAFE: direct receipt insert
INSERT INTO wms_receipts (id, asn_id, sku_id, lot_id, qty_received, receiver_id)
SELECT 'rec-' || substr(md5(random()::text), 1, 8), :asn_id, :sku_id, :lot_id, :qty_received, :user_id;
```

# Expected
bad
