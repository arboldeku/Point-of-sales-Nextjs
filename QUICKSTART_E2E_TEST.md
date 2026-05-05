# Quick End-to-End Test — 5 Minutes Before Showtime

Run this immediately before May 9 event opens. Tests all critical paths in sequence.

---

## Setup (1 min)

```bash
# Terminal 1: Start POS
npm run dev

# Wait for "✓ Ready" message
# Open http://localhost:3000/pos in 2 browser windows
```

---

## Test Sequence

### Test 1: Basic Add to Cart (30 sec)

**Tab A (Tablet 1):**
1. Search: `Groudon`
2. Click **Añadir al carrito**
3. Verify: Green success toast, cart count = 1

**Expected:** ✅ Item in cart

---

### Test 2: Real-Time Lock Sync (30 sec)

**Tab B (Tablet 2):**
1. Search: `Groudon` (same card as Tab A)
2. **Before clicking add**, note the stock: `libre: X / Y`
3. Note the number

**Go back to Tab A:**
4. Increase qty to 2: Click up arrow in cart
5. Go back to Tab B and **refresh search**
6. Stock should now be lower by 1: `libre: (X-1) / Y`

**Expected:** ✅ Lock visible across tabs in real-time

---

### Test 3: Proportional Discount (1 min)

**Tab A:**
1. Click cart → **Resumen** section
2. Add 2 more different cards (any cards, qty=1 each)
   - Now have: Groudon (qty=2), Card B, Card C
3. Enter discount: `3` EUR
4. Verify distribution shows in tooltip or order summary
5. Verify total = (sum of prices) - 3

**Expected:** ✅ Discount distributed proportionally

---

### Test 4: PIN Confirmation (30 sec)

**Tab A (cart with 3 items):**
1. Click **Confirmar Venta**
2. Enter PIN: `1234`
3. Click **Confirmar PIN**
4. Wait for response

**Expected:** ✅ Green toast: "Venta confirmada" within 5 seconds

---

### Test 5: Records Sync (30 sec)

**Tab A or Tab B:**
1. Navigate to **Records**
2. Should see rows for your 3 items
3. Each row shows: hora, card name, SKU, qty, price, discount, total

**Expected:** ✅ 3 rows visible with correct data

---

### Test 6: Test Mode Isolation (30 sec)

**Tab A:**
1. Click **Test Mode** toggle (orange banner appears)
2. Search any card
3. Add to cart → Confirm → PIN: 1234
4. Sale completes

**Tab A (Records):**
5. Should see this test sale

**Supabase (in browser console or SQL client):**
6. Check: `SELECT COUNT(*) FROM scan_events_test WHERE session_id = TODAY()` → Should be 1
7. Check: `SELECT COUNT(*) FROM scan_events WHERE session_id = TODAY()` → Should be 0 (from Test 4)

**Expected:** ✅ Test data isolated, production data untouched

---

### Test 7: DataMatrix Barcode (1 min)

**Tab A → Labels:**
1. Search `Groudon`
2. Click **Generar etiquetas PDF**
3. Print dialog appears
4. Either:
   - Actually print 1 page, OR
   - Cancel and manually open browser DevTools → check for `<canvas>` with DataMatrix

**Scanner test (if available):**
5. If you have the barcode scanner ready, scan the DataMatrix
6. Clipboard should contain the SKU (e.g., `12345-0001`)

**Expected:** ✅ PDF generates, DataMatrix renders, scanner reads correctly

---

## Emergency Rollback (If Any Test Fails)

1. **Hard refresh all tabs:** Ctrl+Shift+R
2. **Check Supabase status:** Open [Supabase dashboard](https://supabase.com/dashboard)
3. **If DB is slow:** Restart dev server (Ctrl+C, then `npm run dev`)
4. **If barcode scanner fails:** Use manual entry for labels (type SKU instead of scan)
5. **If PIN fails:** Verify `POS_CONFIRM_PIN=1234` in `.env.local`

---

## Final Checklist (Before Guests Arrive)

- [ ] Both test and production data flows work
- [ ] No console errors (F12)
- [ ] Cart locks working (Tab B shows reduced stock after Tab A adds)
- [ ] PIN: 1234 confirmed in `.env.local`
- [ ] Barcode scanner reads DataMatrix
- [ ] CSV export has 16 columns (check Records page)
- [ ] All 10 tablets can load `localhost:3000/pos` (WiFi OK)

**You're ready.** 🚀
