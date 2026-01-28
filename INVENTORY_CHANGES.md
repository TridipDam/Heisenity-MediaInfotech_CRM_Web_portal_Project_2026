# Inventory System Changes: currentUnits Field Implementation

## Overview
Added a `currentUnits` field to track live physical stock levels, while keeping `totalUnits` as the original received/starting quantity. This provides clear semantics and improves query performance.

## Changes Made

### 1. Database Schema Update
**File:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)

Added `currentUnits` field to the Product model:
```prisma
model Product {
  id               BigInt   @id @default(autoincrement())
  sku              String   @unique
  productName      String   @map("product_name")
  description      String?
  boxQty           Int      @map("box_qty")
  totalUnits       Int      @map("total_units")      // Original/received quantity
  currentUnits     Int      @map("current_units")    // Live physical stock
  reorderThreshold Int      @default(0) @map("reorder_threshold")
  // ... rest of fields
}
```

### 2. Prisma Migration
**File:** [backend/prisma/migrations/20260128015445_add_current_units_to_product/migration.sql](backend/prisma/migrations/20260128015445_add_current_units_to_product/migration.sql)

Created migration to add the `current_units` INTEGER column to the products table.

Database is automatically reset with seed data, and `currentUnits` is initialized to match `totalUnits` for all products.

### 3. Inventory Service Updates
**File:** [backend/src/modules/Inventory/inventory.service.ts](backend/src/modules/Inventory/inventory.service.ts)

#### 3a. Updated `calculateAvailableUnits()`
```typescript
/**
 * Calculates available units for a product:
 * available = product.currentUnits (live physical stock)
 * currentUnits is decremented on RETURN/USED transactions
 */
export async function calculateAvailableUnits(
  productId: string | number | bigint
): Promise<number> {
  const pid = BigInt(productId as any);

  const product = await prisma.product.findUnique({
    where: { id: pid },
    select: { currentUnits: true }  // Changed from totalUnits
  });

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  return Math.max(0, product.currentUnits);
}
```

**Benefits:**
- No more summing allocations per request
- Direct single-value lookup
- O(1) query performance

#### 3b. Updated `checkLowStockThreshold()`
```typescript
export async function checkLowStockThreshold(productId: string | number | bigint) {
    const pid = BigInt(productId as any);

    const product = await prisma.product.findUnique({
        where: { id: pid },
        select: { currentUnits: true, reorderThreshold: true }  // Uses currentUnits
    });
    // ... rest of logic
}
```

**Benefits:**
- Checks against live stock levels
- Alerts trigger based on actual available inventory

#### 3c. Updated RETURN Flow
```typescript
// RETURN flow
if (transactionType === 'RETURN' && barcodeId) {
    const barcode = await tx.barcode.findUnique({
        where: { id: barcodeId },
        select: { boxQty: true, productId: true }
    });

    if (!barcode) {
        throw new Error('Barcode not found');
    }

    // Calculate units to decrement from inventory
    const actualUsedQty = Math.min(usedQty, barcode.boxQty);

    // mark barcode AVAILABLE
    await tx.barcode.update({
        where: { id: barcodeId },
        data: { status: 'AVAILABLE' }
    });

    // update checkout record(s)
    await tx.barcodeCheckout.updateMany({
        where: {
            barcodeId,
            isReturned: false
        },
        data: {
            isReturned: true,
            returnTime: new Date()
        }
    });

    // Decrement currentUnits (live physical stock) based on actual usage
    if (actualUsedQty > 0) {
        await tx.product.update({
            where: { id: barcode.productId },
            data: {
                currentUnits: { decrement: actualUsedQty }  // Changed from totalUnits
            }
        });
    }
}
```

**Key Changes:**
- When a barcode is returned, `currentUnits` is decremented by `actualUsedQty`
- `totalUnits` remains unchanged (represents the original inventory received)
- `currentUnits` = `totalUnits` - total consumed quantity over time
- Barcode status returns to AVAILABLE for reuse

## Semantics

| Field | Meaning | Updates |
|-------|---------|---------|
| `totalUnits` | Original/received quantity | **Never** (static baseline) |
| `currentUnits` | Live physical stock | Decremented on RETURN when items are used |

## Transaction Flow

### CHECKOUT
1. Employee checks out a barcode with X units
2. Barcode status → CHECKED_OUT
3. BarcodeCheckout record created (isReturned: false)
4. **No inventory change** — stock reserved until return

### RETURN
1. Employee returns barcode with actualUsedQty reported
2. Barcode status → AVAILABLE (for reuse)
3. BarcodeCheckout record marked (isReturned: true, returnTime: now)
4. **currentUnits decremented** by actualUsedQty
5. **totalUnits unchanged**

### Result
- Live inventory queries are O(1) — just read `currentUnits`
- Audit trail preserved in InventoryTransaction records
- Clear distinction between received and remaining stock

## Benefits

✅ **Clear Semantics**
- `totalUnits` = started/received inventory
- `currentUnits` = live physical stock

✅ **Performance**
- No summing allocations per request
- Direct single-column lookup

✅ **Accuracy**
- Real-time stock levels
- Simple reconciliation (totalUnits - currentUnits = consumed)

✅ **Auditability**
- InventoryTransaction records still track every change
- Can trace exactly how inventory changed over time

## Migration Path

1. ✅ Schema updated with `currentUnits` column
2. ✅ Database migrated (reset for dev)
3. ✅ `currentUnits` initialized to `totalUnits` (one-time)
4. ✅ Service layer updated to use `currentUnits`
5. ✅ RETURN flow now decrements `currentUnits`
6. ✅ Low stock alerts check `currentUnits`

## Testing Recommendations

- Test RETURN flow with various usedQty values
- Verify currentUnits decrements correctly
- Confirm low stock alerts trigger at correct thresholds
- Check allocation logic still works correctly
- Verify barcode reuse after return
