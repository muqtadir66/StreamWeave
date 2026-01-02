import React from 'react';
import { useGridStore } from '../../stores/gridStore';
import './GridHUD.css'; // We will create this CSS file

export default function GridHUD() {
    const selectedBlock = useGridStore(s => s.selectedBlock);

    return (
        <div className="hud-container">
            {/* TOP TICKER */}
            <div className="hud-ticker">
                <span className="ticker-text">
                    SYSTEM ONLINE :: THE WEAVE PROTOCOL V2 :: LIVE MARKET DATA :: SECTOR 7 HOTSPOT DETECTED
                </span>
            </div>

            {/* RIGHT INSPECTOR PANEL - Only shows when a block is selected */}
            <div className={`hud-panel ${selectedBlock ? 'active' : ''}`}>
                <div className="panel-header">
                    <h2>BLOCK DATA</h2>
                    <span className="block-id">ID: #{selectedBlock?.id || '---'}</span>
                </div>

                <div className="panel-content">
                    <div className="data-row">
                        <label>COORDINATES</label>
                        <value>[{selectedBlock?.x}, {selectedBlock?.z}]</value>
                    </div>
                    <div className="data-row">
                        <label>STATUS</label>
                        <value className={selectedBlock?.isOwned ? "status-occupied" : "status-free"}>
                            {selectedBlock?.isOwned ? "OCCUPIED" : "AVAILABLE"}
                        </value>
                    </div>
                    <div className="data-row highlight">
                        <label>VALUE</label>
                        <value>{selectedBlock?.price?.toLocaleString()} $WEAVE</value>
                    </div>

                    {/* Image Preview Placeholder */}
                    <div className="preview-box">
                        {selectedBlock?.isOwned ? (
                            <div className="ad-placeholder">AD CONTENT</div>
                        ) : (
                            <div className="no-signal">NO SIGNAL</div>
                        )}
                    </div>

                    {/* Action Button */}
                    <button className="action-btn">
                        {selectedBlock?.isOwned ? "INITIATE TAKEOVER" : "CLAIM BLOCK"}
                    </button>
                </div>
            </div>

            {/* BOTTOM LEFT STATS */}
            <div className="hud-stats">
                <div>GRID: 100x100</div>
                <div>BLOCKS: 10,000</div>
                <div style={{ color: '#00f6ff' }}>NET: SOLANA MAINNET</div>
            </div>
        </div>
    );
}