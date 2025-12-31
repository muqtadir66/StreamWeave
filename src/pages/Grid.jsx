import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import './Grid.css'

const MAP_UNITS = 1000
const BLOCK_UNITS = 10
const BLOCKS_PER_ROW = MAP_UNITS / BLOCK_UNITS // 100

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function xorshift32(seed) {
  let x = seed | 0
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  return x | 0
}

function formatCompactWallet(seed) {
  const hex = (seed >>> 0).toString(16).padStart(8, '0')
  return `Wallet ${hex.slice(0, 2)}x…${hex.slice(-2)}`
}

function getBlockMeta(index, nowMs = Date.now()) {
  const h1 = xorshift32(index * 2654435761)
  const h2 = xorshift32(h1 ^ 0x9e3779b9)
  const owned = (h1 & 7) !== 0 // ~87.5% "owned" for a dense mosaic zoomed out
  const base = 1000
  const multiplier = 1 + ((h2 >>> 0) % 240) / 10 // 1.0x - 25.0x
  const lastPrice = Math.floor(base * multiplier)
  const ownerSeed = xorshift32(h2 ^ 0x51ed270b)
  const lastBuyTs = nowMs - (((h1 >>> 0) % (10 * 24 * 3600)) * 1000) // last 10 days
  return {
    owned,
    lastPrice,
    owner: owned ? formatCompactWallet(ownerSeed) : null,
    lastBuyTs,
    hue: (h2 >>> 0) % 360,
    sat: 55 + ((h1 >>> 0) % 35),
    light: owned ? 38 + ((h2 >>> 0) % 18) : 10,
  }
}

function priceMath(lastPrice) {
  const takeoverPrice = Math.ceil(lastPrice * 1.5)
  const victimPayout = Math.floor(takeoverPrice * 0.8) // 1.2/1.5 = 80%
  const tax = takeoverPrice - victimPayout
  const burn = Math.floor(tax * 0.5)
  const treasury = tax - burn
  return { takeoverPrice, victimPayout, tax, burn, treasury }
}

function WeaveCanvas({ selected, onSelect }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  const [view, setView] = useState(() => ({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    width: 1,
    height: 1,
  }))

  const pointerStateRef = useRef({
    dragging: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    moved: false,
  })

  const scheduleDraw = () => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      draw()
    })
  }

  const worldToScreen = (wx, wy) => ({
    x: view.offsetX + wx * view.scale,
    y: view.offsetY + wy * view.scale,
  })

  const screenToWorld = (sx, sy) => ({
    x: (sx - view.offsetX) / view.scale,
    y: (sy - view.offsetY) / view.scale,
  })

  const fitToView = (width, height) => {
    const scale = Math.min(width, height) / (MAP_UNITS + 80)
    const offsetX = (width - MAP_UNITS * scale) / 2
    const offsetY = (height - MAP_UNITS * scale) / 2
    setView({ scale, offsetX, offsetY, width, height })
  }

  const resize = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1)
    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    fitToView(rect.width, rect.height)
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = view
    ctx.clearRect(0, 0, width, height)

    // Background vignette
    const vg = ctx.createRadialGradient(width * 0.5, height * 0.4, 40, width * 0.5, height * 0.5, Math.max(width, height) * 0.7)
    vg.addColorStop(0, 'rgba(6, 10, 18, 0.35)')
    vg.addColorStop(1, 'rgba(0, 0, 0, 0.9)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, width, height)

    const topLeft = screenToWorld(0, 0)
    const bottomRight = screenToWorld(width, height)

    const minWx = clamp(Math.floor(topLeft.x / BLOCK_UNITS) - 2, 0, BLOCKS_PER_ROW - 1)
    const minWy = clamp(Math.floor(topLeft.y / BLOCK_UNITS) - 2, 0, BLOCKS_PER_ROW - 1)
    const maxWx = clamp(Math.ceil(bottomRight.x / BLOCK_UNITS) + 2, 0, BLOCKS_PER_ROW)
    const maxWy = clamp(Math.ceil(bottomRight.y / BLOCK_UNITS) + 2, 0, BLOCKS_PER_ROW)

    const px = view.scale * BLOCK_UNITS
    const showBorders = px >= 9

    const drawNow = Date.now()
    for (let by = minWy; by < maxWy; by++) {
      for (let bx = minWx; bx < maxWx; bx++) {
        const index = by * BLOCKS_PER_ROW + bx
        const meta = getBlockMeta(index, drawNow)
        const x = bx * BLOCK_UNITS
        const y = by * BLOCK_UNITS
        const s = worldToScreen(x, y)

        if (meta.owned) {
          ctx.fillStyle = `hsl(${meta.hue} ${meta.sat}% ${meta.light}%)`
        } else {
          ctx.fillStyle = 'rgba(20, 26, 34, 0.85)'
        }

        ctx.fillRect(s.x, s.y, px + 0.5, px + 0.5)

        if (showBorders) {
          ctx.strokeStyle = meta.owned ? 'rgba(0, 246, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)'
          ctx.lineWidth = 1
          ctx.strokeRect(s.x, s.y, px, px)
        }
      }
    }

    // Map boundary
    const tl = worldToScreen(0, 0)
    ctx.strokeStyle = 'rgba(0, 246, 255, 0.35)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(tl.x, tl.y, MAP_UNITS * view.scale, MAP_UNITS * view.scale)

    // Selection brackets
    if (selected) {
      const x = selected.x * BLOCK_UNITS
      const y = selected.y * BLOCK_UNITS
      const s = worldToScreen(x, y)
      const size = px
      const pad = Math.max(2, Math.min(10, size * 0.12))
      const seg = Math.max(10, Math.min(22, size * 0.28))

      ctx.save()
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.85)'
      ctx.lineWidth = Math.max(1.5, Math.min(3, size * 0.04))
      ctx.shadowColor = 'rgba(0, 255, 255, 0.55)'
      ctx.shadowBlur = Math.max(6, Math.min(18, size * 0.22))

      const x0 = s.x - pad
      const y0 = s.y - pad
      const x1 = s.x + size + pad
      const y1 = s.y + size + pad

      ctx.beginPath()
      // top-left
      ctx.moveTo(x0, y0 + seg)
      ctx.lineTo(x0, y0)
      ctx.lineTo(x0 + seg, y0)
      // top-right
      ctx.moveTo(x1 - seg, y0)
      ctx.lineTo(x1, y0)
      ctx.lineTo(x1, y0 + seg)
      // bottom-right
      ctx.moveTo(x1, y1 - seg)
      ctx.lineTo(x1, y1)
      ctx.lineTo(x1 - seg, y1)
      // bottom-left
      ctx.moveTo(x0 + seg, y1)
      ctx.lineTo(x0, y1)
      ctx.lineTo(x0, y1 - seg)
      ctx.stroke()
      ctx.restore()
    }
  }

  useEffect(() => {
    resize()
    const onResize = () => resize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    scheduleDraw()
  }, [selected, view.scale, view.offsetX, view.offsetY, view.width, view.height])

  const onWheel = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)

    const direction = e.deltaY > 0 ? -1 : 1
    const factor = direction > 0 ? 1.12 : 0.9

    const nextScale = clamp(view.scale * factor, 0.12, 22)
    const nextOffsetX = sx - world.x * nextScale
    const nextOffsetY = sy - world.y * nextScale
    setView((v) => ({ ...v, scale: nextScale, offsetX: nextOffsetX, offsetY: nextOffsetY }))
  }

  const onPointerDown = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    pointerStateRef.current = {
      dragging: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: view.offsetX,
      startOffsetY: view.offsetY,
      moved: false,
    }
  }

  const onPointerMove = (e) => {
    const st = pointerStateRef.current
    if (!st.dragging || st.pointerId !== e.pointerId) return
    const dx = e.clientX - st.startX
    const dy = e.clientY - st.startY
    if (!st.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) st.moved = true
    setView((v) => ({ ...v, offsetX: st.startOffsetX + dx, offsetY: st.startOffsetY + dy }))
  }

  const onPointerUp = (e) => {
    const st = pointerStateRef.current
    if (st.pointerId !== e.pointerId) return
    pointerStateRef.current.dragging = false
    pointerStateRef.current.pointerId = null

    if (st.moved) return

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)
    if (world.x < 0 || world.y < 0 || world.x >= MAP_UNITS || world.y >= MAP_UNITS) return
    const bx = clamp(Math.floor(world.x / BLOCK_UNITS), 0, BLOCKS_PER_ROW - 1)
    const by = clamp(Math.floor(world.y / BLOCK_UNITS), 0, BLOCKS_PER_ROW - 1)
    onSelect({ x: bx, y: by, index: by * BLOCKS_PER_ROW + bx })
  }

  return (
    <canvas
      ref={canvasRef}
      className="weave-canvas"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  )
}

function formatTimeAgo(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d`
  if (h > 0) return `${h}h`
  if (m > 0) return `${m}m`
  return `${s}s`
}

export default function Grid() {
  const navigate = useNavigate()
  const { connected, publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const simNowRef = useRef(Date.now())
  const [now, setNow] = useState(() => Date.now())

  const [selected, setSelected] = useState(() => ({ x: 12, y: 22, index: 22 * BLOCKS_PER_ROW + 12 }))

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const selectedMeta = useMemo(() => getBlockMeta(selected.index, simNowRef.current), [selected.index])
  const pricing = useMemo(() => priceMath(selectedMeta.lastPrice), [selectedMeta.lastPrice])

  const operator = useMemo(() => {
    if (!connected || !publicKey) return null
    const base58 = publicKey.toBase58()
    return `${base58.slice(0, 4)}…${base58.slice(-4)}`
  }, [connected, publicKey])

  const immunityEndsAt = selectedMeta.lastBuyTs + 60 * 60 * 1000
  const immunityRemaining = Math.max(0, immunityEndsAt - now)

  const sampleEvents = useMemo(
    () => [
      `Wallet 8x…F2 seized Block #4022 for 65,000 WEAVE`,
      `Wallet 1b…3c overwrote Sector (12,22) for 1,500 WEAVE`,
      `Wallet 7a…91 claimed 3 blocks — burn executed`,
      `Treasury inflow: +${(pricing.treasury / 10).toFixed(1)}k WEAVE (simulated)`,
    ],
    [pricing.treasury],
  )

  const tickerText = useMemo(() => sampleEvents.join('   //   '), [sampleEvents])

  return (
    <div className="weave">
      <div className="weave__ticker">
        <div className="weave__tickerInner" title={tickerText}>
          <span>{tickerText}</span>
          <span aria-hidden="true">{tickerText}</span>
        </div>
      </div>

      <div className="weave__hudTop">
        <button type="button" className="weave__hudBtn" onClick={() => navigate('/')}>
          PORTAL
        </button>

        <div className="weave__hudWallet">
          <div className="weave__hudWalletLabel">{connected ? 'OPERATOR' : 'STATUS'}</div>
          <div className={`weave__hudWalletValue ${connected ? '' : 'weave__hudWalletValue--muted'}`}>
            {connected ? operator : 'DISCONNECTED'}
          </div>
          <button type="button" className="weave__hudBtn" onClick={() => setVisible(true)}>
            {connected ? 'WALLET' : 'CONNECT'}
          </button>
        </div>
      </div>

      <div className="weave__stage">
        <div className="weave__canvasWrap">
          <WeaveCanvas selected={selected} onSelect={setSelected} />
          <div className="weave__coords" aria-hidden="true">
            <div className="weave__coordsLabel">TARGET</div>
            <div className="weave__coordsValue">
              ({selected.x},{selected.y}) #{selected.index}
            </div>
          </div>
        </div>

        <aside className="weave__inspector">
          <div className="weave__panelTitle">INSPECTOR</div>

          <div className="weave__kv">
            <div className="weave__k">COORDS</div>
            <div className="weave__v">
              ({selected.x},{selected.y}) — Block #{selected.index}
            </div>
          </div>

          <div className="weave__kv">
            <div className="weave__k">OWNER</div>
            <div className="weave__v">{selectedMeta.owned ? selectedMeta.owner : 'UNCLAIMED'}</div>
          </div>

          <div className="weave__kv">
            <div className="weave__k">LAST PRICE</div>
            <div className="weave__v">{selectedMeta.lastPrice.toLocaleString()} WEAVE</div>
          </div>

          <div className="weave__kv">
            <div className="weave__k">BUYOUT (1.5x)</div>
            <div className="weave__v weave__v--accent">{pricing.takeoverPrice.toLocaleString()} WEAVE</div>
          </div>

          <div className="weave__gridLine" />

          <div className="weave__kv">
            <div className="weave__k">SCALPER YIELD</div>
            <div className="weave__v">
              Victim +{pricing.victimPayout.toLocaleString()} / Tax {pricing.tax.toLocaleString()}
            </div>
          </div>

          <div className="weave__kv">
            <div className="weave__k">TAX SPLIT</div>
            <div className="weave__v">
              Burn {pricing.burn.toLocaleString()} / Treasury {pricing.treasury.toLocaleString()}
            </div>
          </div>

          <div className="weave__gridLine" />

          <div className="weave__kv">
            <div className="weave__k">LAST FLIP</div>
            <div className="weave__v">{formatTimeAgo(now - selectedMeta.lastBuyTs)} ago</div>
          </div>

          <div className="weave__kv">
            <div className="weave__k">IMMUNITY</div>
            <div className="weave__v">
              {immunityRemaining > 0 ? `${Math.ceil(immunityRemaining / 60000)}m remaining` : 'OFFLINE'}
            </div>
          </div>

          <div className="weave__actions">
            <button
              type="button"
              className="weave__takeoverBtn"
              onClick={() => {
                if (!connected) {
                  setVisible(true)
                  return
                }
                alert('Takeover transaction wiring comes next (Anchor + Supabase sync).')
              }}
            >
              TAKEOVER
            </button>
            <button
              type="button"
              className="weave__secondaryBtn"
              onClick={() => alert('Upload + metadata wiring comes next (Supabase Storage).')}
            >
              UPLOAD ART
            </button>
          </div>

          <div className="weave__fineprint">
            Prototype UI: blocks are simulated client-side until `takeover_grid` + sync function are live.
          </div>
        </aside>
      </div>
    </div>
  )
}
