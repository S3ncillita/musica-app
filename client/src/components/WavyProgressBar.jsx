import { useEffect, useRef, useState } from 'react';

// Barra de progreso ondulada (estilo Material 3 Expressive), compartida
// entre FullPlayer y DesktopPlayerPanel. El CSS (.fp-bar y compañía) vive en
// FullPlayer.css, ya que ambos la importan.

const WAVE_PERIOD = 24;
const WAVE_MID = 8;

// Onda en píxeles reales: un número entero de períodos que llena justo el
// ancho disponible (así arranca y termina en la línea media), más un período
// extra a la derecha. Ese extra es lo que "entra" cuando la animación corre
// la fase hacia la izquierda; sin él, el final de la barra quedaba vacío y
// la onda parecía no tener tope.
function buildWavePath(width, extra) {
  const periods = Math.max(1, Math.round(width / WAVE_PERIOD));
  const p = width / periods;
  let d = `M0,${WAVE_MID}`;
  for (let i = 0; i < periods + extra; i++) {
    const x = i * p;
    d += ` C${x + p / 3},2 ${x + (2 * p) / 3},14 ${x + p},${WAVE_MID}`;
  }
  return { d, period: p };
}

export default function WavyProgressBar({ buffered, duration, pctProgress, isPlaying, onSeek, onTouchSeek }) {
  const innerRef = useRef(null);
  const [innerWidth, setInnerWidth] = useState(0);

  // Se mide el área interna (la barra menos el margen de cada lado, que deja
  // lugar para las puntas redondeadas) y se genera la onda a ese ancho.
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setInnerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wave = innerWidth ? buildWavePath(innerWidth, 1) : { d: '', period: WAVE_PERIOD };
  const trackD = innerWidth ? buildWavePath(innerWidth, 0).d : '';
  const { d, period } = wave;
  const svgWidth = innerWidth + period;
  const progressPx = (innerWidth * pctProgress) / 100;

  return (
    <div className="fp-bar" onClick={onSeek} onTouchMove={onTouchSeek}>
      <div className="fp-bar-inner" ref={innerRef}>
        <div className="fp-bar-buffered" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
        <svg
          className="fp-bar-track"
          width={innerWidth}
          height="16"
          viewBox={`0 0 ${innerWidth} 16`}
          aria-hidden="true"
        >
          <path d={trackD} />
        </svg>
        <div className="fp-bar-wave-clip" style={{ width: progressPx }}>
          <svg
            className={`fp-bar-wave ${isPlaying ? 'is-playing' : ''}`}
            style={{ '--wave-period': `${period}px` }}
            width={svgWidth}
            height="16"
            viewBox={`0 0 ${svgWidth} 16`}
            aria-hidden="true"
          >
            <path d={d} />
          </svg>
        </div>
        <div className="fp-bar-thumb" style={{ left: progressPx }} />
      </div>
    </div>
  );
}
