// P5PatternDemo.jsx - A standalone demo for testing P5 patterns
import { useState } from 'react';
import P5PatternBackground, { PATTERN_TYPES } from './P5PatternBackground';

const demoColors = [
  ['#3b82f6'],                           // Single blue
  ['#8b5cf6', '#ec4899'],                // Purple + Pink
  ['#f59e0b', '#10b981', '#06b6d4'],     // Orange + Green + Cyan
];

const generateGradientBackground = (colors, seed) => {
  if (colors.length === 0) return '#2a2d35';
  
  const primaryColor = colors[0];
  const secondaryColor = colors[1] || colors[0];
  const angle = (seed * 37) % 360;
  
  return `
    radial-gradient(ellipse at 50% 50%, ${primaryColor}90 0%, transparent 70%),
    radial-gradient(ellipse at 30% 30%, ${secondaryColor}60 0%, transparent 50%),
    linear-gradient(${angle}deg, ${colors.map((c, i) => `${c}cc ${(i / colors.length) * 100}%`).join(', ')}),
    linear-gradient(180deg, ${primaryColor}50 0%, ${secondaryColor}70 100%)
  `;
};

const P5PatternDemo = () => {
  const [selectedPattern, setSelectedPattern] = useState('bokeh');

  return (
    <div style={{ 
      padding: '40px', 
      background: '#1a1d23',
      minHeight: '100vh',
      fontFamily: 'system-ui'
    }}>
      <h1 style={{ 
        color: 'white', 
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        P5.js Pattern Demo - Calendar Day Backgrounds
      </h1>
      
      {/* Pattern Type Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '40px',
        padding: '8px',
        background: '#2a2d35',
        borderRadius: '12px',
        width: 'fit-content',
        margin: '0 auto 40px'
      }}>
        {Object.values(PATTERN_TYPES).map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedPattern(type.id)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: selectedPattern === type.id ? '#3b82f6' : 'transparent',
              color: selectedPattern === type.id ? 'white' : '#9ca3af',
              cursor: 'pointer',
              fontWeight: selectedPattern === type.id ? '600' : '400',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '18px' }}>{type.icon}</span>
            {type.name}
          </button>
        ))}
      </div>

      {/* Pattern Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '40px',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {demoColors.map((colors, colorIdx) => (
          <div key={colorIdx}>
            <h3 style={{ color: 'white', marginBottom: '10px', textAlign: 'center' }}>
              {colors.length} habit{colors.length > 1 ? 's' : ''}
            </h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', justifyContent: 'center' }}>
              {colors.map((c, i) => (
                <div key={i} style={{ 
                  width: '24px', 
                  height: '24px', 
                  background: c, 
                  borderRadius: '6px' 
                }} />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {[1, 2, 3, 4].map(seed => (
              <div 
                key={`${selectedPattern}-${seed}`}
                style={{
                    position: 'relative', 
                    width: '130px', 
                    height: '130px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: generateGradientBackground(colors, seed),
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                  }}
                >
                  <P5PatternBackground
                    colors={colors}
                    seed={seed * 100 + colorIdx * 1000}
                    patternType={selectedPattern}
                  />
                  <span style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    zIndex: 10
                  }}>
                    {seed}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default P5PatternDemo;
