/**
 * Resource Monitor
 *
 * Continuously monitors the automaton's resources and triggers
 * survival mode transitions when needed.
 */

import type {
  AutomatonConfig,
  AutomatonDatabase,
  ConwayClient,
  AutomatonIdentity,
  FinancialState,
  SurvivalTier,
} from "../types.js";
import { getSurvivalTier, formatCredits } from "../conway/credits.js";
import { getUsdcBalance } from "../conway/x402.js";

export interface ResourceStatus {
  financial: FinancialState;
  tier: SurvivalTier;
  previousTier: SurvivalTier | null;
  tierChanged: boolean;
  sandboxHealthy: boolean;
}

/**
 * Check all resources and return current status.
 */
export async function checkResources(
  identity: AutomatonIdentity,
  conway: ConwayClient,
  db: AutomatonDatabase,
  config: AutomatonConfig,
): Promise<ResourceStatus> {
  // Check credits
  let creditsCents = 0;
  try {
    creditsCents = await conway.getCreditsBalance();
  } catch {}

  // Check USDC
  let usdcBalance = 0;
  try {
    usdcBalance = await getUsdcBalance(identity.address);
  } catch {}

  // Check Solana treasury if on Solana network
  if (config.network === "solana" && config.solanaWalletAddress) {
    try {
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const { SolanaTreasury } = await import("./solana-treasury.js");

      const rpcUrl =
        config.solanaNetwork === "mainnet"
          ? "https://api.mainnet-beta.solana.com"
          : "https://api.devnet.solana.com";
      const connection = new Connection(rpcUrl);
      const walletPubkey = new PublicKey(config.solanaWalletAddress);

      const treasury = new SolanaTreasury(
        connection,
        config.solanaNetwork!,
        db,
        config,
      );

      const balance = await treasury.getBalance(walletPubkey);
      const allocation = treasury.getReserveAllocation(balance);

      // Use operating reserve for survival tier calculation
      // Convert to cents for compatibility with existing tier system
      const operatingCents = Math.floor(allocation.operating * 100);

      // If Solana treasury has funds, use that for tier calculation
      if (operatingCents > creditsCents) {
        creditsCents = operatingCents;
      }

      // Store treasury info
      db.setKV("treasury_balance", JSON.stringify(balance));
      db.setKV("treasury_allocation", JSON.stringify(allocation));
    } catch (err: any) {
      // Treasury check failed, continue with Conway credits only
      console.error(`[TREASURY] Check failed: ${err.message}`);
    }
  }

  // Check sandbox health
  let sandboxHealthy = true;
  try {
    const result = await conway.exec("echo ok", 5000);
    sandboxHealthy = result.exitCode === 0;
  } catch {
    sandboxHealthy = false;
  }

  const financial: FinancialState = {
    creditsCents,
    usdcBalance,
    lastChecked: new Date().toISOString(),
  };

  const tier = getSurvivalTier(creditsCents);
  const prevTierStr = db.getKV("current_tier");
  const previousTier = (prevTierStr as SurvivalTier) || null;
  const tierChanged = previousTier !== null && previousTier !== tier;

  // Store current tier
  db.setKV("current_tier", tier);

  // Store financial state
  db.setKV("financial_state", JSON.stringify(financial));

  return {
    financial,
    tier,
    previousTier,
    tierChanged,
    sandboxHealthy,
  };
}

/**
 * Generate a human-readable resource report.
 */
export function formatResourceReport(status: ResourceStatus, config: AutomatonConfig, db: AutomatonDatabase): string {
  const lines = [
    `=== RESOURCE STATUS ===`,
    `Credits: ${formatCredits(status.financial.creditsCents)}`,
    `USDC: ${status.financial.usdcBalance.toFixed(6)}`,
  ];

  // Add Solana treasury info if available
  if (config.network === "solana") {
    const treasuryStr = db.getKV("treasury_balance");
    const allocationStr = db.getKV("treasury_allocation");

    if (treasuryStr && allocationStr) {
      const treasury = JSON.parse(treasuryStr);
      const allocation = JSON.parse(allocationStr);

      lines.push(`\n--- SOLANA TREASURY ---`);
      lines.push(`SOL: ${treasury.sol.toFixed(4)} SOL`);
      lines.push(`USDC: ${treasury.usdc.toFixed(2)} USDC`);
      lines.push(`Total Value: $${treasury.totalValueUSD.toFixed(2)}`);
      lines.push(`Operating Reserve: $${allocation.operating.toFixed(2)}`);
      lines.push(`Trading Capital: $${allocation.trading.toFixed(2)}`);
    }
  }

  lines.push(``);
  lines.push(`Tier: ${status.tier}${status.tierChanged ? ` (changed from ${status.previousTier})` : ""}`);
  lines.push(`Sandbox: ${status.sandboxHealthy ? "healthy" : "UNHEALTHY"}`);
  lines.push(`Checked: ${status.financial.lastChecked}`);
  lines.push(`========================`);

  return lines.join("\n");
}
