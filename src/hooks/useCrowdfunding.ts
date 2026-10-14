import { useState } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { erc20Abi } from 'viem'
import { getUsdc } from '@/onchain-facts'

const CHAIN_ID = 5042002 // Arc Testnet

// Contract address is set after deployment — replace with the deployed address
const CONTRACT_ADDRESS = (import.meta.env.VITE_CROWDFUNDING_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`

const USDC_ADDRESS = getUsdc(CHAIN_ID)!.address as `0x${string}`

export interface CampaignData {
  id: bigint
  creator: `0x${string}`
  title: string
  description: string
  goalAmount: bigint
  deadline: bigint
  totalRaised: bigint
  claimed: boolean
  cancelled: boolean
}

const CROWDFUNDING_ABI = [
  {
    type: 'function',
    name: 'createCampaign',
    inputs: [
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'goalAmount', type: 'uint256' },
      { name: 'durationInDays', type: 'uint256' },
    ],
    outputs: [{ name: 'campaignId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'contribute',
    inputs: [
      { name: 'campaignId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawFunds',
    inputs: [{ name: 'campaignId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimRefund',
    inputs: [{ name: 'campaignId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancelCampaign',
    inputs: [{ name: 'campaignId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getAllCampaigns',
    inputs: [],
    outputs: [
      {
        name: 'allCampaigns',
        type: 'tuple[]',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'creator', type: 'address' },
          { name: 'title', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'goalAmount', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'totalRaised', type: 'uint256' },
          { name: 'claimed', type: 'bool' },
          { name: 'cancelled', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getContribution',
    inputs: [
      { name: 'campaignId', type: 'uint256' },
      { name: 'contributor', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'campaignCount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

// ── Read hooks ────────────────────────────────────────────────────────────────

export function useAllCampaigns() {
  const isDeployed = CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000'
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: 'getAllCampaigns',
    chainId: CHAIN_ID,
    query: { enabled: isDeployed },
  })
  return { campaigns: (data as CampaignData[] | undefined) ?? [], isLoading: isDeployed && isLoading, refetch }
}

export function useContribution(campaignId: bigint, contributor?: `0x${string}`) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: 'getContribution',
    args: [campaignId, contributor ?? '0x0000000000000000000000000000000000000000'],
    chainId: CHAIN_ID,
    query: { enabled: !!contributor && CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' },
  })
  return { contribution: data }
}

export function useUsdcAllowance(owner?: `0x${string}`) {
  const { data } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner ?? '0x0000000000000000000000000000000000000000', CONTRACT_ADDRESS],
    chainId: CHAIN_ID,
    query: { enabled: !!owner },
  })
  return { allowance: data }
}

// ── Write hooks ───────────────────────────────────────────────────────────────

export function useCreateCampaign() {
  const { writeContractAsync, isPending } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const { isLoading: isConfirming, isSuccess, error } = useWaitForTransactionReceipt({ hash: txHash })

  const createCampaign = async (title: string, description: string, goalAmount: bigint, durationInDays: bigint) => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CROWDFUNDING_ABI,
        functionName: 'createCampaign',
        args: [title, description, goalAmount, durationInDays],
        chainId: CHAIN_ID,
      })
      setTxHash(hash)
    } catch {
      // surfaced via error state
    }
  }

  return { createCampaign, isPending, isConfirming, isSuccess, error, txHash }
}

export function useApproveUsdc() {
  const { writeContractAsync, isPending } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const approve = async (amount: bigint) => {
    try {
      const hash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, amount],
        chainId: CHAIN_ID,
      })
      setTxHash(hash)
    } catch { }
  }

  return { approve, isPending, isConfirming, isSuccess, txHash }
}

export function useContribute() {
  const { writeContractAsync, isPending } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [error, setError] = useState<Error | null>(null)
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const contribute = async (campaignId: bigint, amount: bigint) => {
    setError(null)
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CROWDFUNDING_ABI,
        functionName: 'contribute',
        args: [campaignId, amount],
        chainId: CHAIN_ID,
      })
      setTxHash(hash)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Transaction failed'))
    }
  }

  return { contribute, isPending, isConfirming, isSuccess, error, txHash }
}

export function useWithdrawFunds() {
  const { writeContractAsync, isPending } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const withdrawFunds = async (campaignId: bigint) => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CROWDFUNDING_ABI,
        functionName: 'withdrawFunds',
        args: [campaignId],
        chainId: CHAIN_ID,
      })
      setTxHash(hash)
    } catch { }
  }

  return { withdrawFunds, isPending, isConfirming, isSuccess, txHash }
}

export function useClaimRefund() {
  const { writeContractAsync, isPending } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const claimRefund = async (campaignId: bigint) => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CROWDFUNDING_ABI,
        functionName: 'claimRefund',
        args: [campaignId],
        chainId: CHAIN_ID,
      })
      setTxHash(hash)
    } catch { }
  }

  return { claimRefund, isPending, isConfirming, isSuccess, txHash }
}

export function useCancelCampaign() {
  const { writeContractAsync, isPending } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const cancelCampaign = async (campaignId: bigint) => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CROWDFUNDING_ABI,
        functionName: 'cancelCampaign',
        args: [campaignId],
        chainId: CHAIN_ID,
      })
      setTxHash(hash)
    } catch { }
  }

  return { cancelCampaign, isPending, isConfirming, isSuccess, txHash }
}

export { useAccount }

