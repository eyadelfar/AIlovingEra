export interface BookState {
  bookDraft: unknown;
  hydrateFromExport: (payload: unknown) => void;
  [key: string]: unknown;
}

declare const useBookStore: import('zustand').UseBoundStore<import('zustand').StoreApi<BookState>>;
export default useBookStore;
