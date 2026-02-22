/**
 * ═══════════════════════════════════════════════════════
 *  EFFICIENCE — Chart.js Streaming Plugins (Temps Réel)
 *  Effets visuels d'animation indicant des données live
 * ═══════════════════════════════════════════════════════
 */

// ── Helper: convertir n'importe quel format de couleur CSS en rgba ──
function toRGBA(color, alpha) {
  if (!color || typeof color !== 'string') return `rgba(100, 150, 255, ${alpha})`;
  // Hex color (#rrggbb or #rgb)
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  // rgb(...) → rgba(...)
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  // rgba(...) → replace alpha
  if (color.startsWith('rgba(')) {
    return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
  }
  return `rgba(100, 150, 255, ${alpha})`;
}

// ── Plugin Bar: traits diagonaux animés + éclat lumineux ──
export const streamingBarPlugin = {
  id: 'streamingBar',
  afterDatasetDraw(chart, args) {
    // Only process bar-type datasets (skip line/scatter overlays to avoid NaN crashes)
    try {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(args.index);
    if (meta.type !== 'bar') return;
    const now = Date.now();
    const isHorizontal = chart.options?.indexAxis === 'y';

    meta.data.forEach((bar) => {
      let barLeft, barTop, barWidth, barHeight;

      if (isHorizontal) {
        const { x, y, width, height, base } = bar.getProps(['x', 'y', 'width', 'height', 'base']);
        barLeft = Math.min(base, x);
        const barRight = Math.max(base, x);
        barWidth = barRight - barLeft;
        barTop = y - height / 2;
        barHeight = height;
      } else {
        const { x, y, width, base } = bar.getProps(['x', 'y', 'width', 'base']);
        barWidth = width;
        barLeft = x - width / 2;
        barTop = Math.min(y, base);
        barHeight = Math.abs(base - y);
      }

      if (barWidth < 3 || barHeight < 3 || isNaN(barWidth) || isNaN(barHeight)) return;

      ctx.save();
      try {
      ctx.beginPath();
      ctx.rect(barLeft, barTop, barWidth, barHeight);
      ctx.clip();

      // Traits diagonaux animés
      const stripeW = 16;
      const speed = 0.04;
      const offset = (now * speed) % (stripeW * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2.5;
      const maxDim = Math.max(barWidth, barHeight);
      for (let i = -maxDim - stripeW * 2; i < maxDim + stripeW * 4; i += stripeW) {
        const sx = barLeft + i + offset;
        ctx.beginPath();
        ctx.moveTo(sx, barTop + barHeight);
        ctx.lineTo(sx + barHeight * 0.6, barTop);
        ctx.stroke();
      }

      // Éclat lumineux qui se déplace
      const glowPos = ((now * 0.0003) % 1);
      if (isHorizontal) {
        const glowX = barLeft + glowPos * barWidth;
        const grad = ctx.createRadialGradient(glowX, barTop + barHeight / 2, 0, glowX, barTop + barHeight / 2, barWidth * 0.18);
        grad.addColorStop(0, 'rgba(255,255,255,0.2)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(barLeft, barTop, barWidth, barHeight);
      } else {
        const glowY = barTop + barHeight - glowPos * barHeight;
        const grad = ctx.createRadialGradient(barLeft + barWidth / 2, glowY, 0, barLeft + barWidth / 2, glowY, barHeight * 0.2);
        grad.addColorStop(0, 'rgba(255,255,255,0.22)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(barLeft, barTop, barWidth, barHeight);
      }

      } finally { ctx.restore(); }
    });
    } catch (e) { /* prevent plugin errors from crashing chart render */ }
  },
};

// ── Plugin Line: points lumineux pulsants + trait lumineux glissant ──
export const streamingLinePlugin = {
  id: 'streamingLine',
  afterDatasetDraw(chart, args) {
    if (args.index !== 0) return; // Premier dataset seulement
    try {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const now = Date.now();
    const points = meta.data;

    if (points.length < 2) return;

    ctx.save();

    // Glow pulse sur chaque point
    const pulsePhase = Math.sin(now * 0.003) * 0.5 + 0.5;
    const borderColor = meta._dataset?.borderColor || '#3b82f6';
    
    points.forEach((pt, i) => {
      const x = pt.x;
      const y = pt.y;
      if (isNaN(x) || isNaN(y)) return;

      // Pulse halo autour du point
      const radius = 6 + pulsePhase * 6;
      const alpha = 0.15 + pulsePhase * 0.1;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(255,255,255,${alpha + 0.1})`);
      grad.addColorStop(0.5, toRGBA(borderColor, alpha));
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Trait de lumière qui parcourt la ligne
    const totalLen = points.length - 1;
    const glowProgress = ((now * 0.0004) % 1);
    const glowIdx = glowProgress * totalLen;
    const idx1 = Math.floor(glowIdx);
    const idx2 = Math.min(idx1 + 1, totalLen);
    const frac = glowIdx - idx1;

    if (idx1 < points.length && idx2 < points.length) {
      const gx = points[idx1].x + (points[idx2].x - points[idx1].x) * frac;
      const gy = points[idx1].y + (points[idx2].y - points[idx1].y) * frac;

      if (!isNaN(gx) && !isNaN(gy)) {
        const glowGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 30);
        glowGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
        glowGrad.addColorStop(0.4, 'rgba(139,92,246,0.15)');
        glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(gx, gy, 30, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();
      }
    }

    ctx.restore();
    } catch (e) { /* prevent plugin errors from crashing chart render */ }
  },
};

// ── Plugin Doughnut: shimmer rotatif + segments lumineux ──
export const streamingDoughnutPlugin = {
  id: 'streamingDoughnut',
  afterDatasetDraw(chart, args) {
    if (args.index !== 0) return;
    try {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const now = Date.now();
    const meta = chart.getDatasetMeta(0);
    const arcs = meta.data;

    if (arcs.length === 0) return;

    ctx.save();

    // Shimmer rotatif autour du doughnut
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    const outerRadius = arcs[0]?.outerRadius || 80;
    const innerRadius = arcs[0]?.innerRadius || 50;

    // Rotation angle
    const angle = (now * 0.001) % (Math.PI * 2);

    // Arc lumineux qui tourne
    const shimmerLen = Math.PI * 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, (outerRadius + innerRadius) / 2, angle, angle + shimmerLen);
    ctx.lineWidth = (outerRadius - innerRadius) * 0.9;
    ctx.strokeStyle = 'rgba(255,255,255,0)';

    // Gradient le long de l'arc
    const gx1 = cx + Math.cos(angle) * outerRadius;
    const gy1 = cy + Math.sin(angle) * outerRadius;
    const gx2 = cx + Math.cos(angle + shimmerLen) * outerRadius;
    const gy2 = cy + Math.sin(angle + shimmerLen) * outerRadius;
    const shimGrad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
    shimGrad.addColorStop(0, 'rgba(255,255,255,0)');
    shimGrad.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    shimGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = shimGrad;
    ctx.stroke();

    // Points lumineux pulsants sur les bords des segments
    const pulse = Math.sin(now * 0.003) * 0.5 + 0.5;
    arcs.forEach((arc) => {
      const startAngle = arc.startAngle;
      const endAngle = arc.endAngle;
      const midAngle = (startAngle + endAngle) / 2;
      const midR = (outerRadius + innerRadius) / 2;
      const px = cx + Math.cos(midAngle) * midR;
      const py = cy + Math.sin(midAngle) * midR;

      const dotR = 3 + pulse * 3;
      const dotGrad = ctx.createRadialGradient(px, py, 0, px, py, dotR);
      dotGrad.addColorStop(0, `rgba(255,255,255,${0.25 + pulse * 0.15})`);
      dotGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fillStyle = dotGrad;
      ctx.fill();
    });

    ctx.restore();
    } catch (e) { /* prevent plugin errors from crashing chart render */ }
  },
};

/**
 * Hook helper: Crée un animation loop pour forcer le redraw du chart
 * Usage: useChartAnimation(chartRef, isReady)
 */
export function startChartAnimation(chartRef) {
  let animFrameId;
  const animate = () => {
    try {
      if (chartRef.current && chartRef.current.canvas) {
        chartRef.current.draw();
      }
    } catch (e) { /* ignore draw errors */ }
    animFrameId = requestAnimationFrame(animate);
  };
  animFrameId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animFrameId);
}
