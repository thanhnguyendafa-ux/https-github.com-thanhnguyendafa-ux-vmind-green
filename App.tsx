import * as React from 'react';
import { Session } from '@supabase/supabase-js';
// FIX: Removed unused and non-existent 'QuestionType' from './types' import.
import { Screen, Table, UserStats, StudySessionData, Question, Badge, Theme, AppState, SyncStatus, Note, VocabRow, Folder, Column, FlashcardSession, FlashcardStatus, SessionWordResult, StudySettings, AppSettings, StudyMode } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDebounce } from './hooks/useDebounce';
import { supabase } from './services/supabaseClient';
import { BADGES } from './constants';
import { generateStudySession } from '../utils/studySessionGenerator';
import HomeScreen from './components/HomeScreen';
import TablesScreen from './components/TablesScreen';
import TableScreen from './components/TableScreen';
import StudySessionScreen from './components/StudySessionScreen';
import RewardsScreen from './components/RewardsScreen';
import Notification from './components/Notification';
import AuthScreen from './components/AuthScreen';
import ReadingScreen from './components/ReadingScreen';
import VmindScreen from './components/VmindScreen';
import Icon from './components/Icon';
import BottomNavBar from './components/BottomNavBar';
import LibraryScreen from './components/LibraryScreen';
import SettingsScreen from './components/SettingsScreen';
import FlashcardsScreen from './components/FlashcardsScreen';
import FlashcardSessionScreen from './components/FlashcardSessionScreen';
import StudySetupScreen from './components/StudySetupScreen';
import Toast from './components/Toast';
import JournalScreen from './components/JournalScreen';


const XP_PER_CORRECT_ANSWER = 10;
const XP_QUIT_PENALTY = 15;
const XP_PER_LEVEL = 1000;
const XP_PER_FLASHCARD_REVIEW = 5;

const defaultSolarSystemTable: Table = {
    id: 'default-solar-system',
    name: 'Solar System Facts',
    columns: [
        { id: 'col-planet', name: 'Planet' },
        { id: 'col-nickname', name: 'Nickname' },
        { id: 'col-diameter', name: 'Diameter (km)' },
        { id: 'col-fact', name: 'Fact' },
        { id: 'col-rings', name: 'Has Rings' },
    ],
    rows: [
        { id: 'row-mercury', cols: { 'col-planet': 'Mercury', 'col-nickname': 'The Swift Planet', 'col-diameter': '4879', 'col-fact': 'It is the smallest planet in our solar system.', 'col-rings': 'No' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
        { id: 'row-venus', cols: { 'col-planet': 'Venus', 'col-nickname': "Earth's Twin", 'col-diameter': '12104', 'col-fact': 'It spins in the opposite direction to most planets.', 'col-rings': 'No' }, stats: { correct: 1, incorrect: 5, lastStudied: Date.now() - 86400000, flashcardStatus: FlashcardStatus.Again, flashcardEncounters: 6, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 86400000 } },
        { id: 'row-earth', cols: { 'col-planet': 'Earth', 'col-nickname': 'The Blue Planet', 'col-diameter': '12742', 'col-fact': 'The only planet known to support life.', 'col-rings': 'No' }, stats: { correct: 10, incorrect: 1, lastStudied: Date.now() - 259200000, flashcardStatus: FlashcardStatus.Easy, flashcardEncounters: 11, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 259200000 } },
        { id: 'row-mars', cols: { 'col-planet': 'Mars', 'col-nickname': 'The Red Planet', 'col-diameter': '6779', 'col-fact': 'It has the largest volcano, Olympus Mons.', 'col-rings': 'No' }, stats: { correct: 3, incorrect: 2, lastStudied: Date.now() - 172800000, flashcardStatus: FlashcardStatus.Hard, flashcardEncounters: 5, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 172800000 } },
        { id: 'row-jupiter', cols: { 'col-planet': 'Jupiter', 'col-nickname': 'The Gas Giant', 'col-diameter': '139820', 'col-fact': 'It has a Great Red Spot, a giant storm.', 'col-rings': 'Yes' }, stats: { correct: 8, incorrect: 2, lastStudied: Date.now() - 604800000 * 2, flashcardStatus: FlashcardStatus.Good, flashcardEncounters: 10, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 604800000 * 2 } },
        { id: 'row-saturn', cols: { 'col-planet': 'Saturn', 'col-nickname': 'The Ringed Planet', 'col-diameter': '116460', 'col-fact': 'Its rings are made of ice and rock particles.', 'col-rings': 'Yes' }, stats: { correct: 12, incorrect: 0, lastStudied: Date.now() - 86400000, flashcardStatus: FlashcardStatus.Perfect, flashcardEncounters: 12, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 86400000 } },
        { id: 'row-uranus', cols: { 'col-planet': 'Uranus', 'col-nickname': 'The Ice Giant', 'col-diameter': '50724', 'col-fact': 'It rotates on its side.', 'col-rings': 'Yes' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
        { id: 'row-neptune', cols: { 'col-planet': 'Neptune', 'col-nickname': 'The Windiest Planet', 'col-diameter': '49244', 'col-fact': 'It has supersonic winds.', 'col-rings': 'Yes' }, stats: { correct: 5, incorrect: 3, lastStudied: Date.now() - 604800000 * 3, flashcardStatus: FlashcardStatus.Good, flashcardEncounters: 8, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 604800000 * 3 } },
    ],
    relations: [
        { id: 'rel-planet-nickname', name: 'Planet ➡️ Nickname', questionColumnIds: ['col-planet'], answerColumnIds: ['col-nickname'], compatibleModes: [StudyMode.Flashcards, StudyMode.MultipleChoice, StudyMode.Typing, StudyMode.TrueFalse], isCustom: false },
        { id: 'rel-fact-planet', name: 'Fact ➡️ Planet', questionColumnIds: ['col-fact'], answerColumnIds: ['col-planet'], compatibleModes: [StudyMode.Flashcards, StudyMode.MultipleChoice, StudyMode.Typing], isCustom: false },
        { id: 'rel-planet-diameter', name: 'Planet ➡️ Diameter', questionColumnIds: ['col-planet'], answerColumnIds: ['col-diameter'], compatibleModes: [StudyMode.Typing], isCustom: true },
        { id: 'rel-scramble', name: 'Planet Scramble', questionColumnIds: ['col-planet'], answerColumnIds: [], compatibleModes: [StudyMode.Scrambled], isCustom: true },
    ],
    description: 'A comprehensive table about the planets in our solar system, designed for testing all of Vmind\'s features.',
    tags: ['science', 'space', 'sample'],
    isPublic: false,
};

const defaultStats: UserStats = {
    xp: 0, level: 1, studyStreak: 0, lastSessionDate: null, activity: {},
    totalStudyTimeSeconds: 0, unlockedBadges: [],
};

const defaultSettings: AppSettings = {
    journalMode: 'manual',
};

const defaultState: AppState = { tables: [defaultSolarSystemTable], folders: [], stats: defaultStats, notes: [], settings: defaultSettings, savedFlashcardQueues: {} };

function App() {
  // Global State
  const [session, setSession] = React.useState<Session | null>(null);
  const [isGuest, setIsGuest] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  
  // App Data State
  const [appState, setAppState] = React.useState<AppState>(defaultState);
  const [localState, setLocalState] = useLocalStorage<AppState>('vmind-guest-data', defaultState);
  
  const tables = isGuest ? localState.tables : appState.tables;
  const folders = isGuest ? localState.folders : appState.folders;
  const stats = isGuest ? localState.stats : appState.stats;
  const notes = isGuest ? localState.notes : appState.notes;
  const settings = isGuest ? localState.settings : appState.settings;
  const savedFlashcardQueues = isGuest ? localState.savedFlashcardQueues : appState.savedFlashcardQueues;
  const setState = isGuest ? setLocalState : setAppState;

  // UI State
  const [theme, setTheme] = useLocalStorage<Theme>('vmind-theme', 'dark');
  const [currentScreen, setCurrentScreen] = React.useState<Screen>(Screen.Home);
  const [activeTableId, setActiveTableId] = React.useState<string | null>(null);
  const [activeSession, setActiveSession] = React.useState<StudySessionData | null>(null);
  const [activeFlashcardSession, setActiveFlashcardSession] = React.useState<FlashcardSession | null>(null);
  const [unlockedBadgeNotification, setUnlockedBadgeNotification] = React.useState<Badge | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>('idle');
  const [isDirty, setIsDirty] = React.useState(false);

  const debouncedAppState = useDebounce(appState, 1500);
  
  // Ref to hold the latest state for use in unload handlers, preventing stale closures.
  const latestStateRef = React.useRef(appState);
  latestStateRef.current = appState;

  // --- Auth & Data Loading ---
  React.useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
      if (session) {
          setIsGuest(false);
          fetchData();
          setCurrentScreen(Screen.Home);
      } else if (!loading) {
          setCurrentScreen(Screen.Auth);
      }
  }, [session, loading]);

  const fetchData = async () => {
    if (!session) return;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('app_data')
            .eq('id', session.user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data && data.app_data) {
            const fetchedState = data.app_data as AppState;
            // --- Backward Compatibility ---
            fetchedState.notes = fetchedState.notes || [];
            fetchedState.folders = fetchedState.folders || [];
            fetchedState.settings = { ...defaultSettings, ...(fetchedState.settings || {}) };
            fetchedState.savedFlashcardQueues = fetchedState.savedFlashcardQueues || {};
            fetchedState.tables = fetchedState.tables.map(t => {
                const rowsSource = (t as any).words || t.rows;
                return {
                    ...t,
                    words: undefined, // remove legacy field
                    relations: (t.relations || []).map((r: any) => ({
                        ...r,
                        questionColumnIds: Array.isArray(r.questionColumnIds)
                            ? r.questionColumnIds.filter((id: any): id is string => typeof id === 'string')
                            : ([r.questionColumnId].filter((id: any): id is string => typeof id === 'string')),
                        answerColumnIds: Array.isArray(r.answerColumnIds)
                            ? r.answerColumnIds.filter((id: any): id is string => typeof id === 'string')
                            : ([r.answerColumnId].filter((id: any): id is string => typeof id === 'string')),
                    })),
                    rows: (rowsSource || []).map((w: any): VocabRow => ({
                        id: w.id,
                        cols: (w as any).data || w.cols, // Handle legacy 'data'
                        stats: {
                            correct: w.stats?.correct || 0,
                            incorrect: w.stats?.incorrect || 0,
                            lastStudied: w.stats?.lastStudied || null,
                            flashcardStatus: w.stats?.flashcardStatus || FlashcardStatus.New,
                            flashcardEncounters: w.stats?.flashcardEncounters || 0,
                            isFlashcardReviewed: w.stats?.isFlashcardReviewed || false,
                            lastPracticeDate: w.stats?.lastPracticeDate || null,
                            wasQuit: w.stats?.wasQuit || false,
                        }
                    })),
                    description: t.description || '',
                    tags: t.tags || [],
                    isPublic: t.isPublic || false,
                };
            });
            setAppState(fetchedState);
        } else {
            setAppState(defaultState); // New user
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
  };

  const saveData = React.useCallback(async (newState: AppState) => {
    if (!session || isGuest) return;
    setSyncStatus('saving');
    try {
        const { error } = await supabase
            .from('profiles')
            .upsert({ id: session.user.id, app_data: newState, updated_at: new Date().toISOString() });
        if (error) throw error;
        setSyncStatus('saved');
        
        // **FIX:** Only mark as "not dirty" if the state we just saved is still the current state.
        // This prevents a race condition where a new change made during the save gets ignored.
        const currentState = latestStateRef.current;
        if (JSON.stringify(newState) === JSON.stringify(currentState)) {
          setIsDirty(false);
        }

        setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
        console.error('Error saving data:', error);
        setSyncStatus('error');
    }
  }, [session, isGuest]);
  
  // --- Enhanced Saving Logic ---
  
  // Debounced save for performance during active use
  React.useEffect(() => {
    if (isDirty && session && !isGuest) {
      saveData(debouncedAppState);
    }
  }, [debouncedAppState, session, isGuest, isDirty, saveData]);

  // Immediate save on page hide/exit to prevent data loss
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      // When the page is hidden (e.g., user switches tabs or closes browser),
      // and there are unsaved changes, save immediately.
      if (document.visibilityState === 'hidden' && isDirty) {
        saveData(latestStateRef.current);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDirty, saveData]);

  const setAndMarkDirty = (updater: React.SetStateAction<AppState>) => {
      setState(updater);
      setIsDirty(true);
  };


  // --- Guest Mode ---
  const handleGuestLogin = () => {
      setIsGuest(true);
      setCurrentScreen(Screen.Home);
  }

  // --- Logout ---
  const handleLogout = async () => {
    if (!isGuest && isDirty) {
      await saveData(appState);
    }
    
    await supabase.auth.signOut();
    setIsGuest(false);
    setAppState(defaultState);
    setCurrentScreen(Screen.Auth);
  };
  
  // --- Theming ---
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  const handleToggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };
  
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setAndMarkDirty(prev => ({
        ...prev,
        settings: {
            ...prev.settings,
            ...newSettings,
        },
    }));
  };

  // --- App Logic ---
  const activeTable = React.useMemo(() => tables.find(t => t.id === activeTableId), [tables, activeTableId]);

  const handleCreateTable = (name: string, columnsStr: string) => {
    const columnNames: string[] = columnsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    if (columnNames.length === 0) {
        alert("Please provide at least one column name.");
        return;
    }
    const newColumns: Column[] = columnNames.map((colName, index) => ({
        id: `col-${Date.now()}-${index}`,
        name: colName,
    }));

    const newTable: Table = {
      id: Date.now().toString(), name,
      columns: newColumns,
      rows: [],
      relations: [],
      description: '',
      tags: [],
      isPublic: false,
    };
    setAndMarkDirty(prev => ({ ...prev, tables: [...prev.tables, newTable] }));
  };
  
  const handleDeleteTable = (tableId: string) => {
    setAndMarkDirty(prev => {
        const newTables = prev.tables.filter(t => t.id !== tableId);
        const newFolders = prev.folders.map(f => ({
            ...f,
            tableIds: f.tableIds.filter(id => id !== tableId)
        }));
        return { ...prev, tables: newTables, folders: newFolders };
    });
  };

  const handleCreateFolder = (name: string) => {
      const newFolder: Folder = {
          id: Date.now().toString(),
          name,
          tableIds: [],
      };
      setAndMarkDirty(prev => ({ ...prev, folders: [...prev.folders, newFolder] }));
  };

  const handleDeleteFolder = (folderId: string) => {
      setAndMarkDirty(prev => ({...prev, folders: prev.folders.filter(f => f.id !== folderId)}));
  };

  const handleMoveTableToFolder = (tableId: string, folderId: string | null) => {
      setAndMarkDirty(prev => {
          // Remove from old folder
          const newFolders = prev.folders.map(f => ({
              ...f,
              tableIds: f.tableIds.filter(id => id !== tableId)
          }));
          // Add to new folder
          if (folderId) {
              const folderIndex = newFolders.findIndex(f => f.id === folderId);
              if (folderIndex > -1) {
                  newFolders[folderIndex].tableIds.push(tableId);
              }
          }
          return { ...prev, folders: newFolders };
      });
  };

  const handleImportTables = (importedTables: Table[], appendToTableId?: string) => {
    setAndMarkDirty(prev => {
        if (appendToTableId) {
            const rowsToAppend = importedTables[0]?.rows || [];
            const newTables = prev.tables.map(t => {
                if (t.id === appendToTableId) {
                    return { ...t, rows: [...t.rows, ...rowsToAppend] };
                }
                return t;
            });
            return { ...prev, tables: newTables };
        } else {
            const existingIds = new Set(prev.tables.map(t => t.id));
            const newTables = importedTables.map(t => 
                existingIds.has(t.id) ? { ...t, id: `${t.id}-${Date.now()}` } : t
            );
            return { ...prev, tables: [...prev.tables, ...newTables] };
        }
    });
  };

  const handleSelectTable = (tableId: string) => {
    setActiveTableId(tableId);
    setCurrentScreen(Screen.TableDetail);
  };

  const handleUpdateTable = (updatedTable: Table) => {
    setAndMarkDirty(prev => ({ ...prev, tables: prev.tables.map(t => t.id === updatedTable.id ? updatedTable : t) }));
  };

  const handleUpdateRow = (updatedRow: VocabRow) => {
      const tableToUpdate = tables.find(t => t.rows.some(r => r.id === updatedRow.id));
      if (tableToUpdate) {
          const newRows = tableToUpdate.rows.map(r => r.id === updatedRow.id ? updatedRow : r);
          handleUpdateTable({ ...tableToUpdate, rows: newRows });
      }
  };

  // --- Reading Space & Journal Logic ---
  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'New Note',
      content: 'Start writing here...',
      createdAt: Date.now(),
    };
    setAndMarkDirty(prev => ({ ...prev, notes: [...prev.notes, newNote] }));
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setAndMarkDirty(prev => ({ ...prev, notes: prev.notes.map(n => n.id === updatedNote.id ? updatedNote : n) }));
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      setAndMarkDirty(prev => ({...prev, notes: prev.notes.filter(n => n.id !== noteId)}));
    }
  };
  
  const handleSaveToJournal = (source: string, content: string) => {
    const today = new Date().toISOString().split('T')[0];
    const journalTitle = `Journal - ${today}`;
    let todayNote = notes.find(n => n.title === journalTitle);
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const contentToPrepend = `\n\n---\n**${source}** (${time})\n${content}`;

    if (todayNote) {
        const noteHeaderRegex = /^(Journal entry for .*?\.)/;
        const match = todayNote.content.match(noteHeaderRegex);
        const header = match ? match[0] : '';
        const body = match ? todayNote.content.substring(header.length) : todayNote.content;
        
        handleUpdateNote({ ...todayNote, content: `${header}${contentToPrepend}${body}` });
    } else {
        const newNote: Note = {
            id: Date.now().toString(),
            title: journalTitle,
            content: `Journal entry for ${today}.${contentToPrepend}`,
            createdAt: Date.now(),
        };
        setAndMarkDirty(prev => ({...prev, notes: [...prev.notes, newNote]}));
    }
    showToast("Saved to Journal", "success");
  };

  const handleStartStudySession = React.useCallback((settings: StudySettings) => {
    const questions = generateStudySession(tables, settings);
    
    if (questions.length === 0) {
      alert("Could not generate any questions based on the current settings. Please check your configuration and make sure there are enough valid words.");
      return;
    }

    setActiveSession({
        questions, 
        startTime: Date.now(),
        settings: settings,
    });
    setCurrentScreen(Screen.StudySession);
  }, [tables]);
  
    const processSessionResults = (prev: AppState, results: SessionWordResult[], durationSeconds: number, penalty: number, remainingQuestionIds?: Set<string>): AppState => {
        const rowUpdatesByTable = results.reduce((acc, result) => {
            for (const table of tables) {
                const row = table.rows.find(r => r.id === result.rowId);
                if (row) {
                    if (!acc[table.id]) acc[table.id] = {};
                    if (!acc[table.id][result.rowId]) acc[table.id][result.rowId] = { correct: 0, incorrect: 0 };
                    if (result.isCorrect) acc[table.id][result.rowId].correct++;
                    else acc[table.id][result.rowId].incorrect++;
                    break;
                }
            }
            return acc;
        }, {} as Record<string, Record<string, { correct: number, incorrect: number }>>);

        const updatedTables = prev.tables.map(table => {
            const tableUpdates = rowUpdatesByTable[table.id];
            const hasUpdates = tableUpdates || (remainingQuestionIds && table.rows.some(r => remainingQuestionIds.has(r.id)));
            if (!hasUpdates) return table;

            return {
                ...table,
                rows: table.rows.map(row => {
                    const updates = tableUpdates?.[row.id];
                    const wasQuit = remainingQuestionIds?.has(row.id);
                    if (!updates && !wasQuit) return row;
                    return {
                        ...row,
                        stats: {
                            ...row.stats,
                            correct: row.stats.correct + (updates?.correct || 0),
                            incorrect: row.stats.incorrect + (updates?.incorrect || 0),
                            lastStudied: Date.now(),
                            wasQuit: wasQuit,
                        }
                    };
                })
            };
        });

        const xpGained = results.reduce((totalXp, result) => {
            if (result.isCorrect) {
                // Award half XP if a hint was used, full XP otherwise.
                const xpForThisAnswer = result.hintUsed ? XP_PER_CORRECT_ANSWER / 2 : XP_PER_CORRECT_ANSWER;
                return totalXp + xpForThisAnswer;
            }
            return totalXp;
        }, 0);

        const newXp = Math.max(0, prev.stats.xp + xpGained - penalty);
        const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const lastSessionWasYesterday = prev.stats.lastSessionDate === yesterday.toISOString().split('T')[0];
        const lastSessionWasToday = prev.stats.lastSessionDate === todayStr;
        const newStreak = lastSessionWasYesterday ? prev.stats.studyStreak + 1 : (lastSessionWasToday ? prev.stats.studyStreak : 1);

        const newActivity = { ...prev.stats.activity, [todayStr]: (prev.stats.activity[todayStr] || 0) + durationSeconds };
        const newTotalTime = prev.stats.totalStudyTimeSeconds + durationSeconds;
        
        const newUnlockedBadges = [...prev.stats.unlockedBadges];
        BADGES.forEach(badge => {
            if (!newUnlockedBadges.includes(badge.id) && ((badge.type === 'xp' && newXp >= badge.value) || (badge.type === 'time' && newTotalTime >= badge.value))) {
                newUnlockedBadges.push(badge.id);
                setUnlockedBadgeNotification(badge);
            }
        });

        return {
            ...prev,
            tables: updatedTables,
            stats: {
                ...prev.stats,
                xp: newXp,
                level: newLevel,
                studyStreak: newStreak,
                lastSessionDate: todayStr,
                activity: newActivity,
                totalStudyTimeSeconds: newTotalTime,
                unlockedBadges: newUnlockedBadges,
            }
        };
    };

    const handleEndSession = (results: SessionWordResult[], durationSeconds: number) => {
        setAndMarkDirty(prev => processSessionResults(prev, results, durationSeconds, 0));
        setCurrentScreen(Screen.Home);
        setActiveSession(null);
    };

    const handleSessionQuit = (results: SessionWordResult[], durationSeconds: number, remainingQueue: Question[]) => {
        const remainingIds = new Set(remainingQueue.map(q => q.rowId));
        setAndMarkDirty(prev => processSessionResults(prev, results, durationSeconds, XP_QUIT_PENALTY, remainingIds));
        setCurrentScreen(Screen.Home);
        setActiveSession(null);
    };

  // --- Flashcard Logic ---
    const handleStartFlashcardSession = (tableIds: string[], relationIds: string[]) => {
        const rowsFromTables = tables
            .filter(t => tableIds.includes(t.id))
            .flatMap(t => t.rows);
        
        if (rowsFromTables.length === 0) {
            alert("Selected tables have no rows to study.");
            return;
        }

        const queueKey = [...tableIds].sort().join(',') + '|' + [...relationIds].sort().join(',');
        const savedQueue = savedFlashcardQueues?.[queueKey] || [];
        
        const existingRowIds = new Set(savedQueue);
        const newRows = rowsFromTables.filter(w => !existingRowIds.has(w.id));
        const finalQueue = [...savedQueue, ...shuffleArray(newRows.map(w => w.id))];

        setActiveFlashcardSession({
            tableIds,
            relationIds,
            queue: finalQueue,
            currentIndex: 0,
            sessionEncounters: 0,
            startTime: Date.now(),
            history: []
        });
        setCurrentScreen(Screen.FlashcardSession);
    };

    const handleFinishFlashcardSession = (finalSession: FlashcardSession) => {
        const { tableIds, relationIds, queue, history } = finalSession;
        const queueKey = [...tableIds].sort().join(',') + '|' + [...relationIds].sort().join(',');
        
        const sessionDurationSeconds = Math.round((Date.now() - finalSession.startTime) / 1000);
        const todayStr = new Date().toISOString().split('T')[0];

        setAndMarkDirty(prev => {
            const updatedTables = prev.tables.map(table => {
                if (!tableIds.includes(table.id)) return table;
                
                const updatedRows = table.rows.map(row => {
                    const rowHistory = history.filter(h => h.rowId === row.id);
                    if (rowHistory.length === 0) return row;
                    
                    const lastStatus = rowHistory[rowHistory.length - 1].status;
                    return {
                        ...row,
                        stats: {
                            ...row.stats,
                            flashcardStatus: lastStatus,
                            flashcardEncounters: row.stats.flashcardEncounters + rowHistory.length,
                            isFlashcardReviewed: true,
                            lastPracticeDate: Date.now()
                        }
                    };
                });
                return { ...table, rows: updatedRows };
            });

            const newXp = prev.stats.xp + history.length * XP_PER_FLASHCARD_REVIEW;
            const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
            const newActivity = { ...prev.stats.activity, [todayStr]: (prev.stats.activity[todayStr] || 0) + sessionDurationSeconds };

            return {
                ...prev,
                tables: updatedTables,
                savedFlashcardQueues: {
                    ...prev.savedFlashcardQueues,
                    [queueKey]: queue,
                },
                stats: {
                    ...prev.stats,
                    xp: newXp,
                    level: newLevel,
                    activity: newActivity,
                    totalStudyTimeSeconds: prev.stats.totalStudyTimeSeconds + sessionDurationSeconds,
                }
            };
        });

        setActiveFlashcardSession(null);
        setCurrentScreen(Screen.Flashcards);
    };
  
  const handleNavigation = (screen: keyof typeof Screen) => {
    const screenEnum = Screen[screen];
    if (screenEnum !== undefined) {
      setCurrentScreen(screenEnum);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center"><Icon name="spinner" className="w-10 h-10 text-emerald-500 animate-spin" /></div>;
  }
  
  const renderContent = () => {
    if (activeFlashcardSession) {
        return <FlashcardSessionScreen
            session={activeFlashcardSession}
            tables={tables}
            onFinish={handleFinishFlashcardSession}
            onUpdateRow={(row) => {
              const tableToUpdate = tables.find(t => t.rows.some(w => w.id === row.id));
              if (tableToUpdate) {
                const newRows = tableToUpdate.rows.map(w => w.id === row.id ? row : w);
                handleUpdateTable({...tableToUpdate, rows: newRows});
              }
            }}
            onSaveToJournal={handleSaveToJournal}
        />
    }

    switch (currentScreen) {
      case Screen.Auth:
        return <AuthScreen onGuestLogin={handleGuestLogin} />;
      case Screen.Home:
        return <HomeScreen 
            theme={theme} 
            onToggleTheme={handleToggleTheme} 
            stats={stats} 
            tables={tables}
            onSelectTable={handleSelectTable} 
            onNavigateTo={handleNavigation}
            syncStatus={syncStatus} 
            isGuest={isGuest} 
            onLogout={handleLogout} />;
      case Screen.Tables:
        return <TablesScreen
            tables={tables}
            folders={folders}
            onCreateTable={handleCreateTable}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveTableToFolder={handleMoveTableToFolder}
            onSelectTable={handleSelectTable}
            onDeleteTable={handleDeleteTable}
            onImportTables={handleImportTables}
            onShowToast={showToast}
          />;
      case Screen.Library:
        return <LibraryScreen />;
      case Screen.Vmind:
          return <VmindScreen 
            onBack={() => setCurrentScreen(Screen.Home)}
            onNavigateToReading={() => setCurrentScreen(Screen.Reading)}
            onNavigateToJournal={() => setCurrentScreen(Screen.Journal)}
            onNavigateToFlashcards={() => setCurrentScreen(Screen.Flashcards)}
            onStartStudySession={() => setCurrentScreen(Screen.StudySetup)}
          />;
      case Screen.Rewards:
          return <RewardsScreen stats={stats} allBadges={BADGES} />;
      case Screen.Settings:
          return <SettingsScreen onLogout={handleLogout} onToggleTheme={handleToggleTheme} theme={theme} isGuest={isGuest} settings={settings} onUpdateSettings={handleUpdateSettings}/>;
      case Screen.TableDetail:
        return activeTable && <TableScreen table={activeTable} onBack={() => setCurrentScreen(Screen.Tables)} onUpdateTable={handleUpdateTable} onStartStudySession={() => {}} onNavigateToVmind={() => setCurrentScreen(Screen.Vmind)} isGuest={isGuest} onShowToast={showToast}/>;
      case Screen.StudySession:
          return activeSession && <StudySessionScreen session={activeSession} tables={tables} settings={settings} onEndSession={handleEndSession} onSessionQuit={handleSessionQuit} onSaveToJournal={handleSaveToJournal} />
      case Screen.Flashcards:
          return <FlashcardsScreen tables={tables} onStartSession={handleStartFlashcardSession} />;
      case Screen.StudySetup:
          return <StudySetupScreen
            tables={tables}
            onBack={() => setCurrentScreen(Screen.Vmind)}
            onStartSession={handleStartStudySession}
          />;
      case Screen.Reading:
          return <ReadingScreen 
            notes={notes}
            tables={tables}
            onBack={() => setCurrentScreen(Screen.Vmind)}
            onCreateNote={handleCreateNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onUpdateTable={handleUpdateTable}
            onShowToast={showToast}
            onSaveToJournal={handleSaveToJournal}
          />;
      case Screen.Journal:
          return <JournalScreen
            notes={notes}
            onUpdateNote={handleUpdateNote}
            onBack={() => setCurrentScreen(Screen.Vmind)}
          />;
      default:
        return null;
    }
  };

  const showNavBar = currentScreen !== Screen.Auth && currentScreen !== Screen.StudySession && currentScreen !== Screen.FlashcardSession;
  
  function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <main className={showNavBar ? 'pb-20' : ''}>
        {renderContent()}
      </main>
      {showNavBar && <BottomNavBar currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />}
      {unlockedBadgeNotification && (
        <Notification 
          message={unlockedBadgeNotification.name} 
          icon={unlockedBadgeNotification.icon} 
          onClose={() => setUnlockedBadgeNotification(null)}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
