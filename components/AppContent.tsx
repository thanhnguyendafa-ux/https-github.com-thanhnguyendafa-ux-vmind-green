import * as React from 'react';
import { useAppContext } from '../context/AppContext';
import { Screen } from '../types';
import HomeScreen from './HomeScreen';
import TablesScreen from './TablesScreen';
import TableScreen from './TableScreen';
import StudySessionScreen from './StudySessionScreen';
import RewardsScreen from './RewardsScreen';
import Notification from './Notification';
import AuthScreen from './AuthScreen';
import ReadingScreen from './ReadingScreen';
import VmindScreen from './VmindScreen';
import Icon from './Icon';
import BottomNavBar from './BottomNavBar';
import LibraryScreen from './LibraryScreen';
import SettingsScreen from './SettingsScreen';
import FlashcardsScreen from './FlashcardsScreen';
import FlashcardSessionScreen from './FlashcardSessionScreen';
import StudySetupScreen from './StudySetupScreen';
import Toast from './Toast';
import JournalScreen from './JournalScreen';
import GalleryViewModal from './GalleryViewModal';
import ScrambleSetupScreen from './ScrambleSetupScreen';
import ScrambleSessionScreen from './ScrambleSessionScreen';
import TheaterSetupScreen from './TheaterSetupScreen';
import TheaterSessionScreen from './TheaterSessionScreen';
import DictationScreen from './DictationScreen';
import DictationEditorScreen from './DictationEditorScreen';
import DictationSessionScreen from './DictationSessionScreen';


export const AppContent: React.FC = () => {
    const {
        loading,
        currentScreen,
        activeFlashcardSession,
        activeSession,
        activeScrambleSession,
        activeTheaterSession,
        activeDictationSession,
        editingDictationNote,
        activeTable,
        unlockedBadgeNotification,
        setUnlockedBadgeNotification,
        toast,
        setToast,
        galleryViewData,
        setGalleryViewData,
    } = useAppContext();

    if (loading) {
        return <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center"><Icon name="spinner" className="w-10 h-10 text-emerald-500 animate-spin" /></div>;
    }

    const renderContent = () => {
        if (activeDictationSession) {
            return <DictationSessionScreen />;
        }
        if (activeTheaterSession) {
            return <TheaterSessionScreen />;
        }
        if (activeScrambleSession) {
            return <ScrambleSessionScreen />;
        }
        if (activeFlashcardSession) {
            return <FlashcardSessionScreen />
        }
        if (activeSession) {
            return <StudySessionScreen session={activeSession} />
        }

        switch (currentScreen) {
            case Screen.Auth: return <AuthScreen />;
            case Screen.Home: return <HomeScreen />;
            case Screen.Tables: return <TablesScreen />;
            case Screen.Library: return <LibraryScreen />;
            case Screen.Vmind: return <VmindScreen />;
            case Screen.Rewards: return <RewardsScreen />;
            case Screen.Settings: return <SettingsScreen />;
            case Screen.TableDetail: return activeTable ? <TableScreen table={activeTable} /> : <TablesScreen />;
            case Screen.Flashcards: return <FlashcardsScreen />;
            case Screen.StudySetup: return <StudySetupScreen />
            case Screen.ScrambleSetup: return <ScrambleSetupScreen />
            case Screen.TheaterSetup: return <TheaterSetupScreen />
            case Screen.Reading: return <ReadingScreen />
            case Screen.Journal: return <JournalScreen />
            case Screen.Dictation: return <DictationScreen />
            case Screen.DictationEditor: return editingDictationNote ? <DictationEditorScreen /> : <DictationScreen />;
            case Screen.DictationSession: return activeDictationSession ? <DictationSessionScreen /> : <DictationScreen />;
            default: return <HomeScreen />;
        }
    };

    const showNavBar = currentScreen !== Screen.Auth && !activeSession && !activeFlashcardSession && !activeScrambleSession && !activeTheaterSession && !activeDictationSession;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
            <main className={showNavBar ? 'pb-20' : ''}>
                {renderContent()}
            </main>
            {showNavBar && <BottomNavBar />}
            {galleryViewData && (
                <GalleryViewModal
                    table={galleryViewData.table}
                    initialRowId={galleryViewData.initialRowId}
                    onClose={() => setGalleryViewData(null)}
                />
            )}
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
};