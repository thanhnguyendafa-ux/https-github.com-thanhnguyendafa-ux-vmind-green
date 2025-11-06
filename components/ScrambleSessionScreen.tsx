import React, { useState, useEffect, useMemo } from 'react';
import { ScrambleSessionData, FlashcardStatus } from '../types';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';

const statusConfig: { [key in FlashcardStatus]: { label: string; color: string; } } = {
  [FlashcardStatus.New]: { label: 'New', color: 'gray' },
  [FlashcardStatus.Again]: { label: 'Again', color: 'bg-red-500 hover:bg-red-600' },
  [FlashcardStatus.Hard]: { label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600' },
  [FlashcardStatus.Good]: { label: 'Good', color: 'bg-blue-500 hover:bg-blue-600' },
  [FlashcardStatus.Easy]: { label: 'Easy', color: 'bg-green-500 hover:bg-green-600' },
  [FlashcardStatus.Perfect]: { label: 'Perfect', color: 'bg-purple-500 hover:bg-purple-600' },
};

const normalizeSentence = (s: string) => s.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ").trim();

const ScrambleSessionScreen: React.FC = () => {
    const { activeScrambleSession, handleFinishScrambleSession } = useAppContext();
    if (!activeScrambleSession) return null;

    const [session, setSession] = useState(activeScrambleSession);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [shake, setShake] = useState(false);
    
    // Typing mode state
    const [typedAnswer, setTypedAnswer] = useState('');
    
    // Click mode state
    const [answerParts, setAnswerParts] = useState<string[]>([]);
    const [bankParts, setBankParts] = useState<string[]>([]);

    const currentQuestion = session.queue[session.currentIndex];
    const progressPercentage = (session.currentIndex / session.queue.length) * 100;
    const answered = feedback !== null;

    useEffect(() => {
        if (currentQuestion) {
            setBankParts(currentQuestion.scrambledParts);
            setAnswerParts([]);
            setTypedAnswer('');
            setFeedback(null);
        }
    }, [currentQuestion]);

    const handleAnswerCheck = () => {
        if (answered || !currentQuestion) return;
        
        const userAnswer = session.settings.interactionMode === 'click'
            ? answerParts.join(' ')
            : typedAnswer;
        
        const isCorrect = normalizeSentence(userAnswer) === normalizeSentence(currentQuestion.originalSentence);
        
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        if (!isCorrect) {
            setShake(true);
            setTimeout(() => setShake(false), 300);
        }
    };

    const handleRate = (status: FlashcardStatus) => {
        if (!currentQuestion) return;
        
        const isCorrect = status !== FlashcardStatus.Again && status !== FlashcardStatus.Hard;
        
        let workQueue = [...session.queue];
        const [itemToMove] = workQueue.splice(session.currentIndex, 1);
        
        let insertIndex;
        if (!isCorrect) {
            insertIndex = Math.min(2, workQueue.length - session.currentIndex); // Re-ask soon
        } else {
            insertIndex = workQueue.length - session.currentIndex; // Put at the end of remaining queue
        }
        
        workQueue.splice(session.currentIndex + insertIndex, 0, itemToMove);
        
        const nextIndex = session.currentIndex;
        const updatedHistory = [...session.history, { rowId: currentQuestion.rowId, status, timestamp: Date.now() }];

        if (nextIndex >= session.queue.length -1) {
             handleFinishScrambleSession({ ...session, history: updatedHistory });
        } else {
            setSession(prev => ({
                ...prev,
                queue: workQueue,
                currentIndex: prev.currentIndex + 1,
                history: updatedHistory,
            }));
        }
    };
    
    // Click mode handlers
    const moveFromBank = (part: string, index: number) => {
        setAnswerParts(prev => [...prev, part]);
        setBankParts(prev => prev.filter((_, i) => i !== index));
    };
    const moveFromAnswer = (part: string, index: number) => {
        setBankParts(prev => [...prev, part]);
        setAnswerParts(prev => prev.filter((_, i) => i !== index));
    };

    if (!currentQuestion) {
        return <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex items-center justify-center"><p>Session Complete!</p></div>;
    }

    return (
        <div className="fixed inset-0 bg-slate-100 dark:bg-slate-900 flex flex-col items-center p-4 transition-colors duration-300">
            <header className="w-full max-w-2xl mb-4">
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 mb-2">
                    <span>Card {session.currentIndex + 1} of {session.queue.length}</span>
                    <button onClick={() => handleFinishScrambleSession(session)} className="hover:text-slate-800 dark:hover:text-white transition-colors">End Session</button>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                </div>
            </header>
            
            <main className={`flex-1 flex flex-col items-center justify-center w-full max-w-2xl ${shake ? 'animate-shake' : ''}`}>
                <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-6 shadow-lg w-full">
                    <h2 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400 mb-4 text-center">Reconstruct the Sentence</h2>
                    
                    {session.settings.interactionMode === 'click' ? (
                        <div className="space-y-4">
                            <div className="min-h-[6rem] bg-slate-100 dark:bg-slate-700/50 rounded-lg p-2 flex flex-wrap gap-2 items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                                {answerParts.map((part, index) => (
                                    <button key={index} onClick={() => !answered && moveFromAnswer(part, index)} className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-200 font-medium px-3 py-1.5 rounded-md text-base transition-transform hover:-translate-y-0.5">
                                        {part}
                                    </button>
                                ))}
                            </div>
                            <div className="min-h-[6rem] p-2 flex flex-wrap gap-2 items-center justify-center">
                                {bankParts.map((part, index) => (
                                    <button key={index} onClick={() => !answered && moveFromBank(part, index)} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium px-3 py-1.5 rounded-md text-base transition-transform hover:scale-105">
                                        {part}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-2 flex flex-wrap gap-2 items-center justify-center text-slate-500 dark:text-slate-400 italic">
                                {currentQuestion.scrambledParts.join(' ')}
                            </div>
                            <textarea
                                value={typedAnswer}
                                onChange={(e) => setTypedAnswer(e.target.value)}
                                disabled={answered}
                                placeholder="Type the sentence here..."
                                rows={3}
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                            />
                        </div>
                    )}

                    {!answered ? (
                        <button onClick={handleAnswerCheck} className="mt-4 w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors">
                            Check Answer
                        </button>
                    ) : (
                        <div className="mt-4 animate-fadeIn space-y-4">
                             <div className={`p-3 rounded-lg text-center ${feedback === 'correct' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-700 dark:text-red-300'}`}>
                                <p className="font-bold text-sm">{feedback === 'correct' ? 'Correct!' : 'Incorrect'}</p>
                                {feedback === 'incorrect' && <p className="text-sm mt-1">Answer: <span className="font-bold">{currentQuestion.originalSentence}</span></p>}
                            </div>
                            <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full">
                                {[FlashcardStatus.Again, FlashcardStatus.Hard, FlashcardStatus.Good, FlashcardStatus.Easy, FlashcardStatus.Perfect].map(status => (
                                    <button key={status} onClick={() => handleRate(status)} className={`py-2 sm:py-3 rounded-lg text-white text-xs sm:text-sm font-bold transition-transform hover:scale-105 ${statusConfig[status].color}`}>
                                        {statusConfig[status].label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ScrambleSessionScreen;
