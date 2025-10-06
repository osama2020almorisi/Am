// Lightweight IndexedDB wrapper with LocalStorage fallback + scheduler for automatic notifications
const DB = (function(){
  const DBNAME = 'aman_travel_db_v1';
  const VERSION = 1;
  const stores = ['clients','flights','visas','workvisas','notifications','activity'];
  let db = null;

  function openDB(){
    return new Promise((res,rej)=>{
      const req = indexedDB.open(DBNAME, VERSION);
      req.onupgradeneeded = e=>{
        db = e.target.result;
        stores.forEach(s=>{ if(!db.objectStoreNames.contains(s)) db.createObjectStore(s,{keyPath:'id'}); });
      };
      req.onsuccess = e=>{ db = e.target.result; res(); };
      req.onerror = e=>{ console.warn('IndexedDB failed, using LocalStorage fallback'); db = null; res(); };
    });
  }

  async function init(){ await openDB(); // start scheduler after DB ready
    startScheduler();
  }

  // Scheduler: checks visas and flights and creates notifications automatically
  async function startScheduler(){
    try{
      await checkAndCreateExpiryNotifications();
      // run every hour while page open
      setInterval(checkAndCreateExpiryNotifications, 1000*60*60);
    }catch(e){ console.error('Scheduler error', e); }
  }

  function daysBetween(dateStr){
    if(!dateStr) return null;
    const d = new Date(dateStr);
    const today = new Date();
    // clear time
    d.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diff = Math.ceil((d - today) / (1000*60*60*24));
    return diff;
  }

  // create a notification if similar one doesn't exist recently
  async function createNotificationOnce(obj){
    // obj: {id, text, when, type, relatedStore, relatedId, meta}
    const nots = await DB.getAll('notifications');
    // avoid duplicates: same relatedId + type + when
    const exists = nots.find(n=> n.relatedId===obj.relatedId && n.type===obj.type && n.when===obj.when);
    if(exists) return;
    await DB.add('notifications', obj);
    await DB.add('activity', {when:new Date().toLocaleString(), text:`نظام: إشعار ${obj.type} => ${obj.text}`});
  }

  async function checkAndCreateExpiryNotifications(){
    // thresholds: 2,7,30 days
    const thresholds = [2,7,30];
    // visas
    const visas = await DB.getAll('visas');
    for(const v of visas){
      const d = daysBetween(v.expiry);
      if(d===null) continue;
      for(const t of thresholds){
        if(d===t){
          const when = new Date().toISOString();
          const obj = {
            id: 'notif_' + Date.now().toString() + Math.random().toString(36).slice(2,6),
            text: `تأشيرة للعميل ${v.client} ستنتهي بعد ${t} يوم${t>1?'':' '}`,
            when: when,
            type: 'visa_expiry',
            relatedStore: 'visas',
            relatedId: v.id,
            meta: {expiry:v.expiry, days:d}
          };
          await createNotificationOnce(obj);
        }
      }
    }
    // flights - upcoming departure or return
    const flights = await DB.getAll('flights');
    for(const f of flights){
      const d = daysBetween(f.date);
      if(d===null) continue;
      for(const t of thresholds){
        if(d===t){
          const when = new Date().toISOString();
          const obj = {
            id: 'notif_' + Date.now().toString() + Math.random().toString(36).slice(2,6),
            text: `رحلة ${f.flightNo || ''} للعميل ${f.client || ''} ستبدأ بعد ${t} يوم`,
            when: when,
            type: 'flight_upcoming',
            relatedStore: 'flights',
            relatedId: f.id,
            meta: {date:f.date, days:d}
          };
          await createNotificationOnce(obj);
        }
      }
    }
  }

  return {
    init,
    add: async (storeName, obj)=> {
      if(!db){
        const key='ls_'+storeName; const arr=JSON.parse(localStorage.getItem(key)||'[]'); arr.push(obj); localStorage.setItem(key,JSON.stringify(arr)); return;
      }
      return new Promise((res,rej)=>{ const tx=db.transaction(storeName,'readwrite'); const st=tx.objectStore(storeName); const r=st.add(obj); r.onsuccess=()=>res(); r.onerror=err=>rej(err); });
    },
    getAll: async (storeName)=> {
      if(!db){ const arr=JSON.parse(localStorage.getItem('ls_'+storeName)||'[]'); return arr; }
      return new Promise((res,rej)=>{ const tx=db.transaction(storeName,'readonly'); const st=tx.objectStore(storeName); const r=st.getAll(); r.onsuccess=()=>res(r.result); r.onerror=err=>rej(err); });
    },
    delete: async (storeName, id)=> {
      if(!db){ const key='ls_'+storeName; let arr=JSON.parse(localStorage.getItem(key)||'[]'); arr=arr.filter(x=>x.id!==id); localStorage.setItem(key,JSON.stringify(arr)); return; }
      return new Promise((res,rej)=>{ const tx=db.transaction(storeName,'readwrite'); const st=tx.objectStore(storeName); const r=st.delete(id); r.onsuccess=()=>res(); r.onerror=err=>rej(err); });
    },
    count: async (storeName)=> {
      if(!db){ const arr=JSON.parse(localStorage.getItem('ls_'+storeName)||'[]'); return arr.length; }
      return new Promise((res,rej)=>{ const tx=db.transaction(storeName,'readonly'); const st=tx.objectStore(storeName); const r=st.count(); r.onsuccess=()=>res(r.result); r.onerror=err=>rej(err); });
    },
    // JSON export/import helpers
    exportJSON: async function(){
      const all = {};
      for(const s of ['clients','flights','visas','workvisas','notifications','activity']){
        all[s] = await this.getAll(s);
      }
      return JSON.stringify({ exportedAt: new Date().toISOString(), data: all }, null, 2);
    },
    importJSON: async function(jsonStr, options={merge:true}){
      const parsed = JSON.parse(jsonStr);
      const data = parsed.data || parsed;
      for(const [storeName, arr] of Object.entries(data)){
        if(!Array.isArray(arr)) continue;
        for(const row of arr){
          // ensure id
          row.id = row.id || (Date.now().toString() + Math.random().toString(36).slice(2,6));
          await this.add(storeName, row);
        }
      }
    }
  };
})();
