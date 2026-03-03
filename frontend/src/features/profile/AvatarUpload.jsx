import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AvatarUpload({ avatarUrl, initial, onUpload, uploading }) {
  const { t } = useTranslation('profile');
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-20 h-20 rounded-full object-cover border-2 border-gray-700 group-hover:border-violet-500 transition-colors"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center text-white text-2xl font-semibold border-2 border-gray-700 group-hover:border-violet-500 transition-colors">
          {initial}
        </div>
      )}
      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {uploading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Camera className="w-5 h-5 text-white" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        aria-label={t('uploadAvatar')}
      />
    </div>
  );
}
