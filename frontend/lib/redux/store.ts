import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import sessionReducer from './slices/sessionSlice';
import { api } from './api';

// Feature slices for client/UI-only state land here as they're needed. Server state
// goes through the single RTK Query `api` slice instead, per frontend/CLAUDE.md.
export const store = configureStore({
  reducer: {
    session: sessionReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

// Enables refetchOnFocus/refetchOnReconnect — appropriate for a live dashboard that
// should pick up changes another crew member just made.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
