import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { MessageCircle, X, Send } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";// ══════════════════════════════════════════════════════
//  CONSTANTS & DATA
// ══════════════════════════════════════════════════════

const LANGS = {
  ar: {
    appName: "صيّاد", tagline: "دليلك الذكي للصيد البحري",
    login: "تسجيل الدخول", logout: "خروج", username: "اسم المستخدم",
    password: "كلمة المرور", loginBtn: "دخول", wrongPass: "بيانات خاطئة",
    fishSelector: "اختر نوع السمك", allFish: "الكل",
    probLabel: "احتمالية الوجود", tonight: "توصية الليلة",
    bestTime: "أفضل وقت", bestDepth: "أفضل عمق", season: "الموسم",
    proOnly: "محتوى حصري للمشتركين ⭐", upgrade: "اشترك الآن",
    adminPanel: "لوحة الأدمن", users: "المستخدمون", addPro: "تفعيل احترافي",
    revokePro: "إيقاف الاشتراك", userId: "ID المستخدم", activate: "تفعيل",
    activeUsers: "مشتركون نشطون", totalUsers: "إجمالي المستخدمين",
    mapTitle: "خريطة ساحل تلمسان", clickZone: "انقر على منطقة لتفاصيلها",
    refresh: "تحديث البيانات", lastUpdate: "آخر تحديث",
    high: "عالي", medium: "متوسط", low: "منخفض",
    free: "مجاني", pro: "احترافي ⭐", admin: "أدمن 🔧",
    noAccess: "هذا المحتوى للمشتركين الاحترافيين فقط",
    lang: "اللغة",
  },
  fr: {
    appName: "Sayyad", tagline: "Votre guide intelligent de pêche",
    login: "Connexion", logout: "Déconnexion", username: "Nom d'utilisateur",
    password: "Mot de passe", loginBtn: "Se connecter", wrongPass: "Identifiants incorrects",
    fishSelector: "Choisir le poisson", allFish: "Tous",
    probLabel: "Probabilité de présence", tonight: "Recommandation ce soir",
    bestTime: "Meilleur moment", bestDepth: "Meilleure profondeur", season: "Saison",
    proOnly: "Contenu réservé aux abonnés ⭐", upgrade: "S'abonner",
    adminPanel: "Panneau admin", users: "Utilisateurs", addPro: "Activer Pro",
    revokePro: "Désactiver", userId: "ID utilisateur", activate: "Activer",
    activeUsers: "Abonnés actifs", totalUsers: "Total utilisateurs",
    mapTitle: "Carte côte Tlemcen", clickZone: "Cliquez sur une zone",
    refresh: "Actualiser", lastUpdate: "Dernière mise à jour",
    high: "Élevé", medium: "Moyen", low: "Faible",
    free: "Gratuit", pro: "Pro ⭐", admin: "Admin 🔧",
    noAccess: "Ce contenu est réservé aux abonnés pro",
    lang: "Langue",
  },
  en: {
    appName: "Sayyad", tagline: "Your smart fishing guide",
    login: "Login", logout: "Logout", username: "Username",
    password: "Password", loginBtn: "Sign in", wrongPass: "Wrong credentials",
    fishSelector: "Select fish", allFish: "All",
    probLabel: "Presence probability", tonight: "Tonight's tip",
    bestTime: "Best time", bestDepth: "Best depth", season: "Season",
    proOnly: "Pro subscribers only ⭐", upgrade: "Subscribe",
    adminPanel: "Admin Panel", users: "Users", addPro: "Activate Pro",
    revokePro: "Revoke", userId: "User ID", activate: "Activate",
    activeUsers: "Active subscribers", totalUsers: "Total users",
    mapTitle: "Tlemcen Coast Map", clickZone: "Click a zone for details",
    refresh: "Refresh data", lastUpdate: "Last update",
    high: "High", medium: "Medium", low: "Low",
    free: "Free", pro: "Pro ⭐", admin: "Admin 🔧",
    noAccess: "This content is for pro subscribers only",
    lang: "Language",
  }
};

const FISH_TYPES = {
  all:    { ar:"الكل",    fr:"Tous",    en:"All",    icon:"🐠", color:"#00e5ff" },
  latcha: { ar:"اللاتشا", fr:"Lача",    en:"Latcha", icon:"🐟", color:"#f0c040",
    season:{ar:"يونيو–سبتمبر",fr:"Juin–Septembre",en:"June–September"},
    bestTime:{ar:"21:00–02:00",fr:"21h–02h",en:"9PM–2AM"},
    bestDepth:{ar:"0–30م سطحي",fr:"0–30m surface",en:"0–30m surface"},
    weights:{temp:0.35, chloro:0.35, wind:0.15, current:0.10, moon:0.05},
    tempRange:[18,26], chloroMin:0.4 },
  sardine:{ ar:"السردين", fr:"Sardine",  en:"Sardine", icon:"🐡", color:"#4fc3f7",
    season:{ar:"مارس–نوفمبر",fr:"Mars–Novembre",en:"March–November"},
    bestTime:{ar:"20:00–01:00",fr:"20h–01h",en:"8PM–1AM"},
    bestDepth:{ar:"10–50م",fr:"10–50m",en:"10–50m"},
    weights:{temp:0.30, chloro:0.30, wind:0.20, current:0.15, moon:0.05},
    tempRange:[14,22], chloroMin:0.3 },
  hobar:  { ar:"الحبار",  fr:"Calmar",  en:"Squid",  icon:"🦑", color:"#ce93d8",
    season:{ar:"أكتوبر–يناير",fr:"Oct–Janvier",en:"October–January"},
    bestTime:{ar:"22:00–04:00",fr:"22h–04h",en:"10PM–4AM"},
    bestDepth:{ar:"20–80م",fr:"20–80m",en:"20–80m"},
    weights:{temp:0.20, chloro:0.20, wind:0.15, current:0.30, moon:0.15},
    tempRange:[16,24], chloroMin:0.2 },
};

// Mock user DB
const INITIAL_USERS = [
  { id:"USR001", username:"admin",    password:"admin123",  role:"admin", pro:true  },
  { id:"USR002", username:"yassine",  password:"fish2024",  role:"user",  pro:true  },
  { id:"USR003", username:"khalid",   password:"khalid123", role:"user",  pro:false },
  { id:"USR004", username:"omar",     password:"omar456",   role:"user",  pro:false },
];

const COAST_LINE = [
  [35.18,-2.12],[35.15,-2.05],[35.12,-1.95],[35.09,-1.86],
  [35.10,-1.78],[35.13,-1.65],[35.20,-1.52],[35.28,-1.38],[35.33,-1.25]
];

const ZONES = [
  { id:1, name:{ar:"خليج الغزوات",fr:"Baie de Ghazaouet",en:"Ghazaouet Bay"},
    lat:35.11, lng:-1.86, base:0.85, dist:{ar:"2 كلم",fr:"2 km",en:"2 km"}, type:"coastal" },
  { id:2, name:{ar:"غرب الميناء",fr:"Ouest du port",en:"West Harbor"},
    lat:35.12, lng:-1.82, base:0.75, dist:{ar:"3 كلم",fr:"3 km",en:"3 km"}, type:"coastal" },
  { id:3, name:{ar:"رأس الحديد",fr:"Cap El Hadid",en:"Iron Cape"},
    lat:35.13, lng:-1.92, base:0.60, dist:{ar:"4 كلم",fr:"4 km",en:"4 km"}, type:"coastal" },
  { id:4, name:{ar:"مرسى بن مهيدي",fr:"Marsa Ben M'hidi",en:"Marsa Ben Mhidi"},
    lat:35.12, lng:-2.15, base:0.65, dist:{ar:"5 كلم",fr:"5 km",en:"5 km"}, type:"coastal" },
  { id:5, name:{ar:"رأس العقبة",fr:"Ras El Akba",en:"Ras El Akba"},
    lat:35.11, lng:-1.97, base:0.70, dist:{ar:"6 كلم",fr:"6 km",en:"6 km"}, type:"coastal" },
  { id:6, name:{ar:"بني صاف",fr:"Beni Saf",en:"Beni Saf"},
    lat:35.31, lng:-1.38, base:0.55, dist:{ar:"5 كلم",fr:"5 km",en:"5 km"}, type:"coastal" },
  { id:7, name:{ar:"وسط الغزوات",fr:"Centre Ghazaouet",en:"Ghazaouet Center"},
    lat:35.35, lng:-1.86, base:0.78, dist:{ar:"30 كلم",fr:"30 km",en:"30 km"}, type:"mid" },
  { id:8, name:{ar:"شمال رأس الحديد",fr:"Nord Cap Hadid",en:"North Cap Hadid"},
    lat:35.45, lng:-1.93, base:0.68, dist:{ar:"40 كلم",fr:"40 km",en:"40 km"}, type:"mid" },
  { id:9, name:{ar:"الخليج الغربي",fr:"Golfe Ouest",en:"West Gulf"},
    lat:35.30, lng:-2.15, base:0.72, dist:{ar:"25 كلم",fr:"25 km",en:"25 km"}, type:"mid" },
  { id:10, name:{ar:"شمال بني صاف",fr:"Nord Beni Saf",en:"North Beni Saf"},
    lat:35.55, lng:-1.38, base:0.58, dist:{ar:"37 كلم",fr:"37 km",en:"37 km"}, type:"mid" },
  { id:11, name:{ar:"المنطقة العميقة",fr:"Zone profonde",en:"Deep Zone"},
    lat:35.65, lng:-1.86, base:0.50, dist:{ar:"63 كلم",fr:"63 km",en:"63 km"}, type:"deep" },
  { id:12, name:{ar:"شمال غرب عميق",fr:"Nord-Ouest profond",en:"Deep NW"},
    lat:35.70, lng:-2.05, base:0.45, dist:{ar:"67 كلم",fr:"67 km",en:"67 km"}, type:"deep" },
  { id:13, name:{ar:"الحافة الشمالية",fr:"Limite Nord",en:"North Edge"},
    lat:35.75, lng:-1.65, base:0.42, dist:{ar:"70 كلم",fr:"70 km",en:"70 km"}, type:"deep" },
  { id:14, name:{ar:"شاطئ سيدي يوشع",fr:"Plage Sidi Youchaa",en:"Sidi Youchaa Beach"},
    lat:35.30, lng:-1.33, base:0.80, dist:{ar:"2 كلم",fr:"2 km",en:"2 km"}, type:"coastal" },
  { id:15, name:{ar:"صخور سيدي يوشع",fr:"Récifs Sidi Youchaa",en:"Sidi Youchaa Reef"},
    lat:35.32, lng:-1.30, base:0.72, dist:{ar:"4 كلم",fr:"4 km",en:"4 km"}, type:"coastal" },
  { id:16, name:{ar:"بحر سيدي يوشع",fr:"Large Sidi Youchaa",en:"Sidi Youchaa Offshore"},
    lat:35.45, lng:-1.32, base:0.65, dist:{ar:"18 كلم",fr:"18 km",en:"18 km"}, type:"mid" },
  { id:17, name:{ar:"عمق سيدي يوشع",fr:"Profond Sidi Youchaa",en:"Sidi Youchaa Deep"},
    lat:35.60, lng:-1.30, base:0.48, dist:{ar:"35 كلم",fr:"35 km",en:"35 km"}, type:"deep" },
];

const MAP_BOUNDS = { latMin:34.30, latMax:35.50, lngMin:-2.25, lngMax:-1.10 };

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
function geo2canvas(lat, lng, w, h) {
  const x = ((lng - MAP_BOUNDS.lngMin) / (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin)) * w;
  const y = ((MAP_BOUNDS.latMax - lat) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * h;
  return [x, y];
}

function probColor(p) {
  if (p >= 0.70) return { s:"#00e676", f:"rgba(0,230,118,0.20)" };
  if (p >= 0.45) return { s:"#f0c040", f:"rgba(240,192,64,0.20)" };
  return { s:"#ff4d6d", f:"rgba(255,77,109,0.18)" };
}

function moonPhase() {
  const known = new Date("2024-01-11");
  return ((Date.now() - known) / 86400000 % 29.53) / 29.53;
}

function getMoon(p) {
  if (p < 0.05 || p > 0.95) return { icon:"🌑", score:1.0 };
  if (p < 0.25) return { icon:"🌒", score:0.85 };
  if (p < 0.45) return { icon:"🌓", score:0.65 };
  if (p < 0.55) return { icon:"🌕", score:0.35 };
  if (p < 0.75) return { icon:"🌖", score:0.60 };
  return { icon:"🌘", score:0.80 };
}

function generateEnvData(fishKey) {
  const month = new Date().getMonth() + 1;
  const temps = {1:14,2:13.5,3:14.5,4:16,5:18.5,6:21,7:24,8:25.5,9:23,10:20,11:17,12:15};
  const temp = temps[month] + (Math.random()*2-1);
  const chloro = (month>=3&&month<=8?0.6:0.35) + Math.random()*0.4;
  const wind = 3 + Math.random()*18;
  const current = 0.05 + Math.random()*0.35;
  const moon = getMoon(moonPhase());

  const fish = fishKey !== "all" ? FISH_TYPES[fishKey] : null;
  const w = fish?.weights || {temp:0.30,chloro:0.35,wind:0.15,current:0.10,moon:0.10};
  const tRange = fish?.tempRange || [18,26];
  const cMin = fish?.chloroMin || 0.35;

  const tScore = temp>=tRange[0]&&temp<=tRange[1]?1.0:temp>=(tRange[0]-2)?0.65:0.25;
  const cScore = chloro>=cMin?1.0:chloro>=(cMin-0.2)?0.6:0.2;
  const wScore = wind>=5&&wind<=15?0.9:wind<5?0.6:wind<=20?0.5:0.1;
  const cuScore = current>=0.1&&current<=0.25?0.9:current<0.1?0.5:0.65;

  const score = Math.round((tScore*w.temp+cScore*w.chloro+wScore*w.wind+cuScore*w.current+moon.score*w.moon)*100);
  return { temp, chloro, wind, current, moon, score };
}

// ══════════════════════════════════════════════════════
//  MAP CANVAS
// ══════════════════════════════════════════════════════
function OceanMap({ zones, selected, onSelect, isPro, lang, fishColor }) {
  return (
    <div style={{height: 400, width: "100%", borderRadius: 10, overflow: "hidden", background: "#04111e", zIndex: 0}}>
      <MapContainer center={[35.35, -1.8]} zoom={9} style={{ height: "100%", width: "100%", zIndex: 1 }} scrollWheelZoom={true}>
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        />
        {zones.map((z, i) => {
          const isSel = selected === i;
          
          if(!isPro && z.type !== "coastal") {
             return (
               <CircleMarker key={z.id} center={[z.lat, z.lng]} radius={12}
                 pathOptions={{ color: "rgba(100,130,160,0.5)", fillColor: "rgba(30,50,70,0.8)", fillOpacity: 0.8, weight: 2 }}>
                 <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                   <span style={{fontSize: 12}}>🔒</span>
                 </Tooltip>
               </CircleMarker>
             );
          }

          const col = probColor(z.prob);
          const r = z.type==="deep"?14:z.type==="mid"?16:18;
          
          return (
            <CircleMarker key={z.id} center={[z.lat, z.lng]} radius={r} className="radar-pulse"
              eventHandlers={{ click: () => onSelect(isSel ? -1 : i) }}
              pathOptions={{
                color: col.s, 
                fillColor: col.f, 
                fillOpacity: 1, 
                weight: isSel ? 4 : 2,
              }}>
              <Tooltip direction="center" permanent opacity={1} className="custom-tooltip">
                <span style={{color: col.s, fontWeight: "900", fontSize: "11px", textShadow: "0 0 3px rgba(0,0,0,0.9)"}}>
                  {Math.round(z.prob*100)}%
                </span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <style>{`
        .leaflet-tooltip.custom-tooltip {
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
        }
        .leaflet-tooltip-top:before, .leaflet-tooltip-bottom:before, .leaflet-tooltip-left:before, .leaflet-tooltip-right:before {
          display: none;
        }
        @keyframes pulse {
          0% { stroke-width: 1px; fill-opacity: 0.6; filter: drop-shadow(0 0 2px currentColor); }
          50% { stroke-width: 5px; fill-opacity: 0.9; filter: drop-shadow(0 0 10px currentColor); }
          100% { stroke-width: 1px; fill-opacity: 0.6; filter: drop-shadow(0 0 2px currentColor); }
        }
        .radar-pulse path {
          animation: pulse 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  ADMIN PANEL
// ══════════════════════════════════════════════════════
function AdminPanel({ users, setUsers, t, lang }) {
  const [inputId, setInputId] = useState("");
  const [msg, setMsg] = useState("");

  const toggle = (id, activate) => {
    setUsers(prev => prev.map(u => u.id===id ? {...u, pro:activate} : u));
    setMsg(activate ? `✅ تم تفعيل ${id}` : `❌ تم إيقاف ${id}`);
    setTimeout(()=>setMsg(""),3000);
  };

  const proCount = users.filter(u=>u.pro&&u.role!=="admin").length;
  const totalCount = users.filter(u=>u.role!=="admin").length;

  return (
    <div style={{padding:"0 4px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {[
          {label:t.activeUsers, value:proCount, color:"#00e676"},
          {label:t.totalUsers,  value:totalCount, color:"#00e5ff"},
        ].map((s,i)=>(
          <div key={i} style={{background:"#0d2137",borderRadius:12,padding:"16px",textAlign:"center",border:`1px solid ${s.color}22`}}>
            <div style={{fontSize:32,fontWeight:900,color:s.color}}>{s.value}</div>
            <div style={{fontSize:11,color:"#6b8fa8",marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Activate by ID */}
      <div style={{background:"#0d2137",borderRadius:12,padding:16,marginBottom:16,border:"1px solid rgba(0,229,255,0.15)"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#00e5ff",marginBottom:10}}>➕ {t.addPro}</div>
        <div style={{display:"flex",gap:8}}>
          <input value={inputId} onChange={e=>setInputId(e.target.value.toUpperCase())}
            placeholder={t.userId}
            style={{flex:1,background:"#061420",border:"1px solid rgba(0,229,255,0.2)",
              borderRadius:8,padding:"8px 12px",color:"#e0f4ff",fontFamily:"Cairo,sans-serif",fontSize:13}}/>
          <button onClick={()=>{toggle(inputId,true);setInputId("");}}
            style={{background:"rgba(0,230,118,0.15)",border:"1px solid #00e676",
              borderRadius:8,padding:"8px 16px",color:"#00e676",fontFamily:"Cairo,sans-serif",
              fontWeight:700,cursor:"pointer",fontSize:13}}>
            {t.activate}
          </button>
        </div>
        {msg && <div style={{marginTop:8,fontSize:12,color:"#00e676"}}>{msg}</div>}
      </div>

      {/* Users list */}
      <div style={{fontSize:12,color:"#6b8fa8",fontWeight:600,marginBottom:8,letterSpacing:1}}>▸ {t.users}</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {users.filter(u=>u.role!=="admin").map(u=>(
          <div key={u.id} style={{
            background:"#0d2137",borderRadius:10,padding:"12px 14px",
            display:"flex",justifyContent:"space-between",alignItems:"center",
            border:`1px solid ${u.pro?"rgba(0,230,118,0.2)":"rgba(255,255,255,0.05)"}`
          }}>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>{u.username}
                <span style={{marginRight:8,fontSize:11,color:"#6b8fa8"}}> {u.id}</span>
              </div>
              <div style={{fontSize:11,marginTop:3,color:u.pro?"#00e676":"#6b8fa8"}}>
                {u.pro ? t.pro : t.free}
              </div>
            </div>
            <button onClick={()=>toggle(u.id,!u.pro)}
              style={{
                background:u.pro?"rgba(255,77,109,0.12)":"rgba(0,230,118,0.12)",
                border:`1px solid ${u.pro?"#ff4d6d":"#00e676"}`,
                borderRadius:8,padding:"6px 12px",
                color:u.pro?"#ff4d6d":"#00e676",
                fontFamily:"Cairo,sans-serif",fontWeight:700,cursor:"pointer",fontSize:11
              }}>
              {u.pro ? t.revokePro : t.addPro}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  AI CHAT ASSISTANT
// ══════════════════════════════════════════════════════
function AIChat({ lang, isRtl }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(false);

  const tTitle = lang === "ar" ? "المساعد الذكي" : lang === "fr" ? "Assistant IA" : "AI Assistant";
  const tPh = lang === "ar" ? "اسأل عن الصيد..." : lang === "fr" ? "Demandez..." : "Ask...";

  const send = async () => {
    if(!inp.trim()) return;
    const userMsg = { role:"user", text:inp };
    setMsgs(p=>[...p, userMsg]);
    setInp(""); setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/chat`, { message: userMsg.text, language: lang });
      setMsgs(p=>[...p, { role:"ai", text:res.data.response }]);
    } catch(err) {
      setMsgs(p=>[...p, { role:"ai", text:"⚠️ Error connecting to AI." }]);
    }
    setLoading(false);
  };

  if(!open) return (
    <button onClick={()=>setOpen(true)}
      style={{position:"fixed",bottom:20,right:isRtl?20:"auto",left:isRtl?"auto":20,
        width:56,height:56,borderRadius:28,background:"linear-gradient(135deg,#00e676,#00b259)",
        color:"#061420",display:"flex",alignItems:"center",justifyContent:"center",
        border:"none",cursor:"pointer",boxShadow:"0 4px 12px rgba(0,230,118,0.3)",zIndex:999}}>
      <MessageCircle size={28} />
    </button>
  );

  return (
    <div style={{position:"fixed",bottom:20,right:isRtl?20:"auto",left:isRtl?"auto":20,
      width:320,height:450,background:"#0a1628",border:"1px solid rgba(0,229,255,0.2)",
      borderRadius:16,display:"flex",flexDirection:"column",boxShadow:"0 8px 24px rgba(0,0,0,0.5)",
      zIndex:999,direction:isRtl?"rtl":"ltr",fontFamily:"Cairo,sans-serif"}}>
      <div style={{padding:"12px 16px",background:"#0d2137",borderBottom:"1px solid rgba(0,229,255,0.1)",
        display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"16px 16px 0 0"}}>
        <span style={{fontWeight:700,color:"#00e5ff",display:"flex",alignItems:"center",gap:6}}>
          <MessageCircle size={18} /> {tTitle}
        </span>
        <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:"#6b8fa8",cursor:"pointer"}}><X size={20}/></button>
      </div>
      <div style={{flex:1,padding:16,overflowY:"auto",display:"flex",flexDirection:"column",gap:12}}>
        {msgs.length===0 && (
          <div style={{textAlign:"center",color:"#6b8fa8",fontSize:13,marginTop:20}}>
            {lang==="ar"?"مرحباً! أنا مساعدك الذكي للصيد. كيف يمكنني مساعدتك؟"
            :lang==="fr"?"Bonjour! Je suis votre assistant de pêche. Comment puis-je vous aider?"
            :"Hello! I'm your fishing AI assistant. How can I help?"}
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} style={{alignSelf:m.role==="user"?"flex-end":"flex-start",
            maxWidth:"85%",background:m.role==="user"?"#00e5ff22":"#1e3246",
            padding:"8px 12px",borderRadius:m.role==="user"?"12px 12px 0 12px":"12px 12px 12px 0",
            color:"#e0f4ff",fontSize:13,lineHeight:1.5}}>
            {m.text}
          </div>
        ))}
        {loading && <div style={{color:"#6b8fa8",fontSize:12}}>...</div>}
      </div>
      <div style={{padding:12,borderTop:"1px solid rgba(0,229,255,0.1)",display:"flex",gap:8}}>
        <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder={tPh}
          style={{flex:1,background:"#061420",border:"1px solid rgba(0,229,255,0.2)",
            borderRadius:20,padding:"8px 12px",color:"#e0f4ff",fontSize:13,outline:"none"}}/>
        <button onClick={send} disabled={loading}
          style={{background:"#00e5ff",color:"#061420",border:"none",width:36,height:36,
            borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════
export default function App() {
  const [lang, setLang] = useState("ar");
  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({username:"",password:""});
  const [loginErr, setLoginErr] = useState("");
  const [tab, setTab] = useState("map"); // map | admin
  const [fishKey, setFishKey] = useState("all");
  const [zones, setZones] = useState([]);
  const [selected, setSelected] = useState(-1);
  const [envData, setEnvData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");

  const t = LANGS[lang];
  const isRtl = lang === "ar";
  const isPro = currentUser?.pro || false;
  const isAdmin = currentUser?.role === "admin";
  const fish = FISH_TYPES[fishKey];

  const loadData = useCallback(async () => {
    setLoading(true); setSelected(-1);
    try {
      const res = await axios.get(`${API_URL}/api/marine-data?lat=35.1&lng=-1.8`);
      const { temp, wind, chloro, current, wave_height } = res.data;
      
      const moon = getMoon(moonPhase());
      const fish = fishKey !== "all" ? FISH_TYPES[fishKey] : null;
      const w = fish?.weights || {temp:0.30,chloro:0.35,wind:0.15,current:0.10,moon:0.10};
      const tRange = fish?.tempRange || [18,26];
      const cMin = fish?.chloroMin || 0.35;

      const tScore = temp>=tRange[0]&&temp<=tRange[1]?1.0:temp>=(tRange[0]-2)?0.65:0.25;
      const cScore = chloro>=cMin?1.0:chloro>=(cMin-0.2)?0.6:0.2;
      const wScore = wind>=5&&wind<=15?0.9:wind<5?0.6:wind<=20?0.5:0.1;
      const cuScore = current>=0.1&&current<=0.25?0.9:current<0.1?0.5:0.65;

      const score = Math.round((tScore*w.temp+cScore*w.chloro+wScore*w.wind+cuScore*w.current+moon.score*w.moon)*100);
      const env = { temp, chloro, wind, current, wave_height, moon, score };
      
      setEnvData(env);
      const zData = ZONES.map(z=>({
        ...z,
        prob: Math.min(0.97,Math.max(0.05,z.base*(env.score/100)+Math.random()*0.14-0.06))
      })).sort((a,b)=>b.prob-a.prob);
      setZones(zData);
    } catch (err) {
      console.error(err);
      // Fallback
      const env = generateEnvData(fishKey);
      setEnvData(env);
      const zData = ZONES.map(z=>({
        ...z,
        prob: Math.min(0.97,Math.max(0.05,z.base*(env.score/100)+Math.random()*0.14-0.06))
      })).sort((a,b)=>b.prob-a.prob);
      setZones(zData);
    }
    setLastUpdate(new Date().toLocaleTimeString(lang==="ar"?"ar":"fr"));
    setLoading(false);
  }, [fishKey, lang]);

  useEffect(()=>{ if(currentUser) loadData(); },[currentUser,fishKey]);

  const handleLogin = () => {
    const u = users.find(x=>x.username===loginForm.username&&x.password===loginForm.password);
    if(u){ setCurrentUser(u); setLoginErr(""); setLoginForm({username:"",password:""}); }
    else setLoginErr(t.wrongPass);
  };

  const scoreColor = s => s>=75?"#00e676":s>=55?"#f0c040":s>=35?"#ff9800":"#ff4d6d";
  const scoreLabel = s => s>=75?(lang==="ar"?"احتمالية عالية 🎯":lang==="fr"?"Très probable 🎯":"Very likely 🎯")
    :s>=55?(lang==="ar"?"احتمالية جيدة":lang==="fr"?"Probable":"Likely")
    :s>=35?(lang==="ar"?"متوسطة":lang==="fr"?"Moyen":"Moderate")
    :(lang==="ar"?"منخفضة":lang==="fr"?"Faible":"Low");

  // ── LOGIN SCREEN ──
  if(!currentUser) return (
    <div style={{minHeight:"100vh",background:"#061420",display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"Cairo,sans-serif",direction:isRtl?"rtl":"ltr",padding:16}}>
      <div style={{width:"100%",maxWidth:360}}>
        {/* Lang switcher */}
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:24}}>
          {["ar","fr","en"].map(l=>(
            <button key={l} onClick={()=>setLang(l)}
              style={{padding:"4px 12px",borderRadius:20,border:"1px solid rgba(0,229,255,0.3)",
                background:lang===l?"rgba(0,229,255,0.15)":"transparent",
                color:lang===l?"#00e5ff":"#6b8fa8",cursor:"pointer",
                fontFamily:"Cairo,sans-serif",fontSize:12,fontWeight:700}}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:56,marginBottom:8,filter:"drop-shadow(0 0 12px #f0c040)"}}>🐟</div>
          <h1 style={{fontSize:30,fontWeight:900,color:"#00e5ff",margin:0,
            textShadow:"0 0 20px rgba(0,229,255,0.3)"}}>{t.appName}</h1>
          <div style={{fontSize:13,color:"#6b8fa8",marginTop:6}}>{t.tagline}</div>
        </div>

        <div style={{background:"#0d2137",borderRadius:16,padding:24,
          border:"1px solid rgba(0,229,255,0.15)"}}>
          {[
            {key:"username",placeholder:t.username,type:"text"},
            {key:"password",placeholder:t.password,type:"password"},
          ].map(f=>(
            <input key={f.key} type={f.type} placeholder={f.placeholder}
              value={loginForm[f.key]}
              onChange={e=>setLoginForm(p=>({...p,[f.key]:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              style={{display:"block",width:"100%",marginBottom:12,
                background:"#061420",border:"1px solid rgba(0,229,255,0.2)",
                borderRadius:10,padding:"12px 14px",color:"#e0f4ff",
                fontFamily:"Cairo,sans-serif",fontSize:14,boxSizing:"border-box"}}/>
          ))}
          {loginErr && <div style={{color:"#ff4d6d",fontSize:12,marginBottom:10,textAlign:"center"}}>{loginErr}</div>}
          <button onClick={handleLogin} style={{
            width:"100%",padding:"13px",background:"linear-gradient(135deg,#0e3a5c,rgba(0,229,255,0.2))",
            border:"1px solid rgba(0,229,255,0.35)",borderRadius:12,
            color:"#00e5ff",fontFamily:"Cairo,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer"}}>
            {t.loginBtn}
          </button>
          <div style={{marginTop:14,fontSize:11,color:"#6b8fa8",textAlign:"center",lineHeight:1.8}}>
            demo: admin/admin123 · yassine/fish2024 · khalid/khalid123
          </div>
        </div>
      </div>
    </div>
  );

  // ── MAIN APP ──
  const selZone = selected>=0?zones[selected]:null;
  const sc = envData?.score||0;

  return (
    <div style={{minHeight:"100vh",background:"#061420",color:"#e0f4ff",
      fontFamily:"Cairo,sans-serif",direction:isRtl?"rtl":"ltr"}}>

      {/* TOP BAR */}
      <div style={{background:"#0a1628",borderBottom:"1px solid rgba(0,229,255,0.12)",
        padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22,filter:"drop-shadow(0 0 6px #f0c040)"}}>🐟</span>
          <span style={{fontSize:16,fontWeight:900,color:"#00e5ff"}}>{t.appName}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* Lang */}
          <select value={lang} onChange={e=>setLang(e.target.value)}
            style={{background:"#0d2137",border:"1px solid rgba(0,229,255,0.2)",
              borderRadius:8,padding:"4px 8px",color:"#00e5ff",
              fontFamily:"Cairo,sans-serif",fontSize:12,cursor:"pointer"}}>
            <option value="ar">AR</option>
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
          {/* Role badge */}
          <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
            background:isAdmin?"rgba(255,152,0,0.15)":isPro?"rgba(0,230,118,0.12)":"rgba(0,229,255,0.08)",
            color:isAdmin?"#ff9800":isPro?"#00e676":"#00e5ff"}}>
            {isAdmin?t.admin:isPro?t.pro:t.free}
          </span>
          <button onClick={()=>{setCurrentUser(null);setTab("map");}}
            style={{background:"rgba(255,77,109,0.1)",border:"1px solid rgba(255,77,109,0.3)",
              borderRadius:8,padding:"4px 10px",color:"#ff4d6d",
              fontFamily:"Cairo,sans-serif",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            {t.logout}
          </button>
        </div>
      </div>

      <div style={{maxWidth:860,margin:"0 auto",padding:"16px 14px"}}>

        {/* TABS (admin only) */}
        {isAdmin && (
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            {["map","admin"].map(tb=>(
              <button key={tb} onClick={()=>setTab(tb)}
                style={{padding:"8px 20px",borderRadius:10,fontFamily:"Cairo,sans-serif",
                  fontWeight:700,fontSize:13,cursor:"pointer",
                  background:tab===tb?"rgba(0,229,255,0.15)":"transparent",
                  border:`1px solid ${tab===tb?"rgba(0,229,255,0.4)":"rgba(255,255,255,0.08)"}`,
                  color:tab===tb?"#00e5ff":"#6b8fa8"}}>
                {tb==="map"?"🗺️ "+t.mapTitle:"🔧 "+t.adminPanel}
              </button>
            ))}
          </div>
        )}

        {tab==="admin" && isAdmin
          ? <AdminPanel users={users} setUsers={setUsers} t={t} lang={lang}/>
          : (
          <>
            {/* FISH SELECTOR */}
            <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
              {Object.entries(FISH_TYPES).map(([k,f])=>(
                <button key={k} onClick={()=>setFishKey(k)}
                  style={{flexShrink:0,padding:"8px 16px",borderRadius:24,
                    fontFamily:"Cairo,sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",
                    background:fishKey===k?`${f.color}22`:"transparent",
                    border:`1.5px solid ${fishKey===k?f.color:"rgba(255,255,255,0.1)"}`,
                    color:fishKey===k?f.color:"#6b8fa8",transition:"all .2s"}}>
                  {f.icon} {f[lang]}
                </button>
              ))}
            </div>

            {/* Fish info bar (if specific fish selected) */}
            {fishKey!=="all" && fish && (
              <div style={{background:"#0d2137",borderRadius:12,padding:"12px 16px",
                marginBottom:16,border:`1px solid ${fish.color}33`,
                display:"flex",gap:16,flexWrap:"wrap"}}>
                {[
                  {label:t.season, val:fish.season[lang]},
                  {label:t.bestTime, val:fish.bestTime[lang]},
                  {label:t.bestDepth, val:fish.bestDepth[lang]},
                ].map((item,i)=>(
                  <div key={i}>
                    <div style={{fontSize:10,color:"#6b8fa8",marginBottom:2}}>{item.label}</div>
                    <div style={{fontSize:13,fontWeight:700,color:fish.color}}>{item.val}</div>
                  </div>
                ))}
              </div>
            )}

            {loading ? (
              <div style={{textAlign:"center",padding:48,color:"#6b8fa8"}}>
                <div style={{width:32,height:32,border:"3px solid rgba(0,229,255,0.15)",
                  borderTopColor:"#00e5ff",borderRadius:"50%",
                  animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>
                <div style={{fontSize:13}}>جاري تحليل البيانات...</div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : envData && (
              <>
                {/* SCORE */}
                <div style={{background:"linear-gradient(135deg,#0d2137,#0e3a5c)",
                  border:`1px solid ${scoreColor(sc)}33`,borderRadius:16,
                  padding:"20px 24px",textAlign:"center",marginBottom:16}}>
                  <div style={{fontSize:11,color:"#6b8fa8",letterSpacing:2,marginBottom:6}}>
                    {fish?.icon||"🐠"} {t.probLabel} — {fish?.[lang]||t.allFish}
                  </div>
                  <div style={{fontSize:64,fontWeight:900,color:scoreColor(sc),lineHeight:1,marginBottom:4}}>
                    {sc}%
                  </div>
                  <div style={{fontSize:16,fontWeight:700,marginBottom:12}}>{scoreLabel(sc)}</div>
                  <div style={{height:6,background:"rgba(255,255,255,0.07)",borderRadius:3,
                    maxWidth:260,margin:"0 auto",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${sc}%`,borderRadius:3,
                      background:`linear-gradient(90deg,${scoreColor(sc)}66,${scoreColor(sc)})`,
                      transition:"width 1s"}}/>
                  </div>
                </div>

                {/* ENV FACTORS */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                  {[
                    {icon:"🌡️",val:`${envData.temp.toFixed(1)}°م`,
                      ok:envData.temp>=(fishKey!=="all"?fish?.tempRange[0]:18)},
                    {icon:"🌊",val:`${envData.wave_height?.toFixed(1) || 1.0}m`,
                      ok:envData.wave_height<=1.5},
                    {icon:"💨",val:`${envData.wind.toFixed(1)} kn`,
                      ok:envData.wind>=5&&envData.wind<=15},
                    {icon:"🌙",val:envData.moon.icon, ok:envData.moon.score>=0.65},
                  ].map((f,i)=>(
                    <div key={i} style={{background:"#0d2137",borderRadius:10,padding:"12px 14px",
                      border:`1px solid ${f.ok?"rgba(0,230,118,0.25)":"rgba(255,77,109,0.2)"}`}}>
                      <span style={{fontSize:18}}>{f.icon}</span>
                      <div style={{fontSize:16,fontWeight:900,margin:"4px 0"}}>{f.val}</div>
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
                        background:f.ok?"rgba(0,230,118,0.12)":"rgba(255,77,109,0.12)",
                        color:f.ok?"#00e676":"#ff4d6d"}}>
                        {f.ok?"✓":"✗"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* MAP */}
                <div style={{marginBottom:16,borderRadius:14,overflow:"hidden",
                  border:"1px solid rgba(0,229,255,0.18)"}}>
                  <div style={{background:"#0d2137",padding:"10px 16px",
                    display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#00e5ff"}}>
                      🗺️ {t.mapTitle}
                    </span>
                    <div style={{display:"flex",gap:10,fontSize:11,fontWeight:700}}>
                      <span style={{color:"#00e676"}}>● {t.high}</span>
                      <span style={{color:"#f0c040"}}>● {t.medium}</span>
                      <span style={{color:"#ff4d6d"}}>● {t.low}</span>
                      {!isPro&&<span style={{color:"#6b8fa8"}}>🔒 Pro</span>}
                    </div>
                  </div>

                  <OceanMap zones={zones} selected={selected} onSelect={setSelected}
                    isPro={isPro} lang={lang} fishColor={fishKey!=="all"?fish?.color:null}/>

                  {/* Zone detail */}
                  {selZone && (
                    <div style={{background:"#0d2137",
                      borderTop:`2px solid ${probColor(selZone.prob).s}`,
                      padding:"12px 16px",display:"flex",
                      justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,
                          color:probColor(selZone.prob).s}}>{selZone.name[lang]}</div>
                        <div style={{fontSize:11,color:"#6b8fa8",marginTop:2}}>
                          📍 {selZone.lat.toFixed(2)}°N · {Math.abs(selZone.lng).toFixed(2)}°W &nbsp;|&nbsp;
                          ⚓ {selZone.dist[lang]}
                          {fishKey!=="all"&&<span> · {fish.bestTime[lang]}</span>}
                        </div>
                      </div>
                      <div style={{fontSize:30,fontWeight:900,color:probColor(selZone.prob).s}}>
                        {Math.round(selZone.prob*100)}%
                      </div>
                    </div>
                  )}

                  <div style={{background:"#0d2137",padding:"7px 16px",
                    fontSize:11,color:"#6b8fa8",textAlign:"center",
                    borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                    {t.clickZone}
                    {!isPro&&<span style={{color:"rgba(240,192,64,0.7)"}}> · {t.noAccess}</span>}
                  </div>
                </div>

                {/* FREE user upgrade banner */}
                {!isPro && (
                  <div style={{background:"linear-gradient(135deg,rgba(240,192,64,0.08),rgba(0,230,118,0.05))",
                    border:"1px solid rgba(240,192,64,0.3)",borderRadius:12,
                    padding:"14px 18px",marginBottom:16,textAlign:"center"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#f0c040",marginBottom:6}}>
                      ⭐ {t.proOnly}
                    </div>
                    <div style={{fontSize:12,color:"#6b8fa8"}}>
                      {lang==="ar"?"تواصل معنا للاشتراك والحصول على كامل البيانات"
                        :lang==="fr"?"Contactez-nous pour vous abonner"
                        :"Contact us to subscribe for full access"}
                    </div>
                  </div>
                )}

                {/* ZONES LIST */}
                <div style={{fontSize:11,color:"#6b8fa8",fontWeight:600,marginBottom:8,letterSpacing:1}}>
                  ▸ {lang==="ar"?"المناطق حسب الاحتمالية":lang==="fr"?"Zones par probabilité":"Zones by probability"}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
                  {zones.map((z,i)=>{
                    const locked = !isPro && z.type!=="coastal";
                    const pct = Math.round(z.prob*100);
                    const col = probColor(z.prob);
                    return (
                      <div key={z.id} onClick={()=>!locked&&setSelected(i===selected?-1:i)}
                        style={{background:selected===i?"rgba(0,229,255,0.05)":"#0d2137",
                          borderRadius:10,padding:"10px 14px",
                          display:"flex",justifyContent:"space-between",alignItems:"center",
                          borderRight:`3px solid ${locked?"#2a3f55":col.s}`,
                          cursor:locked?"not-allowed":"pointer",opacity:locked?0.5:1}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:13}}>
                            {locked?"🔒 ":""}{z.name[lang]}
                          </div>
                          <div style={{fontSize:10,color:"#6b8fa8",marginTop:2}}>
                            {z.dist[lang]} · {z.type}
                          </div>
                        </div>
                        <div style={{fontSize:20,fontWeight:900,color:locked?"#2a3f55":col.s}}>
                          {locked?"??%":`${pct}%`}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button onClick={loadData}
                  style={{display:"block",width:"100%",padding:"13px",
                    background:"linear-gradient(135deg,#0e3a5c,rgba(0,229,255,0.15))",
                    border:"1px solid rgba(0,229,255,0.3)",borderRadius:12,
                    color:"#00e5ff",fontFamily:"Cairo,sans-serif",fontSize:14,fontWeight:700,
                    cursor:"pointer",marginBottom:8}}>
                  🔄 {t.refresh}
                </button>
                <div style={{textAlign:"center",fontSize:11,color:"#6b8fa8"}}>
                  {t.lastUpdate}: {lastUpdate}
                </div>
              </>
            )}
          </>
        )}
      </div>
      <AIChat lang={lang} isRtl={isRtl} />
    </div>
  );
}
