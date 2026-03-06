import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

function useWhiteRemoval(src) {
  const [cleanSrc, setCleanSrc] = useState(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Defer canvas processing so it doesn't block the main thread
      const scheduleWork = typeof requestIdleCallback === 'function'
        ? requestIdleCallback
        : (fn) => setTimeout(fn, 0);
      scheduleWork(() => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Flood-fill from edges: only remove white pixels connected to the border
      // This preserves interior white (eyes, teeth, etc.)
      const visited = new Uint8Array(w * h);
      const isWhitish = (pos) => {
        const idx = pos * 4;
        return d[idx] > 220 && d[idx + 1] > 220 && d[idx + 2] > 220;
      };

      const queue = [];
      // Seed from all border pixels that are white-ish
      for (let x = 0; x < w; x++) {
        if (isWhitish(x)) { queue.push(x); visited[x] = 1; }
        const bottom = (h - 1) * w + x;
        if (isWhitish(bottom)) { queue.push(bottom); visited[bottom] = 1; }
      }
      for (let y = 1; y < h - 1; y++) {
        const left = y * w;
        if (isWhitish(left)) { queue.push(left); visited[left] = 1; }
        const right = y * w + w - 1;
        if (isWhitish(right)) { queue.push(right); visited[right] = 1; }
      }

      // BFS flood fill with 8-directional neighbors
      const offsets = [-1, 1, -w, w, -w - 1, -w + 1, w - 1, w + 1];
      let qi = 0;
      while (qi < queue.length) {
        const pos = queue[qi++];
        const px = pos % w;
        for (const off of offsets) {
          const npos = pos + off;
          if (npos < 0 || npos >= w * h) continue;
          const nx = npos % w;
          if (Math.abs(nx - px) > 1) continue; // prevent row wrapping
          if (visited[npos]) continue;
          if (isWhitish(npos)) {
            visited[npos] = 1;
            queue.push(npos);
          }
        }
      }

      // Make background pixels transparent
      for (let i = 0; i < w * h; i++) {
        if (visited[i]) {
          d[i * 4 + 3] = 0;
        }
      }

      // 2px edge softening pass: anti-alias non-background pixels adjacent to background
      // Compute distance to nearest background pixel (1-2px radius) for smooth edges
      const edgeDist = new Float32Array(w * h);
      edgeDist.fill(3); // default: far from edge
      // Pass 1: mark pixels adjacent to background (distance 1)
      for (let i = 0; i < w * h; i++) {
        if (visited[i]) { edgeDist[i] = 0; continue; }
        const px = i % w;
        for (const off of offsets) {
          const ni = i + off;
          if (ni < 0 || ni >= w * h) continue;
          if (Math.abs((ni % w) - px) > 1) continue;
          if (visited[ni]) { edgeDist[i] = 1; break; }
        }
      }
      // Pass 2: mark pixels at distance 2
      for (let i = 0; i < w * h; i++) {
        if (edgeDist[i] !== 3) continue;
        const px = i % w;
        for (const off of offsets) {
          const ni = i + off;
          if (ni < 0 || ni >= w * h) continue;
          if (Math.abs((ni % w) - px) > 1) continue;
          if (edgeDist[ni] === 1) { edgeDist[i] = 2; break; }
        }
      }
      // Apply gaussian-weighted alpha reduction at edges
      for (let i = 0; i < w * h; i++) {
        if (visited[i]) continue;
        const dist = edgeDist[i];
        if (dist > 2) continue;
        const idx = i * 4;
        const r = d[idx], g = d[idx + 1], b = d[idx + 2];
        if (dist === 1) {
          // Immediate edge: blend based on brightness
          const brightness = Math.min(r, g, b);
          const factor = Math.max(0, (brightness - 180) / 75); // wider range for smoother blend
          d[idx + 3] = Math.round(255 * (1 - factor * 0.8));
        } else if (dist === 2 && r > 210 && g > 210 && b > 210) {
          // 2px out: subtle alpha for near-white pixels only
          const brightness = Math.min(r, g, b);
          const factor = Math.max(0, (brightness - 210) / 45);
          d[idx + 3] = Math.round(255 * (1 - factor * 0.4));
        }
      }

      ctx.putImageData(imageData, 0, 0);
      if (!cancelled) setCleanSrc(canvas.toDataURL('image/png'));
      }); // end scheduleWork
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);

  return cleanSrc;
}

// Scene-based animations for the AI cartoon
const sceneAnimations = {
  analyze: { animate: { y: [0, -3, 0] }, transition: { duration: 2, repeat: Infinity } },
  plan: { animate: { rotate: [-2, 2, -2] }, transition: { duration: 3, repeat: Infinity } },
  write: { animate: { y: [0, -2, 0] }, transition: { duration: 1.5, repeat: Infinity } },
  givebook: { animate: { scale: [1, 1.05, 1] }, transition: { duration: 2, repeat: Infinity } },
  heart: { animate: { scale: [1, 1.08, 1] }, transition: { duration: 1.5, repeat: Infinity } },
  design: { animate: { x: [0, 3, 0] }, transition: { duration: 2, repeat: Infinity } },
  hug: { animate: { scale: [1, 1.03, 1] }, transition: { duration: 1.2, repeat: Infinity } },
  celebrate: { animate: { y: [0, -8, 0] }, transition: { duration: 0.7, repeat: Infinity } },
  walk: { animate: { x: [0, 5, 0] }, transition: { duration: 3, repeat: Infinity } },
};

function getSceneKey(stageIndex) {
  if (stageIndex <= 1) return 'analyze';
  if (stageIndex === 2) return 'plan';
  if (stageIndex === 3) return 'write';
  if (stageIndex === 4) return 'givebook';
  if (stageIndex === 5) return 'heart';
  if (stageIndex === 6) return 'design';
  if (stageIndex === 7) return 'hug';
  if (stageIndex === 8) return 'celebrate';
  return 'walk';
}

export default function MiniCouple({ stageIndex, cartoonImages }) {
  const { t } = useTranslation('wizard');
  const sceneKey = getSceneKey(stageIndex);
  const anim = sceneAnimations[sceneKey] || sceneAnimations.analyze;
  const cleanSrc = useWhiteRemoval(cartoonImages?.[0]);

  // Show AI-generated cartoon
  if (cartoonImages?.length > 0) {
    return (
      <div className="relative w-full h-36 sm:h-44 flex items-center justify-center">
        <motion.img
          src={cleanSrc || cartoonImages[0]}
          alt={t('cartoonCoupleAlt')}
          className="h-36 sm:h-44 w-auto object-contain"
          {...anim}
        />
      </div>
    );
  }

  // Nothing until cartoon is ready
  return null;
}
