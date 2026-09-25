// Los m4a de YouTube que baja yt-dlp son MP4 fragmentados (DASH: moov con
// mvex + sidx + moof). WebKit (Safari y todos los navegadores de iPhone,
// incluido Chrome, que usan su motor) calcula mal la duración de esos
// archivos y muestra el doble (3:00 → 6:00). Cuando conocemos la duración
// real (viene de la búsqueda), si lo que reporta el <audio> se pasa por
// mucho, mostramos la conocida.
export function saneDuration(reported, known) {
  if (!reported || isNaN(reported)) return known || 0;
  if (known > 0 && reported > known * 1.3) return known;
  return reported;
}
