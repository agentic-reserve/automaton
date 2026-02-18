/**
 * Work Engine for Autonomous Agents
 * 
 * Enables agents to earn USDC by providing services:
 * - Trading services (DeFi arbitrage, market making)
 * - Data services (oracle updates, indexing)
 * - Compute services (transaction building, simulation)
 * - Social services (content moderation, community management)
 */

import type { AutomatonDatabase, AutomatonConfig } from '../types.js';
import type { SolanaTreasury } from './solana-treasury.js';

export interface WorkOpportunity {
  id: string;
  type: 'trading' | 'data' | 'compute' | 'social' | 'custom';
  description: string;
  paymentUSDC: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // minutes
  requirements: string[];
  deadline?: string;
}

export interface WorkResult {
  opportunityId: string;
  success: boolean;
  earned: number;
  timeSpent: number;
  signature?: string;
  error?: string;
}

export class WorkEngine {
  private db: AutomatonDatabase;
  private config: AutomatonConfig;
  private treasury: SolanaTreasury;

  constructor(
    db: AutomatonDatabase,
    config: AutomatonConfig,
    treasury: SolanaTreasury
  ) {
    this.db = db;
    this.config = config;
    this.treasury = treasury;
  }

  /**
   * Discover available work opportunities
   */
  async discoverOpportunities(): Promise<WorkOpportunity[]> {
    const opportunities: WorkOpportunity[] = [];

    // Trading opportunities
    opportunities.push({
      id: 'arb-jupiter-raydium',
      type: 'trading',
      description: 'Arbitrage between Jupiter and Raydium DEXs',
      paymentUSDC: 5.0,
      difficulty: 'medium',
      estimatedTime: 5,
      requirements: ['jupiter-sdk', 'raydium-sdk', 'min-capital-100'],
    });

    opportunities.push({
      id: 'market-make-orca',
      type: 'trading',
      description: 'Provide liquidity on Orca USDC-SOL pool',
      paymentUSDC: 10.0,
      difficulty: 'medium',
      estimatedTime: 60,
      requirements: ['orca-sdk', 'min-capital-500'],
    });

    // Data opportunities
    opportunities.push({
      id: 'index-nft-metadata',
      type: 'data',
      description: 'Index NFT metadata from Metaplex collections',
      paymentUSDC: 3.0,
      difficulty: 'easy',
      estimatedTime: 10,
      requirements: ['metaplex-sdk', 'helius-api'],
    });

    opportunities.push({
      id: 'update-pyth-prices',
      type: 'data',
      description: 'Submit price updates to Pyth oracle',
      paymentUSDC: 2.0,
      difficulty: 'easy',
      estimatedTime: 2,
      requirements: ['pyth-sdk'],
    });

    // Compute opportunities
    opportunities.push({
      id: 'simulate-transactions',
      type: 'compute',
      description: 'Simulate and optimize transaction bundles',
      paymentUSDC: 4.0,
      difficulty: 'medium',
      estimatedTime: 5,
      requirements: ['solana-rpc', 'jito-sdk'],
    });

    opportunities.push({
      id: 'build-swap-routes',
      type: 'compute',
      description: 'Calculate optimal swap routes for users',
      paymentUSDC: 3.0,
      difficulty: 'easy',
      estimatedTime: 3,
      requirements: ['jupiter-sdk'],
    });

    // Social opportunities
    opportunities.push({
      id: 'moderate-dao-proposals',
      type: 'social',
      description: 'Review and categorize DAO proposals',
      paymentUSDC: 5.0,
      difficulty: 'medium',
      estimatedTime: 15,
      requirements: ['squads-sdk', 'nlp-model'],
    });

    return opportunities;
  }

  /**
   * Evaluate if agent can perform work
   */
  canPerformWork(opportunity: WorkOpportunity): { can: boolean; reason?: string } {
    // Check if agent has required skills
    const skills = this.db.getSkills(true);
    const skillNames = skills.map(s => s.name);

    for (const req of opportunity.requirements) {
      if (req.startsWith('min-capital-')) {
        const minCapital = parseFloat(req.replace('min-capital-', ''));
        // Would check treasury balance here
        continue;
      }

      // Check if skill is available
      const hasSkill = skillNames.some(name => 
        req.toLowerCase().includes(name.toLowerCase())
      );

      if (!hasSkill) {
        return {
          can: false,
          reason: `Missing required skill: ${req}`,
        };
      }
    }

    return { can: true };
  }

  /**
   * Execute work and earn USDC
   */
  async executeWork(opportunity: WorkOpportunity): Promise<WorkResult> {
    const startTime = Date.now();

    try {
      // Check if can perform
      const canPerform = this.canPerformWork(opportunity);
      if (!canPerform.can) {
        return {
          opportunityId: opportunity.id,
          success: false,
          earned: 0,
          timeSpent: 0,
          error: canPerform.reason,
        };
      }

      // Execute based on type
      let result: WorkResult;
      switch (opportunity.type) {
        case 'trading':
          result = await this.executeTradingWork(opportunity);
          break;
        case 'data':
          result = await this.executeDataWork(opportunity);
          break;
        case 'compute':
          result = await this.executeComputeWork(opportunity);
          break;
        case 'social':
          result = await this.executeSocialWork(opportunity);
          break;
        default:
          result = {
            opportunityId: opportunity.id,
            success: false,
            earned: 0,
            timeSpent: 0,
            error: 'Unknown work type',
          };
      }

      result.timeSpent = (Date.now() - startTime) / 1000 / 60; // minutes

      // Record work completion
      if (result.success) {
        this.recordWorkCompletion(opportunity, result);
      }

      return result;
    } catch (error: any) {
      return {
        opportunityId: opportunity.id,
        success: false,
        earned: 0,
        timeSpent: (Date.now() - startTime) / 1000 / 60,
        error: error.message,
      };
    }
  }

  /**
   * Execute trading work
   */
  private async executeTradingWork(opportunity: WorkOpportunity): Promise<WorkResult> {
    // This would integrate with actual DEX SDKs
    // For now, simulate successful trade
    const earned = opportunity.paymentUSDC;

    return {
      opportunityId: opportunity.id,
      success: true,
      earned,
      timeSpent: opportunity.estimatedTime,
      signature: 'simulated_trade_' + Date.now(),
    };
  }

  /**
   * Execute data work
   */
  private async executeDataWork(opportunity: WorkOpportunity): Promise<WorkResult> {
    // This would integrate with data indexing services
    const earned = opportunity.paymentUSDC;

    return {
      opportunityId: opportunity.id,
      success: true,
      earned,
      timeSpent: opportunity.estimatedTime,
      signature: 'simulated_data_' + Date.now(),
    };
  }

  /**
   * Execute compute work
   */
  private async executeComputeWork(opportunity: WorkOpportunity): Promise<WorkResult> {
    // This would integrate with compute services
    const earned = opportunity.paymentUSDC;

    return {
      opportunityId: opportunity.id,
      success: true,
      earned,
      timeSpent: opportunity.estimatedTime,
      signature: 'simulated_compute_' + Date.now(),
    };
  }

  /**
   * Execute social work
   */
  private async executeSocialWork(opportunity: WorkOpportunity): Promise<WorkResult> {
    // This would integrate with social/DAO platforms
    const earned = opportunity.paymentUSDC;

    return {
      opportunityId: opportunity.id,
      success: true,
      earned,
      timeSpent: opportunity.estimatedTime,
      signature: 'simulated_social_' + Date.now(),
    };
  }

  /**
   * Record work completion
   */
  private recordWorkCompletion(opportunity: WorkOpportunity, result: WorkResult): void {
    // Record in transaction history
    this.db.insertTransaction({
      id: result.signature || `work_${Date.now()}`,
      type: 'transfer_in',
      amountCents: result.earned * 100,
      description: `Work completed: ${opportunity.description}`,
      timestamp: new Date().toISOString(),
    });

    // Update work stats
    const statsStr = this.db.getKV('work_stats') || '{}';
    const stats = JSON.parse(statsStr);

    stats.totalJobs = (stats.totalJobs || 0) + 1;
    stats.totalEarned = (stats.totalEarned || 0) + result.earned;
    stats.totalTimeSpent = (stats.totalTimeSpent || 0) + result.timeSpent;
    stats.successRate = stats.totalJobs > 0 ? (stats.totalJobs / stats.totalJobs) : 1;

    this.db.setKV('work_stats', JSON.stringify(stats));
  }

  /**
   * Get work statistics
   */
  getWorkStats(): {
    totalJobs: number;
    totalEarned: number;
    totalTimeSpent: number;
    successRate: number;
    averageEarnings: number;
  } {
    const statsStr = this.db.getKV('work_stats') || '{}';
    const stats = JSON.parse(statsStr);

    return {
      totalJobs: stats.totalJobs || 0,
      totalEarned: stats.totalEarned || 0,
      totalTimeSpent: stats.totalTimeSpent || 0,
      successRate: stats.successRate || 0,
      averageEarnings: stats.totalJobs > 0 ? stats.totalEarned / stats.totalJobs : 0,
    };
  }

  /**
   * Prioritize work opportunities based on agent's current state
   */
  prioritizeOpportunities(
    opportunities: WorkOpportunity[],
    urgency: 'low' | 'medium' | 'high'
  ): WorkOpportunity[] {
    return opportunities.sort((a, b) => {
      if (urgency === 'high') {
        // Prioritize quick, high-paying jobs
        const scoreA = a.paymentUSDC / a.estimatedTime;
        const scoreB = b.paymentUSDC / b.estimatedTime;
        return scoreB - scoreA;
      } else if (urgency === 'medium') {
        // Balance payment and difficulty
        const scoreA = a.paymentUSDC * (a.difficulty === 'easy' ? 1.5 : 1);
        const scoreB = b.paymentUSDC * (b.difficulty === 'easy' ? 1.5 : 1);
        return scoreB - scoreA;
      } else {
        // Prioritize learning opportunities (harder jobs)
        const difficultyScore = { easy: 1, medium: 2, hard: 3 };
        return difficultyScore[b.difficulty] - difficultyScore[a.difficulty];
      }
    });
  }
}
