import * as React from 'react';
import { Table, VocabRow, Relation, Column, AIPrompt, StudyMode, RelationDesign, CardFaceDesign, FlashcardStatus, TypographyDesign, Screen, Theme } from '../types';
import Icon from './Icon';
import Modal from './Modal';
import Toast from './Toast';
import Popover from './Popover';
import WordDetailModal from './WordDetailModal';
import { generateForPrompt, generateSpeech } from '../services/geminiService';
import { useAppContext } from '../context/AppContext';
import ConfirmationModal from './ConfirmationModal';


// --- DESIGN CONSTANTS ---
const DEFAULT_TYPOGRAPHY: TypographyDesign = {
  color: '#111827',
  fontSize: '24px',
  fontFamily: 'sans-serif',
  textAlign: 'center',
  fontWeight: 'bold',
};

const DARK_MODE_DEFAULT_TYPOGRAPHY: TypographyDesign = {
    ...DEFAULT_TYPOGRAPHY,
    color: '#f1f5f9',
};

const DEFAULT_RELATION_DESIGN: RelationDesign = {
  front: { backgroundType: 'solid', backgroundValue: '#FFFFFF', gradientAngle: 135, typography: {}, layout: 'vertical' },
  back: { backgroundType: 'solid', backgroundValue: '#F9FAFB', gradientAngle: 135, typography: {}, layout: 'vertical' }
};

const DESIGN_TEMPLATES: {name: string, design: RelationDesign}[] = [
    { name: 'Minimalist', design: DEFAULT_RELATION_DESIGN },
    { name: 'Dark', design: { 
        front: { backgroundType: 'solid', backgroundValue: '#1e293b', gradientAngle: 135, typography: {}, layout: 'vertical' }, 
        back: { backgroundType: 'solid', backgroundValue: '#334155', gradientAngle: 135, typography: {}, layout: 'vertical' }
    }},
    { name: 'Ocean', design: { 
        front: { backgroundType: 'gradient', backgroundValue: '#007CF0,#00DFD8', gradientAngle: 135, typography: {}, layout: 'vertical' }, 
        back: { backgroundType: 'solid', backgroundValue: '#f0f9ff', gradientAngle: 135, typography: {}, layout: 'vertical' }
    }},
];


// --- Relation Editor & Designer Components ---
const FlashcardPreview: React.FC<{ design: CardFaceDesign, columns: {id: string, name: string}[], face: 'front' | 'back', onSelectColumn: (id: string | null) => void, order: string[], onReorder: (newOrder: string[]) => void, selectedColumnId?: string | null }> = ({ design, columns, onSelectColumn, order, onReorder, selectedColumnId }) => {
    const { theme } = useAppContext();
    const draggedItem = React.useRef<string | null>(null);
    
    const getCardStyle = (): React.CSSProperties => {
        let background = design.backgroundValue;
        if (design.backgroundType === 'gradient' && design.backgroundValue.includes(',')) { const [color1, color2] = design.backgroundValue.split(','); background = `linear-gradient(${design.gradientAngle}deg, ${color1 || '#ffffff'}, ${color2 || '#e0e0e0'})`; } else if (design.backgroundType === 'image') { background = `url("${design.backgroundValue}") center/cover no-repeat, #f0f0f0`; }
        return { background };
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => { draggedItem.current = id; e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => { e.preventDefault(); if (!draggedItem.current || draggedItem.current === targetId) return; const currentIndex = order.indexOf(draggedItem.current); const targetIndex = order.indexOf(targetId); if (currentIndex === -1 || targetIndex === -1) return; const newOrder = [...order]; newOrder.splice(currentIndex, 1); newOrder.splice(targetIndex, 0, draggedItem.current); onReorder(newOrder); draggedItem.current = null; };

    const orderedColumns = React.useMemo(() => order.map(id => columns.find(c => c.id === id)).filter(Boolean) as Column[], [order, columns]);

    return (
        <div className="w-full h-80 rounded-lg shadow-lg border dark:border-slate-700 flex flex-col p-4 relative" style={getCardStyle()} onClick={() => onSelectColumn(null)}>
            <div className={`flex-1 flex items-center justify-center ${design.layout === 'vertical' ? 'flex-col gap-2' : 'flex-row gap-4'}`}>
                {orderedColumns.length > 0 ? orderedColumns.map(col => {
                    const typography = design.typography[col.id] || (theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY);
                    return (
                        <div key={col.id} onClick={(e) => { e.stopPropagation(); onSelectColumn(col.id) }} draggable onDragStart={(e) => handleDragStart(e, col.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)} className={`p-2 rounded-md cursor-pointer transition-all ${selectedColumnId === col.id ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-800' : ''}`} style={{ color: typography.color, fontSize: typography.fontSize, fontFamily: typography.fontFamily, fontWeight: typography.fontWeight, textAlign: typography.textAlign }}>
                            {col.name}
                        </div>
                    );
                }) : <span className="text-sm text-slate-400 dark:text-slate-500">No columns selected for this face.</span>}
            </div>
        </div>
    );
};


const RelationEditorModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (relation: Relation) => void; relation: Relation | null; table: Table; onOpenDesigner: () => void; }> = ({ isOpen, onClose, onSave, relation, table, onOpenDesigner }) => {
    const [editedRelation, setEditedRelation] = React.useState<Relation | null>(null);
    React.useEffect(() => { if (relation) setEditedRelation(JSON.parse(JSON.stringify(relation))); }, [relation]);
    
    if (!isOpen || !editedRelation) return null;

    const handleFieldChange = (field: keyof Relation, value: any) => { setEditedRelation(prev => prev ? { ...prev, [field]: value } : null); };
    const handleColumnToggle = (type: 'question' | 'answer', columnId: string) => {
        const key = type === 'question' ? 'questionColumnIds' : 'answerColumnIds';
        const currentIds = new Set(editedRelation[key]);
        if (currentIds.has(columnId)) currentIds.delete(columnId); else currentIds.add(columnId);
        handleFieldChange(key, Array.from(currentIds));
    };
    const handleModeToggle = (mode: StudyMode) => {
        const currentModes = new Set(editedRelation.compatibleModes || []);
        if (currentModes.has(mode)) { currentModes.delete(mode); } else { if (mode === StudyMode.Scrambled) { currentModes.clear(); } else { currentModes.delete(StudyMode.Scrambled); } currentModes.add(mode); }
        handleFieldChange('compatibleModes', Array.from(currentModes));
    };

    const handleSave = () => { if(editedRelation) onSave(editedRelation); };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editedRelation.id.startsWith('rel-') ? "Edit Relation" : "Create Relation"} containerClassName="max-w-2xl w-full">
            <div className="p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Relation Name</label>
                    <input type="text" value={editedRelation.name} onChange={e => handleFieldChange('name', e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm mb-2">Question Columns</h4>
                        <div className="space-y-2">{table.columns.map(col => (<label key={col.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editedRelation.questionColumnIds.includes(col.id)} onChange={() => handleColumnToggle('question', col.id)} /> {col.name}</label>))}</div>
                    </div>
                     <div>
                        <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm mb-2">Answer Columns</h4>
                        <div className="space-y-2">{table.columns.map(col => (<label key={col.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editedRelation.answerColumnIds.includes(col.id)} onChange={() => handleColumnToggle('answer', col.id)} /> {col.name}</label>))}</div>
                    </div>
                </div>
                 <div>
                    <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm mb-2">Compatible Study Modes</h4>
                    <div className="flex flex-wrap gap-2">
                        {Object.values(StudyMode).map(mode => (
                            <button key={mode} onClick={() => handleModeToggle(mode)} className={`px-2 py-1 rounded-full text-xs font-semibold border transition-colors ${(editedRelation.compatibleModes || []).includes(mode) ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700' : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'}`}>{mode}</button>
                        ))}
                    </div>
                </div>
                 <div className="border-t dark:border-slate-700 pt-4 flex justify-between items-center">
                    <button onClick={onOpenDesigner} className="font-semibold text-emerald-600 dark:text-emerald-500 hover:underline text-sm">Customize Card Design</button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600">Cancel</button>
                        <button onClick={handleSave} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700">Save Relation</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const RelationDesignerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedRelation: Relation) => void;
    relation: Relation | null;
    tableColumns: Column[];
}> = ({ isOpen, onClose, onSave, relation, tableColumns }) => {
    const [designedRelation, setDesignedRelation] = React.useState<Relation | null>(null);
    const [activeFace, setActiveFace] = React.useState<'front' | 'back'>('front');
    const [selectedColumnId, setSelectedColumnId] = React.useState<string | null>(null);
    const [bgTab, setBgTab] = React.useState<'solid' | 'gradient' | 'image'>('solid');
    const { theme } = useAppContext();

    React.useEffect(() => {
        if (relation) {
            setDesignedRelation(JSON.parse(JSON.stringify(relation)));
            setSelectedColumnId(null);
            setBgTab(relation.design?.[activeFace]?.backgroundType || 'solid');
        }
    }, [relation, isOpen]);

    React.useEffect(() => {
        if(designedRelation?.design) {
            setBgTab(designedRelation.design[activeFace].backgroundType);
            setSelectedColumnId(null);
        }
    }, [activeFace, designedRelation?.design]);
    
    if (!isOpen || !designedRelation || !designedRelation.design) return null;
    
    const faceDesign = designedRelation.design[activeFace];
    const columnsForFace = (activeFace === 'front' ? designedRelation.questionColumnIds : designedRelation.answerColumnIds)
        .map(id => tableColumns.find(c => c.id === id)).filter(Boolean) as Column[];

    const handleDesignChange = (field: keyof CardFaceDesign, value: any) => { setDesignedRelation(prev => prev ? { ...prev, design: { ...prev.design!, [activeFace]: { ...prev.design![activeFace], [field]: value } } } : null); };
    const handleTypographyChange = (field: keyof TypographyDesign, value: any) => { if (!selectedColumnId) return; setDesignedRelation(prev => { if (!prev?.design) return prev; const newDesign = JSON.parse(JSON.stringify(prev.design)); const typo = newDesign[activeFace].typography[selectedColumnId] || (theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY); newDesign[activeFace].typography[selectedColumnId] = { ...typo, [field]: value }; return { ...prev, design: newDesign }; }); };
    const handleBackgroundChange = (type: 'solid' | 'gradient' | 'image', value: string) => { handleDesignChange('backgroundValue', value); handleDesignChange('backgroundType', type); };
    const applyTemplate = (templateDesign: RelationDesign) => { setDesignedRelation(prev => prev ? { ...prev, design: JSON.parse(JSON.stringify(templateDesign)) } : null); };
    const handleReorder = (newOrder: string[]) => { const key = activeFace === 'front' ? 'questionColumnIds' : 'answerColumnIds'; setDesignedRelation(prev => prev ? { ...prev, [key]: newOrder } : null); };

    const selectedTypography = selectedColumnId ? faceDesign.typography[selectedColumnId] || (theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY) : null;
    const gradientColors = faceDesign.backgroundType === 'gradient' ? faceDesign.backgroundValue.split(',') : ['#FFFFFF', '#E0E0E0'];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Customize Card Design" containerClassName="max-w-5xl w-full">
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 space-y-4 self-start">
                     <div>
                        <h4 className="font-bold text-sm mb-2 text-slate-700 dark:text-slate-300">Templates</h4>
                        <div className="flex flex-wrap gap-2">{DESIGN_TEMPLATES.map(t => <button key={t.name} onClick={() => applyTemplate(t.design)} className="px-2 py-1 text-xs font-semibold rounded-full border bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">{t.name}</button>)}</div>
                    </div>
                    <div>
                        <h4 className="font-bold text-sm mb-2 text-slate-700 dark:text-slate-300">{selectedColumnId ? `Styling: "${tableColumns.find(c=>c.id === selectedColumnId)?.name}"` : 'Styling: Card Face'}</h4>
                         {!selectedColumnId ? (
                            <div className="space-y-3">
                                <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm"><button onClick={()=>setBgTab('solid')} className={`px-2 py-1 rounded-full flex-1 ${bgTab==='solid' && 'bg-white dark:bg-slate-600 shadow'}`}>Solid</button><button onClick={()=>setBgTab('gradient')} className={`px-2 py-1 rounded-full flex-1 ${bgTab==='gradient' && 'bg-white dark:bg-slate-600 shadow'}`}>Gradient</button><button onClick={()=>setBgTab('image')} className={`px-2 py-1 rounded-full flex-1 ${bgTab==='image' && 'bg-white dark:bg-slate-600 shadow'}`}>Image</button></div>
                                {bgTab === 'solid' && <input type="color" value={faceDesign.backgroundType === 'solid' ? faceDesign.backgroundValue : '#FFFFFF'} onChange={e => handleBackgroundChange('solid', e.target.value)} className="w-full h-8 p-0 border-none rounded cursor-pointer"/>}
                                {bgTab === 'gradient' && <div className="space-y-2"><div className="flex gap-2"><input type="color" value={gradientColors[0]} onChange={e => handleBackgroundChange('gradient', `${e.target.value},${gradientColors[1]}`)} className="w-full h-8 p-0 border-none rounded cursor-pointer"/><input type="color" value={gradientColors[1]} onChange={e => handleBackgroundChange('gradient', `${gradientColors[0]},${e.target.value}`)} className="w-full h-8 p-0 border-none rounded cursor-pointer"/></div><input type="range" min="0" max="360" value={faceDesign.gradientAngle} onChange={e => handleDesignChange('gradientAngle', Number(e.target.value))} className="w-full"/></div>}
                                {bgTab === 'image' && <input type="text" placeholder="Image URL..." value={faceDesign.backgroundType === 'image' ? faceDesign.backgroundValue : ''} onChange={e => handleBackgroundChange('image', e.target.value)} className="w-full text-sm bg-white dark:bg-slate-700 border rounded-md px-2 py-1"/>}
                                <div className="flex items-center justify-between pt-2"><label className="text-sm">Layout</label><div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1"><button onClick={() => handleDesignChange('layout', 'vertical')} className={`px-2 py-1 rounded-full text-xs ${faceDesign.layout === 'vertical' && 'bg-white dark:bg-slate-600 shadow'}`}>Vertical</button><button onClick={() => handleDesignChange('layout', 'horizontal')} className={`px-2 py-1 rounded-full text-xs ${faceDesign.layout === 'horizontal' && 'bg-white dark:bg-slate-600 shadow'}`}>Horizontal</button></div></div>
                            </div>
                         ) : (
                             <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between"><label>Color</label><input type="color" value={selectedTypography?.color} onChange={e => handleTypographyChange('color', e.target.value)} className="w-16 h-8 p-0 border-none rounded cursor-pointer"/></div>
                                <div className="flex items-center justify-between"><label>Font Size</label><input type="text" value={selectedTypography?.fontSize} onChange={e => handleTypographyChange('fontSize', e.target.value)} className="w-20 bg-white dark:bg-slate-700 border rounded-md px-2 py-1 text-right"/></div>
                                <div className="flex items-center justify-between"><label>Weight</label><div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1"><button onClick={() => handleTypographyChange('fontWeight', 'normal')} className={`px-2 py-1 rounded-full text-xs ${selectedTypography?.fontWeight === 'normal' && 'bg-white dark:bg-slate-600 shadow'}`}>Normal</button><button onClick={() => handleTypographyChange('fontWeight', 'bold')} className={`px-2 py-1 rounded-full text-xs ${selectedTypography?.fontWeight === 'bold' && 'bg-white dark:bg-slate-600 shadow'}`}>Bold</button></div></div>
                                <div className="flex items-center justify-between"><label>Align</label><div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1"><button onClick={() => handleTypographyChange('textAlign', 'left')} className={`p-1 rounded-full ${selectedTypography?.textAlign === 'left' && 'bg-white dark:bg-slate-600 shadow'}`}><Icon name="align-left" className="w-5 h-5"/></button><button onClick={() => handleTypographyChange('textAlign', 'center')} className={`p-1 rounded-full ${selectedTypography?.textAlign === 'center' && 'bg-white dark:bg-slate-600 shadow'}`}><Icon name="align-center" className="w-5 h-5"/></button><button onClick={() => handleTypographyChange('textAlign', 'right')} className={`p-1 rounded-full ${selectedTypography?.textAlign === 'right' && 'bg-white dark:bg-slate-600 shadow'}`}><Icon name="align-right" className="w-5 h-5"/></button></div></div>
                             </div>
                         )}
                    </div>
                </div>
                <div className="md:col-span-2 space-y-3">
                    <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm font-semibold w-fit mx-auto"><button onClick={() => setActiveFace('front')} className={`px-4 py-1.5 rounded-full ${activeFace === 'front' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Front</button><button onClick={() => setActiveFace('back')} className={`px-4 py-1.5 rounded-full ${activeFace === 'back' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Back</button></div>
                    <FlashcardPreview design={faceDesign} columns={columnsForFace} onSelectColumn={setSelectedColumnId} selectedColumnId={selectedColumnId} order={activeFace === 'front' ? designedRelation.questionColumnIds : designedRelation.answerColumnIds} onReorder={handleReorder} face={activeFace} />
                </div>
            </div>
             <div className="p-4 border-t dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600">Cancel</button>
                <button onClick={() => onSave(designedRelation)} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700">Save Design</button>
            </div>
        </Modal>
    );
};


// --- ShareModal and AIPromptModal ---
interface ShareModalProps { isOpen: boolean; onClose: () => void; table: Table; onShare: (description: string, tags: string) => void; }
const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, table, onShare }) => { const [description, setDescription] = React.useState(table.description || ''); const [tags, setTags] = React.useState((table.tags || []).join(', ')); React.useEffect(() => { if (isOpen) { setDescription(table.description || ''); setTags((table.tags || []).join(', ')); } }, [isOpen, table]); return ( <Modal isOpen={isOpen} onClose={onClose} title={`Share "${table.name}"`}> <div className="p-6 space-y-4"> <div> <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label> <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a brief description..." className="w-full bg-slate-100 dark:bg-slate-700 border rounded-md px-3 py-2 text-sm" rows={3}/> </div> <div> <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tags (comma-separated)</label> <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., science, language" className="w-full bg-slate-100 dark:bg-slate-700 border rounded-md px-3 py-2 text-sm"/> </div> <div className="flex justify-end gap-2 pt-2"> <button onClick={onClose} className="bg-white dark:bg-slate-700 font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border">Cancel</button> <button onClick={() => onShare(description, tags)} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700">Update & Share</button> </div> </div> </Modal> ); };
interface AIPromptModalProps { isOpen: boolean; onClose: () => void; onSave: (prompt: AIPrompt) => void; onDelete: (promptId: string) => void; targetColumn: Column | null; tableColumns: Column[]; promptToEdit: AIPrompt | null; }
const AIPromptModal: React.FC<AIPromptModalProps> = ({ isOpen, onClose, onSave, onDelete, targetColumn, tableColumns, promptToEdit }) => { const [name, setName] = React.useState(''); const [prompt, setPrompt] = React.useState(''); const [sourceColumnIds, setSourceColumnIds] = React.useState<Set<string>>(new Set()); React.useEffect(() => { if (isOpen) { if (promptToEdit) { setName(promptToEdit.name); setPrompt(promptToEdit.prompt); setSourceColumnIds(new Set(promptToEdit.sourceColumnIds)); } else if (targetColumn) { setName(`Generate ${targetColumn.name}`); setPrompt(`Based on...`); setSourceColumnIds(new Set()); } } }, [isOpen, promptToEdit, targetColumn]); if (!targetColumn) return null; const handleSave = () => { onSave({ id: promptToEdit?.id || `prompt-${Date.now()}`, name, prompt, sourceColumnIds: Array.from(sourceColumnIds), targetColumnId: targetColumn.id, }); onClose(); }; return ( <Modal isOpen={isOpen} onClose={onClose} title={`AI Prompt for "${targetColumn.name}"`}> <div className="p-6 space-y-4"> {/* Form content */} <div className="flex justify-end gap-2"><button onClick={handleSave} className="bg-emerald-600 text-white px-4 py-2 rounded-md">Save</button></div> </div> </Modal> ); };

// --- Table Screen ---
interface TableScreenProps {
  table: Table;
}

const TableScreen: React.FC<TableScreenProps> = ({ table }) => {
  const { setCurrentScreen, handleUpdateTable, isGuest, showToast, theme } = useAppContext();
  
  const upgradeRelationDesign = React.useCallback((relation: Relation): Relation => {
      const newRelation = JSON.parse(JSON.stringify(relation));
      const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;

      if (!newRelation.design) {
          newRelation.design = JSON.parse(JSON.stringify(DEFAULT_RELATION_DESIGN));
      }

      for (const face of ['front', 'back'] as const) {
          const faceDesign = newRelation.design[face] as any; // Use any for migration
          const isLegacy = faceDesign.hasOwnProperty('color') || faceDesign.hasOwnProperty('fontSize');
          
          if (isLegacy || !faceDesign.typography) {
              const oldTypography: Partial<TypographyDesign> = isLegacy ? {
                  color: faceDesign.color,
                  fontSize: faceDesign.fontSize,
                  fontFamily: faceDesign.fontFamily,
                  textAlign: faceDesign.textAlign,
                  fontWeight: faceDesign.fontWeight,
              } : {};

              faceDesign.typography = {};
              const columnIds = face === 'front' ? (newRelation.questionColumnIds || []) : (newRelation.answerColumnIds || []);
              
              for (const colId of columnIds) {
                   // For legacy migrations, safely use theme-default color to avoid contrast issues, but preserve other styles.
                  faceDesign.typography[colId] = {
                      ...defaultTypo,
                      ...oldTypography,
                      color: defaultTypo.color,
                  };
              }

              delete faceDesign.color;
              delete faceDesign.fontSize;
              delete faceDesign.fontFamily;
              delete faceDesign.textAlign;
              delete faceDesign.fontWeight;
          }
          
          const columnIds = face === 'front' ? (newRelation.questionColumnIds || []) : (newRelation.answerColumnIds || []);
          for (const colId of columnIds) {
              if (!faceDesign.typography[colId]) {
                  faceDesign.typography[colId] = { ...defaultTypo };
              }
          }

          if (faceDesign.backgroundType === 'gradient' && typeof faceDesign.gradientAngle !== 'number') {
              faceDesign.gradientAngle = 135;
          }
          if (!faceDesign.layout) {
              faceDesign.layout = 'vertical';
          }
      }
      return newRelation;
  }, [theme]);


  const [activeTab, setActiveTab] = React.useState<'rows' | 'relations'>('rows');
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = React.useState(false);
  const [isAIPromptModalOpen, setIsAIPromptModalOpen] = React.useState(false);
  const [isWordDetailModalOpen, setIsWordDetailModalOpen] = React.useState(false);
  
  const [isRelationEditorOpen, setIsRelationEditorOpen] = React.useState(false);
  const [isRelationDesignerOpen, setIsRelationDesignerOpen] = React.useState(false);
  const [editingRelation, setEditingRelation] = React.useState<Relation | null>(null);
  const [relationToDelete, setRelationToDelete] = React.useState<Relation | null>(null);

  const [editingRow, setEditingRow] = React.useState<VocabRow | null>(null);
  const [configuringColumn, setConfiguringColumn] = React.useState<Column | null>(null);
  const [promptToEdit, setPromptToEdit] = React.useState<AIPrompt | null>(null);

  const handleEditRow = (row: VocabRow) => { setEditingRow(row); setIsWordDetailModalOpen(true); };
  const handleConfigureAI = (column: Column) => { const existingPrompt = (table.aiPrompts || []).find(p => p.targetColumnId === column.id); setConfiguringColumn(column); setPromptToEdit(existingPrompt || null); setIsAIPromptModalOpen(true); };
  const handleSaveAIPrompt = (prompt: AIPrompt) => { const existingPrompts = table.aiPrompts || []; const index = existingPrompts.findIndex(p => p.id === prompt.id); let newPrompts; if (index > -1) { newPrompts = [...existingPrompts]; newPrompts[index] = prompt; } else { newPrompts = [...existingPrompts, prompt]; } handleUpdateTable({ ...table, aiPrompts: newPrompts }); };
  const handleDeleteAIPrompt = (promptId: string) => { handleUpdateTable({ ...table, aiPrompts: (table.aiPrompts || []).filter(p => p.id !== promptId) }); };
  const handleSaveRow = (updatedRow: VocabRow) => { handleUpdateTable({ ...table, rows: table.rows.map(r => r.id === updatedRow.id ? updatedRow : r) }); };
  const handleDeleteRow = (rowId: string) => { handleUpdateTable({ ...table, rows: table.rows.filter(r => r.id !== rowId) }); };
  const handleShare = async (description: string, tags: string) => { const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean); handleUpdateTable({ ...table, description, tags: tagsArray, isPublic: true }); setIsShareModalOpen(false); showToast("Table sharing info updated!", "success"); };
  const handleUpdateName = (newName: string) => { handleUpdateTable({...table, name: newName}); };

  const handleAddNewRow = () => {
    const newRow: VocabRow = { id: `row-${Date.now()}`, cols: {}, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } };
    handleUpdateTable({ ...table, rows: [newRow, ...table.rows] });
    handleEditRow(newRow);
  };

  const handleOpenNewRelation = () => {
    const newRelation: Relation = {
        id: `new-rel-${Date.now()}`, // Temporary ID for new relations
        name: 'New Relation',
        questionColumnIds: [table.columns[0]?.id].filter(Boolean) as string[],
        answerColumnIds: [table.columns[1]?.id].filter(Boolean) as string[],
        compatibleModes: Object.values(StudyMode).filter(m => m !== StudyMode.Flashcards),
        isCustom: true,
    };
    setEditingRelation(upgradeRelationDesign(newRelation));
    setIsRelationEditorOpen(true);
  };
  
  const handleOpenEditRelation = (relation: Relation) => {
    setEditingRelation(upgradeRelationDesign(relation));
    setIsRelationEditorOpen(true);
  };

  const handleSaveRelation = (relationToSave: Relation) => {
    const relations = table.relations || [];
    // Check if it's a new relation by checking for the temporary ID prefix
    const isNew = relationToSave.id.startsWith('new-rel-');
    let newRelations;

    if (isNew) {
        // Assign a permanent ID and add to the array
        const permanentRelation = { ...relationToSave, id: `rel-${Date.now()}` };
        newRelations = [...relations, permanentRelation];
    } else {
        // Update existing relation
        const existingIndex = relations.findIndex(r => r.id === relationToSave.id);
        if (existingIndex > -1) {
            newRelations = [...relations];
            newRelations[existingIndex] = relationToSave;
        } else {
            // Should not happen if IDs are managed correctly, but as a fallback, add it.
            newRelations = [...relations, relationToSave];
        }
    }

    handleUpdateTable({ ...table, relations: newRelations });
    
    // Close modals and reset state
    setEditingRelation(null);
    setIsRelationEditorOpen(false);
    setIsRelationDesignerOpen(false);
  };

  const handleDeleteRelation = (relationId: string) => {
    handleUpdateTable({ ...table, relations: (table.relations || []).filter(r => r.id !== relationId) });
    setRelationToDelete(null);
  };
  
  const renderRowsTab = () => (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                    <tr>
                        {table.columns.map(col => <th key={col.id} scope="col" className="px-6 py-3">{col.name}</th>)}
                        <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    {table.rows.map(row => (
                        <tr key={row.id} onClick={() => handleEditRow(row)} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/50 cursor-pointer">
                            {table.columns.map(col => <td key={col.id} className="px-6 py-4 text-slate-800 dark:text-white truncate max-w-xs">{row.cols[col.id]}</td>)}
                            <td className="px-6 py-4 text-right">
                                <button onClick={(e) => { e.stopPropagation(); handleEditRow(row); }} className="font-medium text-emerald-600 dark:text-emerald-500 hover:underline">Edit</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700">
            <button onClick={handleAddNewRow} className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"><Icon name="plus" className="w-4 h-4" />Add New Row</button>
        </div>
    </div>
  );

  const renderRelationsTab = () => (
    <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(table.relations || []).map(rel => (
                <div key={rel.id} className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-4 flex flex-col justify-between group">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">{rel.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Q: {rel.questionColumnIds.map(id => table.columns.find(c => c.id === id)?.name).join(', ')}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">A: {rel.answerColumnIds.map(id => table.columns.find(c => c.id === id)?.name).join(', ')}</p>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <button onClick={() => handleOpenEditRelation(rel)} className="font-semibold text-sm text-emerald-600 dark:text-emerald-500 hover:underline">Edit</button>
                        <button onClick={() => setRelationToDelete(rel)} className="font-semibold text-sm text-red-600 dark:text-red-500 hover:underline">Delete</button>
                    </div>
                </div>
            ))}
        </div>
        <button onClick={handleOpenNewRelation} className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-emerald-500 transition-colors">
            <Icon name="plus" className="w-6 h-6 mx-auto mb-2"/>
            <span className="font-semibold">Add New Relation</span>
        </button>
    </div>
);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fadeIn">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentScreen(Screen.Tables)} className="p-2 rounded-full text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"> <Icon name="arrowLeft" className="w-6 h-6"/> </button>
          <input type="text" value={table.name} onChange={(e) => handleUpdateName(e.target.value)} className="text-2xl font-bold bg-transparent focus:outline-none focus:bg-white dark:focus:bg-slate-800 w-full rounded-md p-1 -m-1 text-slate-800 dark:text-white" />
        </div>
        <div className="flex gap-2">
          {!isGuest && ( <button onClick={() => setIsShareModalOpen(true)} className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-4 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-2 text-sm"> <Icon name="arrow-up-tray" className="w-4 h-4"/> <span>{table.isPublic ? 'Sharing Settings' : 'Share'}</span> </button> )}
          <button onClick={() => setCurrentScreen(Screen.Vmind)} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm"> <Icon name="brain" className="w-4 h-4"/> <span>Start Studying</span> </button>
        </div>
      </header>
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="flex space-x-4">
          <button onClick={() => setActiveTab('rows')} className={`px-3 py-2 font-semibold text-sm rounded-t-md ${activeTab === 'rows' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Rows ({table.rows.length})</button>
          <button onClick={() => setActiveTab('relations')} className={`px-3 py-2 font-semibold text-sm rounded-t-md ${activeTab === 'relations' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Relations</button>
          <button onClick={() => setIsColumnModalOpen(true)} className={'px-3 py-2 font-semibold text-sm rounded-t-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}>Columns</button>
        </nav>
      </div>
      
      {activeTab === 'rows' && renderRowsTab()}
      {activeTab === 'relations' && renderRelationsTab()}

      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} table={table} onShare={handleShare} />
      <AIPromptModal
        isOpen={isAIPromptModalOpen}
        onClose={() => setIsAIPromptModalOpen(false)}
        onSave={handleSaveAIPrompt}
        onDelete={handleDeleteAIPrompt}
        targetColumn={configuringColumn}
        tableColumns={table.columns}
        promptToEdit={promptToEdit}
      />
       <WordDetailModal
        isOpen={isWordDetailModalOpen}
        onClose={() => setIsWordDetailModalOpen(false)}
        row={editingRow}
        columns={table.columns}
        aiPrompts={table.aiPrompts}
        imageColumnId={table.imageConfig?.imageColumnId}
        onSave={handleSaveRow}
        onDelete={handleDeleteRow}
        onShowToast={showToast}
        onConfigureAI={handleConfigureAI}
      />
      <RelationEditorModal
          isOpen={isRelationEditorOpen}
          onClose={() => {setIsRelationEditorOpen(false); setEditingRelation(null);}}
          onSave={handleSaveRelation}
          relation={editingRelation}
          table={table}
          onOpenDesigner={() => { setIsRelationEditorOpen(false); setIsRelationDesignerOpen(true); }}
      />
      <RelationDesignerModal
          isOpen={isRelationDesignerOpen}
          onClose={() => {setIsRelationDesignerOpen(false); setIsRelationEditorOpen(true);}}
          onSave={(updatedRelation) => {
              setEditingRelation(updatedRelation);
              // Directly save the design changes back to the main state
              handleSaveRelation(updatedRelation);
              // Close the designer and re-open the editor to see other properties
              setIsRelationDesignerOpen(false);
              setIsRelationEditorOpen(true);
          }}
          relation={editingRelation}
          tableColumns={table.columns}
      />
      <ConfirmationModal
          isOpen={!!relationToDelete}
          onClose={() => setRelationToDelete(null)}
          onConfirm={() => {
              if (relationToDelete) handleDeleteRelation(relationToDelete.id);
          }}
          title="Delete Relation"
          message={`Are you sure you want to delete the relation "${relationToDelete?.name}"?`}
          warning="This action cannot be undone."
          confirmText="Delete"
      />
    </div>
  );
};

export default TableScreen;