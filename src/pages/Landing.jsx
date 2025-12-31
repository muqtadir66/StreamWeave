import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

// Dense Starfield with multiple layers and varying brightness
function Starfield() {
    const groupRef = useRef();

    // Multiple star layers for depth
    const layers = useMemo(() => {
        const createLayer = (count, size, speed, color, depth) => {
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);
            const sizes = new Float32Array(count);

            for (let i = 0; i < count; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 300;
                positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
                positions[i * 3 + 2] = -Math.random() * depth - 10;

                const brightness = 0.5 + Math.random() * 0.5;
                const c = new THREE.Color(color);
                colors[i * 3] = c.r * brightness;
                colors[i * 3 + 1] = c.g * brightness;
                colors[i * 3 + 2] = c.b * brightness;

                sizes[i] = size * (0.3 + Math.random() * 0.7);
            }

            return { positions, colors, sizes, speed, depth };
        };

        return [
            createLayer(400, 0.25, 8, '#ffffff', 200),   // Bright close stars
            createLayer(600, 0.15, 5, '#88ccff', 300),   // Medium cyan stars
            createLayer(1000, 0.08, 3, '#6688ff', 400),  // Distant blue stars
            createLayer(500, 0.2, 6, '#ff88cc', 250),    // Pink accent stars
        ];
    }, []);

    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.children.forEach((points, idx) => {
                points.position.z += layers[idx].speed * delta;
                if (points.position.z > 50) {
                    points.position.z = -layers[idx].depth;
                }
            });
        }
    });

    return (
        <group ref={groupRef}>
            {layers.map((layer, idx) => (
                <points key={idx}>
                    <bufferGeometry>
                        <bufferAttribute attach="attributes-position" count={layer.positions.length / 3} array={layer.positions} itemSize={3} />
                        <bufferAttribute attach="attributes-color" count={layer.colors.length / 3} array={layer.colors} itemSize={3} />
                    </bufferGeometry>
                    <pointsMaterial
                        size={layer.sizes[0]}
                        vertexColors
                        transparent
                        opacity={0.9}
                        sizeAttenuation
                        blending={THREE.AdditiveBlending}
                    />
                </points>
            ))}
        </group>
    );
}

// Animated Grid Plane
function GridPlane() {
    const gridRef = useRef();
    const materialRef = useRef();

    useFrame(({ clock }) => {
        if (gridRef.current) {
            gridRef.current.position.z = (clock.elapsedTime * 3) % 8;
        }
        if (materialRef.current) {
            materialRef.current.opacity = 0.15 + Math.sin(clock.elapsedTime) * 0.05;
        }
    });

    return (
        <group ref={gridRef} position={[0, -20, 0]} rotation={[-Math.PI / 2.5, 0, 0]}>
            <gridHelper args={[200, 80, '#0066ff', '#003366']} />
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[200, 200]} />
                <meshBasicMaterial
                    ref={materialRef}
                    color="#0044aa"
                    transparent
                    opacity={0.1}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}

// Floating Particles
function FloatingParticles() {
    const particlesRef = useRef();

    const particles = useMemo(() => {
        const count = 50;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50 - 20;
        }
        return positions;
    }, []);

    useFrame(({ clock }) => {
        if (particlesRef.current) {
            particlesRef.current.rotation.y = clock.elapsedTime * 0.02;
            particlesRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.1) * 0.1;
        }
    });

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={50} array={particles} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.3} color="#00f6ff" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </points>
    );
}

// SVG Icons as components (no emojis)
const RocketIcon = () => (
    <svg viewBox="0 0 64 64" style={{ width: '100%', height: '100%' }}>
        <defs>
            <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f6ff" />
                <stop offset="100%" stopColor="#0088ff" />
            </linearGradient>
            <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <g filter="url(#glow)">
            <path d="M32 4 L40 24 L40 44 L32 52 L24 44 L24 24 Z" fill="url(#rocketGrad)" />
            <path d="M24 36 L16 48 L24 44" fill="#ff4444" />
            <path d="M40 36 L48 48 L40 44" fill="#ff4444" />
            <path d="M28 48 L32 60 L36 48 L32 52 Z" fill="#ff8800" />
            <circle cx="32" cy="24" r="4" fill="#ffffff" opacity="0.9" />
        </g>
    </svg>
);

const GridIcon = () => (
    <svg viewBox="0 0 64 64" style={{ width: '100%', height: '100%' }}>
        <defs>
            <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffcc00" />
                <stop offset="100%" stopColor="#ff8800" />
            </linearGradient>
        </defs>
        <g filter="url(#glow)">
            <rect x="8" y="8" width="20" height="20" fill="url(#gridGrad)" opacity="0.9" />
            <rect x="36" y="8" width="20" height="20" fill="#00f6ff" opacity="0.7" />
            <rect x="8" y="36" width="20" height="20" fill="#ff4444" opacity="0.7" />
            <rect x="36" y="36" width="20" height="20" fill="#00ff88" opacity="0.7" />
            <rect x="6" y="6" width="52" height="52" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
            <line x1="32" y1="6" x2="32" y2="58" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
            <line x1="6" y1="32" x2="58" y2="32" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
        </g>
    </svg>
);

// Protocol Card Component - Sharp edges, premium glass
function ProtocolCard({
    title,
    subtitle,
    status,
    statusColor,
    description,
    icon: Icon,
    buttonText,
    onClick,
    disabled,
    accentColor
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={disabled ? undefined : onClick}
            style={{
                ...styles.card,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.7 : 1,
                transform: hovered && !disabled ? 'translateY(-8px)' : 'translateY(0)',
                borderColor: hovered && !disabled ? accentColor : 'rgba(0, 246, 255, 0.15)',
                boxShadow: hovered && !disabled
                    ? `0 20px 60px ${accentColor}30, 0 0 40px ${accentColor}20, inset 0 1px 0 ${accentColor}40`
                    : 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
        >
            {/* Corner Accents */}
            <div style={{ ...styles.cornerTL, borderColor: accentColor }} />
            <div style={{ ...styles.cornerTR, borderColor: accentColor }} />
            <div style={{ ...styles.cornerBL, borderColor: accentColor }} />
            <div style={{ ...styles.cornerBR, borderColor: accentColor }} />

            {/* Icon */}
            <div style={styles.iconWrapper}>
                <Icon />
            </div>

            {/* Title */}
            <h2 style={{ ...styles.cardTitle, textShadow: `0 0 20px ${accentColor}` }}>{title}</h2>
            <div style={{ ...styles.cardSubtitle, color: accentColor }}>{subtitle}</div>

            {/* Status Badge */}
            <div style={{
                ...styles.statusBadge,
                background: `${statusColor}15`,
                borderColor: statusColor,
                color: statusColor,
            }}>
                <span style={{
                    ...styles.statusDot,
                    background: statusColor,
                    boxShadow: `0 0 10px ${statusColor}`,
                }} />
                {status}
            </div>

            {/* Description */}
            <p style={styles.cardDescription}>{description}</p>

            {/* Action Button */}
            <button
                style={{
                    ...styles.cardButton,
                    borderColor: accentColor,
                    color: hovered && !disabled ? '#000' : accentColor,
                    background: hovered && !disabled ? accentColor : 'transparent',
                }}
                disabled={disabled}
            >
                {buttonText}
            </button>
        </div>
    );
}

// Main Landing Component
function Landing() {
    const navigate = useNavigate();
    const { connected, publicKey, disconnect } = useWallet();
    const { setVisible } = useWalletModal();
    const [glitchActive, setGlitchActive] = useState(false);

    // Periodic glitch effect
    useEffect(() => {
        const triggerGlitch = () => {
            setGlitchActive(true);
            setTimeout(() => setGlitchActive(false), 150);
        };
        const interval = setInterval(() => {
            if (Math.random() > 0.8) triggerGlitch();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={styles.container}>
            <style>
                {`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&family=Rajdhani:wght@500;600;700&display=swap');
          
          @keyframes glitch {
            0%, 90%, 100% { transform: translate(0); filter: none; }
            91% { transform: translate(-3px, 1px) skewX(-1deg); filter: hue-rotate(90deg); }
            93% { transform: translate(3px, -1px) skewX(1deg); filter: hue-rotate(-90deg); }
            95% { transform: translate(-2px, 2px); }
            97% { transform: translate(2px, -2px); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
          }
          
          .landing-scroll {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch;
          }
        `}
            </style>

            {/* Three.js Background - Fixed */}
            <div style={styles.canvasContainer}>
                <Canvas camera={{ position: [0, 0, 50], fov: 60 }} dpr={[1, 2]}>
                    <color attach="background" args={['#000008']} />
                    <fog attach="fog" args={['#000010', 50, 200]} />
                    <Starfield />
                    <GridPlane />
                    <FloatingParticles />
                </Canvas>
                {/* Scanline overlay */}
                <div style={styles.scanlineOverlay} />
                {/* Vignette */}
                <div style={styles.vignette} />
            </div>

            {/* Scrollable Content */}
            <div style={styles.scrollContainer} className="landing-scroll">
                <div style={styles.content}>
                    {/* Header */}
                    <header style={styles.header}>
                        <div style={styles.studioLabel}>
                            <span style={styles.studioLine} />
                            WEAVE STUDIOS PRESENTS
                            <span style={styles.studioLine} />
                        </div>
                        <h1
                            style={{
                                ...styles.mainTitle,
                                animation: glitchActive ? 'glitch 0.15s ease' : 'none',
                            }}
                        >
                            THE WEAVE
                        </h1>
                        <h2 style={styles.ecosystemTitle}>ECOSYSTEM</h2>
                        <div style={styles.tagline}>
                            <span style={styles.taglineBracket}>[</span>
                            CHOOSE YOUR REALITY
                            <span style={styles.taglineBracket}>]</span>
                        </div>
                    </header>

                    {/* Protocol Cards */}
                    <div style={styles.cardsContainer}>
                        <ProtocolCard
                            title="STREAMWEAVE"
                            subtitle="WEAVE REWARD PROTOCOL"
                            status="LIVE"
                            statusColor="#00ff88"
                            accentColor="#00f6ff"
                            description="Skill & Velocity. Wager $WEAVE, pilot your interceptor, and boost through the void to multiply your stake."
                            icon={RocketIcon}
                            buttonText="[ ENTER GAME ]"
                            onClick={() => navigate('/game')}
                            disabled={!connected}
                        />

                        <ProtocolCard
                            title="THE WEAVE"
                            subtitle="DIGITAL TERRITORY PROTOCOL"
                            status="INITIALIZING"
                            statusColor="#ffcc00"
                            accentColor="#ffcc00"
                            description="Capital & Territory. Claim blocks on the digital billboard. Own, advertise, and profit from hostile takeovers."
                            icon={GridIcon}
                            buttonText="[ CLAIM SPACE ]"
                            onClick={() => navigate('/grid')}
                            disabled={!connected}
                        />
                    </div>

                    {/* Wallet Section */}
                    <div style={styles.walletSection}>
                        {connected ? (
                            <div style={styles.connectedContainer}>
                                <div style={styles.walletBadge}>
                                    <div style={styles.walletLabel}>OPERATOR ID</div>
                                    <div style={styles.walletAddress}>
                                        {publicKey?.toBase58().slice(0, 4)}....{publicKey?.toBase58().slice(-4)}
                                    </div>
                                </div>
                                <button onClick={() => disconnect()} style={styles.disconnectBtn}>
                                    [ DISCONNECT ]
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setVisible(true)} style={styles.connectBtn}>
                                <span style={styles.connectBtnIcon}>◈</span>
                                CONNECT WALLET
                            </button>
                        )}
                    </div>

                    {/* Footer */}
                    <footer style={styles.footer}>
                        <div style={styles.footerLine} />
                        <div style={styles.footerText}>
                            POWERED BY <span style={{ color: '#9945FF' }}>SOLANA</span> •
                            FUEL YOUR JOURNEY WITH <span style={{ color: '#00f6ff' }}>$WEAVE</span>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        position: 'fixed',
        inset: 0,
        background: '#000008',
        fontFamily: "'Rajdhani', sans-serif",
        overflow: 'hidden',
    },
    canvasContainer: {
        position: 'absolute',
        inset: 0,
        zIndex: 0,
    },
    scanlineOverlay: {
        position: 'absolute',
        inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        pointerEvents: 'none',
    },
    vignette: {
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)',
        pointerEvents: 'none',
    },
    scrollContainer: {
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
    },
    content: {
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px 60px',
        gap: '40px',
    },
    header: {
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    studioLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
        letterSpacing: '0.5em',
        color: 'rgba(255,255,255,0.4)',
        fontWeight: 700,
    },
    studioLine: {
        width: '40px',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0,246,255,0.5), transparent)',
    },
    mainTitle: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 'clamp(2.5rem, 12vw, 6rem)',
        fontWeight: 900,
        color: '#fff',
        margin: 0,
        letterSpacing: '0.1em',
        textShadow: '0 0 60px rgba(0, 246, 255, 0.6), 0 0 120px rgba(0, 246, 255, 0.3)',
        lineHeight: 1,
    },
    ecosystemTitle: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 'clamp(1.5rem, 8vw, 4rem)',
        fontWeight: 700,
        color: '#00f6ff',
        margin: 0,
        letterSpacing: '0.3em',
        textShadow: '0 0 40px rgba(0, 246, 255, 0.8)',
        marginTop: '-8px',
    },
    tagline: {
        fontSize: 'clamp(0.7rem, 2vw, 0.9rem)',
        letterSpacing: '0.4em',
        color: 'rgba(255,255,255,0.5)',
        fontWeight: 600,
        marginTop: '8px',
    },
    taglineBracket: {
        color: '#00f6ff',
        margin: '0 4px',
    },
    cardsContainer: {
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '800px',
    },
    card: {
        position: 'relative',
        width: '340px',
        maxWidth: 'calc(100vw - 48px)',
        background: 'linear-gradient(180deg, rgba(0, 20, 40, 0.9) 0%, rgba(0, 10, 25, 0.95) 100%)',
        border: '1px solid rgba(0, 246, 255, 0.15)',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
    },
    cornerTL: { position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', borderTop: '2px solid', borderLeft: '2px solid', opacity: 0.6 },
    cornerTR: { position: 'absolute', top: 0, right: 0, width: '20px', height: '20px', borderTop: '2px solid', borderRight: '2px solid', opacity: 0.6 },
    cornerBL: { position: 'absolute', bottom: 0, left: 0, width: '20px', height: '20px', borderBottom: '2px solid', borderLeft: '2px solid', opacity: 0.6 },
    cornerBR: { position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderBottom: '2px solid', borderRight: '2px solid', opacity: 0.6 },
    iconWrapper: {
        width: '80px',
        height: '80px',
        marginBottom: '20px',
        animation: 'float 4s ease-in-out infinite',
    },
    cardTitle: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '1.4rem',
        fontWeight: 800,
        color: '#fff',
        margin: 0,
        letterSpacing: '0.1em',
    },
    cardSubtitle: {
        fontSize: '0.65rem',
        letterSpacing: '0.2em',
        marginTop: '4px',
        fontWeight: 700,
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 16px',
        border: '1px solid',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.15em',
        marginTop: '16px',
    },
    statusDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        animation: 'pulse 1.5s infinite',
    },
    cardDescription: {
        fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.7,
        margin: '20px 0',
    },
    cardButton: {
        background: 'transparent',
        border: '1px solid',
        padding: '12px 32px',
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.15em',
        cursor: 'pointer',
        transition: 'all 0.3s',
        fontFamily: "'Rajdhani', sans-serif",
    },
    walletSection: {
        marginTop: '16px',
    },
    connectedContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
    },
    walletBadge: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '16px 32px',
        background: 'rgba(0, 255, 136, 0.08)',
        border: '1px solid rgba(0, 255, 136, 0.3)',
    },
    walletLabel: {
        fontSize: '0.6rem',
        color: '#00ff88',
        letterSpacing: '0.2em',
        fontWeight: 700,
    },
    walletAddress: {
        fontFamily: 'monospace',
        fontSize: '1.1rem',
        color: '#fff',
        letterSpacing: '0.05em',
    },
    disconnectBtn: {
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '0.7rem',
        cursor: 'pointer',
        letterSpacing: '0.1em',
        padding: '8px',
    },
    connectBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'linear-gradient(135deg, rgba(153, 69, 255, 0.15), rgba(153, 69, 255, 0.05))',
        border: '1px solid #9945FF',
        padding: '18px 40px',
        fontSize: '1rem',
        fontWeight: 700,
        color: '#9945FF',
        letterSpacing: '0.15em',
        cursor: 'pointer',
        transition: 'all 0.3s',
        fontFamily: "'Rajdhani', sans-serif",
    },
    connectBtnIcon: {
        fontSize: '1.2rem',
    },
    footer: {
        marginTop: 'auto',
        paddingTop: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        width: '100%',
        maxWidth: '600px',
    },
    footerLine: {
        width: '100%',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0, 246, 255, 0.3), transparent)',
    },
    footerText: {
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: '0.2em',
        textAlign: 'center',
    },
};

export default Landing;
