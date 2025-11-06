
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';
import { Table, Relation } from '../types';

type AnimationStep = 'in' | 'front' | 'flip' | 'back' | 'out';

interface CardPart {
    text: string;
    columnName: string;
}

const TheaterSessionScreen: React.FC = () => {
    const { activeTheaterSession, handleFinishTheaterSession, tables, handleSaveToJournal } = useAppContext();
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [animationStep, setAnimationStep] = useState<AnimationStep>('in');
    const [revealedPartIndex, setRevealedPartIndex] = useState(-1);
    const [isPaused, setIsPaused] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [elapsed, setElapsed] = useState(0);

    const stepTimerRef = useRef<number | null>(null);
    const sessionTimerRef = useRef<number | null>(null);
    const controlsTimerRef = useRef<number | null>(null);

    const currentCardData = useMemo(() => {
        if (!activeTheaterSession) return null;
        
        const currentRowId = activeTheaterSession.queue[currentIndex];
        let currentTable: Table | undefined;
        let currentRow = undefined;

        for (const table of tables) {
            const row = table.rows.find(r => r.id === currentRowId);
            if (row) {
                currentTable = table;
                currentRow = row;
                break;
            }
        }
        
        if (!currentTable || !currentRow) return null;

        const source = activeTheaterSession.settings.sources.find(s => s.tableId === currentTable!.id);
        if (!source) return null;

        const currentRelation = currentTable.relations.find(r => r.id === source.relationId);
        if (!currentRelation) return null;

        const getParts = (columnIds: string[]): CardPart[] => {
            return columnIds.map(id => ({
                text: currentRow!.cols[id] || '',
                columnName: currentTable!.columns.find(c => c.id === id)?.name || ''
            })).filter(part => part.text);
        };

        return { table: currentTable, row: currentRow, relation: currentRelation, frontParts: getParts(currentRelation.questionColumnIds), backParts: getParts(currentRelation.answerColumnIds) };

    }, [activeTheaterSession, currentIndex, tables]);

    useEffect(() => {
        if (!activeTheaterSession || isPaused || !currentCardData) return;

        const { settings } = activeTheaterSession;
        const { frontParts, backParts } = currentCardData;

        const clearTimer = () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
        clearTimer();

        let nextAction = () => {};
        let delay = 0;

        if (animationStep === 'in') {
            nextAction = () => { setRevealedPartIndex(-1); setAnimationStep('front'); };
            delay = 400; // match slide-in anim
        } else if (animationStep === 'front') {
            if (revealedPartIndex < frontParts.length - 1) {
                nextAction = () => setRevealedPartIndex(i => i + 1);
                delay = settings.partDelay;
            } else {
                nextAction = () => setAnimationStep('flip');
                delay = settings.partDelay + 1000;
            }
        } else if (animationStep === 'flip') {
            nextAction = () => { setRevealedPartIndex(-1); setAnimationStep('back'); };
            delay = 600; // match card flip anim
        } else if (animationStep === 'back') {
             if (revealedPartIndex < backParts.length - 1) {
                nextAction = () => setRevealedPartIndex(i => i + 1);
                delay = settings.partDelay;
            } else {
                nextAction = () => setAnimationStep('out');
                delay = settings.cardInterval;
            }
        } else if (animationStep === 'out') {
            nextAction = () => {
                setCurrentIndex(prev => (prev + 1) % activeTheaterSession.queue.length);
                setAnimationStep('in');
            };
            delay = 400; // match slide-out anim
        }
        
        stepTimerRef.current = window.setTimeout(nextAction, delay);
        
        return clearTimer;
    }, [animationStep, isPaused, currentCardData, revealedPartIndex, activeTheaterSession]);

    useEffect(() => {
        if (!activeTheaterSession || isPaused) return;

        const startTime = Date.now() - elapsed;
        
        sessionTimerRef.current = window.setInterval(() => {
            const newElapsed = Date.now() - startTime;
            setElapsed(newElapsed);
            
            const durationLimit = activeTheaterSession.settings.sessionDuration * 60 * 1000;
            if (durationLimit > 0 && newElapsed >= durationLimit) {
                handleFinishTheaterSession({
                    ...activeTheaterSession,
                    history: [...activeTheaterSession.history, { rowId: activeTheaterSession.queue[currentIndex], timestamp: Date.now() }]
                });
            }
        }, 1000);
        
        return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
    }, [isPaused, activeTheaterSession, elapsed, currentIndex, handleFinishTheaterSession]);

    useEffect(() => {
        if (activeTheaterSession && currentCardData) {
            const currentId = currentCardData.row.id;
            const history = activeTheaterSession.history;
            if (!history.some(h => h.rowId === currentId)) {
                history.push({ rowId: currentId, timestamp: Date.now() });
            }
        }
    }, [currentIndex, activeTheaterSession, currentCardData]);

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = window.setTimeout(() => setShowControls(false), 3000);
    };
    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        };
    }, []);

    const handlePausePlay = () => setIsPaused(!isPaused);
    const handleNext = () => { setAnimationStep('out'); };
    const handlePrev = () => {
        if (!activeTheaterSession) return;
        setCurrentIndex(prev => (prev - 1 + activeTheaterSession.queue.length) % activeTheaterSession.queue.length);
        setAnimationStep('in');
    };
    const handleEnd = () => {
        if(activeTheaterSession && currentCardData) {
            handleFinishTheaterSession({
                ...activeTheaterSession,
                history: activeTheaterSession.history.some(h => h.rowId === currentCardData.row.id) ? activeTheaterSession.history : [...activeTheaterSession.history, { rowId: currentCardData.row.id, timestamp: Date.now() }]
            });
        }
    }
    const handleJournalClick = () => {
        if (!currentCardData) return;
        const front = currentCardData.frontParts.map(p => p.text).join(' / ');
        const back = currentCardData.backParts.map(p => p.text).join(' / ');
        handleSaveToJournal(`Theater: ${currentCardData.table.name}`, `*Q: ${front}*\n*A: ${back}*`);
    };

    if (!activeTheaterSession || !currentCardData) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <p className="text-white">Loading session...</p>
            </div>
        );
    }
    
    const { frontParts, backParts } = currentCardData;
    const isFlipped = animationStep === 'back' || (animationStep === 'flip' && revealedPartIndex === -1);
    const totalDuration = activeTheaterSession.settings.sessionDuration * 60;
    const progressPercent = totalDuration > 0 ? (elapsed / 1000 / totalDuration) * 100 : 0;
    
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const renderParts = (parts: CardPart[], face: 'front' | 'back') => (
        <div className="space-y-4 text-center">
            {parts.map((part, index) => (
                <div key={`${face}-${index}`} className={`transition-opacity duration-500 ${(isFlipped ? animationStep === 'back' : animationStep === 'front') && index <= revealedPartIndex ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`}>
                    <p className="text-xl text-slate-400">{part.columnName}</p>
                    <p className="text-4xl font-bold">{part.text}</p>
                </div>
            ))}
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-4 font-sans select-none">
            <div className={`w-full max-w-4xl h-96 flex items-center justify-center relative ${animationStep === 'in' ? 'animate-slide-in-right' : ''} ${animationStep === 'out' ? 'animate-slide-out-left' : ''}`}>
                 {(animationStep !== 'in' && animationStep !== 'out') && (
                    <div className="card-container w-full h-full perspective-1000">
                        <div className={`card-flip relative w-full h-full transform-style-3d ${isFlipped ? 'flipped' : ''}`}>
                            <div className="card-front absolute w-full h-full flex items-center justify-center">
                                {renderParts(frontParts, 'front')}
                            </div>
                            <div className="card-back absolute w-full h-full flex items-center justify-center">
                                {renderParts(backParts, 'back')}
                            </div>
                        </div>
                    </div>
                 )}
            </div>
            <div className={`fixed inset-0 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                    <button onClick={handleEnd} className="p-2 rounded-full hover:bg-white/10"><Icon name="x" className="w-6 h-6"/></button>
                    <div className="text-center">
                        <h3 className="font-bold">{currentCardData.table.name}</h3>
                        <p className="text-sm text-slate-300">{currentCardData.relation.name}</p>
                    </div>
                    <button onClick={handleJournalClick} className="p-2 rounded-full hover:bg-white/10"><Icon name="book" className="w-6 h-6"/></button>
                </header>
                <footer className="absolute bottom-0 left-0 right-0 p-4 space-y-4 bg-gradient-to-t from-black/50 to-transparent">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono">{formatTime(elapsed)}</span>
                        <div className="w-full bg-white/20 rounded-full h-1.5">
                            <div className="bg-white h-1.5 rounded-full" style={{width: `${progressPercent}%`}}></div>
                        </div>
                        <span className="text-xs font-mono">{activeTheaterSession.settings.sessionDuration > 0 ? formatTime(totalDuration * 1000) : '∞'}</span>
                    </div>
                    <div className="flex items-center justify-center gap-8">
                        <button onClick={handlePrev} className="p-2 rounded-full hover:bg-white/10"><Icon name="arrowLeft" className="w-8 h-8"/></button>
                        <button onClick={handlePausePlay} className="p-4 rounded-full bg-white/20 hover:bg-white/30"><Icon name={isPaused ? "play" : "pause"} className="w-10 h-10"/></button>
                        <button onClick={handleNext} className="p-2 rounded-full hover:bg-white/10"><Icon name="arrowRight" className="w-8 h-8"/></button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default TheaterSessionScreen;
