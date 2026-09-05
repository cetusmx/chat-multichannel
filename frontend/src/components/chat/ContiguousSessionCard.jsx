import React from 'react';

export default function ContiguousSessionCard({ type, date, loading, error, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      aria-disabled={loading}
      className="w-full py-3 px-4 my-2 flex items-center justify-center bg-gray-800 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
    >
      {loading ? (
        <span className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Cargando {type === 'previous' ? 'mensajes anteriores' : 'mensajes siguientes'}...
        </span>
      ) : error ? (
        <span className="text-sales-coral-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Error al cargar. Reintentar
        </span>
      ) : (
        <span className="text-sm font-medium">
        {type === 'previous' ? 'Cargar Conversación anterior' : 'Cargar Conversación siguiente'}
      </span>
      )}
    </button>
  );
}
