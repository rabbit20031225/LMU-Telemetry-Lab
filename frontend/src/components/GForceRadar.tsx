import React, { useEffect, useRef } from 'react';

interface GForceRadarProps {
  data: any;
  refData?: any;
  cursorIndex: number | null;
  refIdx: number | null;
  hasRef?: boolean;
}

export const GForceRadar = React.memo(({
  data,
  refData,
  cursorIndex,
  refIdx,
  hasRef = false
}: GForceRadarProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 內置遙測值插值函數
  const getVal = (source: any, chan: string, idx: number | null) => {
    if (!source || !source[chan] || idx === null) return null;
    const channel = source[chan];
    if (!Array.isArray(channel)) return null;
    
    const baseIdx = Math.floor(idx);
    const nextIdx = Math.min(channel.length - 1, baseIdx + 1);
    const frac = idx - baseIdx;

    const v1 = channel[baseIdx];
    const v2 = channel[nextIdx];

    if (v1 === undefined) return null;
    if (v2 === undefined) return v1;
    return v1 + (v2 - v1) * frac;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除畫布，準備繪製
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.min(canvas.width, canvas.height) / 2 - 16; // 留出邊界給 L/R/F/B 文字
    const maxG = 3.0; // 最大 G 值範圍

    // 1. 繪製同心圓網格 (1G, 2G, 3G)
    ctx.lineWidth = 1;
    
    const gCircles = [1.0, 2.0, 3.0];
    gCircles.forEach((g) => {
      const r = (g / maxG) * maxRadius;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = g === 3.0 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();

      // 在同心圓上標記 G 值 (放在 45 度角，避開軸線)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = 'bold 8.5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const angle = -Math.PI / 4; // 45度
      const gx = cx + Math.cos(angle) * r;
      const gy = cy + Math.sin(angle) * r;
      ctx.fillText(`${g}G`, gx, gy);
    });

    // 2. 繪製十字交叉軸線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    // 水平軸
    ctx.moveTo(cx - maxRadius, cy);
    ctx.lineTo(cx + maxRadius, cy);
    // 垂直軸
    ctx.moveTo(cx, cy - maxRadius);
    ctx.lineTo(cx, cy + maxRadius);
    ctx.stroke();

    // 3. 繪製方向標籤 (F, B, L, R)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // F (前 / Forward / 加速) - 上方
    ctx.fillText('F', cx, cy - maxRadius - 8);
    // B (後 / Braking / 減速) - 下方
    ctx.fillText('B', cx, cy + maxRadius + 8);
    // L (左 / Left) - 左方
    ctx.fillText('L', cx - maxRadius - 8, cy);
    // R (右 / Right) - 右方
    ctx.fillText('R', cx + maxRadius + 8, cy);

    // 4. 獲取軌跡點函數 (拖尾點增加至 10 個)
    const getTrailPoints = (sourceData: any, activeIdx: number | null) => {
      if (activeIdx === null || !sourceData) return [];
      const points = [];
      const trailLen = 10; // 增加歷史點數
      const step = 1.2;   // 縮減步長讓軌跡更連續
      for (let i = 0; i < trailLen; i++) {
        const idx = Math.max(0, activeIdx - i * step);
        const latG = getVal(sourceData, 'G Force Long', idx);
        const longG = getVal(sourceData, 'G Force Lat', idx);
        if (latG !== null && longG !== null) {
          const px = cx + (latG / maxG) * maxRadius;
          const py = cy - (longG / maxG) * maxRadius;
          points.push({ x: px, y: py });
        }
      }
      return points;
    };

    // 5. 繪製軌跡與發光點
    const drawGForcePoint = (
      points: { x: number; y: number }[], 
      color: string, 
      glowColor: string,
      mainPointColor: string
    ) => {
      if (points.length === 0) return;

      // 5.1 繪製拖尾線 (調粗到 3.5px，透明度調亮到 0.5)
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // 5.2 繪製歷史拖尾點 (半徑放大)
      for (let i = points.length - 1; i > 0; i--) {
        const pt = points[i];
        const alpha = (1 - i / points.length) * 0.5;
        const radius = (1 - i / points.length) * 4 + 1.5;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // 5.3 繪製當前最新發光主點 (放大到 5.5px，發光模糊半徑增加到 14)
      const head = points[0];
      ctx.save();
      ctx.shadowBlur = 14;
      ctx.shadowColor = mainPointColor;
      ctx.fillStyle = mainPointColor;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 在主點外面加一個淡淡的發光環 (放大至 9.5px，線粗 1.5px)
      ctx.strokeStyle = mainPointColor;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 9.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    };

    // 先畫 Reference 點 (黃色拖尾，高亮黃色主點)
    if (hasRef && refData) {
      const refPoints = getTrailPoints(refData, refIdx);
      drawGForcePoint(refPoints, '#eab308', 'rgba(234, 179, 8, 0.45)', '#ffea00');
    }

    // 畫 Current 點 (發光藍色)
    const currentPoints = getTrailPoints(data, cursorIndex);
    drawGForcePoint(currentPoints, '#3b82f6', 'rgba(59, 130, 246, 0.45)', '#60a5fa');

  }, [data, refData, cursorIndex, refIdx, hasRef]);

  return (
    <div className="relative w-full flex justify-center items-center">
      <canvas
        ref={canvasRef}
        width={200}
        height={140}
        className="block"
      />
    </div>
  );
});

GForceRadar.displayName = 'GForceRadar';
