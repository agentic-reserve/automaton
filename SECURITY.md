# Security Guidelines

## Sensitive Files (DO NOT COMMIT)

The following files contain sensitive information and are protected by `.gitignore`:

### 1. Environment Variables
- `.env` - Contains API keys and private keys
- Use `.env.example` as template

### 2. Wallet Files
- `.automaton/wallet.json` - EVM wallet private key
- `.automaton/solana-wallet.json` - Solana wallet private key
- `*-wallet.json` - Any wallet files

### 3. Genesis Prompt
- `GENESIS_PROMPT.txt` - May contain creator addresses and strategy details

### 4. Database Files
- `.automaton/state.db` - Contains agent state and transaction history
- `*.db`, `*.db-journal`, `*.db-wal`, `*.db-shm` - Database files

### 5. Key Files
- `*.key` - Private key files
- `*.pem` - Certificate files

## Before Committing

Always check:

```bash
# Check what will be committed
git status

# Verify no sensitive files
git diff --cached

# Search for exposed keys
grep -r "PRIVATE_KEY\|API_KEY\|privateKey" --exclude-dir=node_modules --exclude-dir=dist .
```

## Environment Variables

Never hardcode sensitive values. Use environment variables:

```typescript
// ❌ BAD
const apiKey = "cnwy_k_aU5-FB3mH2spFTFUQcdvHQHEf7TnPnap";

// ✅ GOOD
const apiKey = process.env.CONWAY_API_KEY;
```

## API Keys

### Conway API Key
- Format: `cnwy_k_*`
- Store in: `.env` or environment variables
- Never commit to git

### OpenRouter API Key
- Format: `sk-or-*`
- Store in: `.env` or environment variables
- Never commit to git

## Private Keys

### EVM Private Key
- Format: 64 hex characters
- Store in: `.automaton/wallet.json` (encrypted) or `.env`
- Never commit to git
- Never share publicly

### Solana Private Key
- Format: Base64 encoded
- Store in: `.automaton/solana-wallet.json` or `.env`
- Never commit to git
- Never share publicly

## Wallet Addresses

Public addresses are safe to share:
- EVM: `0x...` (42 characters)
- Solana: Base58 (32-44 characters)

But avoid committing them in:
- Genesis prompts
- Configuration files with strategy details
- Documentation with personal information

## Safe Practices

### 1. Use Environment Variables
```bash
# Set in shell
export CONWAY_API_KEY=your_key_here
export ETHEREUM_PRIVATE_KEY=your_key_here

# Or use .env file (gitignored)
echo "CONWAY_API_KEY=your_key_here" >> .env
```

### 2. Use .env.example
```bash
# Copy template
cp .env.example .env

# Edit with your keys
nano .env
```

### 3. Verify .gitignore
```bash
# Check if file is ignored
git check-ignore .env
# Should output: .env

# Check if file is tracked
git ls-files .env
# Should output nothing
```

### 4. Remove Committed Secrets

If you accidentally committed secrets:

```bash
# Remove from history (DANGEROUS - rewrites history)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (if already pushed)
git push origin --force --all

# Rotate the exposed keys immediately!
```

## Key Rotation

If keys are exposed:

1. **Conway API Key**
   - Revoke old key in Conway dashboard
   - Generate new key
   - Update `.env`

2. **Wallet Private Keys**
   - Create new wallet
   - Transfer funds to new wallet
   - Update configuration
   - Never reuse exposed wallet

3. **OpenRouter API Key**
   - Revoke old key in OpenRouter dashboard
   - Generate new key
   - Update `.env`

## Deployment Security

### Railway/Cloud Deployment

Set environment variables in platform:

```bash
# Railway CLI
railway variables set CONWAY_API_KEY=your_key_here
railway variables set ETHEREUM_PRIVATE_KEY=your_key_here

# Or use Railway dashboard
# Settings → Variables → Add Variable
```

### Docker

Use secrets or environment files:

```bash
# Docker secrets
docker secret create conway_api_key ./conway_key.txt

# Docker compose with env file
docker-compose --env-file .env.production up
```

## Audit Checklist

Before pushing to GitHub:

- [ ] `.env` is in `.gitignore`
- [ ] No API keys in code
- [ ] No private keys in code
- [ ] No wallet files committed
- [ ] `GENESIS_PROMPT.txt` is in `.gitignore`
- [ ] `.env.example` has placeholder values only
- [ ] All sensitive files are gitignored
- [ ] No hardcoded addresses in public docs

## Reporting Security Issues

If you find a security vulnerability:

1. **DO NOT** open a public issue
2. Email: [your-security-email]
3. Include: description, impact, reproduction steps
4. Allow time for fix before public disclosure

## Resources

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP: Key Management](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [12 Factor App: Config](https://12factor.net/config)
