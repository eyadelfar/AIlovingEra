import { createContext, useContext } from 'react';

const EditModeContext = createContext({
  isEditMode: false,
  chapterIdx: null,
  spreadIdx: null,
  pageToSpreadMap: null,
});

export function EditModeProvider({ children, isEditMode, chapterIdx, spreadIdx, pageToSpreadMap }) {
  return (
    <EditModeContext.Provider value={{ isEditMode, chapterIdx, spreadIdx, pageToSpreadMap }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}
