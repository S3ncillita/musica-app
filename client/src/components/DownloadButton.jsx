const fmtMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

export default function DownloadButton({ song, isDownloaded, downloadingKey, downloadProgress, onDownload, onRemoveDownload, onCancelDownload, className = '', size = 16 }) {
  if (!song) return null;
  const key = song.videoId ? `yt_${song.videoId}` : `local_${song.id}`;
  const downloaded = isDownloaded?.(song);
  const downloading = downloadingKey === key;
  const { pct = 0, loaded = 0, total = 0 } = downloadProgress || {};

  const downloadingTitle = total
    ? `Cancelar descarga (${fmtMB(loaded)} / ${fmtMB(total)} MB)`
    : 'Cancelar descarga';

  return (
    <button
      className={`download-btn ${downloaded ? 'downloaded' : ''} ${downloading ? 'downloading' : ''} ${className}`}
      title={downloaded ? 'Quitar descarga' : downloading ? downloadingTitle : 'Descargar para escuchar offline'}
      onClick={(e) => {
        e.stopPropagation();
        if (downloading) {
          onCancelDownload?.();
        } else {
          downloaded ? onRemoveDownload?.(song) : onDownload?.(song);
        }
      }}
    >
      {downloading ? (
        <span className="download-btn-pct download-btn-cancel" style={{ fontSize: size * 0.55 }}>
          <span className="download-btn-pct-text">{pct}%</span>
          <svg className="download-btn-x" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </span>
      ) : downloaded ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
      )}
    </button>
  );
}
