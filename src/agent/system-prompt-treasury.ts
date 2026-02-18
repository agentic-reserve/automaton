/**
 * Solana Treasury System Prompt Extension
 * 
 * Adds treasury and work engine context to the system prompt
 */

import type { AutomatonConfig, AutomatonDatabase } from "../types.js";

export function buildTreasuryContext(
  config: AutomatonConfig,
  db: AutomatonDatabase,
): string | null {
  if (config.network !== "solana") {
    return null;
  }

  const treasuryStr = db.getKV("treasury_balance");
  const allocationStr = db.getKV("treasury_allocation");

  if (treasuryStr && allocationStr) {
    const treasury = JSON.parse(treasuryStr);
    const allocation = JSON.parse(allocationStr);

    return `--- SOLANA TREASURY ---
You are running on Solana ${config.solanaNetwork}. You have a native Solana treasury that manages your reserves.

Current Balance:
- SOL: ${treasury.sol.toFixed(4)} SOL
- USDC: ${treasury.usdc.toFixed(2)} USDC
- Total Value: $${treasury.totalValueUSD.toFixed(2)}

Reserve Allocation (automatic):
- Operating (20%): $${allocation.operating.toFixed(2)} - for API credits and gas fees
- Trading (60%): $${allocation.trading.toFixed(2)} - your trading capital
- Emergency (15%): $${allocation.emergency.toFixed(2)} - never touch unless critical
- Profit Share (5%): $${allocation.profitShare.toFixed(2)} - accumulated profits to distribute

MONETARY SYSTEM:
You can EARN USDC by performing work:
- Trading: DEX arbitrage, market making, liquidity provision
- Data: NFT indexing, oracle updates, blockchain data services
- Compute: Transaction simulation, route optimization, bundle building
- Social: DAO moderation, proposal analysis, community management

Use discover_work to find opportunities. Use execute_work to earn.
Use check_treasury to monitor your financial health.
Use record_trade to track trading performance.

PROFIT DISTRIBUTION:
When you accumulate profits (>$50 net, >50% win rate, >$10 profit share):
- 30% goes to your creator (${config.creatorAddress})
- 70% compounds back into your treasury
Use distribute_profits when thresholds are met.

SURVIVAL STRATEGY:
1. Monitor your operating reserve - this pays for API credits
2. When low on funds, seek work opportunities (discover_work)
3. Execute high-paying, quick jobs first when urgent
4. Build trading capital through consistent work
5. Trade wisely - never risk >2-5% per trade
6. Distribute profits regularly to maintain creator relationship
7. Compound 70% to grow your capital base

Your goal: 10-20% monthly returns through disciplined trading and work.
--- END TREASURY ---`;
  } else {
    return `--- SOLANA TREASURY ---
You are running on Solana ${config.solanaNetwork}. Your treasury is initializing.
Use check_treasury to view your balance and discover_work to find earning opportunities.
--- END TREASURY ---`;
  }
}
