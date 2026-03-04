import { 
  CurrencyEuroIcon, 
  UserGroupIcon, 
  CalendarDaysIcon, 
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));

// Fonction pour calculer le % de variation
const calcVariation = (current, previous) => {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous * 100).toFixed(1);
};

export default function ComportementCabinet({ 
  cabinetName = 'Cabinet',
  subtitle = 'Évolution mensuelle',
  ca = 0,
  caVariation = null,
  patients = 0,
  patientsVariation = null,
  rdv = 0,
  rdvVariation = null,
  heures = 0,
  heuresVariation = null,
  showVariations = true
}) {
  const cards = [
    {
      value: `${fmt(ca)} €`,
      label: 'CA du mois',
      icon: CurrencyEuroIcon,
      variation: caVariation,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-100',
      iconBg: 'bg-green-100'
    },
    {
      value: patients,
      label: 'Patients',
      icon: UserGroupIcon,
      variation: patientsVariation,
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600',
      borderColor: 'border-pink-100',
      iconBg: 'bg-pink-100'
    },
    {
      value: rdv,
      label: 'RDV',
      icon: CalendarDaysIcon,
      variation: rdvVariation,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-100',
      iconBg: 'bg-blue-100'
    },
    {
      value: `${heures}h`,
      label: 'Heures',
      icon: ClockIcon,
      variation: heuresVariation,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-100',
      iconBg: 'bg-amber-100'
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      {/* Header with icon */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Comportement du Cabinet</h3>
          <p className="text-sm text-gray-500">{cabinetName} — {subtitle}</p>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} ${card.borderColor} border rounded-xl p-4 text-center transition-all hover:shadow-md`}
          >
            <p className={`text-2xl lg:text-3xl font-bold ${card.textColor}`}>
              {card.value}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <card.icon className={`w-4 h-4 ${card.textColor} opacity-70`} />
              <span className="text-xs text-gray-600">{card.label}</span>
            </div>
            
            {showVariations && card.variation !== null && (
              <div className={`flex items-center justify-center gap-1 mt-2 text-xs font-medium ${
                parseFloat(card.variation) >= 0 ? 'text-green-600' : 'text-red-500'
              }`}>
                {parseFloat(card.variation) >= 0 ? (
                  <ArrowTrendingUpIcon className="w-3 h-3" />
                ) : (
                  <ArrowTrendingDownIcon className="w-3 h-3" />
                )}
                <span>{parseFloat(card.variation) >= 0 ? '+' : ''}{card.variation}%</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Export helper for variation calculation
export { calcVariation };
