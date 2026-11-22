# AirNest Firestore Security Specification (Phase 0 TDD)

## Data Invariants
1. **Owner Isolation (PII & Profile)**: `/users/{userId}` can ONLY be read, created, updated, or deleted by the authenticated owner (`request.auth.uid == userId`) with verified email (`request.auth.token.email_verified == true`) for writes. Blanket `list` is denied.
2. **Master Gate**: `/users/{userId}/dailyProgress/{progressId}` requires the parent `/users/{userId}` document to exist on create and matches `ownerId == request.auth.uid`.
3. **Aggregate-Only Community**: `/communityAggregates/{cityId}` contains zero PII and forbids arbitrary client mutations.
4. **Immutability & Temporal Integrity**: `ownerId` and `createdAt` are immutable after create; `createdAt == request.time` on create and `updatedAt == request.time` on update.

## Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated read of `/users/u1`**: `auth = null`.
2. **Cross-user read of `/users/u2` by `u1`**: PII leakage test.
3. **Unverified email write to `/users/u1`**: `email_verified = false`.
4. **Identity spoofing on create**: `u1` creates `/users/u1` with `ownerId: "u2"`.
5. **Shadow / Ghost field injection**: `u1` writes `{ ..., isAdmin: true }` to `/users/u1`.
6. **Oversized string DoW attack**: `displayName` of 500 characters (>60 maxLength).
7. **ID poisoning**: Document ID `progressId` containing spaces/slashes or >128 chars.
8. **Immutable field mutation**: `u1` updates `createdAt` or `ownerId` on `/users/u1`.
9. **Client-forged timestamp**: `updatedAt` set to past date instead of `request.time`.
10. **Unbounded array injection**: `completedIds` with 50 items (>12 max).
11. **Value poisoning on whitelisted key**: Updating `roomAreaM2` with a string `"hack"` instead of number.
12. **Community tampering**: Client attempting `setDoc` or `deleteDoc` on `/communityAggregates/coimbatore`.
