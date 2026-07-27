import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Stand-in for real auth until Phase 7 exists — mirrors protocol_dept_app's own
// pre-auth sessionSlice.ts exactly. My Assignments and any status-update action that
// eventually needs "who is doing this" reads from here instead of a JWT-derived
// session. See components/acting-as-picker.tsx, the only place this gets written.
interface SessionState {
  actingAsId: string | null;
}

const initialState: SessionState = {
  actingAsId: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setActingAs(state, action: PayloadAction<string | null>) {
      state.actingAsId = action.payload;
    },
  },
});

export const { setActingAs } = sessionSlice.actions;
export default sessionSlice.reducer;
