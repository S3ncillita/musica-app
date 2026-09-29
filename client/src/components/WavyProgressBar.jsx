// Barra de progreso ondulada (estilo Material 3 Expressive), compartida
// entre FullPlayer y DesktopPlayerPanel. El CSS (.fp-bar y compañía) vive en
// FullPlayer.css, ya que ambos la importan.
const WAVE_PATH = "M0,8 C8,2 16,14 24,8 C32,2 40,14 48,8 C56,2 64,14 72,8 C80,2 88,14 96,8 C104,2 112,14 120,8 C128,2 136,14 144,8 C152,2 160,14 168,8 C176,2 184,14 192,8 C200,2 208,14 216,8 C224,2 232,14 240,8 C248,2 256,14 264,8 C272,2 280,14 288,8 C296,2 304,14 312,8 C320,2 328,14 336,8 C344,2 352,14 360,8 C368,2 376,14 384,8 C392,2 400,14 408,8 C416,2 424,14 432,8 C440,2 448,14 456,8 C464,2 472,14 480,8 C488,2 496,14 504,8 C512,2 520,14 528,8 C536,2 544,14 552,8 C560,2 568,14 576,8";

export default function WavyProgressBar({ buffered, duration, pctProgress, isPlaying, onSeek, onTouchSeek }) {
  return (
    <div className="fp-bar" onClick={onSeek} onTouchMove={onTouchSeek}>
      <div className="fp-bar-buffered" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
      {/* Pista completa: la misma onda, sin recortar, en gris — antes era
          una línea recta, y quedaba raro que solo una parte de la barra
          fuera ondulada. */}
      <svg className="fp-bar-track" height="16" viewBox="0 0 564 16" aria-hidden="true">
        <path d={WAVE_PATH} />
      </svg>
      <div className="fp-bar-wave-clip" style={{ width: `${pctProgress}%` }}>
        <svg className={`fp-bar-wave ${isPlaying ? 'is-playing' : ''}`} height="16" viewBox="0 0 564 16" aria-hidden="true">
          <path d={WAVE_PATH} />
        </svg>
      </div>
      <div className="fp-bar-thumb" style={{ left: `${pctProgress}%` }} />
    </div>
  );
}
