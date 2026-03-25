import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Heart, Eye, EyeOff, ChevronDown, ChevronLeft, X, Check, ArrowRight, MapPin, Building2, Mail, Phone, User, Lock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, OperationType, handleFirestoreError } from '../App';
import { collection, addDoc } from 'firebase/firestore';

interface RegisterWizardProps {
  onNavigate: (page: string) => void;
  onBack: () => void;
  onLogin: () => void;
}

// ── Argentine Provinces & Cities ──
const PROVINCES_CITIES: Record<string, string[]> = {
  'Buenos Aires': [
    'Ciudad Autónoma de Buenos Aires', 'La Plata', 'Mar del Plata', 'Bahía Blanca', 'Tandil',
    'San Isidro', 'Vicente López', 'Tigre', 'Pilar', 'Quilmes', 'Lomas de Zamora',
    'Morón', 'Avellaneda', 'San Martín', 'Zárate', 'Campana', 'Luján', 'Junín', 'Pergamino',
    'Necochea', 'Tres Arroyos', 'Olavarría', 'Mercedes', 'San Nicolás', 'Escobar',
  ],
  'Córdoba': [
    'Córdoba Capital', 'Villa Carlos Paz', 'Río Cuarto', 'Villa María', 'Alta Gracia',
    'Jesús María', 'Cosquín', 'La Falda', 'Bell Ville', 'San Francisco',
  ],
  'Santa Fe': [
    'Rosario', 'Santa Fe Capital', 'Rafaela', 'Venado Tuerto', 'Reconquista',
    'Casilda', 'Esperanza', 'San Lorenzo', 'Villa Gobernador Gálvez',
  ],
  'Mendoza': [
    'Mendoza Capital', 'San Rafael', 'Godoy Cruz', 'Luján de Cuyo', 'Maipú',
    'Tunuyán', 'San Martín', 'Las Heras', 'Rivadavia',
  ],
  'Tucumán': [
    'San Miguel de Tucumán', 'Yerba Buena', 'Tafí Viejo', 'Concepción', 'Banda del Río Salí',
  ],
  'Entre Ríos': [
    'Paraná', 'Concordia', 'Gualeguaychú', 'Colón', 'Victoria', 'Villaguay',
  ],
  'Salta': [
    'Salta Capital', 'San Ramón de la Nueva Orán', 'Tartagal', 'Cafayate', 'Rosario de la Frontera',
  ],
  'Misiones': [
    'Posadas', 'Puerto Iguazú', 'Eldorado', 'Oberá', 'Jardín América',
  ],
  'Corrientes': [
    'Corrientes Capital', 'Goya', 'Mercedes', 'Curuzú Cuatiá', 'Paso de los Libres',
  ],
  'Chaco': [
    'Resistencia', 'Presidencia Roque Sáenz Peña', 'Villa Ángela', 'Barranqueras',
  ],
  'San Juan': [
    'San Juan Capital', 'Rawson', 'Rivadavia', 'Chimbas', 'Pocito',
  ],
  'Jujuy': [
    'San Salvador de Jujuy', 'San Pedro', 'Palpalá', 'Tilcara', 'Humahuaca',
  ],
  'Río Negro': [
    'Bariloche', 'General Roca', 'Viedma', 'Cipolletti', 'El Bolsón',
  ],
  'Neuquén': [
    'Neuquén Capital', 'San Martín de los Andes', 'Villa La Angostura', 'Centenario', 'Plottier',
  ],
  'Santiago del Estero': [
    'Santiago del Estero Capital', 'La Banda', 'Termas de Río Hondo', 'Añatuya',
  ],
  'San Luis': [
    'San Luis Capital', 'Villa Mercedes', 'Merlo', 'La Punta',
  ],
  'Catamarca': [
    'San Fernando del Valle de Catamarca', 'Valle Viejo', 'Tinogasta',
  ],
  'La Rioja': [
    'La Rioja Capital', 'Chilecito', 'Chamical',
  ],
  'Formosa': [
    'Formosa Capital', 'Clorinda', 'Pirané',
  ],
  'La Pampa': [
    'Santa Rosa', 'General Pico', 'Toay',
  ],
  'Chubut': [
    'Rawson', 'Comodoro Rivadavia', 'Trelew', 'Puerto Madryn', 'Esquel',
  ],
  'Santa Cruz': [
    'Río Gallegos', 'Calafate', 'Caleta Olivia', 'Pico Truncado',
  ],
  'Tierra del Fuego': [
    'Ushuaia', 'Río Grande', 'Tolhuin',
  ],
};

const PROVINCE_NAMES = Object.keys(PROVINCES_CITIES);

// ── Sector Types & Activity Sectors ──
const SECTOR_TYPES: Record<string, string[]> = {
  'Recepción': [
    'Salones de Fiesta', 'Estancias', 'Hoteles', 'Restaurantes', 'Quintas',
    'Jardines y Parques', 'Clubes', 'Terrazas', 'Bodegas',
  ],
  'Proveedores': [
    'Fotografía', 'Video', 'DJ y Música', 'Maquillaje', 'Peinado',
    'Decoración', 'Flores', 'Tortas y Mesa Dulce', 'Souvenirs',
    'Transporte', 'Animación', 'Pirotecnia', 'Catering',
  ],
  'Novias': [
    'Vestidos de Novia', 'Zapatos', 'Tocados y Accesorios', 'Lencería',
    'Joyería y Alianzas',
  ],
  'Novios': [
    'Trajes', 'Zapatos de Novio', 'Accesorios de Novio', 'Peluquería Masculina',
  ],
};

const SECTOR_TYPE_NAMES = Object.keys(SECTOR_TYPES);

export const RegisterWizard: React.FC<RegisterWizardProps> = ({ onNavigate, onBack, onLogin }) => {
  // ── Form State ──
  const [businessName, setBusinessName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [sectorType, setSectorType] = useState('');
  const [activitySector, setActivitySector] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Dropdown State ──
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Close city dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node) &&
        cityInputRef.current && !cityInputRef.current.contains(e.target as Node)
      ) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Filtered Cities ──
  const filteredCities = useMemo(() => {
    if (!province) return [];
    const cities = PROVINCES_CITIES[province] || [];
    if (!citySearch.trim()) return cities;
    return cities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
  }, [province, citySearch]);

  // ── Activity Sectors for selected type ──
  const activityOptions = useMemo(() => {
    if (!sectorType) return [];
    return SECTOR_TYPES[sectorType] || [];
  }, [sectorType]);

  // ── Validation ──
  const usernameValid = username.length >= 5;
  const passwordValid = password.length >= 8 && password.length <= 48 &&
    /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && !/\s/.test(password);

  const formComplete = businessName && province && city && sectorType && activitySector &&
    email && phone && usernameValid && passwordValid && acceptTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formComplete) return;
    
    if (!auth.currentUser) {
      onLogin();
      return;
    }

    setSubmitting(true);
    try {
      const vendorData = {
        userId: auth.currentUser.uid,
        businessName: businessName,
        province: province,
        city: city,
        sectorType: sectorType,
        sectorActivity: activitySector,
        contactName: username,
        contactPhone: phone,
        contactEmail: email,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'vendors'), vendorData);
      setSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'vendors');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-slate-800">¡Cuenta creada!</h2>
          <p className="text-slate-500 leading-relaxed">
            Tu cuenta de proveedor ha sido registrada exitosamente. Ya podés acceder al panel Pro para completar tu perfil.
          </p>
          <button
            onClick={() => onNavigate('pro-dashboard')}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2"
          >
            Ir al Panel Pro
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel — Image */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1556157382-97edd2d93229?auto=format&fit=crop&w=900&q=80"
          alt="Profesional de bodas"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Heart className="w-8 h-8 text-rose-400 fill-rose-400" />
              <span className="text-2xl font-serif font-bold text-white">TuCasamiento</span>
              <span className="text-rose-300 text-xs font-black uppercase tracking-widest bg-rose-500/20 px-2 py-1 rounded-full border border-rose-400/30 ml-1">Pro</span>
            </div>
            <h2 className="text-4xl font-serif font-bold text-white leading-tight">
              Potenciá tu negocio<br />con nosotros
            </h2>
            <p className="text-white/70 max-w-sm leading-relaxed">
              Unite a la red de proveedores más grande de Argentina y conectá con miles de parejas que planifican su casamiento.
            </p>
            <div className="flex items-center gap-6 text-white/60 text-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>+2.000 proveedores</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                <span>+50.000 parejas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-10 lg:py-16">
          {/* Desktop Back Button */}
          <div className="hidden lg:flex items-center justify-end mb-12">
            <button
              onClick={onBack}
              className="text-sm text-slate-500 hover:text-rose-500 font-medium flex items-center gap-2 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver al inicio
            </button>
          </div>

          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
              <span className="text-xl font-serif font-bold text-slate-800">TuCasamiento</span>
              <span className="text-rose-500 text-[9px] font-black uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">Pro</span>
            </div>
            <button
              onClick={onBack}
              className="text-sm text-slate-500 hover:text-rose-500 font-medium"
            >
              Volver al inicio
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 mb-10"
          >
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-800">
              Sumate gratis y hacé crecer tu negocio
            </h1>
            <p className="text-slate-500">
              Creá tu perfil profesional y conseguí visibilidad ante miles de parejas.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* ── DATOS DE CONTACTO ── */}
            <section className="space-y-5">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-800">Datos de contacto</h3>

              {/* Business Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">Nombre de la empresa</label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="Ej: Studio Captura Eterna"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Province & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Province */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Provincia</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      value={province}
                      onChange={e => {
                        setProvince(e.target.value);
                        setCity('');
                        setCitySearch('');
                      }}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-12 pr-10 py-3.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all text-sm cursor-pointer text-slate-700"
                    >
                      <option value="">Seleccionar provincia</option>
                      {PROVINCE_NAMES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* City with autocomplete */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-500 ml-1">Ciudad</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      ref={cityInputRef}
                      type="text"
                      value={city || citySearch}
                      onChange={e => {
                        setCitySearch(e.target.value);
                        setCity('');
                        setShowCityDropdown(true);
                      }}
                      onFocus={() => province && setShowCityDropdown(true)}
                      placeholder={province ? 'Buscar ciudad...' : 'Elegí provincia primero'}
                      disabled={!province}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-10 py-3.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all text-sm disabled:bg-slate-50 disabled:text-slate-400"
                    />
                    {city && (
                      <button
                        type="button"
                        onClick={() => { setCity(''); setCitySearch(''); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* City Dropdown */}
                  <AnimatePresence>
                    {showCityDropdown && filteredCities.length > 0 && (
                      <motion.div
                        ref={cityDropdownRef}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto"
                      >
                        {filteredCities.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setCity(c);
                              setCitySearch('');
                              setShowCityDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-rose-50 transition-colors text-sm border-b border-slate-50 last:border-0"
                          >
                            <span className="font-medium text-slate-800">{c}</span>
                            <span className="text-slate-400 text-xs ml-2">{province}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Sector Type & Activity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sector Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Tipo de sector</label>
                  <div className="relative">
                    <select
                      value={sectorType}
                      onChange={e => {
                        setSectorType(e.target.value);
                        setActivitySector('');
                      }}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 pr-10 py-3.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all text-sm cursor-pointer text-slate-700"
                    >
                      <option value="">Seleccionar tipo</option>
                      {SECTOR_TYPE_NAMES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Activity Sector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Sector de actividad</label>
                  <div className="relative">
                    <select
                      value={activitySector}
                      onChange={e => setActivitySector(e.target.value)}
                      disabled={!sectorType}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 pr-10 py-3.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all text-sm cursor-pointer text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">Seleccionar sector</option>
                      {activityOptions.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">Correo electrónico</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">Teléfono / WhatsApp</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Ej: 1155667788"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all text-sm"
                  />
                </div>
              </div>
            </section>

            {/* ── DATOS DE ACCESO ── */}
            <section className="space-y-5">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-800">Datos de acceso</h3>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">Nombre de usuario</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Mínimo 5 caracteres"
                    className={`w-full bg-white border rounded-xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 transition-all text-sm ${
                      username && !usernameValid
                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-400'
                        : username && usernameValid
                          ? 'border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-400'
                          : 'border-slate-200 focus:ring-rose-500/20 focus:border-rose-400'
                    }`}
                  />
                  {username && usernameValid && (
                    <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  )}
                </div>
                {username && !usernameValid && (
                  <p className="text-rose-500 text-xs ml-1">El nombre de usuario debe tener al menos 5 caracteres.</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className={`w-full bg-white border rounded-xl pl-12 pr-12 py-3.5 outline-none focus:ring-2 transition-all text-sm ${
                      password && !passwordValid
                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-400'
                        : password && passwordValid
                          ? 'border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-400'
                          : 'border-slate-200 focus:ring-rose-500/20 focus:border-rose-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className={`text-xs ml-1 ${password && !passwordValid ? 'text-rose-500' : 'text-slate-400'}`}>
                  Tu contraseña debe tener entre 8 y 48 caracteres, incluir al menos una{' '}
                  <span className={`font-bold ${password && /[a-z]/.test(password) ? 'text-emerald-500' : ''}`}>minúscula</span>,{' '}
                  una <span className={`font-bold ${password && /[A-Z]/.test(password) ? 'text-emerald-500' : ''}`}>mayúscula</span>{' '}
                  y un <span className={`font-bold ${password && /[0-9]/.test(password) ? 'text-emerald-500' : ''}`}>número</span>,{' '}
                  y no puede contener espacios.
                </p>
              </div>
            </section>

            {/* ── TERMS ── */}
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setAcceptTerms(!acceptTerms)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  acceptTerms
                    ? 'bg-rose-500 border-rose-500 text-white'
                    : 'border-slate-300 hover:border-rose-400'
                }`}
              >
                {acceptTerms && <Check className="w-3 h-3" />}
              </button>
              <p className="text-sm text-slate-600 leading-relaxed">
                Acepto las{' '}
                <a href="#" className="text-rose-500 underline hover:text-rose-600 font-medium">condiciones de uso</a>{' '}
                y la{' '}
                <a href="#" className="text-rose-500 underline hover:text-rose-600 font-medium">Política de privacidad</a>{' '}
                de TuCasamiento.
              </p>
            </div>

            {/* ── SUBMIT ── */}
            <motion.button
              type="submit"
              disabled={!formComplete || submitting}
              whileHover={formComplete ? { scale: 1.01 } : {}}
              whileTap={formComplete ? { scale: 0.98 } : {}}
              className={`w-full font-bold py-4 rounded-2xl transition-all text-lg flex items-center justify-center gap-3 shadow-xl ${
                formComplete
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Crear tu cuenta
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>

            <p className="text-center text-sm text-slate-400">
              ¿Ya tenés cuenta?{' '}
              <button type="button" onClick={() => onNavigate('pro-dashboard')} className="text-rose-500 font-bold hover:underline">
                Iniciá sesión
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
