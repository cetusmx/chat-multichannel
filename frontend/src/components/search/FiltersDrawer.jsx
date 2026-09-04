import React, { useEffect, useRef } from 'react';
import FiltersSidebar from './FiltersSidebar';
import { X } from 'lucide-react';

export default function FiltersDrawer({ isOpen, onClose, facets, activeTypes, onFilterChange }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Native focus trapping with dialog
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
    } else {
      document.body.style.overflow = '';
      if (dialog && dialog.open) {
        dialog.close();
      }
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  return (
    <dialog 
      ref={dialogRef}
      onCancel={handleClose}
      className="fixed inset-y-0 left-0 w-4/5 max-w-sm h-full m-0 bg-white shadow-xl transform transition-transform duration-300 flex flex-col p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex"
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-200 w-full">
        <h2 className="text-lg font-bold text-gray-800">Filtros</h2>
        <button onClick={handleClose} aria-label="Cerrar filtros" className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100">
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto w-full">
        <FiltersSidebar 
          facets={facets} 
          loading={false} 
          activeTypes={activeTypes}
          onFilterChange={(k, v) => {
            onFilterChange(k, v);
            handleClose();
          }}
        />
      </div>
    </dialog>
  );
}
