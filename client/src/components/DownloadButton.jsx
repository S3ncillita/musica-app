export default function DownloadButton({ song, isDownloaded, downloadingKey, onDownload, onRemoveDownload, className = '', size = 16 }) {
  if (!song) return null;
  const key = song.videoId ? `yt_${song.videoId}` : `local_${song.id}`;
  const downloaded = isDownloaded?.(song);
  const downloading = downloadingKey === key;

  return (
    <button
      className={`download-btn ${downloaded ? 'downloaded' : ''} ${className}`}
      disabled={downloading}
      title={downloaded ? 'Quitar descarga' : 'Descargar para escuchar offline'}
      onClick={(e) => {
        e.stopPropagation();
        downloaded ? onRemoveDownload?.(song) : onDownload?.(song);
      }}
    >
      {downloading ? (
        <svg className="spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
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
