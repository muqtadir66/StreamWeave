import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

function BoostStreakHUD() {
  const boostStreak = useGameStore((s) => s.boostStreak);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestone, setMilestone] = useState(0);

  useEffect(() => {
    const currentMilestone = Math.floor(boostStreak / 10);
    if (currentMilestone > 0 && currentMilestone > milestone) {
      setMilestone(currentMilestone);
      setShowMilestone(true);
      setTimeout(() => setShowMilestone(false), 2000);
    } else if (boostStreak === 0) {
      setMilestone(0);
    }
  }, [boostStreak, milestone]);

  if (boostStreak === 0) {
    return null;
  }

  const seconds = Math.floor(boostStreak);
  const milliseconds = Math.floor((boostStreak * 100) % 100);

  return (
    <div
      style={{
        position: 'absolute',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#00f6ff',
        fontFamily: "'Courier New', 'Consolas', monospace",
        fontSize: '24px',
        textShadow: '0 0 10px rgba(0, 246, 255, 0.8)',
        transition: 'opacity 0.5s',
        opacity: boostStreak > 0 ? 1 : 0,
      }}
    >
      <div>
        {seconds.toString().padStart(2, '0')}:{milliseconds.toString().padStart(2, '0')}
      </div>
      {showMilestone && (
        <div
          style={{
            marginTop: '10px',
            fontSize: '18px',
            color: '#ff4444',
            textShadow: '0 0 8px rgba(255, 68, 68, 0.8)',
          }}
        >
          Streak Bonus! +{0.5 * milestone}x
        </div>
      )}
    </div>
  );
}

export default BoostStreakHUD;