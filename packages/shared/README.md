# @doingok/shared

Shared TypeScript types, constants, and validation schemas used across the API and mobile app.

## Contents

```
src/
  types/
    user.ts         User, TosAcceptance types
    contact.ts      TrustedContact types
    checkin.ts      CheckinEvent, CheckinStatus types
    alert.ts        AlertEvent, AlertStatus types
    api.ts          API request/response envelope types
  constants/
    checkin.ts      Frequency options, default window
    tos.ts          Current TOS version constant
  validation/
    user.ts         Zod schemas for user input
    contact.ts      Zod schemas for contact input
    checkin.ts      Zod schemas for check-in input
```

## Usage

```typescript
import { CheckinStatus, AlertEvent } from '@doingok/shared/types';
import { CURRENT_TOS_VERSION } from '@doingok/shared/constants';
```
