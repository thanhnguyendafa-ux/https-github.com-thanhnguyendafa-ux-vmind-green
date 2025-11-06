import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Screen, TranscriptEntry } from '../types';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';
import { extractVideoID, loadYouTubeAPI } from '../utils/youtubeUtils';

const DictationEditorScreen: React.FC = () => {
    const { 
        editingDictationNote, 
        setCurrentScreen, 
        handleUpdateDictationNote, 
        handleStartDictationSession,
        showToast
    } = useAppContext();

    if (!editingDictationNote) return null;

    const [title, setTitle] = useState(editingDictationNote.title);
    const [youtubeUrl, setYoutubeUrl] = useState(editingDictationNote.youtubeUrl);
    const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>(editingDictationNote.transcript);
    const [loopCount, setLoopCount] = useState<number>(1);
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    
    const playerRef = useRef<any>(null); // To hold the YouTube player instance
    const segmentTimeoutRef = useRef<number | null>(null);
    const loopCounterRef = useRef(0);
    const videoId = useMemo(() => extractVideoID(youtubeUrl), [youtubeUrl]);

    useEffect(() => {
        if (videoId) {
            loadYouTubeAPI().then(() => {
                if (playerRef.current && playerRef.current.loadVideoById) {
                    playerRef.current.loadVideoById(videoId);
                } else if (!playerRef.current) {
                    playerRef.current = new window.YT.Player('yt-player-editor', {
                        height: '200',
                        width: '100%',
                        videoId,
                        playerVars: { 'playsinline': 1 }
                    });
                }
            });
        }
    }, [videoId]);
    
    const playSegment = (entry: TranscriptEntry) => {
        if (!playerRef.current || !playerRef.current.seekTo) {
            showToast("Video player is not ready.", "info");
            return;
        }

        if (segmentTimeoutRef.current) {
            clearTimeout(segmentTimeoutRef.current);
        }

        loopCounterRef.current = 1;
        playerRef.current.setPlaybackRate(playbackRate);

        const executePlay = () => {
            playerRef.current.seekTo(entry.start, true);
            playerRef.current.playVideo();

            segmentTimeoutRef.current = window.setTimeout(() => {
                if (loopCount === -1 || loopCounterRef.current < loopCount) {
                    loopCounterRef.current++;
                    executePlay();
                } else {
                    playerRef.current?.pauseVideo();
                }
            }, (entry.duration * 1000) / playbackRate);
        };

        executePlay();
    };
    
    const handleEntryChange = (index: number, field: keyof TranscriptEntry, value: string | number) => {
        const newEntries = [...transcriptEntries];
        const entryToUpdate = { ...newEntries[index] };
        
        if (field === 'text') {
            entryToUpdate.text = value as string;
        } else {
            const numValue = Number(value);
            if (!isNaN(numValue) && numValue >= 0) {
                 if (field === 'start') entryToUpdate.start = numValue;
                 if (field === 'duration') entryToUpdate.duration = numValue;
            }
        }
        newEntries[index] = entryToUpdate;
        setTranscriptEntries(newEntries);
    };

    const handleDeleteEntry = (index: number) => {
        setTranscriptEntries(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddEntry = () => {
        const lastEntry = transcriptEntries[transcriptEntries.length - 1];
        const newStart = lastEntry ? lastEntry.start + lastEntry.duration : 0;
        const newEntry: TranscriptEntry = { text: '', start: Math.round(newStart), duration: 3 };
        setTranscriptEntries([...transcriptEntries, newEntry]);
    };

    const formatTimestamp = (totalSeconds: number): string => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSave = () => {
        handleUpdateDictationNote({
            ...editingDictationNote,
            title,
            youtubeUrl,
            transcript: transcriptEntries,
        });
        showToast("Changes saved!", "success");
    };

    const handleStartPractice = () => {
        const updatedNote = {
            ...editingDictationNote,
            title,
            youtubeUrl,
            transcript: transcriptEntries,
        };
        handleUpdateDictationNote(updatedNote);
        handleStartDictationSession(updatedNote);
    };

    const isPracticeReady = !!videoId && transcriptEntries.length > 0;

    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
            <header className="flex items-center gap-3 mb-6">
                <button onClick={() => setCurrentScreen(Screen.Dictation)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                    <Icon name="arrowLeft" className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Edit Dictation</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400">Link a video and provide a timestamped transcript.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">YouTube URL</label>
                        <input type="text" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2" />
                    </div>
                     <div className="bg-black rounded-lg overflow-hidden">
                        <div id="yt-player-editor"></div>
                        {!videoId && <div className="h-[200px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500">Video preview will appear here</div>}
                    </div>
                    <div className="flex items-center gap-4">
                        <div>
                            <label htmlFor="loop-select-editor" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Loop</label>
                            <select id="loop-select-editor" value={loopCount} onChange={e => setLoopCount(Number(e.target.value))} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1.5 text-sm">
                                <option value="1">1x</option>
                                <option value="3">3x</option>
                                <option value="5">5x</option>
                                <option value="-1">∞</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="speed-select-editor" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Speed</label>
                            <select id="speed-select-editor" value={playbackRate} onChange={e => setPlaybackRate(Number(e.target.value))} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1.5 text-sm">
                                <option value="0.5">0.5x</option>
                                <option value="0.75">0.75x</option>
                                <option value="1">1x (Normal)</option>
                                <option value="1.5">1.5x</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Transcript</label>
                    <div className="flex-grow space-y-2 h-80 overflow-y-auto p-2 bg-slate-100 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                        {transcriptEntries.map((entry, index) => (
                            <div key={index} className="flex items-start gap-2 group p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => playSegment(entry)}>
                                <span className="font-mono text-sm text-slate-500 dark:text-slate-400 pt-1" title="Click to play segment">
                                    {formatTimestamp(entry.start)}
                                </span>
                                <textarea
                                    value={entry.text}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={e => handleEntryChange(index, 'text', e.target.value)}
                                    rows={1}
                                    className="flex-grow bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none overflow-hidden"
                                    ref={el => {
                                        if (el) {
                                            el.style.height = 'auto';
                                            el.style.height = `${el.scrollHeight}px`;
                                        }
                                    }}
                                />
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteEntry(index); }} className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                                    <Icon name="trash" className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleAddEntry} className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 self-start">
                        <Icon name="plus" className="w-4 h-4"/> Add Segment
                    </button>
                </div>
            </div>
            
            <footer className="mt-6 flex justify-end items-center gap-3">
                <button onClick={handleSave} className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-1">
                    <Icon name="check" className="w-5 h-5"/>
                    Save Changes
                </button>
                <button onClick={handleStartPractice} disabled={!isPracticeReady} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <Icon name="play" className="w-5 h-5" />
                    Start Practice
                </button>
            </footer>
        </div>
    );
};

export default DictationEditorScreen;
