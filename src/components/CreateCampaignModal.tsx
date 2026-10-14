import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { useCreateCampaign } from '../hooks/useCrowdfunding'
import { parseUsdc } from '@/onchain-money'

interface CreateCampaignModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function CreateCampaignModal({ onClose, onSuccess }: CreateCampaignModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [durationDays, setDurationDays] = useState('30')

  const { createCampaign, isPending, isConfirming, isSuccess, error } = useCreateCampaign()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const goalAmountRaw = parseUsdc(goalAmount || '0')
    void createCampaign(title, description, goalAmountRaw, BigInt(durationDays || '30'))
  }

  if (isSuccess) {
    onSuccess()
    return null
  }

  const isLoading = isPending || isConfirming
  const canSubmit = title.trim().length > 0 && Number(goalAmount) > 0 && Number(durationDays) >= 1

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(18,45,69,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-3xl p-6 flex flex-col gap-5" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(18,45,69,0.16)' }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="display font-semibold text-lg" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            New Campaign
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What are you building?"
              maxLength={80}
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-sm font-medium outline-none transition-all"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--focus)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell contributors what you're building and why it matters..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm font-medium outline-none transition-all resize-none"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--focus)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Goal + Duration row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
                Goal (USDC)
              </label>
              <input
                type="number"
                value={goalAmount}
                onChange={e => setGoalAmount(e.target.value)}
                placeholder="0.00"
                min="0.000001"
                step="any"
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-medium outline-none transition-all tabular-nums"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--focus)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
                Duration (days)
              </label>
              <input
                type="number"
                value={durationDays}
                onChange={e => setDurationDays(e.target.value)}
                min="1"
                max="365"
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-medium outline-none transition-all tabular-nums"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--focus)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(186,43,76,0.08)', color: 'var(--danger)' }}>
              <AlertCircle size={14} />
              <span>{error.message.includes('user rejected') ? 'Transaction cancelled.' : 'Transaction failed. Please try again.'}</span>
            </div>
          )}

          {/* CTA */}
          <button
            type="submit"
            disabled={!canSubmit || isLoading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: canSubmit && !isLoading ? 'var(--accent)' : 'var(--surface-muted)',
              color: canSubmit && !isLoading ? '#fff' : 'var(--subtle)',
              cursor: canSubmit && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isPending ? 'Confirm in wallet…' : isConfirming ? 'Creating campaign…' : 'Launch Campaign'}
          </button>
        </form>
      </div>
    </div>
  )
}
