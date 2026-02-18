---
name: sipher
description: Privacy-as-a-Skill for Multi-Chain Agents. Add stealth addresses, hidden amounts, and compliance viewing keys to blockchain transactions across 17 chains (Solana, NEAR, Ethereum, Cosmos, Bitcoin, Move). Supports shielded transfers, confidential SPL tokens, homomorphic commitments, STARK range proofs, and privacy-preserving governance.
auto-activate: false
---

# Sipher — Privacy-as-a-Skill for Multi-Chain Agents

Add stealth addresses, hidden amounts, and compliance viewing keys to blockchain transactions across 17 chains.

**Base URL:** `https://sipher.sip-protocol.org`

**Auth:** `X-API-Key: <your-key>` header (skip for health/docs endpoints)

**Rate Limits:** Tiered by API key
- Free: 100/hr
- Pro: 10K/hr  
- Enterprise: 100K/hr

**Docs:** Interactive API docs at `/docs` | OpenAPI spec at `/v1/openapi.json`

## What Sipher Does

Sipher wraps [SIP Protocol](https://sip-protocol.org)'s privacy SDK as a REST API. Any autonomous agent can call these endpoints to:

1. **Generate multi-chain stealth addresses** — one-time recipient addresses for 17 chains
2. **Create shielded transfers** — build unsigned transactions with hidden recipients and amounts
3. **Scan for payments** — detect incoming shielded payments using viewing keys
4. **Selective disclosure** — encrypt/decrypt transaction data for auditors/compliance
5. **Homomorphic commitment math** — add and subtract commitments without revealing values

All privacy operations use:
- **Stealth addresses** — unlinkable one-time addresses (ed25519 for Solana/NEAR/Move, secp256k1 for EVM/Cosmos/Bitcoin)
- **Pedersen commitments** — homomorphic commitments hiding amounts
- **Viewing keys** — selective disclosure for compliance without revealing spending power

## Supported Chains (17 total)

| Chain Family | Chains | Curve |
|-------------|--------|-------|
| **Solana** | solana | ed25519 |
| **NEAR** | near | ed25519 |
| **Move** | aptos, sui | ed25519 |
| **EVM** | ethereum, polygon, arbitrum, optimism, base | secp256k1 |
| **Cosmos** | cosmos, osmosis, injective, celestia, sei, dydx | secp256k1 |
| **Bitcoin** | bitcoin, zcash | secp256k1 |

## Core Endpoints

### Health & Meta

```bash
GET /v1/health          # Server status, Solana RPC latency, memory
GET /v1/ready           # Readiness probe (200 if healthy)
GET /v1/errors          # Full error code catalog
GET /v1/openapi.json    # OpenAPI 3.1 specification
GET /docs               # Interactive Swagger UI
```

### Stealth Addresses

**Generate Meta-Address Keypair:**
```bash
POST /v1/stealth/generate
{
  "chain": "solana",
  "label": "My Agent Wallet"
}
```
Returns: `metaAddress`, `spendingPrivateKey`, `viewingPrivateKey`, `chain`, `curve`

**Derive One-Time Stealth Address:**
```bash
POST /v1/stealth/derive
{
  "recipientMetaAddress": {
    "spendingKey": "0x...",
    "viewingKey": "0x...",
    "chain": "solana"
  }
}
```
Returns: `stealthAddress` (address, ephemeralPublicKey, viewTag), `sharedSecret`

**Check Ownership:**
```bash
POST /v1/stealth/check
{
  "stealthAddress": {
    "address": "0x...",
    "ephemeralPublicKey": "0x...",
    "viewTag": 42
  },
  "spendingPrivateKey": "0x...",
  "viewingPrivateKey": "0x..."
}
```
Returns: `{ isOwner: boolean }`

### Shielded Transfers

**Build Shielded Transfer (Unsigned):**
```bash
POST /v1/transfer/shield
{
  "sender": "<solana-address>",
  "recipientMetaAddress": {
    "spendingKey": "0x...",
    "viewingKey": "0x...",
    "chain": "solana"
  },
  "amount": "1000000000",
  "mint": "<spl-token-mint>"
}
```
Returns unsigned base64 transaction, stealth address, commitment, viewing key hash. Agent signs and submits.

**Claim Stealth Payment (Signed):**
```bash
POST /v1/transfer/claim
{
  "stealthAddress": "<stealth-address>",
  "ephemeralPublicKey": "0x...",
  "spendingPrivateKey": "0x...",
  "viewingPrivateKey": "0x...",
  "destinationAddress": "<your-wallet>",
  "mint": "<spl-token-mint>"
}
```
Derives stealth private key server-side, signs and submits claim transaction. Returns `txSignature`.

**Unified Private Transfer (Chain-Agnostic):**
```bash
POST /v1/transfer/private
{
  "sender": "<address>",
  "recipientMetaAddress": {
    "spendingKey": "0x...",
    "viewingKey": "0x...",
    "chain": "ethereum"
  },
  "amount": "1000000000000000000",
  "token": "<token-address>"
}
```
Supported chains: solana, ethereum, polygon, arbitrum, optimism, base, near

Returns chain-specific `chainData`:
- **Solana:** `{ type: "solana", transaction: "<base64>" }` — unsigned transaction
- **EVM:** `{ type: "evm", to, value, data, chainId }` — TX descriptor
- **NEAR:** `{ type: "near", receiverId, actions[] }` — action descriptors

Plus privacy fields: `stealthAddress`, `ephemeralPublicKey`, `viewTag`, `commitment`, `blindingFactor`, `viewingKeyHash`, `sharedSecret`

### Scan for Payments

```bash
POST /v1/scan/payments
{
  "viewingPrivateKey": "0x...",
  "spendingPublicKey": "0x...",
  "fromSlot": 300000000,
  "limit": 100
}
```
Scans Solana for SIP announcements matching your viewing key. Returns array of detected payments.

### Pedersen Commitments

**Create Commitment:**
```bash
POST /v1/commitment/create
{
  "value": "1000000000"
}
```
Returns: `commitment` (curve point), `blindingFactor`

**Verify Commitment:**
```bash
POST /v1/commitment/verify
{
  "commitment": "0x...",
  "value": "1000000000",
  "blindingFactor": "0x..."
}
```
Returns: `{ valid: boolean }`

**Add Commitments (Homomorphic):**
```bash
POST /v1/commitment/add
{
  "commitmentA": "0x...",
  "commitmentB": "0x...",
  "blindingA": "0x...",
  "blindingB": "0x..."
}
```
Returns: combined `commitment` and `blindingFactor` representing sum of hidden values.

**Subtract Commitments (Homomorphic):**
```bash
POST /v1/commitment/subtract
{
  "commitmentA": "0x...",
  "commitmentB": "0x...",
  "blindingA": "0x...",
  "blindingB": "0x..."
}
```
Returns: combined `commitment` and `blindingFactor` representing difference of hidden values.

### Viewing Keys

**Generate Viewing Key:**
```bash
POST /v1/viewing-key/generate
{
  "path": "m/0"
}
```
Returns: viewing key with `key`, `path`, `hash`

**Derive Child Viewing Key (BIP32-style):**
```bash
POST /v1/viewing-key/derive
{
  "masterKey": {
    "key": "0x...",
    "path": "m/0",
    "hash": "0x..."
  },
  "childPath": "audit"
}
```
Returns: derived child viewing key with `key`, `path` (e.g., `m/0/audit`), `hash`, and `derivedFrom` metadata.

Supports multi-level derivation: `m/0 → m/0/org → m/0/org/2026 → m/0/org/2026/Q1`

**Encrypt for Disclosure:**
```bash
POST /v1/viewing-key/disclose
{
  "viewingKey": {
    "key": "0x...",
    "path": "m/0",
    "hash": "0x..."
  },
  "transactionData": {
    "sender": "<address>",
    "recipient": "<address>",
    "amount": "1000000000",
    "timestamp": 1706000000000
  }
}
```
Returns encrypted payload (ciphertext, nonce, viewingKeyHash) that only the viewing key holder can decrypt.

**Decrypt with Viewing Key:**
```bash
POST /v1/viewing-key/decrypt
{
  "viewingKey": {
    "key": "0x...",
    "path": "m/0",
    "hash": "0x..."
  },
  "encrypted": {
    "ciphertext": "0x...",
    "nonce": "0x...",
    "viewingKeyHash": "0x..."
  }
}
```
Returns decrypted transaction data: `sender`, `recipient`, `amount`, `timestamp`.

## Advanced Features

### Confidential SPL Tokens (C-SPL)

Wrap, unwrap, and transfer SPL tokens with encrypted (hidden) amounts using Solana's Confidential Transfer extension.

**Wrap SPL → Confidential:**
```bash
POST /v1/cspl/wrap
{
  "mint": "<spl-mint>",
  "amount": "1000000000",
  "owner": "<wallet>",
  "createAccount": true
}
```

**Unwrap Confidential → SPL:**
```bash
POST /v1/cspl/unwrap
{
  "csplMint": "C-wSOL",
  "encryptedAmount": "0x...",
  "owner": "<wallet>",
  "proof": "0x..."
}
```

**Confidential Transfer:**
```bash
POST /v1/cspl/transfer
{
  "csplMint": "C-USDC",
  "from": "<sender>",
  "to": "<recipient>",
  "encryptedAmount": "0x...",
  "memo": "payment for services"
}
```

Supported tokens: `C-wSOL`, `C-USDC`, `C-USDT`

### STARK Range Proofs

Prove that a hidden value in a Pedersen commitment meets a threshold — without revealing the value.

**Generate Range Proof:**
```bash
POST /v1/proofs/range/generate
{
  "value": "1000000000",
  "threshold": "500000000",
  "blindingFactor": "0x...",
  "commitment": "0x..."
}
```

**Verify Range Proof:**
```bash
POST /v1/proofs/range/verify
{
  "type": "range",
  "proof": "0x...",
  "publicInputs": ["0x...", "0x..."]
}
```

### Privacy Score

Analyze any Solana wallet's on-chain privacy posture.

```bash
POST /v1/privacy/score
{
  "address": "<solana-address>",
  "limit": 100
}
```
Returns: `score` (0-100), `grade` (A-F), `factors` (addressReuse, amountPatterns, timingCorrelation, counterpartyExposure), and `recommendations`.

### Private Swap

Privacy-preserving token swap via Jupiter DEX.

```bash
POST /v1/swap/private
{
  "sender": "<wallet>",
  "inputMint": "So11111111111111111111111111111111111111112",
  "inputAmount": "1000000000",
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "slippageBps": 50,
  "recipientMetaAddress": {
    "spendingKey": "0x...",
    "viewingKey": "0x...",
    "chain": "solana"
  }
}
```

Supported tokens: SOL, USDC, USDT, mSOL, JitoSOL

### Governance Voting Privacy

Privacy-preserving governance — encrypted ballots via Pedersen commitments, nullifier-based double-vote prevention, and homomorphic vote tallying.

**Encrypt Ballot:**
```bash
POST /v1/governance/ballot/encrypt
{
  "proposalId": "proposal-001",
  "vote": "yes",
  "voterSecret": "0x...",
  "stealthAddress": "<stealth-address>"
}
```

**Submit Ballot:**
```bash
POST /v1/governance/ballot/submit
{
  "proposalId": "proposal-001",
  "commitment": "0x...",
  "blindingFactor": "0x...",
  "nullifier": "0x...",
  "vote": "yes"
}
```

**Tally Votes:**
```bash
POST /v1/governance/tally
{
  "proposalId": "proposal-001"
}
```

## Agent Workflow Example

```
1. Agent generates stealth meta-address → POST /v1/stealth/generate
2. Counterparty derives stealth address → POST /v1/stealth/derive
3. Counterparty builds shielded transfer → POST /v1/transfer/shield
4. Counterparty signs + submits the returned transaction
5. Agent scans for incoming payments → POST /v1/scan/payments
6. Agent claims funds to real wallet → POST /v1/transfer/claim
7. If audit needed → POST /v1/viewing-key/disclose
8. Auditor decrypts → POST /v1/viewing-key/decrypt
```

## Idempotency

Mutation endpoints support the `Idempotency-Key` header. Send a UUID v4 value to safely retry requests — duplicate keys return the cached response with `Idempotency-Replayed: true` header.

## On-Chain Program

| Field | Value |
|-------|-------|
| **Program ID** | `S1PMFspo4W6BYKHWkHNF7kZ3fnqibEXg3LQjxepS9at` |
| **Config PDA** | `BVawZkppFewygA5nxdrLma4ThKx8Th7bW4KTCkcWTZwZ` |
| **Fee Collector** | `S1P6j1yeTm6zkewQVeihrTZvmfoHABRkHDhabWTuWMd` |
| **Network** | Solana Mainnet-Beta |

## Resources

- **SIP Protocol:** https://sip-protocol.org
- **SDK:** https://www.npmjs.com/package/@sip-protocol/sdk
- **API Docs:** https://sipher.sip-protocol.org/docs
- **OpenAPI Spec:** https://sipher.sip-protocol.org/v1/openapi.json
