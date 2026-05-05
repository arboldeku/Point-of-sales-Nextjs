# Iberian Card Show POS Deployment Checklist — May 9

**Deadline:** May 9, 2026 (4 days)  
**Target:** 10 simultaneous tablets, 0 overselling, atomic sales confirmation

---

## Pre-Event Validation (Do This 48h Before)

### 1. Cart Locks System — Multi-Device Conflict Prevention

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run concurrent lock tests
npm test -- cart-locks-concurrent
```

**Manual test:**
- Open `localhost:3000/pos` on 2 browser tabs simultaneously (simulate 2 tablets)
- Tab A: Search "Groudon" → Add to cart (qty=1)
- Tab B: Search "Groudon" (refresh) → Should show `libre: 4/5` not `libre: 5/5` (Tab A's lock)
- Tab A: Increase qty to 2 → Tab B should refresh to `libre: 3/5`
- Tab A: Remove from cart → Tab B should refresh to `libre: 5/5`

**Expected outcome:** Available qty reflects active locks in real-time across tabs.

---

### 2. DataMatrix Label Scanning

**Hardware needed:** Barcode scanner capable of reading 2D DataMatrix codes

**Test:**
1. Go to **Labels** tab
2. Select a test card (e.g., Groudon)
3. Click **Print Labels**
4. Scan the DataMatrix barcode with your hardware scanner
5. Should correctly parse the `internal_sku` (e.g., `12345-0001`)

**Expected outcome:** Scanner reads DataMatrix without errors. Barcode clipboard shows `internal_sku`.

---

### 3. Full Sales Flow (Confirm → Inventory Update → FIFO)

**Test with PIN 1234:**

1. **Add 3 cards to cart** (different items)
   - Card A: qty=2, price=€10 each = €20
   - Card B: qty=1, price=€15 = €15
   - Card C: qty=1, price=€5 = €5
   - **Total: €40**

2. **Apply €4 discount**
   - Expected split: A gets €1.33, B gets €1.50, C gets €1.17 (last absorbs rounding)
   - After discount: A=€18.67, B=€13.50, C=€3.83

3. **Confirm sale** (PIN: 1234)
   - Should succeed with `✓ Venta confirmada`
   - 10-min timeout should not trigger

4. **Verify in Records page**
   - Should see 3 rows (one per item)
   - Discount column should show split values
   - Total should match €40 - €4 = €36

5. **Verify Supabase**
   ```sql
   -- Check scan_events marked as 'confirmed'
   SELECT COUNT(*) FROM scan_events 
   WHERE session_id = TODAY() AND status = 'confirmed';
   
   -- Check sales_physical created
   SELECT COUNT(*) FROM sales_physical 
   WHERE sale_date >= TODAY();
   
   -- Check FIFO OUT events created
   SELECT COUNT(*) FROM fifo_ledger_events 
   WHERE event_type = 'OUT' AND event_date >= TODAY();
   
   -- Check inventory_current decremented
   SELECT qty FROM inventory_current 
   WHERE internal_sku = 'ADDED_CARD_SKU';
   ```

**Expected outcome:**
- Discount proportionally split, last item absorbs rounding
- All 3 rows visible in Records
- Supabase has scan_events + sales_physical + fifo_ledger_events entries
- inventory_current qty reduced by sales qty

---

### 4. Test Mode Isolation

**Critical:** Test mode must NOT affect production inventory

1. Click **Test Mode** toggle in SalesTab (orange banner appears)
2. Add card to cart, confirm sale (PIN: 1234)
3. Check Records page → Sale should appear (from `scan_events_test`)
4. Check Supabase `scan_events_test` table → Row should exist
5. Check Supabase `scan_events` table → **Row should NOT exist**
6. Check Supabase `inventory_current` → **Qty should be UNCHANGED**
7. Check Supabase `sales_physical` → **No row should exist**

**Expected outcome:** Test sales isolated to `scan_events_test`. Zero impact on production tables.

---

### 5. 10-Tablet Concurrent Scenario

**Setup:** 5 physical devices + 5 browser tabs (or 10 tabs)

1. All 10 "tablets" open `localhost:3000/pos` in parallel
2. Search for same card (e.g., "Groudon", qty=15 in inventory)
3. **All 10 simultaneously add qty=1 to cart**
4. Verify:
   - All 10 tabs show cart item added (success)
   - Tab 6-10: Check stock display on search → should show `libre: 5/15` not `libre: 15/15`
   - Create locks in Supabase for all 10 sessions

5. **All 10 simultaneously confirm sales** (PIN: 1234)
   - Should all succeed (~10 seconds total)
   - Records page should show 10 rows for Groudon
   - Supabase `inventory_current` for Groudon should now be 5 (was 15)

**Expected outcome:** No overselling. All 10 confirmations atomic. Inventory decremented by exactly 10.

---

### 6. Stock Depletion Edge Case

**Scenario:** Only 2 units left, 5 tablets try to add 1 each

1. Manually reduce inventory for test card to qty=2
2. 5 tabs simultaneously try to add qty=1
3. First 2 succeed, tabs 3-5 see `libre: 0/2`
4. Tabs 3-5 cannot add (or add fails server-side)

**Expected outcome:** Exact stock match. No overselling.

---

### 7. PIN Security

**Test invalid PIN:**
1. Add card to cart
2. Attempt confirm with PIN: 9999 (wrong)
3. Should fail with `❌ PIN incorrecto`
4. Cart remains unchanged
5. No database write occurs

**Expected outcome:** PIN validation blocks confirm. No data mutation.

---

### 8. Label CSV Export

**Test Powertools compatibility:**

1. Go to **Records** page
2. Confirm at least 3 sales exist
3. Click **Descargar CSV**
4. Open in Excel
5. Verify 16 columns exist:
   - Original 12: hora, carta, SKU, qty, precio, descuento, total, pago, channel, business_rarity, language, estado
   - Powertools 4: cardmarket_id, card_name, lang, set_code

**Expected outcome:** All columns present. CSV imports into Powertools without error.

---

## Final Checks (Day Before Event)

- [ ] Dev server runs on `localhost:3000` without errors
- [ ] All 10 tablets can connect to Supabase (no network issues)
- [ ] Barcode scanner is paired and reads DataMatrix correctly
- [ ] PIN is set to **1234** in `.env.local` → `POS_CONFIRM_PIN=1234`
- [ ] Cart lock TTL is **10 minutes** (check route.ts line 6)
- [ ] Discount distribution algorithm tested with mock 3-item sale
- [ ] Test mode toggle verified (orange banner, isolated data)
- [ ] No uncommitted changes in `git status`
- [ ] Latest code deployed to Vercel (check dashboard auto-deploy)

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Carrito vacío" on confirm | No pending items | Add items before PIN entry |
| "PIN incorrecto" | Wrong PIN entered | Use **1234** |
| Discount shows €0 | Discount input not filled | Enter discount EUR amount |
| Stock shows "libre: 0" but qty > 0 | Active locks exist | Check `cart_locks` table expiry |
| Test mode data appears in Records | testMode toggle off | Click toggle to enable test mode |
| Barcode scanner doesn't work | Scanner not calibrated for DataMatrix | Test with manual entry first |
| 11th tablet can't add card | All 10 units locked/sold | Expected behavior; offer similar set instead |

---

## Rollback Plan (If Issues Arise)

1. **Restart Supabase connection:** Hard refresh (Ctrl+Shift+R) on all tablets
2. **Clear test data:** `DELETE FROM scan_events_test WHERE session_id = TODAY()`
3. **Reset inventory snapshot:** Revert last `inventory_current` upsert, re-run gold pipeline
4. **Fallback to cash register:** Manual cash tally (CSV export from Records page)

---

## Success Metrics

After 4 hours of event operation:
- ✅ 0 oversells (inventory never goes negative)
- ✅ 100% of sales confirmed and recorded in Supabase
- ✅ Cart locks clean up after 10 minutes (tablets don't deadlock)
- ✅ Proportional discounts correctly split across items
- ✅ DataMatrix labels scanned without errors
- ✅ Records CSV exports Powertools-compatible data
- ✅ Test mode never contaminates production inventory

---

**Questions before May 9?** Check CLAUDE.md or review confirm routes in `app/api/pos/`.
