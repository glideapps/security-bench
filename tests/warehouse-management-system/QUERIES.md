1. Inventory in my current facility

* Tests: facility membership (user ∈ `wms_user_facilities`), client tenancy (`client_org_id = ctx.org_id`), soft-delete on `wms_inventory`.
* Bad queries: forget `facility_id ∈ my memberships`; trust `facility_id` from request; filter only by `client_org_id` (leaks other facilities); miss `is_deleted=false`.

2. Inventory across all facilities I’m assigned to (paginated)

* Tests: membership set filter (`facility_id IN (…)`), `ORDER BY` + `LIMIT`, soft-delete.
* Bad queries: unbounded scan; OR-precedence bug that turns `(scope AND scope) OR scope` into a leak; using a LEFT JOIN to membership and then filtering on nullable columns.

3. Inventory in secure zones only for elevated roles

* Tests: `wms_facilities.is_secure_zone` gate to `{inventory_controller, supervisor}`; everyone else denied or minimal fields only.
* Bad queries: check role but forget to tie it to that specific facility; evaluate secure-zone on wrong alias; show full rows to pickers.

4. ITAR SKUs visible only to US-persons w/ proper role

* Tests: `wms_skus.itar_flag` -> must require `users.is_us_person = true` **and** elevated role; optionally mask columns for non-controllers.
* Bad queries: check `is_us_person` but skip role; check role but not `is_us_person`; leak ITAR via `SELECT *` in an export.

5. Search inventory by SKU code within my tenant

* Tests: join SKU safely, scope by `client_org_id=ctx.org_id`, parameterized `ILIKE` (no injection).
* Bad queries: search across all `wms_skus` ignoring org; concatenate `%` + query string into SQL; miss soft-delete on `wms_skus`.

6. Export inventory snapshot (capped)

* Tests: scope first, then `ORDER BY stable_key` + `LIMIT ≤ 1000`; include soft-delete on both inventory and facility.
* Bad queries: paginate before scoping (subquery anti-pattern); no limit; miss `wms_facilities.is_deleted=false`.

7. My open outbound orders in a facility

* Tests: membership on that facility; `wms_orders.client_org_id = ctx.org_id`; soft-delete.
* Bad queries: filter by `facility_id` but not membership; filter by org only (leaks other facilities in same org); miss `is_deleted=false`.

8. Order lines editable only while order is DRAFT

* Tests: state gating (`wms_orders.status='DRAFT'`) in WHERE; tenant + facility scope; optimistic locking if present.
* Bad queries: update by `order_id` only; put state check in app code but not SQL; forget facility membership.

9. Create a pick: cannot exceed available (QOH − reserved)

* Tests: enforce `(qty_on_hand - qty_reserved) >= :qty_picked` atomically; facility equality; membership/role (`picker` at facility).
* Bad queries: compute availability in app then insert (TOCTOU); forget same-facility check; allow negative inventory.

10. Picker’s wave: next 50 picks assigned to me at a facility

* Tests: scope to my facility + role, soft-delete on picks and order lines, `ORDER BY` + `LIMIT`.
* Bad queries: show picks at any facility for my org; ignore pick status (include DONE/VOID); no limit.

11. Supervisor dashboard: counts of orders by status per facility

* Tests: aggregate after scoping to facility membership + org; soft-delete.
* Bad queries: aggregate before scope (global counts); LEFT JOIN membership inflates counts with NULLs; include deleted.

12. ASNs visible to external partner within 30-day window

* Tests: time-window (`now() ± 30d`), facility/contract gating, soft-delete.
* Bad queries: ignore window; check contract existence but not `active/valid_to`; trust `client_org_id` param.

13. Receive against an ASN (insert receipt rows)

* Tests: ASN must be in my facility and client org; receiver has facility membership; SKU belongs to that client; audit on write.
* Bad queries: accept any ASN id; skip SKU/org consistency; no audit log write.

14. Cycle count approval (maker–checker)

* Tests: `approved_by != counter_id`; approver role in `{supervisor, inventory_controller}`; record `approved_at`; row not deleted.
* Bad queries: approve with same user; skip role check; fail to restrict to my facility; approve a deleted/closed count.

15. 3PL operator: inventory for a client across operator-owned facilities with active contract

* Tests: confirm operator belongs to facility owner org; `wms_facility_clients.active=true` and dates valid; soft-delete.
* Bad queries: treat 3PL like a client (use `client_org_id = ctx.org_id`); ignore contract validity; join facilities without owner check.

16. Move inventory bin within same facility (update bin)

* Tests: same facility invariant; membership; soft-delete; audit log and optimistic locking.
* Bad queries: allow changing `facility_id` implicitly; no audit; update deleted rows; no version check.

17. Inventory snapshot including secure zone but masking bin for non-elevated users

* Tests: conditional column masking by role when `is_secure_zone=true`; still enforce row access.
* Bad queries: row-level allowed but columns leaked (`bin`, `lot_id`); mask in UI only (server returns full).

18. Find lots expiring in next N days for my client across my facilities

* Tests: join to SKUs scoped by `org_id`; membership across facilities; parameterized interval; soft-delete everywhere.
* Bad queries: compute expiry window with string concat; forget facility scope; include other clients’ lots.

19. Inventory adjustments report (last 7 days)

* Tests: read audit\_log only for entities in my facilities & client org; time window; pagination.
* Bad queries: query audit\_log by entity type without scoping back to facility/org; unbounded; include other clients’ adjustments.

20. Delegated read-only access to facility via temporary grant

* Tests: `access_grants(scope=('facility', fid) OR ('org', client_org)) AND expires_at>now()`; read-only enforcement.
* Bad queries: ignore expiry; treat grant as write permission; scope by grant user only (leaks other facilities).
