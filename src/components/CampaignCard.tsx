import { useState } from 'react'
import { Clock, Users, CheckCircle, XCircle } from 'lucide-react'
import type { CampaignData } from '../hooks/useCrowdfunding'
import { formatUsdc } from '@/onchain-money'

interface CampaignCardProps {
  campaign: CampaignData
  userContribution?: bigint
  onClick: () => void
}

function timeLeft(deadline: bigint): string {
  const nowSec = BigInt(Math.floor(Date.now() / 1000))
  if (deadline <= nowSec) return 'Ended'
  const diff = Number(deadline - nowSec)
  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h left`
  const mins = Math.floor((diff % 3600) / 60)
  return `${hours}h ${mins}m left`
}

export function CampaignCard({ campaign, userContribution, onClick }: CampaignCardProps) {
  const [nowSec] = useState(() => BigInt(Math.floor(Date.now() / 1000)))
  const progress = campaign.goalAmount > 0n
    ? Math.min(100, Number((campaign.totalRaised * 10000n) / campaign.goalAmount) / 100)
    : 0
  const isGoalMet = campaign.totalRaised >= campaign.goalAmount
  const isExpired = campaign.deadline <= nowSec
  const statusLabel = campaign.cancelled ? 'Cancelled' : isGoalMet ? 'Goal Met' : isExpired ? 'Expired' : 'Active'
  const statusColor = campaign.cancelled ? 'var(--danger)' : isGoalMet ? 'var(--success)' : isExpired ? 'var(--muted)' : 'var(--accent)'

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-5 transition-all duration-200 flex flex-col gap-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}
      onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: statusColor, letterSpacing: '0.08em' }}>
              {statusLabel}
            </span>
          </div>
          <h3 className="display font-semibold text-base leading-tight" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            {campaign.title}
          </h3>
        </div>
        {isGoalMet && <CheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />}
        {campaign.cancelled && <XCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />}
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--muted)' }}>
        {campaign.description || 'No description provided.'}
      </p>

      {/* Progress */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="tabular-nums font-semibold text-sm" style={{ color: 'var(--ink)' }}>
            {formatUsdc(campaign.totalRaised)} USDC raised
          </span>
          <span className="tabular-nums text-xs font-medium" style={{ color: 'var(--muted)' }}>
            of {formatUsdc(campaign.goalAmount)} goal
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: isGoalMet ? 'var(--success)' : 'var(--accent)' }}
          />
        </div>
        <div className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
          {progress.toFixed(1)}% funded
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--subtle)' }}>
          <Clock size={12} />
          <span>{timeLeft(campaign.deadline)}</span>
        </div>
        {userContribution !== undefined && userContribution > 0n && (
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--accent)' }}>
            <Users size={12} />
            <span>You: {formatUsdc(userContribution)} USDC</span>
          </div>
        )}
      </div>
    </button>
  )
}
