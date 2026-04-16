import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  addDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  Settings, 
  CheckCircle, 
  Home,
  MapPin,
  Star,
  Trash2,
  Edit3,
  ArrowLeft,
  MessageCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE MANUAL ---
const firebaseConfig = {
  apiKey: "AIzaSyAj1RM1uOvER1PJej7rHj17aN8ELtSLPsc",
  authDomain: "sistema-reservas-cabad.firebaseapp.com",
  projectId: "sistema-reservas-cabad",
  storageBucket: "sistema-reservas-cabad.firebasestorage.app",
  messagingSenderId: "27928368421",
  appId: "1:27928368421:web:1ae7ceee3244833e0fb6cc"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'ssa-stay-v2'; 

const SEU_WHATSAPP = "5571993019981"; 
const QR_CODE_PIX = "https://firebasestorage.googleapis.com/v0/b/sistema-reservas-cabad.appspot.com/o/qrpix.jpeg?alt=media";

// --- UTILITÁRIOS ---
const formatDate = (date) => date.toISOString().split('T')[0];
const getDatesInRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];
  while (start <= end) {
    dates.push(formatDate(new Date(start)));
    start.setDate(start.getDate() + 1);
  }
  return dates;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [view, setView] = useState('gallery');
  const [selectedPropId, setSelectedPropId] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [properties, setProperties] = useState([]);
  const [allReservations, setAllReservations] = useState({});

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) { 
        console.error("Erro na autenticação:", e);
        if (e.code === 'auth/admin-restricted-operation') {
          setAuthError("O Login Anônimo não está ativado no console do Firebase.");
        } else {
          setAuthError(e.message);
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    const propsCol = collection(db, 'artifacts', appId, 'public', 'data', 'properties');
    const unsubProps = onSnapshot(propsCol, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProperties(list);
      list.forEach(prop => {
        const resCol = collection(db, 'artifacts', appId, 'public', 'data', `res_${prop.id}`);
        onSnapshot(resCol, (resSnap) => {
          const resList = resSnap.docs.map(rd => ({ id: rd.id, ...rd.data() }));
          setAllReservations(prev => ({ ...prev, [prop.id]: resList }));
        }, (err) => { if (err.code !== 'permission-denied') console.error(err); });
      });
    }, (err) => console.error(err));
    return () => unsubProps();
  }, [authReady, user]);

  const selectedProperty = useMemo(() => 
    properties.find(p => p.id === selectedPropId), 
  [properties, selectedPropId]);

  if (authError) return <ErrorScreen message={authError} />;
  if (!authReady) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 font-black text-2xl text-indigo-600 cursor-pointer" onClick={() => { setView('gallery'); setSelectedPropId(null); }}>
          <Home className="w-7 h-7" />
          <span>SSA STAY</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setView('gallery')} className={`text-sm font-bold transition ${view !== 'admin' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Explorar</button>
          <button onClick={() => setView('admin')} className={`text-sm font-bold transition ${view === 'admin' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Painel Admin</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {view === 'gallery' && <Gallery properties={properties} onSelect={(id) => { setSelectedPropId(id); setView('details'); }} />}
        {view === 'details' && selectedProperty && (
          <PropertyView 
            property={selectedProperty} 
            reservations={allReservations[selectedProperty.id] || []} 
            onBack={() => setView('gallery')} 
            user={user} 
          />
        )}
        {view === 'admin' && (
          !isAdminAuthenticated ? (
            <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} />
          ) : (
            <AdminPanel 
              properties={properties} 
              allReservations={allReservations} 
              onLogout={() => setIsAdminAuthenticated(false)} 
            />
          )
        )}
      </main>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-md space-y-4 bg-white p-8 rounded-[2rem] shadow-xl border border-red-100">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-800">Erro de Configuração</h2>
        <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
        <div className="text-left bg-slate-50 p-4 rounded-xl text-xs space-y-2 text-slate-600">
          <p className="font-bold">Como resolver:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Vá ao Console do Firebase.</li>
            <li>Acesse <b>Authentication</b> {'>'} <b>Sign-in method</b>.</li>
            <li>Clique em <b>Adicionar novo provedor</b>.</li>
            <li>Escolha <b>Anônimo</b> e clique em <b>Ativar</b>.</li>
          </ol>
        </div>
        <button onClick={() => window.location.reload()} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Tentar Novamente</button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="font-bold text-slate-400 animate-pulse">Carregando SSA Stay...</p>
      </div>
    </div>
  );
}

function Gallery({ properties, onSelect }) {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-5xl font-black mb-4 tracking-tight text-slate-900">Salvador te espera.</h1>
        <p className="text-slate-500 text-lg">Reserve os melhores imóveis por temporada com facilidade.</p>
      </div>
      
      {properties.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed rounded-3xl text-slate-400">Nenhum imóvel disponível no momento.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map(prop => {
            const mainImg = prop.images?.[0] || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80";
            return (
              <div key={prop.id} onClick={() => onSelect(prop.id)} className="group bg-white rounded-[2.5rem] border shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border-slate-100">
                <div className="relative h-64 overflow-hidden">
                  <img src={mainImg} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={prop.title} />
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-xs font-black shadow-sm flex items-center gap-1">
                    <Star size={12} className="fill-yellow-400 text-yellow-400" /> 4.9
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-800">{prop.title}</h3>
                  <p className="text-slate-400 text-sm flex items-center gap-1 mt-1"><MapPin size={14}/> {prop.location}</p>
                  <p className="text-xl font-black text-indigo-600 mt-4">R${prop.defaultPrice} <span className="text-xs text-slate-400 font-normal">/ noite</span></p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PropertyView({ property, reservations, onBack, user }) {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const images = property.images?.length > 0 ? property.images : ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"];

  const occupiedDates = useMemo(() => {
    const dates = new Set();
    reservations.forEach(res => {
      getDatesInRange(res.start, res.end).forEach(d => dates.add(d));
    });
    return dates;
  }, [reservations]);

  const total = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const diff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000*60*60*24));
    return diff > 0 ? diff * property.defaultPrice : 0;
  }, [startDate, endDate, property]);

  const confirmBooking = async () => {
    if (!user || !startDate || !endDate || !customer.name || !customer.phone) return;
    
    const resData = { 
      name: customer.name, 
      phone: customer.phone,
      start: startDate, 
      end: endDate, 
      total, 
      propertyId: property.id, 
      createdAt: new Date().toISOString() 
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', `res_${property.id}`), resData);
      
      const msg = encodeURIComponent(
        `Olá! Gostaria de confirmar minha reserva:\n\n` +
        `🏠 *Imóvel:* ${property.title}\n` +
        `👤 *Hóspede:* ${customer.name}\n` +
        `📞 *Telefone:* ${customer.phone}\n` +
        `📅 *Check-in:* ${new Date(startDate).toLocaleDateString()}\n` +
        `📅 *Check-out:* ${new Date(endDate).toLocaleDateString()}\n` +
        `💰 *Total:* R$${total}\n\n` +
        `Já realizei o pagamento via Pix!`
      );
      
      window.open(`https://wa.me/${SEU_WHATSAPP}?text=${msg}`, '_blank');
      setStep(4);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 font-bold hover:bg-white px-4 py-2 rounded-xl transition shadow-sm w-fit border border-slate-100 hover:border-indigo-100"><ArrowLeft size={18}/> Voltar</button>
      
      <div className="grid lg:grid-cols-5 gap-12">
        <div className="lg:col-span-3 space-y-8">
          <div className="relative group overflow-hidden rounded-[3rem] shadow-2xl bg-slate-200">
            <img src={images[activeImageIdx]} className="w-full h-[450px] object-cover transition-all" alt="" />
            {images.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-md p-2 rounded-full">
                {images.map((_, i) => (
                  <button key={i} onClick={() => setActiveImageIdx(i)} className={`h-2 rounded-full transition-all ${i === activeImageIdx ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />
                ))}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-slate-900">{property.title}</h2>
            <p className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-50 w-fit px-4 py-1 rounded-full"><MapPin size={18}/> {property.location}</p>
            <p className="text-slate-500 text-lg leading-relaxed">{property.description}</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl sticky top-24 space-y-6 border-slate-100">
            {step === 1 && (
              <>
                <Calendar startDate={startDate} endDate={endDate} isOccupied={(d) => occupiedDates.has(d)} onDateClick={(d) => {
                  if (!startDate || (startDate && endDate)) { setStartDate(d); setEndDate(null); }
                  else { if (new Date(d) < new Date(startDate)) setStartDate(d); else setEndDate(d); }
                }} />
                {startDate && endDate && (
                  <div className="p-5 bg-indigo-600 rounded-3xl text-white flex justify-between items-center shadow-lg animate-in zoom-in">
                    <div><p className="text-xs opacity-80">Total</p><p className="font-black text-2xl">R${total}</p></div>
                    <button onClick={()=>setStep(2)} className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black hover:scale-105 transition">Próximo</button>
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <h3 className="text-xl font-black text-slate-800">Seus Dados</h3>
                <input placeholder="Nome do Hóspede" value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 ring-indigo-500" />
                <input placeholder="Número de Telefone (WhatsApp)" value={customer.phone} onChange={e=>setCustomer({...customer, phone:e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 ring-indigo-500" />
                <div className="flex gap-2">
                  <button onClick={()=>setStep(1)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">Voltar</button>
                  <button disabled={!customer.name || !customer.phone} onClick={()=>setStep(3)} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition">Ir para Pagamento</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center space-y-6 animate-in zoom-in">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800">Pagamento via Pix</h3>
                  <p className="text-sm text-slate-500 italic">Escaneie o código abaixo para pagar R${total}</p>
                </div>
                
                <div className="bg-white p-4 border-2 border-indigo-100 rounded-[2rem] inline-block shadow-sm">
                  <img 
                    src={QR_CODE_PIX} 
                    alt="QR Code Pix" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>

                <div className="space-y-3">
                  <button onClick={confirmBooking} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-100">
                    <MessageCircle size={22} /> Confirmar Reserva no WhatsApp
                  </button>
                  <button onClick={()=>setStep(2)} className="text-slate-400 font-bold text-sm">Voltar e alterar dados</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-10 space-y-4 animate-in zoom-in">
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto"><CheckCircle size={40} /></div>
                <h3 className="text-2xl font-black text-slate-800">Sucesso!</h3>
                <p className="text-slate-500">Sua reserva foi enviada. Estamos aguardando você no WhatsApp.</p>
                <button onClick={onBack} className="text-indigo-600 font-bold">Voltar para Galeria</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Calendar({ startDate, endDate, isOccupied, onDateClick }) {
  const [curr, setCurr] = useState(new Date());
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const daysInMonth = new Date(curr.getFullYear(), curr.getMonth() + 1, 0).getDate();
  const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1).getDay();
  const today = formatDate(new Date());
  
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(formatDate(new Date(curr.getFullYear(), curr.getMonth(), d)));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="font-black text-slate-800">{monthNames[curr.getMonth()]} {curr.getFullYear()}</p>
        <div className="flex gap-1">
          <button onClick={()=>setCurr(new Date(curr.getFullYear(), curr.getMonth()-1, 1))} className="p-2 hover:bg-slate-100 rounded-xl"><ChevronLeft size={18}/></button>
          <button onClick={()=>setCurr(new Date(curr.getFullYear(), curr.getMonth()+1, 1))} className="p-2 hover:bg-slate-100 rounded-xl"><ChevronRight size={18}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="text-[10px] font-black text-slate-400 text-center uppercase py-2">{d}</div>)}
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const isPast = d < today;
          const occ = isOccupied(d);
          const sel = d === startDate || d === endDate;
          const mid = startDate && endDate && d > startDate && d < endDate;
          let cls = "h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all border-2 cursor-pointer ";
          if (occ || isPast) cls += "bg-slate-50 text-slate-300 border-transparent cursor-not-allowed";
          else if (sel) cls += "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105";
          else if (mid) cls += "bg-indigo-50 text-indigo-700 border-transparent";
          else cls += "bg-white text-slate-700 border-transparent hover:border-indigo-100 hover:bg-indigo-50";

          return <div key={d} onClick={()=>!isPast && !occ && onDateClick(d)} className={cls}>{new Date(d).getDate()}</div>;
        })}
      </div>
    </div>
  );
}

function AdminLogin({ onLogin }) {
  const [p, setP] = useState('');
  return (
    <div className="max-w-md mx-auto mt-20 bg-white p-10 rounded-[3rem] border shadow-2xl text-center space-y-6">
      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto"><Settings size={30} /></div>
      <h2 className="text-2xl font-black">Área Administrativa</h2>
      <input type="password" placeholder="Senha" className="w-full p-4 bg-slate-50 border rounded-2xl text-center outline-none focus:ring-2 ring-indigo-500" value={p} onChange={e=>setP(e.target.value)} />
      <button onClick={()=>p==='123'?onLogin():window.alert('Senha Incorreta')} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">Entrar</button>
    </div>
  );
}

function AdminPanel({ properties, allReservations, onLogout }) {
  const [tab, setTab] = useState('res');
  const [edit, setEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', location: '', defaultPrice: '', description: '', imgs: '' });

  const save = async (e) => {
    e.preventDefault();
    const data = { 
      title: form.title, 
      location: form.location, 
      defaultPrice: Number(form.defaultPrice), 
      description: form.description, 
      images: form.imgs.split(',').map(s=>s.trim()).filter(s=>!!s)
    };
    if (editingId) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'properties', editingId), data);
    else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'properties'), data);
    setEdit(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
        <h2 className="text-xl font-black">Administração</h2>
        <button onClick={onLogout} className="text-red-500 font-bold">Sair</button>
      </div>

      <div className="flex gap-4 border-b">
        <button onClick={()=>setTab('res')} className={`pb-4 px-4 font-black transition ${tab==='res'?'text-indigo-600 border-b-4 border-indigo-600':'text-slate-400'}`}>Reservas</button>
        <button onClick={()=>setTab('inv')} className={`pb-4 px-4 font-black transition ${tab==='inv'?'text-indigo-600 border-b-4 border-indigo-600':'text-slate-400'}`}>Imóveis</button>
      </div>

      {tab === 'res' && (
        <div className="space-y-6">
          {Object.entries(allReservations).map(([id, list]) => (
            <div key={id} className="space-y-2">
              <p className="font-black text-xs text-indigo-600 uppercase">{properties.find(p=>p.id===id)?.title}</p>
              {list.map(r => (
                <div key={r.id} className="bg-white p-6 rounded-3xl border shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">{r.name}</p>
                    <p className="text-xs text-slate-400">{new Date(r.start).toLocaleDateString()} a {new Date(r.end).toLocaleDateString()}</p>
                    <p className="text-xs text-indigo-600 font-bold">{r.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg">R${r.total}</p>
                    <button onClick={async ()=>{if(window.confirm("Deseja excluir esta reserva?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', `res_${id}`, r.id))}} className="text-red-400 hover:text-red-600 mt-2"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'inv' && (
        <div className="space-y-6">
          <button onClick={()=>{setForm({title:'',location:'',defaultPrice:'',description:'',imgs:''});setEditingId(null);setEdit(true)}} className="w-full p-8 border-2 border-dashed rounded-3xl text-slate-400 font-bold hover:text-indigo-600 hover:bg-indigo-50 transition">+ Novo Imóvel</button>
          <div className="grid md:grid-cols-2 gap-4">
            {properties.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-3xl border flex gap-4 items-center">
                <img src={p.images?.[0]} className="w-16 h-16 rounded-xl object-cover" alt="" />
                <div className="flex-1"><p className="font-bold">{p.title}</p><p className="text-xs text-slate-400">R${p.defaultPrice}</p></div>
                <div className="flex gap-2">
                  <button onClick={()=>{setForm({title:p.title,location:p.location,defaultPrice:p.defaultPrice,description:p.description,imgs:p.images?.join(', ')||''});setEditingId(p.id);setEdit(true)}} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg"><Edit3 size={16}/></button>
                  <button onClick={async ()=>{if(window.confirm("Excluir imóvel permanentemente?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'properties', p.id))}} className="p-2 text-red-500 bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white p-10 rounded-[2.5rem] w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black">{editingId?'Editar':'Cadastrar'} Imóvel</h3>
            <input placeholder="Título" required value={form.title} onChange={e=>setForm({...form, title:e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Local" required value={form.location} onChange={e=>setForm({...form, location:e.target.value})} className="p-4 bg-slate-50 border rounded-2xl" />
              <input placeholder="Preço" type="number" required value={form.defaultPrice} onChange={e=>setForm({...form, defaultPrice:e.target.value})} className="p-4 bg-slate-50 border rounded-2xl" />
            </div>
            <textarea placeholder="Links das Fotos (separados por vírgula)" value={form.imgs} onChange={e=>setForm({...form, imgs:e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl h-24" />
            <textarea placeholder="Descrição" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl h-32" />
            <div className="flex gap-2 pt-4">
              <button type="button" onClick={()=>setEdit(false)} className="flex-1 py-4 font-bold bg-slate-100 rounded-2xl">Cancelar</button>
              <button type="submit" className="flex-[2] py-4 font-black bg-indigo-600 text-white rounded-2xl">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}