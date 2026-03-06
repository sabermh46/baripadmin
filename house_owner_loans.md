# House Owner Loan APIs & Workflows

This document describes the loan management APIs and workflows for **house owners** — how they create (mark) a loan for their house and record paid amounts.

---

## Base URL & Auth

- **Base path:** `/api/loans`
- **Auth:** Bearer token required (JWT in `Authorization: Bearer <token>` header)
- **Access:** Any authenticated user can call these endpoints. For **house_owner** role, access is restricted to houses they own (`house.ownerId === req.user.id`). Staff, web_owner, and caretaker may have broader access depending on house hierarchy.

---

## Data Model

### `house_loan`

| Field | Type | Description |
|-------|------|-------------|
| `id` | BigInt | Primary key |
| `uuid` | string | Unique identifier |
| `house_id` | BigInt | FK to `house` |
| `provider_name` | string | Lender/provider name |
| `amount` | Decimal | Total loan amount |
| `interest_rate` | Decimal? | Optional |
| `start_date` | Date | Required |
| `end_date` | Date? | Optional |
| `monthly_payment` | Decimal? | Optional |
| `paid_amount` | Decimal | Running total of payments (default 0) |
| `status` | string | `active` or `paid` |
| `metadata` | JSON? | Optional extra data |

### `house_loan_payment`

| Field | Type | Description |
|-------|------|-------------|
| `id` | BigInt | Primary key |
| `uuid` | string | Unique identifier |
| `loan_id` | BigInt | FK to `house_loan` |
| `amount` | Decimal | Payment amount |
| `payment_date` | Date | When payment was made |
| `transaction_id` | string? | Optional reference |
| `notes` | string? | Optional notes |

---

## Workflow 1: Create a Loan (Mark House Has a Loan)

**Endpoint:** `POST /api/loans`

**Purpose:** House owner marks that they have a loan for a house.

**Request body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `house_id` | number | Yes | House ID (must be owned by house_owner) |
| `provider_name` | string | Yes | Lender/provider name |
| `amount` | number | Yes | Total loan amount |
| `start_date` | string | Yes | ISO date (e.g. `2025-01-15`) |
| `interest_rate` | number | No | Interest rate |
| `end_date` | string | No | ISO date |
| `monthly_payment` | number | No | Monthly payment amount |
| `metadata` | object | No | Extra JSON data |

**Example:**

```json
{
  "house_id": 5,
  "provider_name": "Bank XYZ",
  "amount": 500000,
  "start_date": "2025-01-15",
  "interest_rate": 8.5,
  "monthly_payment": 4500
}
```

**Response 201:**

```json
{
  "success": true,
  "message": "Loan created successfully",
  "data": {
    "id": 1,
    "uuid": "...",
    "house_id": 5,
    "provider_name": "Bank XYZ",
    "amount": "500000.00",
    "interest_rate": "8.50",
    "start_date": "2025-01-15",
    "end_date": null,
    "monthly_payment": "4500.00",
    "paid_amount": "0.00",
    "status": "active",
    "metadata": null,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**Validation:**

- House must exist.
- For **house_owner**: `house.ownerId` must equal `req.user.id`.

**Errors:**

- `400` — Missing required fields: `house_id`, `provider_name`, `amount`, `start_date`
- `403` — Unauthorized (house_owner does not own the house)
- `404` — House not found

---

## Workflow 2: Record a Paid Amount (Payment Record)

**Endpoint:** `POST /api/loans/:loanId/payments`

**Purpose:** Record a payment made toward the loan. This is purely for record-keeping; no payment gateway integration.

**Path params:**

| Param | Type | Description |
|-------|------|-------------|
| `loanId` | number | Loan ID |

**Request body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Payment amount |
| `payment_date` | string | Yes | ISO date (e.g. `2025-03-01`) |
| `transaction_id` | string | No | Bank/transaction reference |
| `notes` | string | No | Optional notes |

**Example:**

```json
{
  "amount": 4500,
  "payment_date": "2025-03-01",
  "transaction_id": "TXN-12345",
  "notes": "Monthly EMI"
}
```

**Response 201:**

```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "id": 1,
    "uuid": "...",
    "loan_id": 1,
    "amount": "4500.00",
    "payment_date": "2025-03-01",
    "transaction_id": "TXN-12345",
    "notes": "Monthly EMI",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**Backend behavior:**

1. Inserts a row into `house_loan_payment`.
2. Updates `house_loan.paid_amount` += `amount`.
3. If `paid_amount >= loan.amount`, sets `house_loan.status` to `paid`.

**Validation:**

- House owner must own the house associated with the loan.

**Errors:**

- `400` — Missing `amount` or `payment_date`
- `403` — Unauthorized
- `404` — Loan not found

---

## Other API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/loans/house/:houseId` | List all loans for a house |
| GET | `/api/loans/:id` | Get loan details (including payment history) |
| PUT | `/api/loans/:id` | Update loan |
| DELETE | `/api/loans/:id` | Delete loan |
| PUT | `/api/loans/payments/:paymentId` | Update a payment record |

All of these enforce the same ownership checks for house_owner.

---

## DNA Integration (Managed Users)

When fetching managed users with `expand=dna`:

- `dna.loans` — All loans for their houses (`house_loan`).
- `dna.loanPayments` — All loan payment rows for those loans (`house_loan_payment`), newest first.

Example: `GET /auth/managed-users?role=house_owner&expand=dna` returns house owners with loans and loan payments in their DNA.

---

## Summary

| Action | Endpoint | Purpose |
|--------|----------|---------|
| Create loan | `POST /api/loans` | Mark house has a loan |
| Record payment | `POST /api/loans/:loanId/payments` | Record paid amount (for record only) |
| List loans | `GET /api/loans/house/:houseId` | List loans for a house |
| Loan details | `GET /api/loans/:id` | Loan + payment history |
| Update loan | `PUT /api/loans/:id` | Edit loan details |
| Delete loan | `DELETE /api/loans/:id` | Remove loan |
| Update payment | `PUT /api/loans/payments/:paymentId` | Edit a payment record |
