import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register as registerAPI } from '../services/api';
import { FiUser, FiMail, FiLock, FiArrowRight, FiShield, FiCheckCircle, FiAlertCircle, FiHome, FiHash, FiArrowLeft } from 'react-icons/fi';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    cabinetName: '',
    practitionerCode: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);

    try {
      const res = await registerAPI({
        name: form.name,
        email: form.email,
        password: form.password,
        cabinetName: form.cabinetName,
        practitionerCode: form.practitionerCode
      });
      setSuccess(res.data.message);
      setForm({ name: '', email: '', password: '', confirmPassword: '', cabinetName: '', practitionerCode: '' });
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0f1e' }}>
      {/* LEFT SIDE - Dark navy branding */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#111827] to-[#0a0f1e]"></div>
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-blue-600 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-0 w-56 h-56 bg-emerald-500 rounded-full opacity-5 blur-3xl"></div>

        <div className="relative z-10">
          {/* Logo RM DEV */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <span className="text-white font-semibold text-sm tracking-wider">RM DEV</span>
          </div>

          {/* Main title */}
          <h1 className="text-5xl xl:text-6xl font-black text-white leading-tight mb-6" style={{ fontStyle: 'italic' }}>
            EFFICIENCE<br />
            <span className="text-blue-400">DENTAIRE</span>.
          </h1>

          {/* Description */}
          <p className="text-gray-400 text-base leading-relaxed mb-10 max-w-sm">
            Rejoignez la plateforme d'analyse de performance dentaire la plus avancée.
          </p>

          {/* Badges */}
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 border border-emerald-500/30 rounded-full w-fit bg-emerald-500/5">
              <FiShield className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium tracking-wide uppercase">Protection nos certifiées</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 border border-emerald-500/30 rounded-full w-fit bg-emerald-500/5">
              <FiCheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium tracking-wide uppercase">Vérification par email</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - White registration form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center bg-white lg:rounded-l-[40px] relative">
        <div className="w-full max-w-md px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FiUser className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase">Nouveau praticien</span>
            </div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">
              INSCRIPTION<span className="text-blue-500"> .</span>
            </h2>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-700 text-sm">
              <FiCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Inscription réussie !</p>
                <p>{success}</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
              <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom complet */}
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                  Nom complet
                </label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Dr. Jean Dupont"
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 text-sm placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-500 bg-gray-50 border border-gray-200"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                  Email professionnel
                </label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="praticien@cabinet.fr"
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 text-sm placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-500 bg-gray-50 border border-gray-200"
                  />
                </div>
              </div>

              {/* Nom du cabinet */}
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                  Nom du cabinet
                </label>
                <div className="relative">
                  <FiHome className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    name="cabinetName"
                    value={form.cabinetName}
                    onChange={handleChange}
                    placeholder="Cabinet Dentaire Sourire"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 text-sm placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-500 bg-gray-50 border border-gray-200"
                  />
                </div>
              </div>

              {/* Code praticien */}
              <div>
                <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                  Code praticien <span className="text-gray-300 normal-case">(optionnel)</span>
                </label>
                <div className="relative">
                  <FiHash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    name="practitionerCode"
                    value={form.practitionerCode}
                    onChange={handleChange}
                    placeholder="Ex: JD"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 text-sm placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-500 bg-gray-50 border border-gray-200"
                  />
                </div>
              </div>

              {/* Row: Password + Confirm */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 text-sm placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-500 bg-gray-50 border border-gray-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                    Confirmer
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 text-sm placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-500 bg-gray-50 border border-gray-200"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-full font-bold text-sm tracking-wider text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 bg-[#1e293b] mt-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    CRÉER MON COMPTE
                    <FiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              DÉJÀ MEMBRE ?{' '}
              <span
                onClick={() => navigate('/login')}
                className="font-bold text-gray-800 underline cursor-pointer hover:text-blue-600 tracking-wide inline-flex items-center gap-1"
              >
                <FiArrowLeft className="w-3 h-3" />
                SE CONNECTER
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
