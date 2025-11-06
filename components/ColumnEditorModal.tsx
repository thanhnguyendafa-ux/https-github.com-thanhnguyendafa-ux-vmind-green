import * as React from 'react';
import { Column } from '../types';
import Modal from './Modal';
import Icon from './Icon';
import ConfirmationModal from './ConfirmationModal';

interface ColumnEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  onSave: (newColumns: Column[]) => void;
}

const ColumnEditorModal: React.FC<ColumnEditorModalProps> = ({ isOpen, onClose, columns, onSave }) => {
  const [editedColumns, setEditedColumns] = React.useState<Column[]>([]);
  const [newColumnName, setNewColumnName] = React.useState('');
  const [columnToDelete, setColumnToDelete] = React.useState<Column | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Deep copy to prevent modifying original state until save
      setEditedColumns(JSON.parse(JSON.stringify(columns)));
      setNewColumnName('');
    }
  }, [isOpen, columns]);

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.dataTransfer.setData('columnIndex', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropIndex: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData('columnIndex'), 10);
    if (dragIndex === dropIndex) return;

    const newColumns = [...editedColumns];
    const [draggedItem] = newColumns.splice(dragIndex, 1);
    newColumns.splice(dropIndex, 0, draggedItem);
    setEditedColumns(newColumns);
  };

  const handleNameChange = (id: string, newName: string) => {
    setEditedColumns(prev =>
      prev.map(col => (col.id === id ? { ...col, name: newName } : col))
    );
  };

  const confirmDelete = (column: Column) => {
    setColumnToDelete(column);
  };

  const handleDelete = () => {
    if (columnToDelete) {
      setEditedColumns(prev => prev.filter(col => col.id !== columnToDelete.id));
      setColumnToDelete(null);
    }
  };
  
  const handleAddNewColumn = () => {
    if (newColumnName.trim() === '') return;
    const newColumn: Column = {
        id: `col-${Date.now()}`,
        name: newColumnName.trim(),
    };
    setEditedColumns(prev => [...prev, newColumn]);
    setNewColumnName('');
  };

  const handleSaveChanges = () => {
    onSave(editedColumns);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Columns" containerClassName="max-w-lg w-full">
        <div className="p-4 space-y-4">
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {editedColumns.map((col, index) => (
              <li
                key={col.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className="flex items-center gap-2 p-2 rounded-md bg-slate-100 dark:bg-slate-700/50"
              >
                <Icon name="grip-vertical" className="w-5 h-5 text-slate-400 cursor-move flex-shrink-0" />
                <input
                  type="text"
                  value={col.name}
                  onChange={(e) => handleNameChange(col.id, e.target.value)}
                  className="flex-grow bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm"
                />
                <button onClick={() => confirmDelete(col)} className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-500/10 flex-shrink-0">
                  <Icon name="trash" className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="New column name..."
              className="flex-grow bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNewColumn()}
            />
            <button
              onClick={handleAddNewColumn}
              className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 text-sm"
            >
              Add
            </button>
          </div>
        </div>
        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="bg-white dark:bg-slate-700 font-semibold px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white">Cancel</button>
          <button onClick={handleSaveChanges} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700">Save Changes</button>
        </div>
      </Modal>
      <ConfirmationModal
        isOpen={!!columnToDelete}
        onClose={() => setColumnToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Column"
        message={`Are you sure you want to delete the column "${columnToDelete?.name}"?`}
        warning="This will permanently delete the column and all associated data in every row of this table."
        confirmText="Delete Column"
      />
    </>
  );
};

export default ColumnEditorModal;
