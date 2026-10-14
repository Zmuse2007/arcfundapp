import { useState } from 'react'
import { ArrowLeft, Clock, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import type { CampaignData } from '../hooks/useCrowdfunding'
import { useContribute, useWithdrawFunds, useClaimRefund, useCancelCampaign, useContribution, useUsdcAllowance, useApproveUsdc } from '../hooks/useCrowdfunding'
import { formatUsdc, parseUsdc } from '@/onchain-money'
import { buildTxExplorerUrl } from '@/onchain-facts'

interface CampaignDetailProps {
  campaign: CampaignData
  onBack: () => void
}

function timeLeft(deadline: bigint): string {
  const now = BigInt(Math.floor(Date.now() / 1000))
  if (deadline <= now) return 'Campaign ended'
  const diff = Number(deadline - now)
  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  if (days > 0) return `${days} days ${hours} hours remaining`
  const mins = Math.floor((diff % 3600) / 60)
  return `${hours}h ${mins}m remaining`
}

export function CampaignDetail({ campaign, onBack }: CampaignDetailProps) {
  const { address } = useAccount()
  const [amount, setAmount] = useState('')

  const [nowSec] = useState(() => BigInt(Math.floor(Date.now() / 1000)))
  const isExpired = campaign.deadline <= nowSec
  const isGoalMet = campaign.totalRaised >= campaign.goalAmount
  const progress = campaign.goalAmount > 0n
    ? Math.min(100, Number((campaign.totalRaised * 10000n) / campaign.goalAmount) / 100)
    : 0

  const isCreator = address?.toLowerCase() === campaign.creator.toLowerCase()

  // Hooks
  const { contribution } = useContribution(campaign.id, address)
  const { allowance } = useUsdcAllowance(address)
  const { approve, isPending: isApprovePending, isConfirming: isApproveConfirming, txHash: approveTxHash } = useApproveUsdc()
  const { contribute, isPending: isContributePending, isConfirming: isContributeConfirming, isSuccess: isContributeSuccess, error: contributeError, txHash: contributeTxHash } = useContribute()
  const { withdrawFunds, isPending: isWithdrawPending, isConfirming: isWithdrawConfirming, isSuccess: isWithdrawSuccess, txHash: withdrawTxHash } = useWithdrawFunds()
  const { claimRefund, isPending: isRefundPending, isConfirming: isRefundConfirming, isSuccess: isRefundSuccess, txHash: refundTxHash } = useClaimRefund()
  const { cancelCampaign, isPending: isCancelPending, isConfirming: isCancelConfirming, isSuccess: isCancelSuccess } = useCancelCampaign()

  const parsedAmount = amount ? parseUsdc(amount) : 0n
  const needsApproval = parsedAmount > 0n && (allowance ?? 0n) < parsedAmount

  const handleContribute = () => {
    if (needsApproval) {
      void approve(parsedAmount)
    } else {
      void contribute(campaign.id, parsedAmount)
    }
  }

  const canContribute = !campaign.cancelled && !isExpired && parsedAmount > 0n
  const canWithdraw = isCreator && !campaign.cancelled && isExpired && isGoalMet && !campaign.claimed
  const canRefund = !isCreator && contribution !== undefined && contribution > 0n && (campaign.cancelled || (isExpired && !isGoalMet))
  const canCancel = isCreator && !campaign.cancelled && !isExpired && !isGoalMet

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium w-fit transition-colors"
        style={{ color: 'var(--muted)' }}
        onMouseOver={e => (e.currentTarget.style.color = 'var(--ink)')}
        onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}
      >
        <ArrowLeft size={16} />
        All campaigns
      </button>

      {/* Main card */}
      <div className="rounded-3xl p-6 flex flex-col gap-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
        {/* Status + title */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase" style={{ color: campaign.cancelled ? 'var(--danger)' : isGoalMet ? 'var(--success)' : isExpired ? 'var(--muted)' : 'var(--accent)', letterSpacing: '0.08em' }}>
              {campaign.cancelled ? 'Cancelled' : isGoalMet ? 'Goal Met' : isExpired ? 'Expired' : 'Active'}
            </span>
          </div>
          <h1 className="display font-bold text-2xl" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            {campaign.title}
          </h1>
          <p className="text-sm mt-1 font-mono" style={{ color: 'var(--subtle)' }}>
            by {campaign.creator.slice(0, 8)}…{campaign.creator.slice(-6)}
          </p>
        </div>

        {/* Description */}
        {campaign.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            {campaign.description}
          </p>
        )}

        {/* Progress */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-end">
            <div>
              <div className="display font-bold text-3xl tabular-nums" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
                {formatUsdc(campaign.totalRaised)}
              </div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>USDC raised</div>
            </div>
            <div className="text-right">
              <div className="tabular-nums font-semibold text-lg" style={{ color: 'var(--ink-2)', letterSpacing: '-0.02em' }}>
                {formatUsdc(campaign.goalAmount)}
              </div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>goal</div>
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: isGoalMet ? 'var(--success)' : 'var(--accent)' }}
            />
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--subtle)' }}>
            <span className="tabular-nums">{progress.toFixed(1)}% funded</span>
            <span className="flex items-center gap-1"><Clock size={11} />{timeLeft(campaign.deadline)}</span>
          </div>
        </div>

        {/* Your contribution */}
        {contribution !== undefined && contribution > 0n && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(26,128,71,0.08)', color: 'var(--success)' }}>
            <CheckCircle size={14} />
            <span>You contributed {formatUsdc(contribution)} USDC</span>
          </div>
        )}
      </div>

      {/* Action card */}
      {!campaign.cancelled && !campaign.claimed && (
        <div className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
          {/* Contribute */}
          {!isExpired && !isGoalMet && (
            <>
              <h2 className="display font-semibold text-base" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                Back this campaign
              </h2>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  className="w-full px-4 py-3 pr-20 rounded-xl text-xl font-semibold outline-none tabular-nums transition-all"
                  style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--focus)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                  USDC
                </span>
              </div>

              {contributeError && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(186,43,76,0.08)', color: 'var(--danger)' }}>
                  <AlertCircle size={14} />
                  {contributeError.message.includes('user rejected') ? 'Transaction cancelled.' : 'Transaction failed. Please try again.'}
                </div>
              )}

              {isContributeSuccess && contributeTxHash && (
                <a
                  href={buildTxExplorerUrl(5042002, contributeTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--success)' }}
                >
                  <CheckCircle size={14} />
                  Contribution confirmed
                  <ExternalLink size={12} />
                </a>
              )}

              {needsApproval && (
                <button
                  onClick={() => void approve(parsedAmount)}
                  disabled={isApprovePending || isApproveConfirming}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
                >
                  {isApprovePending ? 'Confirm in wallet…' : isApproveConfirming ? 'Approving…' : `Allow ${amount} USDC`}
                </button>
              )}

              <button
                onClick={handleContribute}
                disabled={!canContribute || isContributePending || isContributeConfirming || isApprovePending || isApproveConfirming}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: canContribute && !isContributePending && !isContributeConfirming && !needsApproval ? 'var(--accent)' : 'var(--surface-muted)',
                  color: canContribute && !isContributePending && !isContributeConfirming && !needsApproval ? '#fff' : 'var(--subtle)',
                  cursor: canContribute && !needsApproval ? 'pointer' : 'not-allowed',
                }}
              >
                {isContributePending ? 'Confirm in wallet…' : isContributeConfirming ? 'Sending…' : 'Contribute'}
              </button>
            </>
          )}

          {/* Withdraw for creator */}
          {canWithdraw && (
            <>
              <h2 className="display font-semibold text-base" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>Collect funds</h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Your campaign reached its goal. Withdraw {formatUsdc(campaign.totalRaised)} USDC.
              </p>
              {isWithdrawSuccess && withdrawTxHash && (
                <a href={buildTxExplorerUrl(5042002, withdrawTxHash)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--success)' }}>
                  <CheckCircle size={14} />Funds withdrawn<ExternalLink size={12} />
                </a>
              )}
              <button
                onClick={() => void withdrawFunds(campaign.id)}
                disabled={isWithdrawPending || isWithdrawConfirming}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {isWithdrawPending ? 'Confirm in wallet…' : isWithdrawConfirming ? 'Withdrawing…' : `Withdraw ${formatUsdc(campaign.totalRaised)} USDC`}
              </button>
            </>
          )}

          {/* Claim refund */}
          {canRefund && (
            <>
              <h2 className="display font-semibold text-base" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>Claim refund</h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                The campaign {isExpired ? "didn't reach its goal" : 'was cancelled'}. Get back {formatUsdc(contribution)} USDC.
              </p>
              {isRefundSuccess && refundTxHash && (
                <a href={buildTxExplorerUrl(5042002, refundTxHash)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--success)' }}>
                  <CheckCircle size={14} />Refund sent<ExternalLink size={12} />
                </a>
              )}
              <button
                onClick={() => void claimRefund(campaign.id)}
                disabled={isRefundPending || isRefundConfirming}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {isRefundPending ? 'Confirm in wallet…' : isRefundConfirming ? 'Processing…' : `Claim ${formatUsdc(contribution)} USDC`}
              </button>
            </>
          )}

          {/* Cancel */}
          {canCancel && !isCancelSuccess && (
            <button
              onClick={() => void cancelCampaign(campaign.id)}
              disabled={isCancelPending || isCancelConfirming}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}
            >
              {isCancelPending ? 'Confirm in wallet…' : isCancelConfirming ? 'Cancelling…' : 'Cancel campaign'}
            </button>
          )}
        </div>
      )}

      {/* Explorer approvals link */}
      {approveTxHash && (
        <a href={buildTxExplorerUrl(5042002, approveTxHash)} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs self-center" style={{ color: 'var(--subtle)' }}>
          <ExternalLink size={11} />View approval on explorer
        </a>
      )}
    </div>
  )
}
