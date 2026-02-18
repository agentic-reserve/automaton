/**
 * Solana Treasury Management
 * 
 * Native Solana monetary system for autonomous agents.
 * Manages USDC reserves, trading profits, and API credit payments.
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { Keypair } from '@solana/web3.js';
import type { AutomatonConfig, AutomatonDatabase } from '../types.js';

// USDC mint addresses
const USDC_MINT = {
  mainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  devnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
};

export interface TreasuryBalance {
  sol: number;
  usdc: number;
  totalValueUSD: number;
  lastUpdated: string;
}

export interface ReserveAllocation {
  operating: number;      // For immediate API credits and operations
  trading: number;        // For trading capital
  emergency: number;      // Emergency reserve (never touch unless critical)
  profitShare: number;    // Accumulated profits to send to creator
}

export interface TradingMetrics {
  totalTrades: number;
  profitableTrades: number;
  totalProfitUSD: number;
  totalLossUSD: number;
  netProfitUSD: number;
  winRate: number;
  averageProfit: number;
  sharpeRatio: number;
}

export class SolanaTreasury {
  private connection: Connection;
  private network: 'mainnet' | 'devnet';
  private db: AutomatonDatabase;
  private config: AutomatonConfig;

  constructor(
    connection: Connection,
    network: 'mainnet' | 'devnet',
    db: AutomatonDatabase,
    config: AutomatonConfig
  ) {
    this.connection = connection;
    this.network = network;
    this.db = db;
    this.config = config;
  }

  /**
   * Get current treasury balance (SOL + USDC)
   */
  async getBalance(walletPubkey: PublicKey): Promise<TreasuryBalance> {
    try {
      // Get SOL balance
      const solBalance = await this.connection.getBalance(walletPubkey);
      const sol = solBalance / LAMPORTS_PER_SOL;

      // Get USDC balance
      const usdcMint = USDC_MINT[this.network];
      const usdcTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        walletPubkey
      );

      let usdc = 0;
      try {
        const tokenAccountInfo = await this.connection.getTokenAccountBalance(usdcTokenAccount);
        usdc = parseFloat(tokenAccountInfo.value.uiAmount?.toString() || '0');
      } catch (err) {
        // Token account doesn't exist yet
        usdc = 0;
      }

      // Estimate total value in USD (assume SOL price from oracle or fixed rate)
      const solPriceUSD = await this.getSOLPrice();
      const totalValueUSD = (sol * solPriceUSD) + usdc;

      const balance: TreasuryBalance = {
        sol,
        usdc,
        totalValueUSD,
        lastUpdated: new Date().toISOString(),
      };

      // Store in DB
      this.db.setKV('treasury_balance', JSON.stringify(balance));

      return balance;
    } catch (error: any) {
      throw new Error(`Failed to get treasury balance: ${error.message}`);
    }
  }

  /**
   * Get reserve allocation breakdown
   */
  getReserveAllocation(balance: TreasuryBalance): ReserveAllocation {
    const total = balance.totalValueUSD;

    // Allocation strategy:
    // - 20% operating (API credits, gas fees)
    // - 60% trading capital
    // - 15% emergency reserve
    // - 5% profit share accumulation

    return {
      operating: total * 0.20,
      trading: total * 0.60,
      emergency: total * 0.15,
      profitShare: total * 0.05,
    };
  }

  /**
   * Check if agent has sufficient funds for operation
   */
  async canAffordOperation(costUSD: number, walletPubkey: PublicKey): Promise<boolean> {
    const balance = await this.getBalance(walletPubkey);
    const allocation = this.getReserveAllocation(balance);
    
    return allocation.operating >= costUSD;
  }

  /**
   * Pay for API credits using USDC
   */
  async payAPICredits(
    amount: number,
    recipientAddress: string,
    signer: Keypair
  ): Promise<string> {
    try {
      const usdcMint = USDC_MINT[this.network];
      const recipient = new PublicKey(recipientAddress);

      // Get token accounts
      const senderTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        signer.publicKey
      );
      const recipientTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        recipient
      );

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        signer.publicKey,
        amount * 1_000_000, // USDC has 6 decimals
        [],
        TOKEN_PROGRAM_ID
      );

      // Build and send transaction
      const transaction = new Transaction().add(transferInstruction);
      const signature = await this.connection.sendTransaction(transaction, [signer]);
      await this.connection.confirmTransaction(signature);

      // Record payment
      this.recordPayment('api_credits', amount, signature);

      return signature;
    } catch (error: any) {
      throw new Error(`Failed to pay API credits: ${error.message}`);
    }
  }

  /**
   * Send profit share to creator
   */
  async sendProfitShare(
    amount: number,
    creatorAddress: string,
    signer: Keypair
  ): Promise<string> {
    try {
      const usdcMint = USDC_MINT[this.network];
      const creator = new PublicKey(creatorAddress);

      const senderTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        signer.publicKey
      );
      const creatorTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        creator
      );

      const transferInstruction = createTransferInstruction(
        senderTokenAccount,
        creatorTokenAccount,
        signer.publicKey,
        amount * 1_000_000,
        [],
        TOKEN_PROGRAM_ID
      );

      const transaction = new Transaction().add(transferInstruction);
      const signature = await this.connection.sendTransaction(transaction, [signer]);
      await this.connection.confirmTransaction(signature);

      // Record profit distribution
      this.recordPayment('profit_share', amount, signature);

      return signature;
    } catch (error: any) {
      throw new Error(`Failed to send profit share: ${error.message}`);
    }
  }

  /**
   * Get trading metrics
   */
  getTradingMetrics(): TradingMetrics {
    const metricsStr = this.db.getKV('trading_metrics');
    if (!metricsStr) {
      return {
        totalTrades: 0,
        profitableTrades: 0,
        totalProfitUSD: 0,
        totalLossUSD: 0,
        netProfitUSD: 0,
        winRate: 0,
        averageProfit: 0,
        sharpeRatio: 0,
      };
    }
    return JSON.parse(metricsStr);
  }

  /**
   * Record a trade result
   */
  recordTrade(profitUSD: number, signature: string): void {
    const metrics = this.getTradingMetrics();

    metrics.totalTrades++;
    if (profitUSD > 0) {
      metrics.profitableTrades++;
      metrics.totalProfitUSD += profitUSD;
    } else {
      metrics.totalLossUSD += Math.abs(profitUSD);
    }

    metrics.netProfitUSD = metrics.totalProfitUSD - metrics.totalLossUSD;
    metrics.winRate = metrics.profitableTrades / metrics.totalTrades;
    metrics.averageProfit = metrics.netProfitUSD / metrics.totalTrades;

    // Simple Sharpe ratio calculation (would need more data for accurate calculation)
    metrics.sharpeRatio = metrics.averageProfit / (metrics.totalLossUSD / metrics.totalTrades || 1);

    this.db.setKV('trading_metrics', JSON.stringify(metrics));

    // Record in transaction history
    this.db.insertTransaction({
      id: signature,
      type: profitUSD > 0 ? 'transfer_in' : 'transfer_out',
      amountCents: Math.abs(profitUSD) * 100,
      description: `Trade ${profitUSD > 0 ? 'profit' : 'loss'}: $${Math.abs(profitUSD).toFixed(2)}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record a payment
   */
  private recordPayment(type: string, amount: number, signature: string): void {
    this.db.insertTransaction({
      id: signature,
      type: type === 'profit_share' ? 'transfer_out' : 'tool_use',
      amountCents: amount * 100,
      description: `${type}: $${amount.toFixed(2)}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get SOL price (simplified - would use Pyth oracle in production)
   */
  private async getSOLPrice(): Promise<number> {
    // In production, use Pyth oracle or other price feed
    // For now, return a reasonable estimate
    return 150; // $150 per SOL
  }

  /**
   * Check if profit share threshold reached
   */
  shouldDistributeProfits(balance: TreasuryBalance): boolean {
    const allocation = this.getReserveAllocation(balance);
    const metrics = this.getTradingMetrics();

    // Distribute if:
    // 1. Profit share allocation > $10
    // 2. Net profit > $50
    // 3. Win rate > 50%
    return (
      allocation.profitShare > 10 &&
      metrics.netProfitUSD > 50 &&
      metrics.winRate > 0.5
    );
  }

  /**
   * Calculate profit distribution amount (30% to creator, 70% compound)
   */
  calculateProfitDistribution(balance: TreasuryBalance): { toCreator: number; toCompound: number } {
    const allocation = this.getReserveAllocation(balance);
    const toCreator = allocation.profitShare * 0.3;
    const toCompound = allocation.profitShare * 0.7;

    return { toCreator, toCompound };
  }
}
