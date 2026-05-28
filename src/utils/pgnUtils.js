import i18n from '@/i18n'

export function generateFullPgn(partida) {
    if (!partida) return '';

    let fechaPgn = '????.??.??';
    if (partida.fecha) {
        try {
            const d = new Date(partida.fecha);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            fechaPgn = `${year}.${month}.${day}`;
        } catch (e) {
            console.error('Error al formatear fecha para PGN:', e);
        }
    }

    const headers = [
        `[Event "${partida.evento || i18n.t('pgnUtils.defaultEvent')}"]`,
        `[Site "${partida.lugar || '?'}"]`,
        `[Date "${fechaPgn}"]`,
        `[Round "${partida.ronda || '?'}"]`,
        `[White "${partida.blancas || i18n.t('pgnUtils.defaultWhite')}"]`,
        `[Black "${partida.negras || i18n.t('pgnUtils.defaultBlack')}"]`,
        `[Result "${partida.resultado || '*'}"]`,
    ];

    if (partida.tablero) {
        headers.push(`[Board "${partida.tablero}"]`);
    }

    if (partida.tipo_partida) {
        const tipoStr = partida.tipo_partida === 'PI' ? i18n.t('pgnUtils.typeIntroduced') : i18n.t('pgnUtils.typeRetransmision');
        headers.push(`[Annotator "Partida ${tipoStr}"]`);
    }

    // Unimos cabeceras, dejamos una línea en blanco y añadimos los movimientos
    const moves = partida.pgn || '';

    // Aseguramos que los movimientos no tengan ya cabeceras (limpieza por si acaso)
    const cleanMoves = moves.replace(/\[.*?\]\s*/g, '').trim();

    return headers.join('\n') + '\n\n' + cleanMoves + ' ' + (partida.resultado || '*');
}

/**
 * Descarga un archivo .pgn al navegador del usuario.
 * 
 * @param {Object} partida - Objeto con los datos de la partida.
 */
export function parsePgn(pgnString) {
    if (!pgnString) return []
    const moves = pgnString.replace(/\[.*?\]/g, '').trim().split(/\d+\.\s+/).filter(Boolean)
    return moves.map(m => m.trim())
}

export function downloadPgn(partida) {
    const fullPgn = generateFullPgn(partida);
    const blob = new Blob([fullPgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    const filename = `${partida.blancas}_vs_${partida.negras}_${partida.fecha}.pgn`.replace(/\s+/g, '_');

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
