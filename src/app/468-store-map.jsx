/* =========================================================
   KAYIT BAZLI SENKRON — EŞLEME (senkron Faz 2, docs/veri-modeli.md)
   =========================================================
   smToDocs(data, prev?) → { yol: belge }  bugünkü tek JSON'u belgelere böler
   smFromDocs(docs)      → data            belgelerden aynı JSON'u geri kurar
   smDiff(prev, next)    → yazım listesi   iki belge kümesi arasındaki en küçük fark (alan düzeyinde)
   smApply(docs, ops)                      Firestore'un set/update/delete anlamını taklit eder (testler için)
   smCheckDocs(docs)                       Firestore'a yazılabilir mi (boyut, iç içe dizi, ayrılmış ad)

   SAF bir parça: ağ yok, React yok, global durum yok. store-map-test.js gidiş-dönüşün BİREBİR
   aynı olduğunu ve iki cihazın aynı anda yaptığı düzenlemelerin birbirini silmediğini sınar.

   Yollar çalışma alanına göredir: '' = workspaces/{ws} belgesinin kendisi,
   'teams/T1/tests/t9' = workspaces/{ws}/teams/T1/tests/t9.

   İki cihazın aynı anda yazması için kurallar:
   • LİSTE BELGESİ YOK. Takımın sporcuları, kütüphanenin egzersizleri gibi üyelikler bir dizide
     tutulmaz; koleksiyonun kendisinden okunur. İki cihaz aynı anda farklı sporcu eklerse ikisi kalır.
   • SIRA KESİRLİ. Her kaydın `_o` sıra değeri vardır. Önceki belgeler verilirse (prev) yeri
     değişmeyen kayıtlar değerini korur; yeni ya da taşınan kayıt iki komşusunun arasından değer alır.
     Kütüphanenin başına egzersiz eklemek YALNIZCA o egzersizin belgesini yazar.
   • ALT KAYITLAR TAKIM DÜZEYİNDE. Test, sakatlık, ölçüm, sporcu takvimi ve günlükler takımın düz
     koleksiyonlarında durur; sahibini `_a` alanı söyler. Takım başına ~10 dinleyici yeter.
   • GÜNLÜK KAYITLARI ANAHTARLI. Ay kovasında her kayıt kendi anahtarında: kimliği varsa k_<kimlik>,
     yoksa içeriğinin özeti h_<özet>. Kimliksiz iki yeni kayıt aynı anda eklenirse ikisi de kalır.
   • Bir dizi ancak BÜTÜN elemanları geçerli ve (takım içinde) benzersiz kimlik taşıyorsa bölünür;
     değilse olduğu gibi üst belgede kalır. Hiçbir şey kaybolmaz, kimlik uydurulmaz.
   • Firestore dizi içinde dizi kabul etmez: iç diziler {_arr:[…]} olarak sarılır, geri açılır.
   • Cihaza ait alan (activeTeamId) yazılmaz. */

/* <store-map> — store-map-test.js bu bölümü Node'da aynen çalıştırır; yalnızca düz JavaScript. */
var SM_VERSION=2;
var SM_WS_COLS=['exercises','templates','customTests','tryouts','researches'];
var SM_ATH_SUBS=['tests','injuries','measurements'];
var SM_ATH_LOGS={srpeLog:'srpe',wellness:'wellness',nightLog:'night',liftLog:'lift'};
var SM_DOC_LIMIT=900*1024;   // Firestore sınırı 1 MiB; pay bırakılır
var SM_GAP=1024;

function smValidId(id){
  return typeof id==='string'&&id.length>0&&id.length<=200&&id.indexOf('/')<0
    &&id!=='.'&&id!=='..'&&!/^__.*__$/.test(id);
}
function smIsObj(x){return !!x&&typeof x==='object'&&!Array.isArray(x);}
/* Dizi bölünebilir mi: her eleman nesne, kimliği geçerli, kendi içinde ve `used`'da benzersiz. */
function smSplittable(arr,used){
  if(!Array.isArray(arr))return false;
  var seen={};
  for(var i=0;i<arr.length;i++){
    var x=arr[i];
    if(!smIsObj(x)||!smValidId(x.id)||seen[x.id]||(used&&used[x.id]))return false;
    seen[x.id]=1;
  }
  return true;
}
function smMark(arr,used){arr.forEach(function(x){used[x.id]=1;});}
function smOmit(o,keys){
  var r={};for(var k in o){if(Object.prototype.hasOwnProperty.call(o,k)&&keys.indexOf(k)<0)r[k]=o[k];}
  return r;
}
function smEnc(v){
  if(Array.isArray(v))return v.map(function(x){return Array.isArray(x)?{_arr:smEnc(x)}:smEnc(x);});
  if(v&&typeof v==='object'){var r={};for(var k in v)r[k]=smEnc(v[k]);return r;}
  return v;
}
function smDec(v){
  if(Array.isArray(v))return v.map(function(x){
    return smIsObj(x)&&Object.keys(x).length===1&&Array.isArray(x._arr)?smDec(x._arr):smDec(x);});
  if(v&&typeof v==='object'){var r={};for(var k in v)r[k]=smDec(v[k]);return r;}
  return v;
}
function smMonth(date){return typeof date==='string'&&/^\d{4}-\d{2}/.test(date)?date.slice(0,7):'nodate';}
/* Alan sırasından bağımsız kanonik JSON (anahtarlar sıralı). */
function smCanon(v){
  if(Array.isArray(v))return '['+v.map(smCanon).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+smCanon(v[k]);}).join(',')+'}';
  return JSON.stringify(v);
}
/* Kısa, kararlı özet (FNV-1a, iki tur): kimliksiz kaydın anahtarı. */
function smHash(s){
  var h1=0x811c9dc5,h2=0x01000193;
  for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);h1=Math.imul(h1^c,16777619)>>>0;h2=Math.imul(h2^c,2246822507)>>>0;}
  return ('0000000'+h1.toString(16)).slice(-8)+('0000000'+h2.toString(16)).slice(-8);
}

/* ── kesirli sıra ─────────────────────────────────────────────────────────
   keys: yeni sıradaki anahtarlar; prevO: anahtar → önceki _o (yoksa undefined).
   Önceki değerlerden artan en uzun alt dizi yerinde kalır, gerisi komşuları arasından değer alır. */
function smOrder(keys,prevO){
  var n=keys.length,o=new Array(n),p=keys.map(function(k){var v=prevO&&prevO[k];return typeof v==='number'&&isFinite(v)?v:undefined;});
  // artan en uzun alt dizi (yalnızca önceki değeri olanlar)
  var tails=[],tailIdx=[],par=new Array(n);
  for(var i=0;i<n;i++){
    if(p[i]===undefined)continue;
    var lo=0,hi=tails.length;
    while(lo<hi){var mid=(lo+hi)>>1;if(tails[mid]<p[i])lo=mid+1;else hi=mid;}
    tails[lo]=p[i];tailIdx[lo]=i;par[i]=lo>0?tailIdx[lo-1]:-1;
  }
  var keep={};
  if(tails.length){var j=tailIdx[tails.length-1];while(j>=0&&j!==undefined){keep[j]=1;j=par[j];}}
  for(i=0;i<n;i++)if(keep[i])o[i]=p[i];
  // boşlukları doldur
  var ok=true;
  for(i=0;i<n;){
    if(keep[i]){i++;continue;}
    var s=i;while(i<n&&!keep[i])i++;
    var left=s>0?o[s-1]:undefined,right=i<n?o[i]:undefined,cnt=i-s;
    for(var k=0;k<cnt;k++){
      var v=left===undefined&&right===undefined?(s+k)*SM_GAP
        :left===undefined?right-(cnt-k)*SM_GAP
        :right===undefined?left+(k+1)*SM_GAP
        :left+(right-left)*(k+1)/(cnt+1);
      o[s+k]=v;
    }
    if(left!==undefined&&right!==undefined&&(right-left)/(cnt+1)<1e-6)ok=false;
  }
  if(!ok)for(i=0;i<n;i++)o[i]=i*SM_GAP;   // sıkıştı: baştan numarala
  return o;
}
function smPrevO(prev,paths){var r={};if(!prev)return r;paths.forEach(function(x){var d=prev[x[1]];if(d&&typeof d._o==='number')r[x[0]]=d._o;});return r;}

/* ── data → belgeler ─────────────────────────────────────────────────────── */
function smToDocs(data,prev){
  var out={};
  var put=function(path,doc){out[path]=smEnc(doc);};
  var ws=smOmit(data,['activeTeamId','teams'].concat(SM_WS_COLS));
  ws.schemaVersion=SM_VERSION;
  var split=[];
  SM_WS_COLS.forEach(function(c){
    if(!(c in data))return;
    if(smSplittable(data[c])){
      split.push(c);
      var o=smOrder(data[c].map(function(x){return x.id;}),smPrevO(prev,data[c].map(function(x){return [x.id,c+'/'+x.id];})));
      data[c].forEach(function(x,i){put(c+'/'+x.id,Object.assign({},x,{_o:o[i]}));});
    }else ws[c]=data[c];
  });
  ws._split=split;
  if('teams'in data){
    if(smSplittable(data.teams)){
      ws._hasTeams=true;
      var to=smOrder(data.teams.map(function(t){return t.id;}),smPrevO(prev,data.teams.map(function(t){return [t.id,'teams/'+t.id];})));
      data.teams.forEach(function(t,i){smTeamToDocs(t,'teams/'+t.id,to[i],put,prev);});
    }else ws.teams=data.teams;
  }
  put('',ws);
  return out;
}

function smDaysSplittable(days){
  if(!smIsObj(days))return false;
  return Object.keys(days).every(function(dk){return smValidId(dk)&&smIsObj(days[dk]);});
}
/* Günler: her gün bir belge; seanslar kimlikleri uygunsa ayrı belge (gün içinde kesirli sıra).
   owner: sporcu kimliği (sporcu takvimi) ya da null (takım takvimi). */
function smDaysToDocs(days,base,season,owner,used,put,prev){
  var dayCol=owner==null?'days':'athleteDays',sesCol=owner==null?'sessions':'athleteSessions';
  Object.keys(days).forEach(function(dk){
    var day=days[dk],ses=day.sessions;
    var ok=smSplittable(ses,used);
    var dd=Object.assign({},ok?smOmit(day,['sessions']):day,{_key:dk,_season:season});
    if(owner!=null)dd._a=owner;
    if(ok){
      smMark(ses,used);dd._sessions=true;
      var o=smOrder(ses.map(function(s){return s.id;}),smPrevO(prev,ses.map(function(s){return [s.id,base+'/'+sesCol+'/'+s.id];})));
      ses.forEach(function(s,i){
        var sd=Object.assign({},s,{_date:dk,_season:season,_o:o[i]});if(owner!=null)sd._a=owner;
        put(base+'/'+sesCol+'/'+s.id,sd);
      });
    }
    var key=owner!=null?owner+'_'+dk:(season!=null?season+'_':'')+dk;
    put(base+'/'+dayCol+'/'+key,dd);
  });
}

function smTeamToDocs(t,base,order,put,prev){
  var td=smOmit(t,['athletes','days','setup','weekOverrides','seasonData']);
  td._o=order;
  var used={sessions:{},athleteSessions:{},tests:{},injuries:{},measurements:{}};
  var sid=t.activeSeasonId!=null?String(t.activeSeasonId):'_active';
  if(smValidId(sid)){
    var act={_active:true};
    if('setup'in t)act.setup=t.setup;
    if('weekOverrides'in t)act.weekOverrides=t.weekOverrides;
    if('days'in t){
      if(smDaysSplittable(t.days)){act._hasDays=true;smDaysToDocs(t.days,base,sid,null,used.sessions,put,prev);}
      else act.days=t.days;
    }
    put(base+'/seasons/'+sid,act);
  }else{
    ['setup','weekOverrides','days'].forEach(function(k){if(k in t)td[k]=t[k];});
  }
  if('seasonData'in t){
    if(smIsObj(t.seasonData)){
      td._hasSeasonData=true;
      Object.keys(t.seasonData).forEach(function(k){
        var sl=t.seasonData[k];
        if(!smValidId(k)||k===sid||!smIsObj(sl)){(td._seasonDataRaw=td._seasonDataRaw||{})[k]=sl;return;}
        var sd=smOmit(sl,['days']);
        if('days'in sl){
          if(smDaysSplittable(sl.days)){sd._hasDays=true;smDaysToDocs(sl.days,base,k,null,used.sessions,put,prev);}
          else sd.days=sl.days;
        }
        put(base+'/seasons/'+k,sd);
      });
    }else td.seasonData=t.seasonData;
  }
  if('athletes'in t){
    if(smSplittable(t.athletes)){
      td._hasAthletes=true;
      var ao=smOrder(t.athletes.map(function(a){return a.id;}),smPrevO(prev,t.athletes.map(function(a){return [a.id,base+'/athletes/'+a.id];})));
      t.athletes.forEach(function(a,i){smAthleteToDocs(a,base,ao[i],used,put,prev);});
    }else td.athletes=t.athletes;
  }
  put(base,td);
}

/* Kimliksiz günlük kaydının anahtarı: içeriğin özeti; aynı içerikten iki kayıt varsa sayaç. */
function smLogKeys(arr){
  var ids={},keyed=arr.every(function(x){if(!smIsObj(x)||!smValidId(x.id)||ids[x.id])return false;ids[x.id]=1;return true;});
  var seen={};
  return arr.map(function(x){
    if(keyed)return 'k_'+x.id;
    var h='h_'+smHash(smCanon(x));
    seen[h]=(seen[h]||0)+1;
    return seen[h]>1?h+'_'+seen[h]:h;
  });
}

function smAthleteToDocs(a,teamBase,order,used,put,prev){
  var aid=a.id,base=teamBase+'/athletes/'+aid;
  var ad=smOmit(a,SM_ATH_SUBS.concat(Object.keys(SM_ATH_LOGS),['days']));
  ad._o=order;ad._split=[];ad._logs=[];
  SM_ATH_SUBS.forEach(function(c){
    if(!(c in a))return;
    if(smSplittable(a[c],used[c])){
      smMark(a[c],used[c]);ad._split.push(c);
      var o=smOrder(a[c].map(function(x){return x.id;}),smPrevO(prev,a[c].map(function(x){return [x.id,teamBase+'/'+c+'/'+x.id];})));
      a[c].forEach(function(x,i){put(teamBase+'/'+c+'/'+x.id,Object.assign({},x,{_a:aid,_o:o[i]}));});
    }else ad[c]=a[c];
  });
  // günlükler: ay kovası teams/T/logs/{sporcu}_{YYYY-MM}
  var buckets={};
  Object.keys(SM_ATH_LOGS).forEach(function(c){
    if(!(c in a))return;
    var arr=a[c];
    if(!Array.isArray(arr)){ad[c]=arr;return;}
    ad._logs.push(c);
    var f=SM_ATH_LOGS[c],keys=smLogKeys(arr);
    var prevO={};
    if(prev)arr.forEach(function(x,i){var m=smMonth(x&&x.date),b=prev[teamBase+'/logs/'+aid+'_'+m];var e=b&&b[f]&&b[f][keys[i]];if(e&&typeof e._o==='number')prevO[keys[i]]=e._o;});
    var o=smOrder(keys,prevO);
    arr.forEach(function(x,i){
      var m=smMonth(x&&x.date);
      var b=buckets[m]||(buckets[m]={_a:aid,_m:m});
      (b[f]||(b[f]={}))[keys[i]]={v:x,_o:o[i]};
    });
  });
  Object.keys(buckets).forEach(function(m){put(teamBase+'/logs/'+aid+'_'+m,buckets[m]);});
  if('days'in a){
    if(smDaysSplittable(a.days)){ad._hasDays=true;smDaysToDocs(a.days,teamBase,null,aid,used.athleteSessions,put,prev);}
    else ad.days=a.days;
  }
  put(base,ad);
}

/* ── belgeler → data ─────────────────────────────────────────────────────── */
function smByOrder(a,b){return (a.o-b.o)||(a.k<b.k?-1:a.k>b.k?1:0);}
function smFromDocs(docs){
  var D={};for(var p in docs)D[p]=smDec(docs[p]);
  // koleksiyon → [ {id, doc} ] (doğrudan çocuklar)
  var cols={};
  for(var path in D){
    if(path==='')continue;
    var i=path.lastIndexOf('/');
    (cols[path.slice(0,i)]||(cols[path.slice(0,i)]=[])).push({id:path.slice(i+1),doc:D[path]});
  }
  var col=function(c){return cols[c]||[];};
  var sorted=function(list){return list.map(function(e){return{o:e.doc._o||0,k:e.id,e:e};}).sort(smByOrder).map(function(x){return x.e;});};
  var ws=D['']||{};
  var data=smOmit(ws,['schemaVersion','_split','_hasTeams']);
  (ws._split||[]).forEach(function(c){data[c]=sorted(col(c)).map(function(e){return smOmit(e.doc,['_o']);});});
  if(ws._hasTeams)data.teams=sorted(col('teams')).map(function(e){return smTeamFromDocs(e.id,'teams/'+e.id,e.doc,col,sorted);});
  return data;
}

function smDaysFromDocs(col,sorted,base,season,owner){
  var dayCol=owner==null?'days':'athleteDays',sesCol=owner==null?'sessions':'athleteSessions';
  var match=function(d){return owner==null?d._season===season:d._a===owner;};
  var days={},bySes={};
  sorted(col(base+'/'+sesCol).filter(function(e){return match(e.doc);})).forEach(function(e){
    (bySes[e.doc._date]||(bySes[e.doc._date]=[])).push(smOmit(e.doc,['_date','_season','_o','_a']));
  });
  col(base+'/'+dayCol).forEach(function(e){
    var d=e.doc;if(!match(d))return;
    var day=smOmit(d,['_key','_season','_sessions','_a']);
    if(d._sessions)day.sessions=bySes[d._key]||[];
    days[d._key]=day;
  });
  return days;
}

function smTeamFromDocs(id,base,td,col,sorted){
  var t=smOmit(td,['_o','_hasSeasonData','_seasonDataRaw','_hasAthletes']);
  var seasons=col(base+'/seasons');
  var restore=function(s,sid){
    var o=smOmit(s,['_active','_hasDays']);
    if(s._hasDays)o.days=smDaysFromDocs(col,sorted,base,sid,null);
    return o;
  };
  seasons.forEach(function(e){if(e.doc._active){var o=restore(e.doc,e.id);for(var k in o)t[k]=o[k];}});
  if(td._hasSeasonData){
    t.seasonData={};
    seasons.forEach(function(e){if(!e.doc._active)t.seasonData[e.id]=restore(e.doc,e.id);});
    if(td._seasonDataRaw)for(var k in td._seasonDataRaw)t.seasonData[k]=td._seasonDataRaw[k];
  }
  if(td._hasAthletes){
    var subs={};
    SM_ATH_SUBS.forEach(function(c){
      sorted(col(base+'/'+c)).forEach(function(e){(subs[c+'|'+e.doc._a]||(subs[c+'|'+e.doc._a]=[])).push(smOmit(e.doc,['_a','_o']));});
    });
    var logs={};col(base+'/logs').forEach(function(e){(logs[e.doc._a]||(logs[e.doc._a]=[])).push(e.doc);});
    t.athletes=sorted(col(base+'/athletes')).map(function(e){
      var ad=e.doc,aid=e.id;
      var a=smOmit(ad,['_o','_split','_logs','_hasDays']);
      (ad._split||[]).forEach(function(c){a[c]=subs[c+'|'+aid]||[];});
      (ad._logs||[]).forEach(function(c){
        var f=SM_ATH_LOGS[c],rows=[];
        (logs[aid]||[]).forEach(function(b){var m=b[f];if(m)for(var k in m)rows.push({o:m[k]._o||0,k:k,v:m[k].v});});
        a[c]=rows.sort(smByOrder).map(function(r){return r.v;});
      });
      if(ad._hasDays)a.days=smDaysFromDocs(col,sorted,base,null,aid);
      return a;
    });
  }
  return t;
}

/* ── yazım farkı ──────────────────────────────────────────────────────────
   Belge yoksa/yenilenmişse set, kaybolduysa delete, değiştiyse update. update alan yolları
   dizi olarak verilir (['srpe','k_r1']); diziler bütün değer, nesneler en fazla SM_DIFF_DEPTH
   derinliğe kadar inilerek yazılır. Silinen alan { del: true }. */
var SM_DIFF_DEPTH=3;
function smDiffFields(a,b,path,depth,out){
  var keys={},k;
  for(k in a)keys[k]=1;for(k in b)keys[k]=1;
  for(k in keys){
    var p=path.concat([k]);
    if(!(k in b)){out.push({path:p,del:true});continue;}
    if(!(k in a)){out.push({path:p,value:b[k]});continue;}
    if(smCanon(a[k])===smCanon(b[k]))continue;
    if(depth<SM_DIFF_DEPTH&&smIsObj(a[k])&&smIsObj(b[k])&&Object.keys(b[k]).length)smDiffFields(a[k],b[k],p,depth+1,out);
    else out.push({path:p,value:b[k]});
  }
}
function smDiff(prev,next){
  var ops=[],p;
  prev=prev||{};
  for(p in next){
    if(!(p in prev)){ops.push({op:'set',path:p,data:next[p]});continue;}
    if(smCanon(prev[p])===smCanon(next[p]))continue;
    var fields=[];smDiffFields(prev[p],next[p],[],0,fields);
    if(fields.length)ops.push({op:'update',path:p,fields:fields});
  }
  for(p in prev)if(!(p in next))ops.push({op:'delete',path:p});
  return ops;
}
/* Firestore anlamı: update var olmayan belgeye uygulanamaz (NOT_FOUND) → atlanır ve bildirilir. */
function smApply(docs,ops){
  var r={},failed=[];for(var p in docs)r[p]=JSON.parse(JSON.stringify(docs[p]));
  ops.forEach(function(op){
    if(op.op==='set')r[op.path]=JSON.parse(JSON.stringify(op.data));
    else if(op.op==='delete')delete r[op.path];
    else if(op.op==='update'){
      if(!(op.path in r)){failed.push(op.path);return;}
      op.fields.forEach(function(f){
        var o=r[op.path];
        for(var i=0;i<f.path.length-1;i++){if(!smIsObj(o[f.path[i]]))o[f.path[i]]={};o=o[f.path[i]];}
        var last=f.path[f.path.length-1];
        if(f.del)delete o[last];else o[last]=JSON.parse(JSON.stringify(f.value));
      });
    }
  });
  return{docs:r,failed:failed};
}

/* ── yazılabilirlik denetimi ─────────────────────────────────────────────── */
function smCheckDocs(docs){
  var issues=[],sizes=[];
  var walk=function(v,path,inArr){
    if(Array.isArray(v)){if(inArr)issues.push({path:path,kind:'nested-array'});v.forEach(function(x,i){walk(x,path+'['+i+']',true);});return;}
    if(v===undefined){issues.push({path:path,kind:'undefined'});return;}
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
  const byCol={};Object.keys(docs).forEach(p=>{const k=kindOf(p);byCol[k]=(byCol[k]||0)+1;});
  const out=['Belge sayısı: '+c.count,'Toplam: '+kb(c.total),'Gidiş-dönüş birebir: '+(back?'evet':'HAYIR')];
  out.push('','Koleksiyonlar:');Object.entries(byCol).sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>out.push('  '+n+' · '+k));
  out.push('','En büyük belgeler:');c.largest.forEach(([z,p])=>out.push('  '+kb(z)+' · '+kindOf(p)));
  const byKind={};c.issues.forEach(i=>{byKind[i.kind]=(byKind[i.kind]||0)+1;});
  out.push('','Sorunlar: '+(c.issues.length?Object.entries(byKind).map(([k,n])=>k+' ×'+n).join(', '):'yok'));
  return out.join('\n');
}
