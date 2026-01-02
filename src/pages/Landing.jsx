import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useGameStore } from '../stores/gameStore';

// Animated Starfield Background
function Starfield() {
    const starsRef = useRef();
    const starCount = 800;

    const positions = useMemo(() => {
        const arr = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            arr[i * 3] = (Math.random() - 0.5) * 200;
            arr[i * 3 + 1] = (Math.random() - 0.5) * 100;
            arr[i * 3 + 2] = -Math.random() * 300;
        }
        return arr;
    }, []);

    useFrame((_, delta) => {
        if (starsRef.current) {
            starsRef.current.position.z += delta * 15;
            if (starsRef.current.position.z > 50) {
                starsRef.current.position.z = -200;
            }
        }
    });

    return (
        <points ref={starsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={starCount}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.25}
                color="#00f6ff"
                transparent
                opacity={1}
                sizeAttenuation
            />
        </points>
    );
}

// Animated Grid Floor
function GridFloor() {
    const gridRef = useRef();

    useFrame(({ clock }) => {
        if (gridRef.current) {
            gridRef.current.position.z = (clock.elapsedTime * 2) % 4;
        }
    });

    const gridLines = useMemo(() => {
        const lines = [];
        const size = 100;
        const divisions = 50;
        const step = size / divisions;

        for (let i = -size / 2; i <= size / 2; i += step) {
            lines.push(new THREE.Vector3(i, -15, -size), new THREE.Vector3(i, -15, size));
        }
        for (let i = -size; i <= size; i += step) {
            lines.push(new THREE.Vector3(-size / 2, -15, i), new THREE.Vector3(size / 2, -15, i));
        }
        return lines;
    }, []);

    return (
        <group ref={gridRef}>
            <lineSegments>
                <bufferGeometry setFromPoints={gridLines} />
                <lineBasicMaterial color="#1a3a5c" transparent opacity={0.4} />
            </lineSegments>
        </group>
    );
}

// Protocol Card Component - Premium Style
function ProtocolCard({
    title,
    subtitle,
    status,
    statusColor,
    previewImage,
    imageZoom = 1,
    imagePosition = 'center',
    buttonText,
    onClick,
    disabled,
    accentColor,
    glowIntensity = 0.3
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className="protocol-card"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={disabled ? undefined : onClick}
            style={{
                ...styles.card,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.7 : 1,
                borderColor: hovered && !disabled ? accentColor : `${accentColor}40`,
                boxShadow: hovered && !disabled
                    ? `0 0 40px ${accentColor}50, inset 0 0 60px ${accentColor}10`
                    : `0 0 20px ${accentColor}${Math.round(glowIntensity * 255).toString(16).padStart(2, '0')}`,
                transform: hovered && !disabled ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
            }}
        >
            {/* Glow accent line at top */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                opacity: hovered ? 1 : 0.5,
                transition: 'opacity 0.3s',
            }} />

            {/* Title Row */}
            <div style={styles.cardHeader}>
                <h2 style={{ ...styles.cardTitle, color: accentColor }}>{title}</h2>
            </div>

            <div style={styles.cardSubtitle}>{subtitle}</div>

            {/* Status Badge */}
            <div style={{
                ...styles.statusBadge,
                background: `${statusColor}20`,
                borderColor: statusColor,
                color: statusColor,
            }}>
                <span style={{
                    ...styles.statusDot,
                    background: statusColor,
                    boxShadow: `0 0 8px ${statusColor}`,
                }} />
                {status}
            </div>

            <div style={styles.divider} />

            {/* Preview Image with Glowing Border */}
            <div style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '3 / 1',
                borderRadius: '6px',
                overflow: 'hidden',
                border: `2px solid ${accentColor}60`,
                boxShadow: `0 0 20px ${accentColor}40, inset 0 0 20px ${accentColor}20`,
            }}>
                <img
                    src={previewImage}
                    alt={`${title} preview`}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: `scale(${imageZoom})`,
                        objectPosition: imagePosition,
                    }}
                />
            </div>

            <div style={styles.divider} />

            {/* Enter Button */}
            <button
                style={{
                    ...styles.cardButton,
                    borderColor: accentColor,
                    color: accentColor,
                    background: hovered && !disabled ? `${accentColor}20` : `${accentColor}08`,
                    boxShadow: hovered && !disabled ? `0 0 20px ${accentColor}30` : 'none',
                }}
                disabled={disabled}
            >
                {buttonText}
            </button>

            {disabled && (
                <div style={styles.lockMessage}>CONNECT WALLET TO ACCESS</div>
            )}
        </div>
    );
}

// Main Landing Component
function Landing() {
    const navigate = useNavigate();
    const { connected, publicKey, disconnect } = useWallet();
    const { setVisible } = useWalletModal();
    const resetGameState = useGameStore((s) => s.reset);

    const [glitchActive, setGlitchActive] = useState(false);

    // Periodic glitch effect
    useEffect(() => {
        const triggerGlitch = () => {
            setGlitchActive(true);
            setTimeout(() => setGlitchActive(false), 200);
        };

        const interval = setInterval(() => {
            if (Math.random() > 0.7) triggerGlitch();
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    const handleConnect = () => setVisible(true);

    // Navigate to game and ensure it starts at menu
    const handleEnterGame = () => {
        if (resetGameState) {
            resetGameState();
        }
        navigate('/game');
    };

    return (
        <div className="landing-container">
            {/* Load Fonts */}
            <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&family=Rajdhani:wght@500;600;700&display=swap');`}
                {`
          @keyframes glitch {
            0%, 90%, 100% { transform: translate(0); filter: none; }
            92% { transform: translate(-2px, 1px); filter: hue-rotate(90deg); }
            94% { transform: translate(2px, -1px); filter: hue-rotate(-90deg); }
            96% { transform: translate(-1px, 2px); }
            98% { transform: translate(1px, -2px); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(0, 246, 255, 0.3); }
            50% { box-shadow: 0 0 40px rgba(0, 246, 255, 0.5); }
          }
        `}
            </style>

            {/* Three.js Background */}
            <div style={styles.canvasContainer}>
                <Canvas camera={{ position: [0, 0, 30], fov: 60 }}>
                    <fog attach="fog" args={['#000205', 20, 120]} />
                    <ambientLight intensity={0.3} />
                    <Starfield />
                    <GridFloor />
                </Canvas>
            </div>

            {/* Content Overlay */}
            <div style={styles.content}>
                {/* Header */}
                <header style={styles.header}>
                    <div style={styles.studioLabel}>WEAVE STUDIOS</div>
                    <h1
                        style={{
                            ...styles.mainTitle,
                            animation: glitchActive ? 'glitch 0.2s ease' : 'none',
                        }}
                    >
                        THE <span style={{ color: '#00f6ff' }}>WEAVE</span> ECOSYSTEM
                    </h1>
                    <div style={styles.tagline}>SELECT YOUR PROTOCOL</div>
                </header>

                {/* Protocol Cards */}
                <div style={styles.cardsContainer}>
                    <ProtocolCard
                        title="STREAMWEAVE"
                        subtitle="WEAVE REWARD PROTOCOL // SOLANA"
                        status="LIVE"
                        statusColor="#00ff88"
                        accentColor="#00f6ff"
                        previewImage="/images/streamweave-preview.jpg"
                        buttonText="[ ENTER GAME ]"
                        onClick={handleEnterGame}
                        disabled={!connected}
                        glowIntensity={0.3}
                    />

                    <ProtocolCard
                        title="THE WEAVE"
                        subtitle="DIGITAL TERRITORY PROTOCOL"
                        status="BETA"
                        statusColor="#ffcc00"
                        accentColor="#ffcc00"
                        previewImage="/images/theweave-preview.jpg"
                        imageZoom={1.3}
                        imagePosition="center bottom"
                        buttonText="[ CLAIM TERRITORY ]"
                        onClick={() => navigate('/grid')}
                        disabled={!connected}
                        glowIntensity={0.25}
                    />
                </div>

                {/* Wallet Section */}
                <div style={styles.walletSection}>
                    {connected ? (
                        <div style={styles.connectedContainer}>
                            <div style={styles.walletCard}>
                                <div style={styles.walletRow}>
                                    <span style={styles.walletLabel}>OPERATOR ID</span>
                                    <span style={styles.walletAddress}>
                                        {publicKey?.toBase58().slice(0, 4)}....{publicKey?.toBase58().slice(-4)}
                                    </span>
                                </div>
                            </div>
                            <button onClick={disconnect} style={styles.disconnectBtn}>
                                [ DISCONNECT ]
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleConnect} style={styles.connectBtn}>
                            [ CONNECT WALLET ]
                        </button>
                    )}
                </div>

                {/* Footer */}
                <footer style={styles.footer}>
                    <div style={styles.footerText}>
                        POWERED BY <span style={{ color: '#9945FF' }}>SOLANA</span> •
                        FUEL WITH <span style={{ color: '#00f6ff' }}>$WEAVE</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

const styles = {
    canvasContainer: {
        position: 'absolute',
        inset: 0,
        zIndex: 0,
    },
    content: {
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        gap: '24px',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
    },
    header: {
        textAlign: 'center',
    },
    studioLabel: {
        fontSize: '0.75rem',
        letterSpacing: '0.5em',
        color: '#555',
        marginBottom: '8px',
        fontWeight: 700,
    },
    mainTitle: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 'clamp(1.8rem, 5vw, 3.5rem)',
        fontWeight: 900,
        color: '#fff',
        margin: 0,
        letterSpacing: '0.06em',
        textShadow: '0 0 40px rgba(0, 246, 255, 0.5)',
    },
    tagline: {
        fontSize: '0.9rem',
        letterSpacing: '0.4em',
        color: 'rgba(255,255,255,0.4)',
        marginTop: '12px',
        fontWeight: 600,
    },
    cardsContainer: {
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '808px',
        boxSizing: 'border-box',
    },
    card: {
        position: 'relative',
        flex: '1 1 300px',
        maxWidth: '380px',
        minWidth: '280px',
        boxSizing: 'border-box',
        background: 'linear-gradient(180deg, rgba(0, 25, 50, 0.95) 0%, rgba(0, 15, 30, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid',
        borderRadius: '8px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px',
    },
    cardTitle: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '1.5rem',
        fontWeight: 800,
        margin: 0,
        letterSpacing: '0.08em',
        textShadow: '0 0 20px currentColor',
    },
    cardSubtitle: {
        fontSize: '0.7rem',
        letterSpacing: '0.18em',
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: 600,
        marginBottom: '12px',
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        borderRadius: '4px',
        border: '1px solid',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        alignSelf: 'flex-start',
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        animation: 'pulse 2s infinite',
    },
    divider: {
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        width: '100%',
        margin: '16px 0',
    },
    featuresList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    featureRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    featureLabel: {
        fontSize: '0.75rem',
        letterSpacing: '0.1em',
        fontWeight: 600,
    },
    featureValue: {
        fontSize: '0.9rem',
        color: '#fff',
        fontWeight: 700,
        fontFamily: "'Rajdhani', sans-serif",
    },
    cardButton: {
        background: 'transparent',
        border: '2px solid',
        padding: '14px 24px',
        fontSize: '0.95rem',
        fontWeight: 700,
        letterSpacing: '0.15em',
        cursor: 'pointer',
        borderRadius: '4px',
        transition: 'all 0.25s ease',
        fontFamily: "'Rajdhani', sans-serif",
        outline: 'none',
        textTransform: 'uppercase',
    },
    lockMessage: {
        fontSize: '0.65rem',
        color: '#ff4444',
        letterSpacing: '0.15em',
        textAlign: 'center',
        marginTop: '10px',
        fontWeight: 600,
    },
    walletSection: {
        marginTop: '8px',
    },
    connectedContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    walletCard: {
        background: 'rgba(0, 255, 136, 0.08)',
        border: '1px solid rgba(0, 255, 136, 0.35)',
        borderRadius: '6px',
        padding: '12px 20px',
    },
    walletRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
    },
    walletLabel: {
        fontSize: '0.7rem',
        color: '#00ff88',
        letterSpacing: '0.12em',
        fontWeight: 600,
    },
    walletAddress: {
        fontFamily: 'monospace',
        fontSize: '1rem',
        color: '#fff',
        fontWeight: 600,
    },
    disconnectBtn: {
        background: 'none',
        border: 'none',
        color: '#555',
        fontSize: '0.7rem',
        cursor: 'pointer',
        letterSpacing: '0.1em',
        padding: '4px 8px',
        fontFamily: "'Rajdhani', sans-serif",
        transition: 'color 0.2s',
    },
    connectBtn: {
        position: 'relative',
        background: 'rgba(153, 69, 255, 0.1)',
        border: '1px solid rgba(153, 69, 255, 0.3)',
        color: '#9945FF',
        padding: '13px 50px',
        fontSize: '1.05rem',
        letterSpacing: '0.2em',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.3s',
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
    },
    footer: {
        marginTop: '12px',
    },
    footerText: {
        fontSize: '0.7rem',
        color: '#444',
        letterSpacing: '0.15em',
        textAlign: 'center',
    },
};

export default Landing;
