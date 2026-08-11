import './EqPanel.css';

const PRESETS = [
  { id: 'flat', label: 'FLAT', low: 0, mid: 0, high: 0 },
  { id: 'pop', label: 'POP', low: -1, mid: 3, high: 2 },
  { id: 'rock', label: 'ROCK', low: 3, mid: 2, high: -1 },
  { id: 'jazz', label: 'JAZZ', low: 2, mid: 0, high: 1 },
  { id: 'clasica', label: 'CLÁSICA', low: 0, mid: -1, high: 3 },
  { id: 'dance', label: 'DANCE', low: 4, mid: 0, high: 3 },
  { id: 'electronica', label: 'ELECTRÓNICA', low: 2, mid: 3, high: 2 },
];

const BANDS = [
  { id: 'low', label: 'BASS' },
  { id: 'mid', label: 'MID' },
  { id: 'high', label: 'TREBLE' },
];

export default function EqPanel({ eq, onApply, onClose }) {
  const activePreset = PRESETS.find(p =>
    p.low === eq.low && p.mid === eq.mid && p.high === eq.high
  )?.id || 'custom';

  return (
    <div className="eq-overlay" onClick={onClose}>
      <div className="eq-panel" onClick={e => e.stopPropagation()}>
        <div className="eq-header">
          <div>
            <h3 className="eq-title">Ecualizador</h3>
            <div className="eq-status">
              <span className="led" />
              <span>BYPASS: {activePreset === 'flat' ? 'ON' : 'OFF'}</span>
            </div>
          </div>
          <button className="eq-close" onClick={onClose} title="Cerrar">✕</button>
        </div>

        <div className="eq-presets">
          {PRESETS.map(p => (
            <button
              key={p.id}
              className={`eq-chip ${eq.preset === p.id ? 'active' : ''}`}
              onClick={() => onApply({ preset: p.id, low: p.low, mid: p.mid, high: p.high })}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="eq-bands">
          {BANDS.map(band => (
            <div key={band.id} className="eq-band">
              <span className="eq-band-label">{band.label}</span>
              <div className="eq-slider-track">
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="1"
                  value={eq[band.id]}
                  onChange={e => {
                    const next = { ...eq, low: eq.low, mid: eq.mid, high: eq.high, [band.id]: Number(e.target.value), preset: 'custom' };
                    onApply(next);
                  }}
                  className="eq-slider"
                />
              </div>
              <span className="eq-band-value">{eq[band.id] > 0 ? '+' : ''}{eq[band.id]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
