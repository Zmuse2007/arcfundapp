import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'


interface HeaderProps {
  onCreateClick: () => void
}

export function Header({ onCreateClick }: HeaderProps) {
  const { isConnected } = useAccount()

  return (
    <header className="sticky top-0 z-50 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)', backdropFilter: 'blur(16px)' }}>
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 13H2L8 2Z" fill="white" />
            </svg>
          </div>
          <span className="display font-semibold text-base tracking-tight" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            FundArc
          </span>
        </div>

        {/* Right: network badge + create + connect */}
        <div className="flex items-center gap-3">
          {/* Network badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: 'var(--surface-muted)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--success)' }} />
            <span>Arc Testnet</span>
          </div>

          {/* Create campaign button */}
          {isConnected && (
            <button
              onClick={onCreateClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
              onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
              onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              New Campaign
            </button>
          )}

          <ConnectKitButton />
        </div>
      </div>
    </header>
  )
}
