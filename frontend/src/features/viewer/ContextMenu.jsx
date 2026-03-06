import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * Right-click context menu for the book editor.
 * Shows different actions depending on what was clicked:
 * - empty area: Add Image, Add Text, Paste
 * - photo element: Edit, Cut, Copy, Paste, Delete, Enhance with AI
 * - text element: Edit, Cut, Copy, Paste, Delete, Regenerate with AI
 */
export default function ContextMenu({ x, y, targetType, clipboardItem, blendState, onAction, onClose, containerEl }) {
  const { t } = useTranslation('viewer');
  const menuRef = useRef(null);

  // Close on ESC, click outside, or scroll
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    }
    function handleScroll() { onClose(); }

    window.addEventListener('keydown', handleKey);
    // Use setTimeout so the right-click event itself doesn't trigger close
    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handleClick);
    }, 0);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('keydown', handleKey);
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  // Clamp position so menu stays within container
  useEffect(() => {
    if (!menuRef.current || !containerEl) return;
    const menu = menuRef.current;
    const containerRect = containerEl.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    let adjustedX = x;
    let adjustedY = y;

    if (x + menuRect.width > containerRect.width) {
      adjustedX = containerRect.width - menuRect.width - 4;
    }
    if (y + menuRect.height > containerRect.height) {
      adjustedY = y - menuRect.height;
    }
    if (adjustedX < 0) adjustedX = 4;
    if (adjustedY < 0) adjustedY = 4;

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [x, y, containerEl]);

  const hasPaste = !!clipboardItem;

  let items = [];

  if (targetType === 'empty') {
    items = [
      { key: 'addImage', label: t('contextAddImage'), icon: <ImagePlusIcon /> },
      { key: 'generateAIImage', label: t('contextGenerateAIImage', 'Generate AI Image'), icon: <SparkleIcon />, accent: true },
      { key: 'sep0', separator: true },
      { key: 'addText', label: t('contextAddText'), icon: <TextPlusIcon /> },
      { key: 'addShape', label: t('contextAddShape', 'Add Shape'), icon: <ShapeIcon /> },
      { key: 'pageFrame', label: t('contextPageFrame', 'Page Frame'), icon: <FrameIcon /> },
      { key: 'sep1', separator: true },
      { key: 'paste', label: t('contextPaste'), icon: <PasteIcon />, disabled: !hasPaste },
    ];
  } else if (targetType === 'photo') {
    items = [
      { key: 'edit', label: t('contextEdit'), icon: <EditIcon /> },
      { key: 'toggleBlend', label: blendState?.isBlended ? t('contextDisableBlend') : t('contextEnableBlend'), icon: <BlendIcon />, active: blendState?.isBlended },
      { key: 'removeBg', label: t('contextRemoveBg', 'Remove Background'), icon: <RemoveBgIcon /> },
      { key: 'sep1', separator: true },
      { key: 'cut', label: t('contextCut'), icon: <CutIcon /> },
      { key: 'copy', label: t('contextCopy'), icon: <CopyIcon /> },
      { key: 'paste', label: t('contextPaste'), icon: <PasteIcon />, disabled: !hasPaste },
      { key: 'sep2', separator: true },
      { key: 'delete', label: t('contextDelete'), icon: <DeleteIcon />, danger: true },
      { key: 'sep3', separator: true },
      { key: 'enhanceAI', label: t('contextEnhanceAI'), icon: <SparkleIcon />, accent: true },
    ];
  } else if (targetType === 'text') {
    items = [
      { key: 'edit', label: t('contextEdit'), icon: <EditIcon /> },
      { key: 'sep1', separator: true },
      { key: 'cut', label: t('contextCut'), icon: <CutIcon /> },
      { key: 'copy', label: t('contextCopy'), icon: <CopyIcon /> },
      { key: 'paste', label: t('contextPaste'), icon: <PasteIcon />, disabled: !hasPaste },
      { key: 'sep2', separator: true },
      { key: 'delete', label: t('contextDelete'), icon: <DeleteIcon />, danger: true },
      { key: 'sep3', separator: true },
      { key: 'regenerateAI', label: t('contextRegenerateAI'), icon: <SparkleIcon />, accent: true },
    ];
  }

  const portal = containerEl || document.body;

  return createPortal(
    <motion.div
      ref={menuRef}
      data-context-menu
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.1 }}
      className="absolute z-50 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl shadow-black/50 py-1 overflow-hidden">
        {items.map(item => {
          if (item.separator) {
            return <div key={item.key} className="h-px bg-gray-700/60 my-1 mx-2" />;
          }
          return (
            <button
              key={item.key}
              disabled={item.disabled}
              onClick={() => onAction(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors ${
                item.disabled
                  ? 'text-gray-600 cursor-not-allowed'
                  : item.active
                    ? 'text-violet-300 bg-violet-500/20 hover:bg-violet-500/25'
                    : item.danger
                      ? 'text-red-400 hover:bg-red-500/15'
                      : item.accent
                        ? 'text-violet-400 hover:bg-violet-500/15'
                        : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>
    </motion.div>,
    portal,
  );
}

// ── Icons ────────────────────────────────────────────────────────────

function ImagePlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM12 9v3m0 0v3m0-3h3m-3 0H9" />
    </svg>
  );
}

function TextPlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0-15H6.75m5.25 0h5.25M18 9v3m0 0v3m0-3h3m-3 0h-3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  );
}

function CutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm9.304 0l-1.536.887M17.152 8.25a3 3 0 105.196-3 3 3 0 00-5.196 3zM12 17.25L9.384 9.137m2.616 8.113l2.616-8.113m-2.616 8.113L12 21" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
  );
}

function PasteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function BlendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

function RemoveBgIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 0 3 3 0 004.243 0zm0 0L12 12" />
    </svg>
  );
}

function ShapeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function FrameIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4V4zm2 2v12h12V6H6z" />
    </svg>
  );
}
