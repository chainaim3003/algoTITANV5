/**
 * Centralized Contract Registry
 * Single source of truth for all deployed contract App IDs
 * 
 * This file imports from contracts.json which is auto-updated by deployment scripts
 */

import contractsData from './contracts.json';

export interface ContractConfig {
  appId: number;
  appAddress: string;
  network: 'testnet' | 'mainnet';
  version: string;
  deployedAt: string;
  status: 'active' | 'deprecated' | 'pending';
  description: string;
  contractName: string;
  deprecatedAt?: string;
  reason?: string;
}

export interface ContractsRegistry {
  active: Record<string, ContractConfig>;
  deprecated: Record<string, ContractConfig>;
}

// Type-safe access to contracts
export const CONTRACTS: ContractsRegistry = contractsData as ContractsRegistry;

// Helper to get active escrow contract
export function getActiveEscrowContract(): ContractConfig {
  // Check if V5 is deployed
  if (CONTRACTS.active.ESCROW_V5 && CONTRACTS.active.ESCROW_V5.appId !== 0) {
    return CONTRACTS.active.ESCROW_V5;
  }
  
  // Fallback to V4 if V5 not yet deployed (should not happen in production)
  if (CONTRACTS.deprecated.ESCROW_V4) {
    console.warn('⚠️ Using deprecated ESCROW_V4. Please deploy V5!');
    return CONTRACTS.deprecated.ESCROW_V4;
  }
  
  throw new Error('No escrow contract available!');
}

// Helper to get active marketplace
export function getActiveMarketplaceContract(): ContractConfig {
  return CONTRACTS.active.MARKETPLACE_V3;
}

// Helper to get active registry
export function getActiveRegistryContract(): ContractConfig {
  return CONTRACTS.active.REGISTRY_V3;
}

// Helper to get lending contract
export function getLendingContract(): ContractConfig {
  return CONTRACTS.active.LENDING;
}

// Helper to get all active contracts
export function getAllActiveContracts(): ContractConfig[] {
  return Object.values(CONTRACTS.active).filter(c => c.status === 'active');
}

// Helper to get all deprecated contracts
export function getAllDeprecatedContracts(): ContractConfig[] {
  return Object.values(CONTRACTS.deprecated);
}

// Helper to get contract by name
export function getContractByName(name: string): ContractConfig | undefined {
  return CONTRACTS.active[name] || CONTRACTS.deprecated[name];
}
