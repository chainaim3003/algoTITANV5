# TypeScript Build Fix Applied

## Issue
TypeScript error when building: `suggestedParams.fee` is a `bigint`, not a `number`.

## Fix Applied
Updated `escrowV5Service.ts` to handle both `bigint` and `number` types for the fee parameter.

### Before:
```typescript
suggestedParams.fee = Math.max(suggestedParams.fee, 10000);
```

### After:
```typescript
const minFee = 10000n; // At least 10x base fee
if (typeof suggestedParams.fee === 'bigint') {
  suggestedParams.fee = suggestedParams.fee > minFee ? suggestedParams.fee : minFee;
} else {
  suggestedParams.fee = Math.max(suggestedParams.fee as number, 10000);
}
```

This handles both cases:
- When the Algorand SDK returns `bigint` (newer versions)
- When the Algorand SDK returns `number` (older versions)

## Build Again
```bash
npm run build
```

Should now compile successfully! ✅
