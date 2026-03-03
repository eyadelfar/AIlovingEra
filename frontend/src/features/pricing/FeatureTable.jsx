import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FEATURE_ROWS } from '../../lib/pricing';

export default function FeatureTable() {
  const { t } = useTranslation('pricing');

  const COLS = [
    { key: 'free', label: t('colFree') },
    { key: 'single', label: t('colSingle') },
    { key: 'starter', label: t('colStarter') },
    { key: 'creator', label: t('colCreator') },
    { key: 'pro', label: t('colPro') },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-start py-3 px-4 text-gray-400 font-medium">{t('featureTableHeader')}</th>
            {COLS.map((col) => (
              <th key={col.key} className="text-center py-3 px-4 text-gray-400 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_ROWS.map((row, i) => (
            <tr key={i} className="border-b border-gray-800/50">
              <td className="py-3 px-4 text-gray-300">{row.label}</td>
              {COLS.map((col) => {
                const val = row[col.key];
                return (
                  <td key={col.key} className="text-center py-3 px-4">
                    {val === true ? (
                      <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : val === false ? (
                      <X className="w-4 h-4 text-gray-600 mx-auto" />
                    ) : (
                      <span className="text-gray-300">{val}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
