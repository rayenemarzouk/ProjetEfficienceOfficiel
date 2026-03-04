import { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

const periodOptions = [
  { value: 'this_month', label: 'Ce mois' },
  { value: 'last_month', label: 'Mois dernier' },
  { value: '3_months', label: '3 derniers mois' },
  { value: '6_months', label: '6 derniers mois' },
  { value: 'this_year', label: 'Cette année' },
  { value: 'last_year', label: 'Année dernière' },
  { value: 'custom', label: 'Période personnalisée' }
];

export default function PeriodFilter({ value, onChange, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(value?.period === 'custom');
  const [customStart, setCustomStart] = useState(value?.startDate || '');
  const [customEnd, setCustomEnd] = useState(value?.endDate || '');
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

  const handlePeriodSelect = (period) => {
    if (period === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange({ period });
      setIsOpen(false);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({ period: 'custom', startDate: customStart, endDate: customEnd });
      setIsOpen(false);
    }
  };

  const getDisplayLabel = () => {
    if (!value?.period) return 'Sélectionner une période';
    if (value.period === 'custom' && value.startDate && value.endDate) {
      const start = new Date(value.startDate).toLocaleDateString('fr-FR');
      const end = new Date(value.endDate).toLocaleDateString('fr-FR');
      return `${start} - ${end}`;
    }
    return periodOptions.find(o => o.value === value.period)?.label || 'Sélectionner';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors min-w-[200px] justify-between shadow-sm"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-700">{getDisplayLabel()}</span>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Period options */}
          <div className="p-2">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePeriodSelect(option.value)}
                className={`
                  w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                  ${value?.period === option.value ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {showCustom && (
            <div className="border-t border-gray-100 p-4 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 mb-3">PÉRIODE PERSONNALISÉE</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Début</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fin</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Appliquer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
