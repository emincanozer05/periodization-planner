/* =========================================================
   KAYIT BAZLI SENKRON — EŞLEME (senkron Faz 2, docs/veri-modeli.md)
   =========================================================
   smToDocs(data)  → { yol: belge }   bugünkü tek JSON'u belgelere böler
   smFromDocs(docs)→ data             belgelerden aynı JSON'u geri kurar
   smCheckDocs(docs)                  Firestore'a yazılabilir mi (boyut, iç içe dizi, ayrılmış ad)

   Bu parça SAF: ağ yok, React yok, global durum yok. Uygulama henüz kullanmıyor; uyumluluk
   katmanı (Faz 2'nin devamı) ve taşıma aracı (Faz 3) bunun üstüne kurulacak.
   store-map-test.js gidiş-dönüşün BİREBİR aynı olduğunu sınar: smFromDocs(smToDocs(d)) ≡ d.

   Yollar çalışma alanına göredir: '' = workspaces/{ws} belgesinin kendisi,
   'teams/T1/athletes/a1' = workspaces/{ws}/teams/T1/athletes/a1.

   Sağlamlık kuralları:
   • Bir dizi ancak BÜTÜN elemanları geçerli ve benzersiz bir kimlik taşıyorsa belgelere bölünür;
     değilse olduğu gibi üst belgede kalır (hiçbir şey kaybolmaz, yalnızca bölünmemiş olur).
   • Sıra `_o` alanıyla korunur; geri kurarken `_o` silinir.
   • Firestore dizi içinde dizi kabul etmez: iç diziler {_arr:[…]} olarak sarılır, geri açılır.
   • Cihaza ait alan (activeTeamId) yazılmaz; geri kurarken çağıran verir. */

/* <store-map> — store-map-test.js bu bölümü Node'da aynen çalıştırır; yalnızca düz JavaScript. */
var SM_VERSION=2;
var SM_WS_COLS=['exercises','templates','customTests','tryouts','researches'];
var SM_ATH_SUBS=['tests','injuries','measurements'];
var SM_ATH_LOGS={srpeLog:'srpe',wellness:'wellness',nightLog:'night',liftLog:'lift'};
var SM_DOC_LIMIT=900*1024;   // Firestore sınırı 1 MiB; pay bırakılır

function smValidId(id){
  return typeof id==='string'&&id.length>0&&id.length<=200&&id.indexOf('/')<0
    &&id!=='.'&&id!=='..'&&!/^__.*__$/.test(id);
}
/* Dizi bölünebilir mi: her eleman nesne, kimliği geçerli ve benzersiz. */
function smSplittable(arr){
  if(!Array.isArray(arr))return false;
  var seen={};
  for(var i=0;i<arr.length;i++){
    var x=arr[i];
    if(!x||typeof x!=='object'||Array.isArray(x)||!smValidId(x.id)||seen[x.id])return false;
    seen[x.id]=1;
  }
  return true;
}
function smOmit(o,keys){
  var r={};for(var k in o){if(Object.prototype.hasOwnProperty.call(o,k)&&keys.indexOf(k)<0)r[k]=o[k];}
  return r;
}
/* İç içe diziler: [[1,2]] → [{_arr:[1,2]}] ve geri. */
function smEnc(v){
  if(Array.isArray(v))return v.map(function(x){return Array.isArray(x)?{_arr:smEnc(x)}:smEnc(x);});
  if(v&&typeof v==='object'){var r={};for(var k in v)r[k]=smEnc(v[k]);return r;}
  return v;
}
function smDec(v){
  if(Array.isArray(v))return v.map(function(x){
    return x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===1&&Array.isArray(x._arr)?smDec(x._arr):smDec(x);});
  if(v&&typeof v==='object'){var r={};for(var k in v)r[k]=smDec(v[k]);return r;}
  return v;
}
function smMonth(date){return typeof date==='string'&&/^\d{4}-\d{2}/.test(date)?date.slice(0,7):'nodate';}

/* ── data → belgeler ─────────────────────────────────────────────────────── */
function smToDocs(data){
  var out={};
  var put=function(path,doc){out[path]=smEnc(doc);};
  var ws=smOmit(data,['activeTeamId','teams'].concat(SM_WS_COLS));
  ws.schemaVersion=SM_VERSION;
  var split=[];
  SM_WS_COLS.forEach(function(c){
    if(!(c in data))return;
    if(smSplittable(data[c])){split.push(c);data[c].forEach(function(x,i){put(c+'/'+x.id,Object.assign({},x,{_o:i}));});}
    else ws[c]=data[c];
  });
  ws._split=split;
  if('teams' in data){
    if(smSplittable(data.teams)){
      ws._teams=data.teams.map(function(t){return t.id;});
      data.teams.forEach(function(t){smTeamToDocs(t,'teams/'+t.id,put);});
    }else ws.teams=data.teams;
  }
  put('',ws);
  return out;
}

/* Bir sezonun günleri: her gün bir belge; seanslar kimlikleri uygunsa ayrı belge.
   Günlerden biri bile belge olamıyorsa (geçersiz anahtar, nesne değil) false döner ve
   çağıran o günleri olduğu gibi üst belgede tutar. */
function smDaysSplittable(days){
  if(!days||typeof days!=='object'||Array.isArray(days))return false;
  return Object.keys(days).every(function(dk){var d=days[dk];return smValidId(dk)&&d&&typeof d==='object'&&!Array.isArray(d);});
}
function smDaysToDocs(days,base,season,used,put){
  Object.keys(days).forEach(function(dk){
    var day=days[dk];
    var ses=day.sessions;
    var ok=smSplittable(ses)&&ses.every(function(s){return !used[s.id];});
    var dd=Object.assign({},ok?smOmit(day,['sessions']):day,{_key:dk,_season:season});
    if(ok){
      dd._sessions=true;
      ses.forEach(function(s,i){used[s.id]=1;put(base+'/sessions/'+s.id,Object.assign({},s,{_date:dk,_season:season,_o:i}));});
    }
    put(base+'/days/'+(season!=null?season+'_':'')+dk,dd);
  });
}

function smTeamToDocs(t,base,put){
  var td=smOmit(t,['athletes','days','setup','weekOverrides','seasonData']);
  var used={};
  var sid=t.activeSeasonId!=null?String(t.activeSeasonId):'_active';
  var seasons=[];
  if(smValidId(sid)){
    // aktif sezon: team.setup / team.weekOverrides / team.days
    var act={_active:true};
    if('setup'in t)act.setup=t.setup;
    if('weekOverrides'in t)act.weekOverrides=t.weekOverrides;
    if('days'in t){
      if(smDaysSplittable(t.days)){act._hasDays=true;smDaysToDocs(t.days,base,sid,used,put);}
      else act.days=t.days;
    }
    put(base+'/seasons/'+sid,act);seasons.push(sid);
  }else{
    ['setup','weekOverrides','days'].forEach(function(k){if(k in t)td[k]=t[k];});
  }
  // park edilmiş sezonlar (seçili olmayanlar)
  if('seasonData'in t){
    if(t.seasonData&&typeof t.seasonData==='object'&&!Array.isArray(t.seasonData)){
      var parked=[];
      Object.keys(t.seasonData).forEach(function(k){
        var sl=t.seasonData[k];parked.push(k);
        if(!smValidId(k)||k===sid||!sl||typeof sl!=='object'||Array.isArray(sl)){(td._seasonDataRaw=td._seasonDataRaw||{})[k]=sl;return;}
        var sd=smOmit(sl,['days']);
        if('days'in sl){
          if(smDaysSplittable(sl.days)){sd._hasDays=true;smDaysToDocs(sl.days,base,k,used,put);}
          else sd.days=sl.days;
        }
        put(base+'/seasons/'+k,sd);seasons.push(k);
      });
      td._parked=parked;
    }else td.seasonData=t.seasonData;
  }
  td._seasonDocs=seasons;
  // sporcular
  if('athletes'in t){
    if(smSplittable(t.athletes)){
      td._athletes=t.athletes.map(function(a){return a.id;});
      t.athletes.forEach(function(a,i){smAthleteToDocs(a,base+'/athletes/'+a.id,i,put);});
    }else td.athletes=t.athletes;
  }
  put(base,td);
}

function smAthleteToDocs(a,base,order,put){
  var ad=smOmit(a,SM_ATH_SUBS.concat(Object.keys(SM_ATH_LOGS),['days']));
  ad._o=order;ad._split=[];ad._logs=[];
  SM_ATH_SUBS.forEach(function(c){
    if(!(c in a))return;
    if(smSplittable(a[c])){ad._split.push(c);a[c].forEach(function(x,i){put(base+'/'+c+'/'+x.id,Object.assign({},x,{_o:i}));});}
    else ad[c]=a[c];
  });
  // günlük kayıtlar: ay kovası; kayıt anahtarı kimliği (yoksa sırası)
  var buckets={};
  Object.keys(SM_ATH_LOGS).forEach(function(c){
    if(!(c in a))return;
    var arr=a[c];
    if(!Array.isArray(arr)){ad[c]=arr;return;}
    ad._logs.push(c);
    var ids={};
    var keyed=arr.every(function(x){if(!x||typeof x!=='object'||Array.isArray(x)||!smValidId(x.id)||ids[x.id])return false;ids[x.id]=1;return true;});
    arr.forEach(function(x,i){
      var m=smMonth(x&&x.date);
      var b=buckets[m]||(buckets[m]={});
      var f=SM_ATH_LOGS[c];
      (b[f]||(b[f]={}))[keyed?'k_'+x.id:'i_'+i]={v:x,_o:i};
    });
  });
  Object.keys(buckets).forEach(function(m){put(base+'/logs/'+m,buckets[m]);});
  // sporcunun kendi takvimi
  if('days'in a){
    if(smDaysSplittable(a.days)){ad._hasDays=true;smDaysToDocs(a.days,base,null,{},put);}
    else ad.days=a.days;
  }
  put(base,ad);
}

/* ── belgeler → data ─────────────────────────────────────────────────────── */
function smFromDocs(docs){
  var D={};for(var p in docs)D[p]=smDec(docs[p]);
  var byPrefix=function(prefix){
    var r=[];var n=prefix.split('/').length+1;
    for(var p in D){if(p.indexOf(prefix+'/')===0&&p.split('/').length===n)r.push(p);}
    return r;
  };
  var ordered=function(paths){return paths.map(function(p){return D[p];}).sort(function(a,b){return (a._o||0)-(b._o||0);})
    .map(function(x){return smOmit(x,['_o']);});};
  var ws=D['']||{};
  var data=smOmit(ws,['schemaVersion','_split','_teams']);
  (ws._split||[]).forEach(function(c){data[c]=ordered(byPrefix(c));});
  if(ws._teams)data.teams=ws._teams.map(function(id){return smTeamFromDocs(D,'teams/'+id,byPrefix,ordered);});
  return data;
}

function smDaysFromDocs(D,base,season,byPrefix){
  var days={};
  var sessions=byPrefix(base+'/sessions').map(function(p){return D[p];});
  byPrefix(base+'/days').forEach(function(p){
    var d=D[p];
    if(d._season!==season)return;
    var day=smOmit(d,['_key','_season','_sessions']);
    if(d._sessions){
      day.sessions=sessions.filter(function(s){return s._date===d._key&&s._season===season;})
        .sort(function(a,b){return a._o-b._o;}).map(function(s){return smOmit(s,['_date','_season','_o']);});
    }
    days[d._key]=day;
  });
  return days;
}

function smTeamFromDocs(D,base,byPrefix,ordered){
  var td=D[base]||{};
  var t=smOmit(td,['_athletes','_seasonDocs','_parked','_seasonDataRaw']);
  var restore=function(s,sid){
    var o=smOmit(s,['_active','_hasDays']);
    if(s._hasDays)o.days=smDaysFromDocs(D,base,sid,byPrefix);
    return o;
  };
  (td._seasonDocs||[]).forEach(function(sid){
    var s=D[base+'/seasons/'+sid]||{};
    if(s._active){var o=restore(s,sid);for(var k in o)t[k]=o[k];}
  });
  if(td._parked){
    t.seasonData={};
    td._parked.forEach(function(k){
      t.seasonData[k]=td._seasonDataRaw&&k in td._seasonDataRaw?td._seasonDataRaw[k]:restore(D[base+'/seasons/'+k]||{},k);
    });
  }
  if(td._athletes)t.athletes=td._athletes.map(function(id){return smAthleteFromDocs(D,base+'/athletes/'+id,byPrefix,ordered);});
  return t;
}

function smAthleteFromDocs(D,base,byPrefix,ordered){
  var ad=D[base]||{};
  var a=smOmit(ad,['_o','_split','_logs','_hasDays']);
  (ad._split||[]).forEach(function(c){a[c]=ordered(byPrefix(base+'/'+c));});
  var buckets=byPrefix(base+'/logs').map(function(p){return D[p];});
  (ad._logs||[]).forEach(function(c){
    var f=SM_ATH_LOGS[c],rows=[];
    buckets.forEach(function(b){var m=b[f];if(m)for(var k in m)rows.push(m[k]);});
    a[c]=rows.sort(function(x,y){return x._o-y._o;}).map(function(r){return r.v;});
  });
  if(ad._hasDays)a.days=smDaysFromDocs(D,base,null,byPrefix);
  return a;
}

/* Alan sırasından bağımsız karşılaştırma için kanonik JSON (anahtarlar sıralı). */
function smCanon(v){
  if(Array.isArray(v))return '['+v.map(smCanon).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+smCanon(v[k]);}).join(',')+'}';
  return JSON.stringify(v);
}

/* ── yazılabilirlik denetimi (taşıma kuru çalıştırması bunu raporlar) ─────── */
function smCheckDocs(docs){
  var issues=[],sizes=[];
  var walk=function(v,path,inArr){
    if(Array.isArray(v)){if(inArr)issues.push({path:path,kind:'nested-array'});v.forEach(function(x,i){walk(x,path+'['+i+']',true);});return;}
    if(v===undefined){issues.push({path:path,kind:'undefined'});return;}
    if(typeof v==='number'&&!isFinite(v)&&!isNaN(v)){return;}
    if(v&&typeof v==='object'){for(var k in v){if(/^__.*__$/.test(k)||k==='')issues.push({path:path+'.'+k,kind:'reserved-key'});walk(v[k],path+'.'+k,false);}}
  };
  Object.keys(docs).forEach(function(p){
    var z=JSON.stringify(docs[p]).length;
    sizes.push([z,p]);
    if(z>SM_DOC_LIMIT)issues.push({path:p,kind:'too-large',bytes:z});
    walk(docs[p],p,false);
  });
  sizes.sort(function(a,b){return b[0]-a[0];});
  return{count:sizes.length,total:sizes.reduce(function(s,x){return s+x[0];},0),largest:sizes.slice(0,5),issues:issues};
}
/* </store-map> */

/* Senkron tanı penceresindeki "Yeni yapı ön kontrolü": belge sayısı, en büyük belgeler,
   sorunlar. Kişisel veri içermez: belge yollarındaki kimlikler '*' ile gizlenir. */
function smPreflightReport(state){
  const data=stripDeviceOnly(state);
  const docs=smToDocs(data);
  const c=smCheckDocs(docs);
  const kb=z=>Math.max(1,Math.round(z/1024))+' KB';
  const kindOf=p=>p===''?'çalışma alanı':p.split('/').map((x,i)=>i%2?'*':x).join('/');
  const back=smCanon(smFromDocs(docs))===smCanon(data);
  const out=['Belge sayısı: '+c.count,'Toplam: '+kb(c.total),'Gidiş-dönüş birebir: '+(back?'evet':'HAYIR')];
  out.push('','En büyük belgeler:');c.largest.forEach(([z,p])=>out.push('  '+kb(z)+' · '+kindOf(p)));
  const byKind={};c.issues.forEach(i=>{byKind[i.kind]=(byKind[i.kind]||0)+1;});
  out.push('','Sorunlar: '+(c.issues.length?Object.entries(byKind).map(([k,n])=>k+' ×'+n).join(', '):'yok'));
  return out.join('\n');
}
