// Offline-first checklist store. Everything is written to the device first,
// then pushed to Supabase whenever the tablet is online.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { supabase } from '../supabase';
import { uploadPhoto } from '../photos';
import type {
  ChecklistItem, ChecklistResponse, ChecklistRun, ChecklistSchedule,
  ChecklistSlot, ChecklistTemplate,
} from '../../types/checklists';
import { evaluate, localDateString, uuid } from './logic';

const CACHE_KEY = '@pattyshack_checklists_v1';
const PHOTO_BUCKET = 'checklist-photos';

interface Persisted {
  templates: ChecklistTemplate[];
  items: ChecklistItem[];
  schedules: ChecklistSchedule[];
  runs: Record<string, ChecklistRun>;
  responses: Record<string, Record<string, ChecklistResponse>>; // runId -> itemId -> response
  dirtyRuns: string[];
  dirtyResponses: string[]; // `${runId}|${itemId}`
  lastSynced: string | null;
}

interface ChecklistState extends Persisted {
  loaded: boolean;
  online: boolean;
  syncing: boolean;
  syncError: string | null;

  load: (locationId: string) => Promise<void>;
  refresh: (locationId: string) => Promise<void>;
  sync: () => Promise<void>;

  itemsFor: (templateId: string) => ChecklistItem[];
  startRun: (slot: ChecklistSlot, locationId: string, userId: string) => Promise<ChecklistRun>;
  setResponse: (runId: string, item: ChecklistItem, patch: Partial<ChecklistResponse>, userId: string) => Promise<void>;
  completeRun: (runId: string, userId: string) => Promise<void>;
  signOff: (runId: string, userId: string, note: string) => Promise<void>;
  editCompleted: (runId: string, item: ChecklistItem, patch: Partial<ChecklistResponse>, userId: string, note: string) => Promise<void>;
}

const empty: Persisted = {
  templates: [], items: [], schedules: [], runs: {}, responses: {},
  dirtyRuns: [], dirtyResponses: [], lastSynced: null,
};

function pick(s: ChecklistState): Persisted {
  const { templates, items, schedules, runs, responses, dirtyRuns, dirtyResponses, lastSynced } = s;
  return { templates, items, schedules, runs, responses, dirtyRuns, dirtyResponses, lastSynced };
}

const isLocalUri = (u?: string | null) => !!u && !/^https?:\/\//.test(u);

async function uploadLocal(uri: string, folder: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      const blob = await (await fetch(uri)).blob();
      const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg' });
      if (error) throw error;
      return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(data.path).data.publicUrl;
    } catch (e) {
      console.warn('photo upload failed', e);
      return null;
    }
  }
  return uploadPhoto({ id: uri, uri, width: 0, height: 0, fileName: uri.split('/').pop() || 'photo.jpg' }, PHOTO_BUCKET, folder);
}

let netUnsub: (() => void) | null = null;

export const useChecklists = create<ChecklistState>((set, get) => {
  const persist = async () => {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(pick(get())));
  };

  const markRun = (run: ChecklistRun) => {
    set(s => ({
      runs: { ...s.runs, [run.id]: run },
      dirtyRuns: s.dirtyRuns.includes(run.id) ? s.dirtyRuns : [...s.dirtyRuns, run.id],
    }));
  };

  const markResponse = (r: ChecklistResponse) => {
    const key = `${r.run_id}|${r.item_id}`;
    set(s => ({
      responses: { ...s.responses, [r.run_id]: { ...(s.responses[r.run_id] || {}), [r.item_id]: r } },
      dirtyResponses: s.dirtyResponses.includes(key) ? s.dirtyResponses : [...s.dirtyResponses, key],
    }));
  };

  const afterWrite = async () => {
    await persist();
    if (get().online) get().sync();
  };

  return {
    ...empty,
    loaded: false,
    online: true,
    syncing: false,
    syncError: null,

    load: async (locationId) => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) set({ ...empty, ...JSON.parse(raw) });
      } catch (e) {
        console.warn('checklist cache read failed', e);
      }
      set({ loaded: true });

      if (!netUnsub) {
        netUnsub = NetInfo.addEventListener(state => {
          const online = state.isConnected === true && state.isInternetReachable !== false;
          const wasOffline = !get().online;
          set({ online });
          if (online && wasOffline) get().sync();
        });
      }
      await get().refresh(locationId);
    },

    refresh: async (locationId) => {
      if (!get().online) return;
      try {
        await get().sync(); // push local work first so it is not overwritten
        const today = localDateString();
        const since = localDateString(new Date(Date.now() - 2 * 86400000));
        const [t, i, s, r] = await Promise.all([
          supabase.from('checklist_templates').select('*').eq('active', true).order('name'),
          supabase.from('checklist_items').select('*').order('position'),
          supabase.from('checklist_schedules').select('*').eq('active', true),
          supabase.from('checklist_runs').select('*').eq('location_id', locationId).gte('run_date', since).lte('run_date', today),
        ]);
        const err = t.error || i.error || s.error || r.error;
        if (err) throw err;

        const runIds = (r.data || []).map(x => x.id);
        const resp = runIds.length
          ? await supabase.from('checklist_responses').select('*').in('run_id', runIds)
          : { data: [] as ChecklistResponse[], error: null };
        if (resp.error) throw resp.error;

        set(state => {
          const runs = { ...state.runs };
          for (const run of r.data as ChecklistRun[]) {
            if (!state.dirtyRuns.includes(run.id)) runs[run.id] = run;
          }
          const responses = { ...state.responses };
          for (const x of resp.data as ChecklistResponse[]) {
            if (state.dirtyResponses.includes(`${x.run_id}|${x.item_id}`)) continue;
            responses[x.run_id] = { ...(responses[x.run_id] || {}), [x.item_id]: x };
          }
          // Drop runs older than a week from the device
          const cutoff = localDateString(new Date(Date.now() - 7 * 86400000));
          for (const id of Object.keys(runs)) {
            if (runs[id].run_date < cutoff && !state.dirtyRuns.includes(id)) { delete runs[id]; delete responses[id]; }
          }
          return {
            templates: t.data as ChecklistTemplate[],
            items: (i.data as ChecklistItem[]).map(it => ({
              ...it,
              min_value: it.min_value == null ? null : Number(it.min_value),
              max_value: it.max_value == null ? null : Number(it.max_value),
            })),
            schedules: s.data as ChecklistSchedule[],
            runs, responses,
            lastSynced: new Date().toISOString(),
            syncError: null,
          };
        });
        await persist();
      } catch (e: any) {
        set({ syncError: e?.message || 'Could not reach the server. Working offline.' });
      }
    },

    sync: async () => {
      const state = get();
      if (state.syncing || !state.online) return;
      if (!state.dirtyRuns.length && !state.dirtyResponses.length) return;
      set({ syncing: true });
      try {
        // 1) Make sure every run row exists before its answers upload.
        //    Completed runs are inserted "in progress" first (no-op if already
        //    on the server) so offline answers are not blocked by the
        //    "no silent edits to finished lists" rule. They are marked
        //    complete in step 4, after their answers are saved.
        const runIds = [...get().dirtyRuns];
        const runs = runIds.map(id => get().runs[id]).filter(Boolean);
        const open = runs.filter(r => r.status !== 'complete');
        const finished = runs.filter(r => r.status === 'complete');
        if (open.length) {
          const { error } = await supabase.from('checklist_runs').upsert(open);
          if (error) throw error;
        }
        if (finished.length) {
          const staged = finished.map(r => ({
            ...r, status: 'in_progress', completed_by: null, completed_at: null, signoff_by: null, signoff_at: null, signoff_note: null,
          }));
          const { error } = await supabase.from('checklist_runs').upsert(staged, { ignoreDuplicates: true });
          if (error) throw error;
        }

        // 2) Upload any photos still sitting on the device
        const keys = [...get().dirtyResponses];
        for (const key of keys) {
          const [runId, itemId] = key.split('|');
          const r = get().responses[runId]?.[itemId];
          if (!r) continue;
          const folder = `${get().runs[runId]?.location_id || 'unknown'}/${runId}`;
          const patch: Partial<ChecklistResponse> = {};
          if (isLocalUri(r.photo_url)) {
            const url = await uploadLocal(r.photo_url!, folder);
            if (url) patch.photo_url = url;
          }
          if (isLocalUri(r.corrective_photo_url)) {
            const url = await uploadLocal(r.corrective_photo_url!, folder);
            if (url) patch.corrective_photo_url = url;
          }
          if (Object.keys(patch).length) {
            set(s => ({ responses: { ...s.responses, [runId]: { ...s.responses[runId], [itemId]: { ...r, ...patch } } } }));
          }
        }

        // 3) Responses (skip ones whose photo still failed to upload)
        const ready = keys
          .map(k => { const [a, b] = k.split('|'); return get().responses[a]?.[b]; })
          .filter((r): r is ChecklistResponse => !!r && !isLocalUri(r.photo_url) && !isLocalUri(r.corrective_photo_url));
        if (ready.length) {
          const { error } = await supabase.from('checklist_responses').upsert(ready, { onConflict: 'run_id,item_id' });
          if (error) throw error;
          const done = new Set(ready.map(r => `${r.run_id}|${r.item_id}`));
          set(s => ({ dirtyResponses: s.dirtyResponses.filter(k => !done.has(k)) }));
        }

        // 4) Now save the finished runs
        if (finished.length) {
          const { error } = await supabase.from('checklist_runs').upsert(finished);
          if (error) throw error;
        }
        set(s => ({ dirtyRuns: s.dirtyRuns.filter(id => !runIds.includes(id) || s.runs[id] !== runs.find(r => r.id === id)) }));
        set({ lastSynced: new Date().toISOString(), syncError: null });
      } catch (e: any) {
        set({ syncError: e?.message || 'Sync failed. Will retry.' });
      } finally {
        set({ syncing: false });
        await persist();
      }
    },

    itemsFor: (templateId) =>
      get().items.filter(i => i.template_id === templateId).sort((a, b) => a.position - b.position),

    startRun: async (slot, locationId, userId) => {
      if (slot.run) return slot.run;
      const run: ChecklistRun = {
        id: uuid(),
        template_id: slot.template.id,
        schedule_id: slot.schedule.id,
        location_id: locationId,
        run_date: slot.date,
        window_start: slot.schedule.window_start,
        window_end: slot.schedule.window_end,
        status: 'in_progress',
        started_by: userId,
        started_at: new Date().toISOString(),
      };
      markRun(run);
      await afterWrite();
      return run;
    },

    setResponse: async (runId, item, patch, userId) => {
      const prev = get().responses[runId]?.[item.id];
      const next: ChecklistResponse = {
        ...prev,
        ...patch,
        is_na: patch.is_na ?? prev?.is_na ?? false,
        id: prev?.id || uuid(),
        run_id: runId,
        item_id: item.id,
        recorded_by: userId,
        recorded_at: new Date().toISOString(),
      };
      if ('value' in patch || 'is_na' in patch) {
        const v = next.value ?? '';
        next.passed = next.is_na ? null : evaluate(item, v);
        next.numeric_value = (item.type === 'temp' || item.type === 'number') && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;
        // A new passing value clears an old corrective action
        if (next.passed !== false && !('corrective_action' in patch)) {
          next.corrective_action = null; next.corrective_note = null; next.corrective_photo_url = null;
        }
      }
      markResponse(next);
      await afterWrite();
    },

    completeRun: async (runId, userId) => {
      const run = get().runs[runId];
      if (!run) return;
      markRun({ ...run, status: 'complete', completed_by: userId, completed_at: new Date().toISOString() });
      await afterWrite();
    },

    signOff: async (runId, userId, note) => {
      const run = get().runs[runId];
      if (!run) return;
      markRun({ ...run, signoff_by: userId, signoff_at: new Date().toISOString(), signoff_note: note || null });
      await afterWrite();
    },

    editCompleted: async (runId, item, patch, userId, note) => {
      const prevNote = get().responses[runId]?.[item.id]?.edited_note;
      const stamped = `${new Date().toLocaleString()}: ${note}`;
      await get().setResponse(runId, item, { ...patch, edited_note: prevNote ? `${prevNote}\n${stamped}` : stamped }, userId);
    },
  };
});

/** Pending changes waiting to upload */
export const usePendingCount = () =>
  useChecklists(s => s.dirtyRuns.length + s.dirtyResponses.length);
