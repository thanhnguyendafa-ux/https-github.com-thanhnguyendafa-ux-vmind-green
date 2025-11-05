import React, { useState, useMemo, useEffect } from 'react';
import { Table, Folder, VocabRow, FlashcardStatus } from '../types';
import Icon from './Icon';
import Modal from './Modal';
import Popover from './Popover';
import ConfirmationModal from './ConfirmationModal';
import { useAppContext } from '../context/AppContext';

const TableCard: React.FC<{table: Table; onDelete: () => void; onSelect: (id: string) => void; onMove: (id: string) => void}> = ({ table, onDelete, onSelect, onMove }) => {
    
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/80 dark:hover:border-emerald-600 hover:shadow-lg hover:-translate-y-0.5 transition-all group cursor-pointer" onClick={() => onSelect(table.id)}>
          <div className="flex items-start justify-between">
              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center mr-4">
                  <Icon name="table-cells" className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={(e) => { e.stopPropagation(); onMove(table.id); }} className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700" title="Move to folder">
                    <Icon name="folder" className="w-5 h-5"/>
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400" title="Delete table">
                    <Icon name="trash" className="w-5 h-5"/>
                </button>
              </div>
          </div>
          <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white truncate mt-3" title={table.name}>{table.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{table.rows.length} rows</p>
          </div>
      </div>
    );
};

const FolderCard: React.FC<{folder: Folder; tableCount: number; onSelect: () => void; onDelete: () => void}> = ({ folder, tableCount, onSelect, onDelete }) => {
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/80 dark:hover:border-amber-600 hover:shadow-lg hover:-translate-y-0.5 transition-all group cursor-pointer" onClick={onSelect}>
            <div className="flex items-start justify-between">
                <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mr-4">
                    <Icon name="folder" className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                    <Icon name="trash" className="w-5 h-5"/>
                </button>
            </div>
            <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white truncate mt-3" title={folder.name}>{folder.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tableCount} tables</p>
            </div>
        </div>
    );
};

// --- Modals ---
const CreateTableModal: React.FC<{isOpen: boolean; onClose: () => void;}> = ({ isOpen, onClose }) => {
    const { handleCreateTable } = useAppContext();
    const [name, setName] = useState('');
    const [columns, setColumns] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState<'form' | 'confirm'>('form');
    const [duplicateInfo, setDuplicateInfo] = useState<{ name: string; originalColumns: string; uniqueColumns: string; } | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => { setName(''); setColumns(''); setError(''); setStep('form'); setDuplicateInfo(null); }, 300);
        }
    }, [isOpen]);

    const handleCloseAndReset = () => { onClose(); };

    const handleSubmit = () => {
        setError('');
        const trimmedName = name.trim();
        if (!trimmedName) { setError('Table name is required.'); return; }
        const trimmedColumns = columns.trim();
        if (!trimmedColumns) { setError('Please define at least one column.'); return; }

        const columnNames = trimmedColumns.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        const uniqueColumnNames = [...new Set(columnNames)];

        if (uniqueColumnNames.length < columnNames.length) {
            setDuplicateInfo({ name: trimmedName, originalColumns: columnNames.join(', '), uniqueColumns: uniqueColumnNames.join(', '), });
            setStep('confirm');
        } else {
            handleCreateTable(trimmedName, trimmedColumns);
            handleCloseAndReset();
        }
    };
    
    const handleConfirm = (keepDuplicates: boolean) => {
        if (duplicateInfo) {
            const finalColumns = keepDuplicates ? duplicateInfo.originalColumns : duplicateInfo.uniqueColumns;
            handleCreateTable(duplicateInfo.name, finalColumns);
        }
        handleCloseAndReset();
    };

    const renderForm = () => (
        <div className="p-6">
            <div className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Table Name</label>
                    <input type="text" value={name} onChange={e => { setName(e.target.value); if (error) setError(''); }} placeholder="e.g., Spanish Verbs" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Columns (comma-separated)</label>
                    <input type="text" value={columns} onChange={e => { setColumns(e.target.value); if (error) setError(''); }} placeholder="e.g., Word, Definition, Word" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                {error && <p className="text-red-500 text-sm text-center -mt-2">{error}</p>}
                <button onClick={handleSubmit} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors w-full">
                    Create Table
                </button>
            </div>
        </div>
    );

    const renderConfirm = () => (
        <div className="p-6">
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                Your column list contains duplicate names. How would you like to proceed?
            </p>
            <div className="flex flex-col gap-3">
                <button onClick={() => handleConfirm(false)} className="w-full bg-emerald-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors">
                    Remove Duplicates
                </button>
                <button onClick={() => handleConfirm(true)} className="w-full bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 transition-colors">
                    Keep Duplicates
                </button>
            </div>
        </div>
    );
    
    return (<Modal isOpen={isOpen} onClose={handleCloseAndReset} title={step === 'form' ? "Create New Table" : "Duplicate Columns Found"}>{step === 'form' ? renderForm() : renderConfirm()}</Modal>);
};

const CreateFolderModal: React.FC<{isOpen: boolean; onClose: () => void;}> = ({ isOpen, onClose }) => {
    const { handleCreateFolder } = useAppContext();
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    
    const handleSubmit = () => {
        if (name.trim()) {
            handleCreateFolder(name.trim());
            setName('');
            setError('');
            onClose();
        } else {
            setError('Folder name is required.');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Folder">
            <div className="p-6">
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Folder Name</label>
                        <input type="text" value={name} onChange={e => { setName(e.target.value); if (error) setError(''); }} placeholder="e.g., Language Studies" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                    </div>
                    <button onClick={handleSubmit} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors w-full">
                        Create Folder
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const ExportModal: React.FC<{isOpen: boolean; onClose: () => void;}> = ({ isOpen, onClose }) => {
    const { tables } = useAppContext();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleToggle = (id: string) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet); };
    
    const handleExport = (format: 'json' | 'csv') => {
        if (format === 'json') {
            const tablesToExport = tables.filter(t => selectedIds.has(t.id));
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tablesToExport, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "vmind_export.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } else if (format === 'csv') {
            const tableId = Array.from(selectedIds)[0];
            const table = tables.find(t => t.id === tableId);
            if (!table) return;

            const headers = table.columns.map(c => c.name).join(',');
            const rows = table.rows.map(row => table.columns.map(c => `"${row.cols[c.id]?.replace(/"/g, '""') || ''}"`).join(','));
            const csvContent = [headers, ...rows].join('\n');
            const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `${table.name}.csv`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Export Tables">
            <div className="p-6">
                <p className="text-slate-600 dark:text-slate-300 mb-4 text-sm">Select tables to export.</p>
                <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border dark:border-slate-600 rounded-md p-2">
                    {tables.map(table => (
                        <label key={table.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                            <input type="checkbox" checked={selectedIds.has(table.id)} onChange={() => handleToggle(table.id)} className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-sm">{table.name}</span>
                        </label>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleExport('json')} disabled={selectedIds.size === 0} className="flex-1 bg-slate-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 text-sm">Export as JSON</button>
                    <button onClick={() => handleExport('csv')} disabled={selectedIds.size !== 1} className="flex-1 bg-slate-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 text-sm">Export as CSV</button>
                </div>
            </div>
        </Modal>
    );
};

type ParsedCsv = { headers: string[], rows: (string[])[] };
const ImportModal: React.FC<{isOpen: boolean; onClose: () => void;}> = ({ isOpen, onClose }) => {
    const { tables, handleImportTables, showToast } = useAppContext();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
    const [destination, setDestination] = useState<'new' | 'append'>('new');
    const [newTableName, setNewTableName] = useState('');
    const [appendTableId, setAppendTableId] = useState('');
    const [columnMap, setColumnMap] = useState<{[key: number]: string}>({});

    const reset = () => { setStep(1); setFile(null); setParsedCsv(null); setDestination('new'); setNewTableName(''); setAppendTableId(''); setColumnMap({}); };

    const handleFile = async (selectedFile: File) => {
        setFile(selectedFile);
        if (selectedFile.type === 'application/json') {
            const text = await selectedFile.text();
            try {
                const importedTables = JSON.parse(text);
                if (Array.isArray(importedTables) && importedTables.every(t => t.id && t.name)) {
                    handleImportTables(importedTables);
                    showToast(`Successfully imported ${importedTables.length} table(s).`, 'success');
                    reset();
                    onClose();
                } else { throw new Error("Invalid JSON file.")}
            } catch (e) { showToast("Error parsing JSON file.", 'error'); }
        } else {
             const reader = new FileReader();
             reader.onload = e => {
                 const text = e.target?.result as string;
                 const lines = text.split(/\r\n|\n/).filter(line => line);
                 const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                 const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
                 setParsedCsv({ headers, rows });
                 setNewTableName(selectedFile.name.replace(/\.[^/.]+$/, ""));
                 setStep(2);
             };
             reader.readAsText(selectedFile);
        }
    };

    const handleFinishImport = () => {
        if (!parsedCsv) return;
        let finalRows: VocabRow[] = [];
        const destColumns = destination === 'new' ? parsedCsv.headers.map((h, i) => ({ id: `col-import-${i}`, name: h })) : tables.find(t => t.id === appendTableId)?.columns || [];
        const effectiveMap: {[key: number]: string} = {};
        if (destination === 'new') { destColumns.forEach((c, i) => effectiveMap[i] = c.id); } else { Object.assign(effectiveMap, columnMap); }

        finalRows = parsedCsv.rows.map(row => {
            const cols: Record<string, string> = {};
            row.forEach((cellValue, index) => { const destColId = effectiveMap[index]; if (destColId && destColId !== 'ignore') { cols[destColId] = cellValue; } });
            return { id: `row-import-${Date.now()}-${Math.random()}`, cols, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }, };
        });

        if (destination === 'new') {
            const finalTable = { id: `table-import-${Date.now()}`, name: newTableName, columns: destColumns, rows: finalRows, relations: [] };
            handleImportTables([finalTable]);
        } else {
            const tableToAppend = { rows: finalRows } as Table;
            handleImportTables([tableToAppend], appendTableId);
        }

        showToast(`Successfully imported ${finalRows.length} rows.`, 'success');
        reset();
        onClose();
    };
    
    const renderStep = () => {
        switch (step) {
            case 1: return ( <div className="p-6"> <p className="text-center text-slate-500 dark:text-slate-400 mb-4 text-sm">Import from .json (backup) or .csv files.</p> <input type="file" onChange={e => e.target.files && handleFile(e.target.files[0])} accept=".json,.csv" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" /> </div> );
            case 2: return ( <div className="p-6"> <h3 className="font-semibold mb-2 text-slate-700 dark:text-slate-200">Destination</h3> <div className="space-y-2"> <label className="flex items-center gap-3 p-2 rounded-md has-[:checked]:bg-slate-100 dark:has-[:checked]:bg-slate-700"> <input type="radio" name="dest" value="new" checked={destination === 'new'} onChange={() => setDestination('new')} /> <span className="text-sm">Create new table</span> </label> {destination === 'new' && <input type="text" value={newTableName} onChange={e => setNewTableName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white ml-6 text-sm" />} <label className="flex items-center gap-3 p-2 rounded-md has-[:checked]:bg-slate-100 dark:has-[:checked]:bg-slate-700"> <input type="radio" name="dest" value="append" checked={destination === 'append'} onChange={() => setDestination('append')} /> <span className="text-sm">Append to existing table</span> </label> {destination === 'append' && <select value={appendTableId} onChange={e => setAppendTableId(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white ml-6 text-sm"><option value="">Select table...</option>{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>} {destination === 'append' && appendTableId && parsedCsv && ( <div className="ml-6 mt-4"> <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Map CSV Columns</h4> <div className="space-y-2 max-h-32 overflow-y-auto"> {parsedCsv.headers.map((header, index) => { const targetTable = tables.find(t => t.id === appendTableId); return ( <div key={index} className="grid grid-cols-2 gap-2 items-center text-sm"> <span className="truncate font-semibold text-slate-600 dark:text-slate-400" title={header}>{header}</span> <select onChange={e => setColumnMap(m => ({...m, [index]: e.target.value}))} defaultValue="ignore" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs"> <option value="ignore">Ignore</option> {targetTable?.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)} </select> </div> ) })} </div> </div> )} </div> <div className="mt-6 flex justify-end gap-2"> <button onClick={() => { reset(); onClose(); }} className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600">Cancel</button> <button onClick={handleFinishImport} disabled={!((destination === 'new' && newTableName) || (destination === 'append' && appendTableId))} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50">Finish Import</button> </div> </div> );
        }
    };
     return ( <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title={`Import - Step ${step}`}> {renderStep()} </Modal> );
};

const TablesScreen: React.FC = () => {
    const { tables, folders, handleCreateTable, handleCreateFolder, handleDeleteFolder, handleMoveTableToFolder, handleSelectTable, handleDeleteTable, handleImportTables, showToast } = useAppContext();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [movingTableId, setMovingTableId] = useState<string | null>(null);
    const [deletingTable, setDeletingTable] = useState<Table | null>(null);
    const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState<Folder | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    const tablesInFolders = useMemo(() => new Set(folders.flatMap(f => f.tableIds)), [folders]);
    const currentFolder = useMemo(() => folders.find(f => f.id === currentFolderId), [folders, currentFolderId]);

    const displayedTables = useMemo(() => {
        if (currentFolder) {
            return tables.filter(t => currentFolder.tableIds.includes(t.id));
        }
        return tables.filter(t => !tablesInFolders.has(t.id));
    }, [tables, folders, currentFolder, tablesInFolders]);
    
    const handleMoveSubmit = (folderId: string | null) => {
        if (movingTableId) {
            handleMoveTableToFolder(movingTableId, folderId);
        }
        setMovingTableId(null);
    };

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto animate-fadeIn">
            <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                     {currentFolderId && (
                        <button onClick={() => setCurrentFolderId(null)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <Icon name="arrowLeft" className="w-6 h-6"/>
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {currentFolder ? currentFolder.name : "My Tables"}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsImportModalOpen(true)} title="Import Tables" className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <Icon name="arrow-down-tray" className="w-6 h-6" />
                    </button>
                    <button onClick={() => setIsExportModalOpen(true)} title="Export Tables" className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <Icon name="arrow-up-tray" className="w-6 h-6" />
                    </button>
                    <button onClick={() => setIsFolderModalOpen(true)} className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-4 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-2 text-sm"><Icon name="folder" className="w-4 h-4"/><span>New Folder</span></button>
                    <button onClick={() => setIsCreateModalOpen(true)} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm"><Icon name="plus" className="w-4 h-4"/><span>New Table</span></button>
                </div>
            </header>

            {!currentFolderId && folders.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Folders</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {folders.map(folder => <FolderCard key={folder.id} folder={folder} tableCount={folder.tableIds.length} onSelect={() => setCurrentFolderId(folder.id)} onDelete={() => setIsDeleteFolderModalOpen(folder)} />)}
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedTables.map(table => <TableCard key={table.id} table={table} onDelete={() => setDeletingTable(table)} onSelect={handleSelectTable} onMove={setMovingTableId}/>)}
            </div>

            <CreateTableModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
            <CreateFolderModal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} />
            <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
            <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />

            <Modal isOpen={!!movingTableId} onClose={() => setMovingTableId(null)} title="Move Table">
                <div className="p-4">
                    <div className="flex flex-col gap-2">
                        <button onClick={() => handleMoveSubmit(null)} className="w-full text-left text-sm p-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                            (No Folder)
                        </button>
                        {folders.map(folder => (
                            <button key={folder.id} onClick={() => handleMoveSubmit(folder.id)} className="w-full text-left text-sm p-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                                {folder.name}
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
            
            <ConfirmationModal 
                isOpen={!!isDeleteFolderModalOpen}
                onClose={() => setIsDeleteFolderModalOpen(null)}
                onConfirm={() => {
                    if(isDeleteFolderModalOpen) handleDeleteFolder(isDeleteFolderModalOpen.id);
                    setIsDeleteFolderModalOpen(null);
                }}
                title="Delete Folder"
                message={`Are you sure you want to delete the folder "${isDeleteFolderModalOpen?.name}"?`}
                warning="Tables inside this folder will not be deleted but will be moved to the main tables list."
                confirmText="Delete Folder"
            />
            
            <ConfirmationModal 
                isOpen={!!deletingTable}
                onClose={() => setDeletingTable(null)}
                onConfirm={() => {
                    if(deletingTable) handleDeleteTable(deletingTable.id);
                    setDeletingTable(null);
                }}
                title="Delete Table"
                message={`Are you sure you want to delete the table "${deletingTable?.name}"?`}
                warning="This action is permanent and cannot be undone."
                confirmText="Delete Table"
            />

        </div>
    );
};

export default TablesScreen;
