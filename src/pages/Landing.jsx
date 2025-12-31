import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import PortalBackground from '../components/portal/PortalBackground'
import './Landing.css'

function StatusPill({ tone, label }) {
  return (
    <span className={`portal-pill portal-pill--${tone}`}>
      <span className="portal-pill__dot" />
      {label}
    </span>
  )
}

function PortalCard({ side, title, subtitle, statusTone, statusLabel, onEnter }) {
  return (
    <button type="button" className={`portal-card portal-card--${side}`} onClick={onEnter}>
      <div className="portal-card__top">
        <div className="portal-card__titleRow">
          <div className="portal-card__title">{title}</div>
          <StatusPill tone={statusTone} label={statusLabel} />
        </div>
        <div className="portal-card__subtitle">{subtitle}</div>
      </div>

      <div className="portal-card__art" aria-hidden="true">
        <div className={`portal-card__glyph portal-card__glyph--${side}`} />
        <div className="portal-card__scanline" />
      </div>

      <div className="portal-card__ctaRow">
        <span className="portal-card__cta">ENTER</span>
        <span className="portal-card__hint">Click to initialize</span>
      </div>
    </button>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { connected, publicKey } = useWallet()
  const { setVisible } = useWalletModal()

  const [pendingRoute, setPendingRoute] = useState(null)

  const operator = useMemo(() => {
    if (!connected || !publicKey) return null
    const base58 = publicKey.toBase58()
    return `${base58.slice(0, 4)}…${base58.slice(-4)}`
  }, [connected, publicKey])

  const requireWalletThen = (route) => {
    if (connected) {
      navigate(route)
      return
    }
    setPendingRoute(route)
    setVisible(true)
  }

  useEffect(() => {
    if (!connected || !pendingRoute) return
    const next = pendingRoute
    setPendingRoute(null)
    navigate(next)
  }, [connected, navigate, pendingRoute])

  return (
    <div className="portal">
      <div className="portal__bg" aria-hidden="true">
        <PortalBackground />
      </div>

      <div className="portal__chrome">
        <div className="portal__topbar">
          <div className="portal__brand">
            <div className="portal__kicker">WEAVE STUDIOS</div>
            <div className="portal__subkicker">MAINFRAME ACCESS</div>
          </div>

          <div className="portal__wallet">
            <div className="portal__walletMeta">
              <div className="portal__walletLabel">{connected ? 'OPERATOR' : 'STATUS'}</div>
              <div className={`portal__walletValue ${connected ? '' : 'portal__walletValue--muted'}`}>
                {connected ? operator : 'DISCONNECTED'}
              </div>
            </div>
            <button
              type="button"
              className="portal__connectBtn"
              onClick={() => setVisible(true)}
              aria-label={connected ? 'Change wallet' : 'Connect wallet'}
            >
              {connected ? 'WALLET' : 'CONNECT'}
            </button>
          </div>
        </div>

        <div className="portal__hero">
          <div className="portal__headline glitch" data-text="CHOOSE YOUR REALITY">
            CHOOSE YOUR REALITY
          </div>
          <div className="portal__tagline">
            One session. Two protocols. A closed-loop economy powered by WEAVE.
          </div>
        </div>

        <div className="portal__split">
          <PortalCard
            side="left"
            title="STREAMWEAVE"
            subtitle="Skill & Velocity // Arcade Wager Protocol"
            statusTone="green"
            statusLabel="LIVE"
            onEnter={() => requireWalletThen('/game')}
          />
          <PortalCard
            side="right"
            title="THE WEAVE"
            subtitle="Capital & Territory // Digital Real Estate"
            statusTone="yellow"
            statusLabel="INITIALIZING"
            onEnter={() => requireWalletThen('/grid')}
          />
        </div>

        <div className="portal__footer">
          <div className="portal__footerLine">
            TIP: Connect once here—your wallet session carries into StreamWeave and The Weave.
          </div>
        </div>
      </div>
    </div>
  )
}
