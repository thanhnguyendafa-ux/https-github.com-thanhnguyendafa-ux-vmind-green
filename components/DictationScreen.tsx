import React, { useState } from 'react';
import { Screen, DictationNote } from '../types';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';
import ConfirmationModal from './ConfirmationModal';
import Modal from './Modal';

const DictationScreen: React.FC = () => {
    const { 
        dictationNotes, 
        setCurrentScreen, 
        handleCreateDictationNote, 
        handleDeleteDictationNote,
        setEditingDictationNote,
        handleStartDictationSession
    } = useAppContext();

    const [noteToDelete, setNoteToDelete] = useState<DictationNote | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newNoteTitle, setNewNoteTitle] = useState('');

    const handleNewNote = () => {
        if (newNoteTitle.trim()) {
            handleCreateDictationNote(newNoteTitle.trim());
            setIsCreateModalOpen(false);
            setNewNoteTitle('');
        }
    }
    
    const handleSelectNote = (note: DictationNote) => {
        setEditingDictationNote(note);
        setCurrentScreen(Screen.DictationEditor);
    };

    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
            <header className="flex items-center gap-3 mb-6">
                <button onClick={() => setCurrentScreen(Screen.Vmind)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                    <Icon name="arrowLeft" className="w-6 h-6" />
                </button>
                <div className="flex-grow">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dictation Library</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400">Your saved dictation exercises.</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm">
                    <Icon name="plus" className="w-4 h-4" />
                    <span>New Note</span>
                </button>
            </header>
            
            <main className="space-y-4">
                {dictationNotes.length > 0 ? (
                    dictationNotes.map(note => {
                        const lastPractice = note.practiceHistory.length > 0 ? note.practiceHistory[note.practiceHistory.length - 1] : null;

                        return (
                        <div key={note.id} className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl shadow-sm hover:shadow-lg transition-shadow flex flex-col">
                            <div className="p-4 cursor-pointer flex-grow hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-t-xl" onClick={() => handleStartDictationSession(note)}>
                                <h3 className="font-bold text-slate-800 dark:text-white truncate">{note.title}</h3>
                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    <div className="flex items-center gap-1.5">
                                        <Icon name="youtube" className="w-4 h-4" />
                                        <span>{note.transcript.length} segments</span>
                                    </div>
                                    {lastPractice && (
                                        <div className="flex items-center gap-1.5">
                                            <Icon name="check-circle" className="w-4 h-4 text-emerald-500" />
                                            <span>{(lastPractice.accuracy * 100).toFixed(0)}% last score</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-700/50 p-2 flex justify-end items-center gap-2 rounded-b-xl">
                                <button onClick={() => handleSelectNote(note)} className="font-semibold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                                    <Icon name="pencil" className="w-4 h-4"/>
                                    Edit
                                </button>
                                <button onClick={() => setNoteToDelete(note)} className="font-semibold text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                                    <Icon name="trash" className="w-4 h-4"/>
                                    Delete
                                </button>
                                <button onClick={() => handleStartDictationSession(note)} className="bg-emerald-600 text-white font-semibold text-sm px-4 py-1.5 rounded-md hover:bg-emerald-700 flex items-center gap-1.5">
                                    <Icon name="play" className="w-4 h-4" />
                                    Practice
                                </button>
                            </div>
                        </div>
                    )})
                ) : (
                    <div className="text-center py-16">
                        <Icon name="youtube" className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">No Dictation Notes</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Click "New Note" to create your first dictation exercise from a YouTube video.</p>
                    </div>
                )}
            </main>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Dictation Note">
                <div className="p-6">
                    <form onSubmit={(e) => { e.preventDefault(); handleNewNote(); }}>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title</label>
                        <input
                            type="text"
                            value={newNoteTitle}
                            onChange={(e) => setNewNoteTitle(e.target.value)}
                            autoFocus
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Enter a title..."
                        />
                        <div className="mt-6 flex justify-end gap-2">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600">Cancel</button>
                            <button type="submit" disabled={!newNoteTitle.trim()} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50">Create</button>
                        </div>
                    </form>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={!!noteToDelete}
                onClose={() => setNoteToDelete(null)}
                onConfirm={() => {
                    if (noteToDelete) handleDeleteDictationNote(noteToDelete.id);
                    setNoteToDelete(null);
                }}
                title="Delete Dictation Note"
                message={`Are you sure you want to delete "${noteToDelete?.title}"?`}
                warning="This action is permanent and cannot be undone."
                confirmText="Delete"
            />
        </div>
    );
};

export default DictationScreen;
