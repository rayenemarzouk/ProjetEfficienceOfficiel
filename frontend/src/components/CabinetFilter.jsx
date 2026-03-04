import { useState, useRef, useEffect } from 'react';
import { BuildingOfficeIcon, ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function CabinetFilter({ cabinets = [], value = [], onChange, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (code) => {
    if (code === 'all') {
      onChange([]);
    } else {
      const newValue = value.includes(code)
        ? value.filter(c => c !== code)
        : [...value, code];
      onChange(newValue);
    }
  };

  const getDisplayLabel = () => {
    if (value.length === 0) return 'Tous les cabinets';
    if (value.length === 1) {
      const cabinet = cabinets.find(c => c.code === value[0]);
      return cabinet?.nom || value[0];
    }
    return `${value.length} cabinets sélectionnés`;
  };

  const isSelected = (code) => {
    if (code === 'all') return value.length === 0;
    return value.includes(code);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors min-w-[200px] justify-between shadow-sm"
      >
        <div className="flex items-center gap-2">
          <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-700">{getDisplayLabel()}</span>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          <div className="p-2">
            {/* All cabinets option */}
            <button
              onClick={() => handleToggle('all')}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${isSelected('all') ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}
              `}
            >
              <div className={`
                w-5 h-5 rounded border-2 flex items-center justify-center
                ${isSelected('all') ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
              `}>
                {isSelected('all') && <CheckIcon className="w-3 h-3 text-white" />}
              </div>
              <span>Tous les cabinets</span>
            </button>

            {/* Separator */}
            <div className="my-2 border-t border-gray-100" />

            {/* Individual cabinets */}
            {cabinets.map((cabinet) => (
              <button
                key={cabinet.code}
                onClick={() => handleToggle(cabinet.code)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                  ${isSelected(cabinet.code) ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}
                `}
              >
                <div className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center
                  ${isSelected(cabinet.code) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                `}>
                  {isSelected(cabinet.code) && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 text-left">
                  <span className="block">{cabinet.nom}</span>
                  <span className="text-xs text-gray-400">{cabinet.code}</span>
                </div>
              </button>
            ))}

            {cabinets.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Aucun cabinet disponible
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
