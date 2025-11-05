import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FlashcardSession, FlashcardStatus, Table, VocabRow, Relation, RelationDesign, TypographyDesign, CardFaceDesign } from '../types';
import Icon from './Icon';
import Modal from './Modal';
import WordDetailModal from './WordDetailModal';
import { generateSpeech } from '../services/geminiService';

// Base64 decoding function from Gemini docs
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Audio decoding function from Gemini docs
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const statusConfig: { [key in FlashcardStatus]: { label: string; color: string; intervalMultiplier: number } } = {
  [FlashcardStatus.New]: { label: 'New', color: 'gray', intervalMultiplier: 0 },
  [FlashcardStatus.Again]: { label: 'Again', color: 'bg-red-500 hover:bg-red-600', intervalMultiplier: 0 },
  [FlashcardStatus.Hard]: { label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600', intervalMultiplier: 0.25 },
  [FlashcardStatus.Good]: { label: 'Good', color: 'bg-blue-500 hover:bg-blue-600', intervalMultiplier: 0.5 },
  [FlashcardStatus.Easy]: { label: 'Easy', color: 'bg-green-500 hover:bg-green-600', intervalMultiplier: 0.75 },
  [FlashcardStatus.Perfect]: { label: 'Perfect', color: 'bg-purple-500 hover:bg-purple-600', intervalMultiplier: 1 },
};

// --- Design Logic (copied from TableScreen for integration) ---

const DEFAULT_TYPOGRAPHY: TypographyDesign = {
  color: '#111827',
  fontSize: '24px',
  fontFamily: 'sans-serif',
  textAlign: 'center',
  fontWeight: 'bold',
};

// FIX: Added missing 'layout' property to CardFaceDesign objects.
const DEFAULT_RELATION_DESIGN: RelationDesign = {
  front: { backgroundType: 'solid', backgroundValue: '#FFFFFF', gradientAngle: 135, typography: {}, layout: 'vertical' },
  back: { backgroundType: 'solid', backgroundValue: '#F9FAFB', gradientAngle: 135, typography: {}, layout: 'vertical' }
};

// FIX: Updated data migration function to handle missing layout property and clean up old properties.
const upgradeRelationDesign = (relation: Relation): Relation => {
    const newRelation = JSON.parse(JSON.stringify(relation));
    if (!newRelation.design) {
        newRelation.design = JSON.parse(JSON.stringify(DEFAULT_RELATION_DESIGN));
    }

    for (const face of ['front', 'back'] as const) {
        const faceDesign = newRelation.design[face];
        if (typeof faceDesign.typography !== 'object' || faceDesign.typography === null) {
            const oldTypography: TypographyDesign = {
                color: (faceDesign as any).color || (face === 'front' ? '#111827' : '#111827'),
                fontSize: (faceDesign as any).fontSize || (face === 'front' ? '24px' : '18px'),
                fontFamily: (faceDesign as any).fontFamily || 'sans-serif',
                textAlign: (faceDesign as any).textAlign || 'center',
                fontWeight: (faceDesign as any).fontWeight || (face === 'front' ? 'bold' : 'normal'),
            };

            faceDesign.typography = {};
            const columnIds = face === 'front' ? newRelation.questionColumnIds : newRelation.answerColumnIds;
            for (const colId of columnIds) {
                faceDesign.typography[colId] = { ...oldTypography };
            }
        }
        if (faceDesign.backgroundType === 'gradient' && typeof faceDesign.gradientAngle !== 'number') {
            faceDesign.gradientAngle = 135;
        }
        if (!faceDesign.layout) {
            faceDesign.layout = 'vertical';
        }
        delete (faceDesign as any).color;
        delete (faceDesign as any).fontSize;
        delete (faceDesign as any).fontFamily;
        delete (faceDesign as any).textAlign;
        delete (faceDesign as any).fontWeight;
    }
    return newRelation;
};

interface FlashcardSessionScreenProps {
  session: FlashcardSession;
  tables: Table[];
  onFinish: (session: FlashcardSession) => void;
  onUpdateRow: (row: VocabRow) => void;
  onSaveToJournal: (source: string, content: string) => void;
}

const FlashcardSessionScreen: React.FC<FlashcardSessionScreenProps> = ({ session, tables, onFinish, onUpdateRow, onSaveToJournal }) => {
  const [currentSession, setCurrentSession] = useState(session);
  const [isFlipped, setIsFlipped] = useState(false);
  const [rowForDetail, setRowForDetail] = useState<VocabRow | null>(null);

  const audioCtx = useRef<AudioContext | null>(null);
  const [audioState, setAudioState] = useState<'loading' | 'playing' | 'error' | null>(null);

  useEffect(() => {
     if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
  }, []);

  const rowDataMap = useMemo(() => {
    const map = new Map<string, VocabRow>();
    tables.flatMap(t => t.rows).forEach(w => map.set(w.id, w));
    return map;
  }, [tables]);

  const relationDataMap = useMemo(() => {
    const map = new Map<string, Relation>();
    tables.flatMap(t => t.relations).forEach(r => map.set(r.id, r));
    return map;
  }, [tables]);

  const currentRowId = currentSession.queue[currentSession.currentIndex];
  const currentRow = rowDataMap.get(currentRowId);

  // Assign a relation to each row in the queue if it doesn't have one
  const rowRelationMap = useMemo(() => {
    const map = new Map<string, string>();
    currentSession.queue.forEach(rowId => {
        const randomRelId = currentSession.relationIds[Math.floor(Math.random() * currentSession.relationIds.length)];
        map.set(rowId, randomRelId);
    });
    return map;
  }, [currentSession.queue, currentSession.relationIds]);

  const currentRelationId = rowRelationMap.get(currentRowId);
  const currentRelation = currentRelationId ? relationDataMap.get(currentRelationId) : null;
  
  const upgradedRelation = useMemo(() => {
    if (!currentRelation) return null;
    return upgradeRelationDesign(currentRelation);
  }, [currentRelation]);

  const currentTable = tables.find(t => t.rows.some(w => w.id === currentRowId));

  const progressPercentage = (currentSession.currentIndex / currentSession.queue.length) * 100;

  useEffect(() => {
    setIsFlipped(false);
  }, [currentSession.currentIndex]);

  const handleRate = (status: FlashcardStatus) => {
    if (!currentRowId) return;

    const remainingQueue = currentSession.queue.slice(currentSession.currentIndex + 1);
    const multiplier = statusConfig[status].intervalMultiplier;
    let insertIndex: number;

    if (multiplier === 0) { // 'Again'
        insertIndex = 1; 
    } else {
        insertIndex = Math.round(remainingQueue.length * multiplier);
    }
    
    let workQueue = [...currentSession.queue];
    const [itemToMove] = workQueue.splice(currentSession.currentIndex, 1);
    workQueue.splice(currentSession.currentIndex + insertIndex, 0, itemToMove);
    
    const nextIndex = currentSession.currentIndex;

    setCurrentSession(prev => ({
      ...prev,
      queue: workQueue,
      currentIndex: nextIndex >= workQueue.length ? workQueue.length - 1 : nextIndex,
      sessionEncounters: prev.sessionEncounters + 1,
      history: [...prev.history, { rowId: currentRowId, status, timestamp: Date.now() }],
    }));
  };

  const handlePlayAudio = async (textToSpeak: string) => {
    if (!textToSpeak || audioState === 'loading') return;

    setAudioState('loading');
    try {
        const audioB64 = await generateSpeech(textToSpeak);
        if (!audioB64 || !audioCtx.current) throw new Error("Audio generation failed");
        
        const audioBytes = decode(audioB64);
        const audioBuffer = await decodeAudioData(audioBytes, audioCtx.current, 24000, 1);
        
        const source = audioCtx.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.current.destination);
        source.onended = () => setAudioState(null);
        source.start();
        setAudioState('playing');
    } catch (error) {
        console.error("Error playing audio:", error);
        setAudioState('error');
        setTimeout(() => setAudioState(null), 2000);
    }
  };

  const getCardFaceStyle = (faceDesign: CardFaceDesign): React.CSSProperties => {
      let background = faceDesign.backgroundValue;
      if (faceDesign.backgroundType === 'gradient' && faceDesign.backgroundValue.includes(',')) {
          const [color1, color2] = faceDesign.backgroundValue.split(',');
          background = `linear-gradient(${faceDesign.gradientAngle}deg, ${color1 || '#ffffff'}, ${color2 || '#e0e0e0'})`;
      } else if (faceDesign.backgroundType === 'image') {
          background = `url("${faceDesign.backgroundValue}") center/cover no-repeat, #f0f0f0`;
      }
      return { background };
  };

  if (!currentRow || !upgradedRelation || !currentTable) {
    return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center">
            <h2 className="text-xl font-bold mb-4">Session Complete!</h2>
            <button onClick={() => onFinish(currentSession)} className="bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg">
                Return to Menu
            </button>
        </div>
    );
  }

  const cardFrontText = upgradedRelation.questionColumnIds.map(id => currentRow.cols[id]).filter(Boolean).join(' / ') || 'N/A';
  const canPlayFrontAudio = upgradedRelation.questionColumnIds.includes(currentTable.audioConfig?.sourceColumnId || '');
  const canPlayBackAudio = upgradedRelation.answerColumnIds.includes(currentTable.audioConfig?.sourceColumnId || '');


  return (
    <div className="fixed inset-0 bg-slate-100 dark:bg-slate-900 flex flex-col items-center p-4 transition-colors duration-300">
      <header className="w-full max-w-2xl mb-4">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 mb-2">
            <span>Card {currentSession.currentIndex + 1} of {currentSession.queue.length}</span>
            <button onClick={() => onFinish(currentSession)} className="hover:text-slate-800 dark:hover:text-white transition-colors">End Session</button>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
          </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
        <div className="w-full h-64 sm:h-80 cursor-pointer group mb-6" onClick={() => setIsFlipped(!isFlipped)}>
            <div className="card-container w-full h-full perspective-1000">
                <div className={`card-flip relative w-full h-full transform-style-3d ${isFlipped ? 'flipped' : ''}`}>
                    {/* Front */}
                    <div className="card-front absolute w-full h-full flex flex-col items-center justify-center p-4 rounded-lg shadow-lg border dark:border-slate-700" style={getCardFaceStyle(upgradedRelation.design.front)}>
                        {upgradedRelation.questionColumnIds.map(id => {
                            const typography = upgradedRelation.design.front.typography[id] || DEFAULT_TYPOGRAPHY;
                            const text = currentRow.cols[id] || `[${currentTable.columns.find(c => c.id === id)?.name}]`;
                            return <div key={id} style={{...typography}} className="w-full p-1 break-words">{text}</div>;
                        })}
                         {canPlayFrontAudio && <button onClick={(e) => {e.stopPropagation(); handlePlayAudio(cardFrontText)}} className="absolute bottom-4 right-4 text-slate-400 hover:text-emerald-500"><Icon name="play" className="w-6 h-6"/></button>}
                    </div>
                    {/* Back */}
                    <div className="card-back absolute w-full h-full flex flex-col items-center justify-center p-4 rounded-lg shadow-lg border dark:border-slate-700" style={getCardFaceStyle(upgradedRelation.design.back)}>
                        {upgradedRelation.answerColumnIds.map(id => {
                            const typography = upgradedRelation.design.back.typography[id] || DEFAULT_TYPOGRAPHY;
                            const text = currentRow.cols[id] || `[${currentTable.columns.find(c => c.id === id)?.name}]`;
                            const audioText = upgradedRelation.answerColumnIds.map(id => currentRow.cols[id]).filter(Boolean).join(' / ');
                            return <div key={id} style={{...typography}} className="w-full p-1 break-words">{text}</div>;
                        })}
                         {canPlayBackAudio && <button onClick={(e) => {
                           const audioText = upgradedRelation.answerColumnIds.map(id => currentRow.cols[id]).filter(Boolean).join(' / ');
                           e.stopPropagation(); 
                           handlePlayAudio(audioText)
                         }} className="absolute bottom-4 right-4 text-slate-400 hover:text-emerald-500"><Icon name="play" className="w-6 h-6"/></button>}
                    </div>
                </div>
            </div>
        </div>
        
        {isFlipped && (
             <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full animate-fadeIn">
                {[FlashcardStatus.Again, FlashcardStatus.Hard, FlashcardStatus.Good, FlashcardStatus.Easy, FlashcardStatus.Perfect].map(status => (
                    <button key={status} onClick={() => handleRate(status)} className={`py-2 sm:py-3 rounded-lg text-white text-xs sm:text-sm font-bold transition-transform hover:scale-105 ${statusConfig[status].color}`}>
                        {statusConfig[status].label}
                    </button>
                ))}
            </div>
        )}
      </main>
      
      <footer className="w-full max-w-2xl mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={() => setRowForDetail(currentRow)} title="View/Edit Row" className="p-2 rounded-full bg-white dark:bg-slate-700 text-slate-500 hover:text-emerald-500 shadow-sm"><Icon name="pencil" className="w-5 h-5"/></button>
            <button onClick={() => {
              const frontText = upgradedRelation.questionColumnIds.map(id => currentRow.cols[id]).filter(Boolean).join(' / ');
              const backText = upgradedRelation.answerColumnIds.map(id => currentRow.cols[id]).filter(Boolean).join(' / ');
              onSaveToJournal("Flashcard Review", `*Q: ${frontText}*\n*A: ${backText}*`);
            }} title="Save to Journal" className="p-2 rounded-full bg-white dark:bg-slate-700 text-slate-500 hover:text-emerald-500 shadow-sm"><Icon name="book" className="w-5 h-5"/></button>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
              Session Time: {Math.floor((Date.now() - currentSession.startTime) / 60000)}m
          </div>
      </footer>
       <WordDetailModal
        isOpen={!!rowForDetail}
        row={rowForDetail}
        columns={currentTable.columns}
        imageColumnId={currentTable.imageConfig?.imageColumnId}
        onClose={() => setRowForDetail(null)}
        onSave={(updatedRow) => { onUpdateRow(updatedRow); setRowForDetail(null); }}
        onDelete={() => {}}
       />
    </div>
  );
};

export default FlashcardSessionScreen;
