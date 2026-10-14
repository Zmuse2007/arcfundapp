import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { Search, RefreshCw, Layers } from 'lucide-react'
import { Header } from './components/Header'
import { CampaignCard } from './components/CampaignCard'
import { CampaignDetail } from './components/CampaignDetail'
import { CreateCampaignModal } from './components/CreateCampaignModal'
import { useAllCampaigns, useContribution, type CampaignData } from './hooks/useCrowdfunding'
import { toast } from 'sonner'

type FilterTab = 'all' | 'active' | 'funded' | 'ended'

export default function App() {
  const { isConnected, address } = useAccount()
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  const { campaigns, isLoading, refetch } = useAllCampaigns()

  const [nowSec] = useState(() => BigInt(Math.floor(Date.now() / 1000)))

  const filtered = campaigns.filter(c => {
    const matchesSearch = search.length === 0 ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'active') return !c.cancelled && c.deadline > nowSec
    if (filter === 'funded') return c.totalRaised >= c.goalAmount && !c.cancelled
    if (filter === 'ended') return (c.deadline <= nowSec || c.cancelled)
    return true
  })

  const handleCreateSuccess = useCallback(() => {
    setShowCreate(false)
    toast.success('Campaign launched!', { description: 'Your campaign is live on Arc Testnet.' })
    void refetch()
  }, [refetch])

  const isDeployed = Boolean(import.meta.env.VITE_CROWDFUNDING_ADDRESS) && (import.meta.env.VITE_CROWDFUNDING_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      <Header onCreateClick={() => setShowCreate(true)} />

      {selectedCampaign ? (
        <CampaignDetail
          campaign={selectedCampaign}
          onBack={() => {
            setSelectedCampaign(null)
            void refetch()
          }}
        />
      ) : (
        <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Hero */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', letterSpacing: '0.08em' }}>
                Arc Testnet · USDC
              </span>
            </div>
            <h1 className="display font-bold text-4xl sm:text-5xl" style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}>
              Decentralized<br />Crowdfunding
            </h1>
            <p className="text-base max-w-prose" style={{ color: 'var(--muted)' }}>
              Launch or back campaigns funded entirely in USDC. Goals are enforced onchain — contributors get automatic refunds if a campaign doesn't reach its target.
            </p>
            {isConnected && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-1 px-5 py-2.5 rounded-xl text-sm font-semibold w-fit transition-all"
                style={{ background: 'var(--accent)', color: '#fff' }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseOut={e => (e.currentTarget.style.background = 'var(--accent)')}
              >
                Launch a campaign
              </button>
            )}
            {!isConnected && (
              <div className="mt-1 w-fit">
                <ConnectKitButton label="Connect to start" />
              </div>
            )}
          </div>

          {/* Not deployed banner */}
          {!isDeployed && (
            <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: 'rgba(18,45,69,0.06)', border: '1px solid var(--border)' }}>
              <Layers size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Contract not yet deployed</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                  Ask me to "deploy the contract" to push it to Arc Testnet, then campaigns will appear here.
                </p>
              </div>
            </div>
          )}

          {/* Controls */}
          {isDeployed && (
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--subtle)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search campaigns…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--focus)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Filters */}
              <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {(['all', 'active', 'funded', 'ended'] as FilterTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                    style={{
                      background: filter === tab ? 'var(--accent)' : 'transparent',
                      color: filter === tab ? '#fff' : 'var(--muted)',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={() => void refetch()}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          {/* Campaign grid */}
          {isDeployed && (
            <>
              {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-2xl h-48 animate-pulse" style={{ background: 'var(--surface-muted)' }} />
                  ))}
                </div>
              )}

              {!isLoading && filtered.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface-muted)' }}>
                    <Layers size={20} style={{ color: 'var(--subtle)' }} />
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                    {search ? 'No results' : filter !== 'all' ? `No ${filter} campaigns` : 'No campaigns yet'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {isConnected ? 'Be the first to launch one.' : 'Connect your wallet to launch a campaign.'}
                  </p>
                </div>
              )}

              {!isLoading && filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map(campaign => (
                    <CampaignCardWithContribution
                      key={String(campaign.id)}
                      campaign={campaign}
                      address={address}
                      onClick={() => setSelectedCampaign(campaign)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  )
}

function CampaignCardWithContribution({
  campaign, address, onClick
}: {
  campaign: CampaignData
  address?: `0x${string}`
  onClick: () => void
}) {
  const { contribution } = useContribution(campaign.id, address)
  return <CampaignCard campaign={campaign} userContribution={contribution} onClick={onClick} />
}
