import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../shared/BaseModal';

export default function VideoExportModal({ onConfirm, onClose }) {
  const { t } = useTranslation('viewer');
  const [duration, setDuration] = useState(3);
  const [resolution, setResolution] = useState('1080p');

  const resolutions = {
    '1080p': { w: 1920, h: 1080 },
    '720p': { w: 1280, h: 720 },
  };

  return (
    <BaseModal title={t('exportVideoSettings') || 'Export Video'} onClose={onClose} size="sm">
      <div className="space-y-5">
        {/* Format */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">
            {t('videoFormat') || 'Format'}
          </label>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
            WebM (VP9)
          </div>
        </div>

        {/* Duration per photo */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">
            {t('durationPerSpread') || 'Duration per spread'}: {duration}s
          </label>
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={duration}
            onChange={(e) => setDuration(parseFloat(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>1s</span>
            <span>10s</span>
          </div>
        </div>

        {/* Resolution */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">
            {t('resolution') || 'Resolution'}
          </label>
          <div className="flex gap-2">
            {Object.keys(resolutions).map((res) => (
              <button
                key={res}
                onClick={() => setResolution(res)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  resolution === res
                    ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {res} ({resolutions[res].w}x{resolutions[res].h})
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-700 text-gray-400 hover:border-gray-600 transition-all"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            onClick={() => onConfirm({ duration, resolution: resolutions[resolution] })}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 transition-all"
          >
            {t('exportVideo') || 'Export Video'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
