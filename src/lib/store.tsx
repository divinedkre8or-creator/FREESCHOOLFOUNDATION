import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type Announcement,
  type Application,
  type ApplicationStatus,
  type Campaign,
  type Doc,
  type Message,
  type Note,
  type StaffMember,
} from "./fsf";

type State = {
  applications: Application[];
  announcements: Announcement[];
  campaigns: Campaign[];
  staff: StaffMember[];
  currentApplicantId: string | null;
  draft: Partial<Application> | null;
};

const STORAGE_KEY = "fsf-portal-state-v2";

const initialState: State = {
  applications: [],
  announcements: [],
  campaigns: [],
  staff: [],
  currentApplicantId: null,
  draft: null,
};

type Ctx = State & {
  ready: boolean;
  setState: (updater: (s: State) => State) => void;
  saveDraft: (patch: Partial<Application>) => void;
  clearDraft: () => void;
  submitApplication: (app: Application) => void;
  signInApplicant: (id: string) => void;
  signOutApplicant: () => void;
  updateStatus: (id: string, status: ApplicationStatus, by: string, comment?: string) => void;
  addNote: (id: string, note: Note) => void;
  sendMessage: (ids: string[], message: Omit<Message, "id">) => void;
  requestDocument: (id: string, doc: Doc) => void;
  uploadDocument: (id: string, docId: string, fileName: string) => void;
  addAnnouncement: (a: Announcement) => void;
  reset: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<State>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setStateRaw({ ...initialState, ...JSON.parse(raw) });
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }, [state, ready]);

  const setState = useCallback(
    (updater: (s: State) => State) => setStateRaw((s) => updater(s)),
    [],
  );

  const patchApp = useCallback(
    (id: string, fn: (a: Application) => Application) =>
      setState((s) => ({
        ...s,
        applications: s.applications.map((a) => (a.id === id ? fn(a) : a)),
      })),
    [setState],
  );

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      ready,
      setState,
      saveDraft: (patch) => setState((s) => ({ ...s, draft: { ...(s.draft ?? {}), ...patch } })),
      clearDraft: () => setState((s) => ({ ...s, draft: null })),
      submitApplication: (app) =>
        setState((s) => ({
          ...s,
          applications: [app, ...s.applications],
          currentApplicantId: app.id,
          draft: null,
        })),
      signInApplicant: (id) => setState((s) => ({ ...s, currentApplicantId: id })),
      signOutApplicant: () => setState((s) => ({ ...s, currentApplicantId: null })),
      updateStatus: (id, status, by, comment) =>
        patchApp(id, (a) => ({
          ...a,
          status,
          history: [
            ...a.history,
            {
              id: crypto.randomUUID(),
              status,
              at: new Date().toISOString(),
              by,
              ...(comment ? { comment } : {}),
            },
          ],
        })),
      addNote: (id, note) => patchApp(id, (a) => ({ ...a, notes: [note, ...a.notes] })),
      sendMessage: (ids, message) =>
        setState((s) => ({
          ...s,
          applications: s.applications.map((a) =>
            ids.includes(a.id)
              ? { ...a, messages: [{ ...message, id: crypto.randomUUID() }, ...a.messages] }
              : a,
          ),
        })),
      requestDocument: (id, doc) =>
        patchApp(id, (a) => ({ ...a, documents: [...a.documents, doc] })),
      uploadDocument: (id, docId, fileName) =>
        patchApp(id, (a) => ({
          ...a,
          documents: a.documents.map((d) =>
            d.id === docId
              ? { ...d, uploaded: true, name: fileName, uploadedAt: new Date().toISOString() }
              : d,
          ),
        })),
      addAnnouncement: (a) => setState((s) => ({ ...s, announcements: [a, ...s.announcements] })),
      reset: () => setStateRaw(initialState),
    }),
    [state, ready, setState, patchApp],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useCurrentApplication() {
  const { applications, currentApplicantId } = useStore();
  return applications.find((a) => a.id === currentApplicantId) ?? null;
}
