

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Screen, Table, UserStats, StudySession, Question, QuestionType, Badge, Theme, AppState, SyncStatus, Note, VocabRow, Folder, Column, FlashcardSession, FlashcardStatus } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDebounce } from './hooks/useDebounce';
import { supabase } from './services/supabaseClient';
import { BADGES } from './constants';
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


const XP_PER_CORRECT_ANSWER = 10;
const XP_PER_LEVEL = 1000;
const XP_PER_FLASHCARD_REVIEW = 5;

const defaultTables: Table[] = [
    {
        id: 'default-1',
        name: 'Sample: Spanish Vocabulary',
        columns: [ { id: 'col-1', name: 'Spanish' }, { id: 'col-2', name: 'English' } ],
        rows: [
            { id: 'row-1', cols: { 'col-1': 'Hola', 'col-2': 'Hello' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
            { id: 'row-2', cols: { 'col-1': 'Adiós', 'col-2': 'Goodbye' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
            { id: 'row-3', cols: { 'col-1': 'Gracias', 'col-2': 'Thank you' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
            { id: 'row-4', cols: { 'col-1': 'Por favor', 'col-2': 'Please' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
        ],
        relations: [
            { id: 'rel-1', name: 'Spanish to English', questionColumnIds: ['col-1'], answerColumnIds: ['col-2'], isCustom: false }
        ],
        description: 'A sample table with basic Spanish words and their English translations.',
        tags: ['spanish', 'sample', 'vocabulary'],
        isPublic: false,
    },
];

const defaultStats: UserStats = {
    xp: 0, level: 1, studyStreak: 0, lastSessionDate: null, activity: {},
    totalStudyTimeSeconds: 0, unlockedBadges: [],
};

const defaultState: AppState = { tables: defaultTables, folders: [], stats: defaultStats, notes: [], savedFlashcardQueues: {} };

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function App() {
  // Global State
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // App Data State
  const [appState, setAppState] = useState<AppState>(defaultState);
  const [localState, setLocalState] = useLocalStorage<AppState>('vmind-guest-data', defaultState);
  
  const tables = isGuest ? localState.tables : appState.tables;
  const folders = isGuest ? localState.folders : appState.folders;
  const stats = isGuest ? localState.stats : appState.stats;
  const notes = isGuest ? localState.notes : appState.notes;
  const savedFlashcardQueues = isGuest ? localState.savedFlashcardQueues : appState.savedFlashcardQueues;
  const setState = isGuest ? setLocalState : setAppState;

  // UI State
  const [theme, setTheme] = useLocalStorage<Theme>('vmind-theme', 'dark');
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Home);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [activeFlashcardSession, setActiveFlashcardSession] = useState<FlashcardSession | null>(null);
  const [unlockedBadgeNotification, setUnlockedBadgeNotification] = useState<Badge | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const debouncedAppState = useDebounce(appState, 1500);

  // --- Auth & Data Loading ---
  useEffect(() => {
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

  useEffect(() => {
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
            fetchedState.savedFlashcardQueues = fetchedState.savedFlashcardQueues || {};
            fetchedState.tables = fetchedState.tables.map(t => {
                const rowsSource = (t as any).words || t.rows;
                return {
                    ...t,
                    words: undefined, // remove legacy field
                    relations: t.relations?.map(r => ({
                        ...r,
                        questionColumnIds: r.questionColumnIds || [(r as any).questionColumnId],
                        answerColumnIds: r.answerColumnIds || [(r as any).answerColumnId],
                    })) || [],
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

  const saveData = async (newState: AppState) => {
    if (!session || isGuest) return;
    setSyncStatus('saving');
    try {
        const { error } = await supabase
            .from('profiles')
            .upsert({ id: session.user.id, app_data: newState, updated_at: new Date().toISOString() });
        if (error) throw error;
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
        console.error('Error saving data:', error);
        setSyncStatus('error');
    }
  };
  
  useEffect(() => {
    if (debouncedAppState && session && !isGuest && syncStatus !== 'saving') {
      saveData(debouncedAppState);
    }
  }, [debouncedAppState, session, isGuest]);

  // --- Guest Mode ---
  const handleGuestLogin = () => {
      setIsGuest(true);
      setCurrentScreen(Screen.Home);
  }

  // --- Logout ---
  const handleLogout = async () => {
    // FIX: Force a save of the current state before logging out to prevent data loss
    // from actions performed within the debounce delay period.
    await saveData(appState);
    
    await supabase.auth.signOut();
    setIsGuest(false);
    setAppState(defaultState);
    setCurrentScreen(Screen.Auth);
  };
  
  // --- Theming ---
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  const handleToggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // --- App Logic ---
  const activeTable = useMemo(() => tables.find(t => t.id === activeTableId), [tables, activeTableId]);

  const handleCreateTable = (name: string, columnsStr: string) => {
    // FIX: Replaced .filter(s => s) with a more explicit .filter(s => s.length > 0) to ensure only non-empty strings are included and to resolve potential TypeScript type inference issues where the array type might be misinterpreted.
    const columnNames = columnsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
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
    setState(prev => ({ ...prev, tables: [...prev.tables, newTable] }));
  };
  
  const handleDeleteTable = (tableId: string) => {
    setState(prev => {
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
      setState(prev => ({ ...prev, folders: [...prev.folders, newFolder] }));
  };

  const handleDeleteFolder = (folderId: string) => {
      setState(prev => ({...prev, folders: prev.folders.filter(f => f.id !== folderId)}));
  };

  const handleMoveTableToFolder = (tableId: string, folderId: string | null) => {
      setState(prev => {
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
    setState(prev => {
        if (appendToTableId) {
            // This logic assumes the importedTables array contains one "table"
            // whose rows need to be appended.
            const rowsToAppend = importedTables[0]?.rows || [];
            const newTables = prev.tables.map(t => {
                if (t.id === appendToTableId) {
                    return { ...t, rows: [...t.rows, ...rowsToAppend] };
                }
                return t;
            });
            return { ...prev, tables: newTables };
        } else {
            // Add new tables, ensuring no ID conflicts
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
    setState(prev => ({ ...prev, tables: prev.tables.map(t => t.id === updatedTable.id ? updatedTable : t) }));
  };

  // --- Reading Space Logic ---
  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'New Note',
      content: 'Start writing here...',
      createdAt: Date.now(),
    };
    setState(prev => ({ ...prev, notes: [...prev.notes, newNote] }));
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setState(prev => ({ ...prev, notes: prev.notes.map(n => n.id === updatedNote.id ? updatedNote : n) }));
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      setState(prev => ({...prev, notes: prev.notes.filter(n => n.id !== noteId)}));
    }
  };
  
  const handleStartStudySession = useCallback((tableId: string, relationId: string) => {
    const table = tables.find(t => t.id === tableId);
    const relation = table?.relations.find(r => r.id === relationId);

    if (!table || !relation || table.rows.length < 1) return;

    const { questionColumnIds, answerColumnIds } = relation;
    
    const getColumnName = (id: string) => table.columns.find(c => c.id === id)?.name || '';
    const questionSourceColumnNames = questionColumnIds.map(getColumnName);

    const questions: Question[] = shuffleArray(table.rows)
      .map((row: VocabRow): Question | null => {
        const questionText = questionColumnIds.map(id => row.cols[id]).filter((val): val is string => !!val).join(' / ');
        const correctAnswer = answerColumnIds.map(id => row.cols[id]).filter((val): val is string => !!val).join(' / ');

        if (!questionText || !correctAnswer) {
            return null;
        }

        const questionType = table.rows.length >= 4 && Math.random() > 0.5 ? QuestionType.MultipleChoice : QuestionType.Typing;
        let options: string[] = [];
        if (questionType === QuestionType.MultipleChoice) {
            const otherAnswers = table.rows.reduce((acc: string[], w) => {
              if (w.id !== row.id) {
                const answerPart = answerColumnIds.map(id => w.cols[id]).filter((val): val is string => !!val).join(' / ');
                if(answerPart) acc.push(answerPart);
              }
              return acc;
            }, []);

            options = shuffleArray(otherAnswers).slice(0, 3);
            options.push(correctAnswer);
            options = shuffleArray(options);
        }
        return {
            rowId: row.id,
            questionSourceColumnNames,
            questionText, correctAnswer,
            type: questionType, options,
        };
    })
    .filter((q): q is Question => q !== null);
    
    if (questions.length === 0) {
      alert("Not enough complete rows in this table for this relation.");
      return;
    }

    setActiveSession({
        tableId, relationId, questions, currentQuestionIndex: 0, answers: {}, startTime: Date.now(),
    });
    setCurrentScreen(Screen.StudySession);
  }, [tables]);

  const handleAnswer = (questionIndex: number, answer: string, isCorrect: boolean) => {
      if (!activeSession) return;
      
      const updatedAnswers = { ...activeSession.answers, [questionIndex]: { answer, isCorrect } };
      
      if(isCorrect) {
          setState(prev => {
            const newXp = prev.stats.xp + XP_PER_CORRECT_ANSWER;
            const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
            return { ...prev, stats: { ...prev.stats, xp: newXp, level: newLevel } };
          });
      }
      
      const goToNext = () => {
        if (activeSession.currentQuestionIndex < activeSession.questions.length - 1) {
            setActiveSession(prev => prev ? {...prev, answers: updatedAnswers, currentQuestionIndex: prev.currentQuestionIndex + 1 } : null);
        } else {
             setActiveSession(prev => prev ? {...prev, answers: updatedAnswers } : null);
             setTimeout(() => handleEndSession(), 0);
        }
      }
      setTimeout(goToNext, 1200);
  };
  
  const handleEndSession = () => {
      if(!activeSession) return;

      const table = tables.find(t => t.id === activeSession.tableId);
      if(table) {
          const updatedRows = table.rows.map(w => {
              const sessionResults = Object.entries(activeSession.answers).filter(([idx]) => 
                activeSession.questions[parseInt(idx)].rowId === w.id
              );
              if (sessionResults.length === 0) return w;
              
              let correctCount = w.stats.correct; let incorrectCount = w.stats.incorrect;
              sessionResults.forEach(([, result]: [string, { answer: string; isCorrect: boolean }]) => {
                  if (result.isCorrect) correctCount++; else incorrectCount++;
              });
              return {...w, stats: { ...w.stats, correct: correctCount, incorrect: incorrectCount, lastStudied: Date.now() }};
          });
          handleUpdateTable({...table, rows: updatedRows});
      }
      
      const sessionDurationSeconds = Math.round((Date.now() - activeSession.startTime) / 1000);
      const today = new Date(); const todayStr = today.toISOString().split('T')[0];
      
      setState(prev => {
          const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          const lastSessionWasYesterday = prev.stats.lastSessionDate === yesterdayStr;
          const lastSessionWasToday = prev.stats.lastSessionDate === todayStr;

          const newStreak = lastSessionWasYesterday ? prev.stats.studyStreak + 1 : (lastSessionWasToday ? prev.stats.studyStreak : 1);

          const newActivity = { ...prev.stats.activity, [todayStr]: (prev.stats.activity[todayStr] || 0) + sessionDurationSeconds };
          const newTotalTime = prev.stats.totalStudyTimeSeconds + sessionDurationSeconds;

          const newUnlockedBadges = [...prev.stats.unlockedBadges];
          BADGES.forEach(badge => {
            if (!newUnlockedBadges.includes(badge.id)) {
              const hasUnlocked = (badge.type === 'xp' && prev.stats.xp >= badge.value) ||
                                (badge.type === 'time' && newTotalTime >= badge.value);
              if (hasUnlocked) {
                newUnlockedBadges.push(badge.id);
                setUnlockedBadgeNotification(badge);
              }
            }
          });

          return { 
              ...prev, 
              stats: {
                ...prev.stats,
                studyStreak: newStreak, 
                lastSessionDate: todayStr, 
                activity: newActivity,
                totalStudyTimeSeconds: newTotalTime, 
                unlockedBadges: newUnlockedBadges,
              }
          };
      });

      setCurrentScreen(Screen.Home); // Go home after a session
      setActiveSession(null);
  }

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

        setState(prev => {
            const updatedTables = prev.tables.map(table => {
                if (!tableIds.includes(table.id)) return table;
                
                const updatedRows = table.rows.map(row => {
                    const rowHistory = history.filter(h => h.rowId === row.id);
                    if (rowHistory.length === 0) return row;
                    
                    const lastStatus = rowHistory[rowHistory.length - 1].status;
                    return {
                        ...row,
                        stats: {
                            ...row,
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
            onUpdateRow={(row) => handleUpdateTable({...tables.find(t => t.rows.some(w => w.id === row.id))!, rows: tables.find(t => t.rows.some(w => w.id === row.id))!.rows.map(w => w.id === row.id ? row : w)})}
            onSaveToJournal={(cardFront, cardBack) => {
                const today = new Date().toISOString().split('T')[0];
                const journalTitle = `Journal - ${today}`;
                let todayNote = notes.find(n => n.title === journalTitle);
                const contentToAppend = `\n\n---\n**Flashcard Review:**\n*Q: ${cardFront}*\n*A: ${cardBack}*\n`;

                if (todayNote) {
                    handleUpdateNote({ ...todayNote, content: todayNote.content + contentToAppend });
                } else {
                    const newNote: Note = {
                        id: Date.now().toString(),
                        title: journalTitle,
                        content: `New journal entry for ${today}.${contentToAppend}`,
                        createdAt: Date.now(),
                    };
                    setState(prev => ({...prev, notes: [...prev.notes, newNote]}));
                }
            }}
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
            onNavigateToJournal={() => alert("Journal coming soon!")}
            onNavigateToFlashcards={() => setCurrentScreen(Screen.Flashcards)}
            onStartStudySession={() => setCurrentScreen(Screen.StudySetup)}
          />;
      case Screen.Rewards:
          return <RewardsScreen stats={stats} allBadges={BADGES} />;
      case Screen.Settings:
          return <SettingsScreen onLogout={handleLogout} onToggleTheme={handleToggleTheme} theme={theme} isGuest={isGuest}/>;
      case Screen.TableDetail:
        return activeTable && <TableScreen table={activeTable} onBack={() => setCurrentScreen(Screen.Tables)} onUpdateTable={handleUpdateTable} onStartStudySession={handleStartStudySession} onNavigateToVmind={() => setCurrentScreen(Screen.Vmind)} isGuest={isGuest} onShowToast={showToast}/>;
      case Screen.StudySession:
          return activeSession && <StudySessionScreen session={activeSession} onAnswer={handleAnswer} onEndSession={() => { setCurrentScreen(Screen.Home); setActiveSession(null);}} />
      case Screen.Flashcards:
          return <FlashcardsScreen tables={tables} onStartSession={handleStartFlashcardSession} />;
      case Screen.StudySetup:
          return <StudySetupScreen
            tables={tables}
            onBack={() => setCurrentScreen(Screen.Vmind)}
            onStartSession={handleStartFlashcardSession}
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
          />;
      default:
        return null;
    }
  };

  const showNavBar = currentScreen !== Screen.Auth && currentScreen !== Screen.StudySession && currentScreen !== Screen.FlashcardSession;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-gray-100 transition-colors duration-300">
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