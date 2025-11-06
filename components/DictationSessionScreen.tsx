import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';
import { loadYouTubeAPI } from '../utils/youtubeUtils';
import { extractVideoID } from '../utils/youtubeUtils';

const normalizeText = (s: string) => s.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ").trim();

const DictationSessionScreen: React.FC = () => {
    const { activeDictationSession, handleFinishDictationSession, handleSaveToJournal, showToast } = useAppContext();
    if (!activeDictationSession) return null;

    const { note, startTime } = activeDictationSession;
    const [activeIndex, setActiveIndex] = useState(0);
    const [userInputs, setUserInputs] = useState<Record<number, string>>({});
    const [results, setResults] = useState<Record<number, 'correct' | 'incorrect' | 'untouched'>>(
        Object.fromEntries(note.transcript.map((_, i) => [i, 'untouched']))
    );
    const [showAnswer, setShowAnswer] = useState(false);
    const [isTranscriptVisible, setIsTranscriptVisible] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isJournaled, setIsJournaled] = useState(false);
    const [loopCount, setLoopCount] = useState<number>(1);
    const [playbackRate, setPlaybackRate] = useState<number>(1);

    const playerRef = useRef<any>(null);
    const segmentTimeoutRef = useRef<number | null>(null);
    const loopCounterRef = useRef(0);
    
    const videoId = extractVideoID(note.youtubeUrl);
    const currentEntry = note.transcript[activeIndex];

    useEffect(() => {
        if (videoId) {
            loadYouTubeAPI().then(() => {
                if (!playerRef.current) {
                    playerRef.current = new window.YT.Player('yt-player-session', {
                        height: '0', // Hide player visuals
                        width: '0',
                        videoId: videoId,
                        playerVars: { 'playsinline': 1 },
                        events: {
                            'onReady': (event: any) => { event.target.setVolume(100); }
                        }
                    });
                }
            });
        }
        const timer = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => {
            clearInterval(timer);
            if (segmentTimeoutRef.current) clearTimeout(segmentTimeoutRef.current);
            playerRef.current?.destroy();
        };
    }, [videoId, startTime]);

    const playCurrentSegment = () => {
        if (!playerRef.current || !currentEntry || !playerRef.current.seekTo) {
             showToast("Video player is not ready.", "info");
            return;
        }

        if (segmentTimeoutRef.current) {
            clearTimeout(segmentTimeoutRef.current);
        }

        loopCounterRef.current = 1;
        playerRef.current.setPlaybackRate(playbackRate);

        const executePlay = () => {
            playerRef.current.seekTo(currentEntry.start, true);
            playerRef.current.playVideo();

            segmentTimeoutRef.current = window.setTimeout(() => {
                if (loopCount === -1 || loopCounterRef.current < loopCount) {
                    loopCounterRef.current++;
                    executePlay();
                } else {
                    playerRef.current?.pauseVideo();
                }
            }, (currentEntry.duration * 1000) / playbackRate);
        };
        
        executePlay();
    };
    
    const handleCheck = () => {
        const userAnswer = userInputs[activeIndex] || '';
        const isCorrect = normalizeText(userAnswer) === normalizeText(currentEntry.text);
        setResults(prev => ({...prev, [activeIndex]: isCorrect ? 'correct' : 'incorrect'}));
        if(!isCorrect && useAppContext().settings.journalMode === 'automatic') {
             handleSaveToJournal(`Dictation: ${note.title}`, `*Incorrectly transcribed:*\n> ${currentEntry.text}`);
             setIsJournaled(true);
        }
    };
    
    const handleFinish = () => {
        const correctCount = Object.values(results).filter(r => r === 'correct').length;
        handleFinishDictationSession(activeDictationSession, { correct: correctCount, total: note.transcript.length });
    };

    const navigate = (newIndex: number) => {
        if (newIndex >= 0 && newIndex < note.transcript.length) {
            setActiveIndex(newIndex);
            setShowAnswer(false);
            setIsJournaled(false);
        }
    };

    const handleSaveJournalClick = () => {
        handleSaveToJournal(`Dictation: ${note.title}`, `> ${currentEntry.text}`);
        setIsJournaled(true);
    };

    const hasChecked = results[activeIndex] !== 'untouched';
    const resultStyle = results[activeIndex] === 'correct' ? 'border-emerald-500' : (results[activeIndex] === 'incorrect' ? 'border-red-500' : 'border-slate-300 dark:border-slate-600');
    
    return (
        <div className="flex flex-col md:flex-row h-screen bg-slate-100 dark:bg-slate-900">
            <div id="yt-player-session" className="absolute w-0 h-0"></div>
            <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto">
                <header className="flex-shrink-0 flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white truncate">{note.title}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Entry {activeIndex + 1} of {note.transcript.length}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{new Date(elapsedSeconds * 1000).toISOString().substr(14, 5)}</span>
                        <button onClick={handleFinish} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700">Finish</button>
                    </div>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl shadow-lg p-6">
                        <button onClick={playCurrentSegment} className="w-40 h-40 mx-auto flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-full mb-6 shadow-lg transition-transform hover:scale-105">
                            <Icon name="play" className="w-16 h-16"/>
                        </button>

                        <div className="flex items-center justify-center gap-6 mb-4">
                             <div>
                                <label htmlFor="loop-select-session" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 text-center">Loop</label>
                                <select id="loop-select-session" value={loopCount} onChange={e => setLoopCount(Number(e.target.value))} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1.5 text-sm">
                                    <option value="1">1x</option>
                                    <option value="3">3x</option>
                                    <option value="5">5x</option>
                                    <option value="-1">∞</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="speed-select-session" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 text-center">Speed</label>
                                <select id="speed-select-session" value={playbackRate} onChange={e => setPlaybackRate(Number(e.target.value))} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1.5 text-sm">
                                    <option value="0.5">0.5x</option>
                                    <option value="0.75">0.75x</option>
                                    <option value="1">1x (Normal)</option>
                                    <option value="1.5">1.5x</option>
                                </select>
                            </div>
                        </div>

                        <textarea
                            value={userInputs[activeIndex] || ''}
                            onChange={(e) => setUserInputs(prev => ({...prev, [activeIndex]: e.target.value}))}
                            disabled={hasChecked}
                            placeholder="Type what you hear..."
                            rows={3}
                            className={`w-full bg-slate-100 dark:bg-slate-700 border-2 rounded-lg px-4 py-3 text-lg transition-colors ${resultStyle}`}
                        />
                        {!hasChecked ? (
                            <button onClick={handleCheck} disabled={!userInputs[activeIndex]} className="mt-2 w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50">Check Answer</button>
                        ) : (
                            <div className="mt-2 space-y-2 animate-fadeIn">
                                {showAnswer && <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md text-sm text-slate-600 dark:text-slate-300">{currentEntry.text}</div>}
                                <div className="flex items-center justify-center gap-4 text-sm font-semibold">
                                    <button onClick={() => setShowAnswer(!showAnswer)} className="text-emerald-600 hover:underline">{showAnswer ? 'Hide' : 'Show'} Answer</button>
                                    <button onClick={() => showToast('AI Explain feature is coming soon!', 'info')} className="text-emerald-600 hover:underline flex items-center gap-1"><Icon name="sparkles" className="w-4 h-4" /> Explain</button>
                                    <button onClick={handleSaveJournalClick} disabled={isJournaled} className="text-emerald-600 hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <Icon name="book" className="w-4 h-4" /> {isJournaled ? 'Saved' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        )}
                         <div className="flex justify-between items-center mt-4">
                            <button onClick={() => navigate(activeIndex - 1)} disabled={activeIndex === 0} className="p-2 rounded-full disabled:opacity-30 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"><Icon name="arrowLeft" className="w-8 h-8"/></button>
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{activeIndex + 1} / {note.transcript.length}</span>
                            <button onClick={() => navigate(activeIndex + 1)} disabled={activeIndex === note.transcript.length - 1} className="p-2 rounded-full disabled:opacity-30 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"><Icon name="arrowRight" className="w-8 h-8"/></button>
                        </div>
                    </div>
                </div>
            </main>
            <aside className="w-full md:w-80 flex-shrink-0 bg-white dark:bg-slate-800 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-semibold text-sm">Transcript Index</h3>
                    <button onClick={() => setIsTranscriptVisible(!isTranscriptVisible)} title="Toggle transcript visibility" className="p-1 text-slate-500"><Icon name={isTranscriptVisible ? 'eye-off' : 'eye'} className="w-5 h-5"/></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {note.transcript.map((entry, index) => (
                        <div key={index} onClick={() => navigate(index)} className={`p-3 cursor-pointer border-l-4 ${activeIndex === index ? 'bg-slate-100 dark:bg-slate-900/50 border-emerald-500' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                                <Icon name={results[index] === 'correct' ? 'check-circle' : (results[index] === 'incorrect' ? 'error-circle' : 'circle-outline')} className={`w-4 h-4 ${results[index] === 'correct' ? 'text-emerald-500' : (results[index] === 'incorrect' ? 'text-red-500' : 'text-slate-400')}`}/>
                                <span>{new Date(entry.start * 1000).toISOString().substr(14, 5)}</span>
                            </div>
                            {isTranscriptVisible && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 pl-6">{entry.text}</p>}
                        </div>
                    ))}
                </div>
            </aside>
        </div>
    );
};

export default DictationSessionScreen;