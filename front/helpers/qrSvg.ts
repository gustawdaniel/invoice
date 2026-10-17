import QRCode from 'qrcode';

// Synchronous SVG so the print template is complete right after render (printing copies innerHTML)
export function qrSvg(text: string, size = 120): string {
    const {modules} = QRCode.create(text, {errorCorrectionLevel: 'M'});
    const n = modules.size;
    const margin = 2;
    let path = '';
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            if (modules.get(y, x)) path += `M${x + margin} ${y + margin}h1v1h-1z`;
        }
    }
    const box = n + 2 * margin;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${box} ${box}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
