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
   • BELGE İÇİNDEKİ LİSTELER ANAHTARLI. Kimlikli nesnelerden ya da birbirinden farklı yazılardan
     oluşan dizi {_kl:{k_<kimlik>|s_<özet>:{v,_o}}} olarak yazılır (bkz. smEnc): iki cihaz aynı listeye
     aynı anda farklı eleman eklerse ikisi de kalır.
   • Firestore dizi içinde dizi kabul etmez: iç diziler {_arr:[…]} olarak sarılır, geri açılır.
   • Cihaza ait alan (activeTeamId) yazılmaz. */

/* <store-map> — store-map-test.js bu bölümü Node'da aynen çalıştırır; yalnızca düz JavaScript. */
var SM_VERSION=2;
/* Belge BİÇİMİ (kök belgede `_fmt`): eşlemenin yazdığı biçim değişince artar (2: anahtarlı listeler).
   SM_VERSION'dan ayrı: o, çalışma alanının yeni yapıda olduğunu söyler ve kurallar/etkinleştirme ona
   bakar. Daha yeni biçimi gören eski bir uygulama yazmaz (bkz. smController), yoksa okuyamadığı
   alanları bozardı. _fmt'si olmayan kök belge biçim 1'dir. */
var SM_FORMAT=2;
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
/* undefined, eski senkronun JSON'unda olduğu gibi ele alınır: nesnede alan atılır, dizide null olur.
   Firestore undefined'ı reddeder (ignoreUndefinedProperties kapalı) ve bütün paketi düşürür;
   ekranda `{...x, ad: y||undefined}` gibi değerler olağan (ör. sezon adı silinince). */
/* ANAHTARLI LİSTE. Belgenin içindeki bir dizi (takımın `staff`/`seasons`'ı, sezonun Aylık Takvim
   türleri/lokasyonları/kutucukları, seansın sporcuları…) Firestore'da tek bir değerdir: iki cihaz aynı
   anda farklı bir eleman eklerse son yazan öbürünü silerdi. Elemanlar kimlikle eşlenebiliyorsa dizi
   {_kl:{anahtar:{v:eleman,_o:sıra}}} haritası olarak yazılır; ekleme, silme ve düzenleme yalnızca kendi
   anahtarına düşer, sıra kesirli `_o`'dan gelir (önceki belgedeki değer korunur, bkz. smOrder).
   Anahtar: kimlikli nesnede k_<kimlik>; birbirinden farklı yazılarda s_<özet> (yazının kimliği
   kendisidir). Kimliksiz nesne, tekrarlanan değer, sayı ya da karışık dizi olduğu gibi kalır
   (konumu anlamlı olabilir: [x, y], ['', '', 'diz']). */
function smListKeys(arr){
  var keys=[],seen={},objs=arr.length&&smIsObj(arr[0]);
  for(var i=0;i<arr.length;i++){
    var x=arr[i],k;
    if(objs){if(!smIsObj(x)||!smValidId(x.id))return null;k='k_'+x.id;}
    else{if(typeof x!=='string')return null;k='s_'+smHash(x);}
    if(seen[k])return null;
    seen[k]=1;keys.push(k);
  }
  return keys;
}
function smIsKl(v){return smIsObj(v)&&Object.keys(v).length===1&&smIsObj(v._kl);}
/* Eleman anahtarıyla tutarlı mı: başka cihazın sildiği elemana düşen bir düzenleme yarım bir
   girdi ({v} ya da {_o}) bırakabilir; o girdi okunmaz (ayrı belgedeki kayıtta olduğu gibi silme kalır). */
function smKlEntryOk(k,e){
  if(!smIsObj(e)||typeof e._o!=='number')return false;
  return k.slice(0,2)==='k_'?smIsObj(e.v)&&'k_'+e.v.id===k:typeof e.v==='string'&&'s_'+smHash(e.v)===k;
}
/* Günlük kovasındaki kayıt için aynı denetim: bir cihaz kaydı silerken öbürü onun bir alanını
   düzenlerse ({v:{scRPE}}) ya da sırasını değiştirirse ({_o}) yarım bir kayıt kalır; okunmaz. */
function smLogEntryOk(k,e){
  if(!smIsObj(e)||typeof e._o!=='number'||!('v'in e))return false;
  return k.slice(0,2)!=='k_'||(smIsObj(e.v)&&'k_'+e.v.id===k);
}
function smEncArr(a){return a.map(function(x){return x===undefined?null:Array.isArray(x)?{_arr:smEncArr(x)}:smEnc(x);});}
/* p: aynı yerdeki önceki (kodlanmış) değer; anahtarlı listelerin sırası ondan korunur. */
function smEnc(v,p){
  if(Array.isArray(v)){
    var keys=smListKeys(v);
    if(!keys)return smEncArr(v);
    var pk=smIsKl(p)?p._kl:null,prevO={};
    if(pk)keys.forEach(function(k){var e=pk[k];if(smIsObj(e)&&typeof e._o==='number')prevO[k]=e._o;});
    var o=smOrder(keys,prevO),m={};
    v.forEach(function(x,i){var e=pk&&pk[keys[i]];m[keys[i]]={v:smEnc(x,smIsObj(e)?e.v:undefined),_o:o[i]};});
    return{_kl:m};
  }
  if(v&&typeof v==='object'){
    var r={},pp=smIsObj(p)?p:null;
    for(var k in v)if(v[k]!==undefined)r[k]=smEnc(v[k],pp?pp[k]:undefined);
    return r;
  }
  return v;
}
function smDec(v){
  if(Array.isArray(v))return v.map(function(x){
    return smIsObj(x)&&Object.keys(x).length===1&&Array.isArray(x._arr)?smDec(x._arr):smDec(x);});
  if(smIsKl(v)){
    var rows=[];
    for(var key in v._kl){var e=v._kl[key];if(smKlEntryOk(key,e))rows.push({o:e._o,k:key,v:e.v});}
    return rows.sort(smByOrder).map(function(r){return smDec(r.v);});
  }
  if(v&&typeof v==='object'){var r={};for(var k in v)r[k]=smDec(v[k]);return r;}
  return v;
}
function smMonth(date){return typeof date==='string'&&/^\d{4}-\d{2}/.test(date)?date.slice(0,7):'nodate';}
/* Alan sırasından bağımsız kanonik JSON (anahtarlar sıralı); undefined JSON'daki gibi (bkz. smEnc). */
function smCanon(v){
  if(Array.isArray(v))return '['+v.map(function(x){return x===undefined?'null':smCanon(x);}).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.keys(v).filter(function(k){return v[k]!==undefined;}).sort().map(function(k){return JSON.stringify(k)+':'+smCanon(v[k]);}).join(',')+'}';
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
/* EZBERLEME (memo, senkron hız planı R3). memo verilirse her belge için onu kuran girdiler (kaynak nesnelerin
   KİMLİĞİ + küçük bağlam değerleri: sıra, tarih, sezon, sahip, bölme kararları) saklanır. Girdiler aynıysa ve
   önceki çıktı (prev[yol]) hâlâ bu fonksiyonun o belge için ürettiği nesneyse belge yeniden kurulmaz, KODLANMAZ:
   aynı nesne döner. smDiff aynı nesneyi metne çevirmeden geçer. Böylece bir düzenlemenin maliyeti hesabın
   değil, değişen kayıtların büyüklüğüyle orantılı olur.
   Varsayım: ekran verisi değişmez nesnelerle güncellenir (değişen kayıt yeni nesne). Yerinde değiştirilen bir
   kaynak ezberden eski belgeyi döndürür; denetleyici bunun için gölgede tam eşlemeyle karşılaştırır ve boşta
   tam uzlaşma yapar (bkz. smController). memo verilmezse davranış ezberlemesiz eşlemeyle birebir aynıdır. */
function smDepsEq(a,b){if(!a||!b||a.length!==b.length)return false;for(var i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
/* smOmit ile aynı alanlar: kaynaktaki (atlananlar dışındaki) her alanın adı ve değeri (kimlik). */
function smEntries(o,skip){var r=[];for(var k in o){if(Object.prototype.hasOwnProperty.call(o,k)&&(!skip||skip.indexOf(k)<0))r.push(k,o[k]);}return r;}
function smToDocs(data,prev,memo){
  var out={},seen=memo?{}:null;
  /* put(yol, bağımlılıklar(), kur()): memo varsa ve bağımlılıklar + önceki çıktı aynıysa eski belge aynen. */
  var put=function(path,deps,build){
    if(memo){
      var dp=deps(),m=memo[path];
      seen[path]=1;
      if(m&&prev&&prev[path]===m.out&&smDepsEq(m.deps,dp)){out[path]=m.out;return;}
      var enc=smEnc(build(),prev&&prev[path]);
      memo[path]={deps:dp,out:enc};out[path]=enc;return;
    }
    out[path]=smEnc(build(),prev&&prev[path]);
  };
  var ctx={put:put,prev:prev,memo:memo,seen:seen,out:out};
  var split=[];
  SM_WS_COLS.forEach(function(c){
    if(!(c in data))return;
    if(smSplittable(data[c])){
      split.push(c);
      var o=smOrder(data[c].map(function(x){return x.id;}),smPrevO(prev,data[c].map(function(x){return [x.id,c+'/'+x.id];})));
      data[c].forEach(function(x,i){put(c+'/'+x.id,function(){return [x,o[i]];},function(){return Object.assign({},x,{_o:o[i]});});});
    }
  });
  var hasTeams=false;
  if('teams'in data&&smSplittable(data.teams)){
    hasTeams=true;
    var to=smOrder(data.teams.map(function(t){return t.id;}),smPrevO(prev,data.teams.map(function(t){return [t.id,'teams/'+t.id];})));
    data.teams.forEach(function(t,i){smTeamToDocs(t,'teams/'+t.id,to[i],ctx);});
  }
  var rootSkip=['activeTeamId','teams'].concat(split);
  put('',function(){return smEntries(data,rootSkip).concat([split.join('\u0001'),hasTeams,'teams'in data,hasTeams?null:data.teams]);},function(){
    var ws=smOmit(data,['activeTeamId','teams'].concat(SM_WS_COLS));
    ws.schemaVersion=SM_VERSION;
    ws._fmt=SM_FORMAT;
    SM_WS_COLS.forEach(function(c){if(c in data&&split.indexOf(c)<0)ws[c]=data[c];});
    ws._split=split;
    if('teams'in data){if(hasTeams)ws._hasTeams=true;else ws.teams=data.teams;}
    return ws;
  });
  if(memo)for(var k in memo)if(!seen[k])delete memo[k];
  return out;
}

function smDaysSplittable(days){
  if(!smIsObj(days))return false;
  return Object.keys(days).every(function(dk){return smValidId(dk)&&smIsObj(days[dk]);});
}
/* Günler: her gün bir belge; seanslar kimlikleri uygunsa ayrı belge (gün içinde kesirli sıra).
   owner: sporcu kimliği (sporcu takvimi) ya da null (takım takvimi). */
function smDaysToDocs(days,base,season,owner,used,ctx){
  var put=ctx.put,prev=ctx.prev;
  var dayCol=owner==null?'days':'athleteDays',sesCol=owner==null?'sessions':'athleteSessions';
  Object.keys(days).forEach(function(dk){
    var day=days[dk],ses=day.sessions;
    var ok=smSplittable(ses,used);
    if(ok){
      smMark(ses,used);
      var o=smOrder(ses.map(function(s){return s.id;}),smPrevO(prev,ses.map(function(s){return [s.id,base+'/'+sesCol+'/'+s.id];})));
      ses.forEach(function(s,i){
        put(base+'/'+sesCol+'/'+s.id,function(){return [s,dk,season,o[i],owner];},function(){
          var sd=Object.assign({},s,{_date:dk,_season:season,_o:o[i]});if(owner!=null)sd._a=owner;return sd;
        });
      });
    }
    var key=owner!=null?owner+'_'+dk:(season!=null?season+'_':'')+dk;
    put(base+'/'+dayCol+'/'+key,function(){return smEntries(day,ok?['sessions']:null).concat([dk,season,owner,ok]);},function(){
      var dd=Object.assign({},ok?smOmit(day,['sessions']):day,{_key:dk,_season:season});
      if(owner!=null)dd._a=owner;
      if(ok)dd._sessions=true;
      return dd;
    });
  });
}

function smTeamToDocs(t,base,order,ctx){
  var put=ctx.put,prev=ctx.prev;
  var used={sessions:{},athleteSessions:{},tests:{},injuries:{},measurements:{}};
  var sid=t.activeSeasonId!=null?String(t.activeSeasonId):'_active';
  var sidOk=smValidId(sid),daysSplit=false;
  if(sidOk){
    if('days'in t&&smDaysSplittable(t.days)){daysSplit=true;smDaysToDocs(t.days,base,sid,null,used.sessions,ctx);}
    put(base+'/seasons/'+sid,function(){return ['setup'in t,t.setup,'weekOverrides'in t,t.weekOverrides,'days'in t,daysSplit,daysSplit?null:t.days];},function(){
      var act={_active:true};
      if('setup'in t)act.setup=t.setup;
      if('weekOverrides'in t)act.weekOverrides=t.weekOverrides;
      if('days'in t){if(daysSplit)act._hasDays=true;else act.days=t.days;}
      return act;
    });
  }
  var sdObj='seasonData'in t&&smIsObj(t.seasonData);
  if(sdObj){
    Object.keys(t.seasonData).forEach(function(k){
      var sl=t.seasonData[k];
      if(!smValidId(k)||k===sid||!smIsObj(sl))return;
      var sdSplit='days'in sl&&smDaysSplittable(sl.days);
      if(sdSplit)smDaysToDocs(sl.days,base,k,null,used.sessions,ctx);
      put(base+'/seasons/'+k,function(){return smEntries(sl,['days']).concat(['days'in sl,sdSplit,sdSplit?null:sl.days]);},function(){
        var sd=smOmit(sl,['days']);
        if('days'in sl){if(sdSplit)sd._hasDays=true;else sd.days=sl.days;}
        return sd;
      });
    });
  }
  var athSplit='athletes'in t&&smSplittable(t.athletes);
  if(athSplit){
    var ao=smOrder(t.athletes.map(function(a){return a.id;}),smPrevO(prev,t.athletes.map(function(a){return [a.id,base+'/athletes/'+a.id];})));
    t.athletes.forEach(function(a,i){smAthleteToDocs(a,base,ao[i],used,ctx);});
  }
  var tdSkip=['athletes','days','setup','weekOverrides','seasonData'];
  put(base,function(){
    return smEntries(t,tdSkip).concat([order,sidOk,sidOk?null:t.setup,sidOk?null:t.weekOverrides,sidOk?null:t.days,
      'seasonData'in t,t.seasonData,'athletes'in t,athSplit,athSplit?null:t.athletes]);
  },function(){
    var td=smOmit(t,tdSkip);
    td._o=order;
    if(!sidOk)['setup','weekOverrides','days'].forEach(function(k){if(k in t)td[k]=t[k];});
    if('seasonData'in t){
      if(sdObj){
        td._hasSeasonData=true;
        Object.keys(t.seasonData).forEach(function(k){
          var sl=t.seasonData[k];
          if(!smValidId(k)||k===sid||!smIsObj(sl))(td._seasonDataRaw=td._seasonDataRaw||{})[k]=sl;
        });
      }else td.seasonData=t.seasonData;
    }
    if('athletes'in t){if(athSplit)td._hasAthletes=true;else td.athletes=t.athletes;}
    return td;
  });
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

function smAthleteToDocs(a,teamBase,order,used,ctx){
  var put=ctx.put,prev=ctx.prev,memo=ctx.memo;
  var aid=a.id,base=teamBase+'/athletes/'+aid;
  var splitList=[];
  SM_ATH_SUBS.forEach(function(c){
    if(!(c in a))return;
    if(smSplittable(a[c],used[c])){
      smMark(a[c],used[c]);splitList.push(c);
      var o=smOrder(a[c].map(function(x){return x.id;}),smPrevO(prev,a[c].map(function(x){return [x.id,teamBase+'/'+c+'/'+x.id];})));
      a[c].forEach(function(x,i){put(teamBase+'/'+c+'/'+x.id,function(){return [x,aid,o[i]];},function(){return Object.assign({},x,{_a:aid,_o:o[i]});});});
    }
  });
  // günlükler: ay kovası teams/T/logs/{sporcu}_{YYYY-MM}
  var logList=[],logArrs=[];
  Object.keys(SM_ATH_LOGS).forEach(function(c){if(c in a&&Array.isArray(a[c])){logList.push(c);logArrs.push(a[c]);}});
  /* Ezber: sporcunun günlük dizileri (kimlikleriyle) aynıysa ve kovalar önceki çıktıysa anahtarlar (kimliksiz
     kayıtlarda içerik özeti — pahalı) ve kovalar hiç hesaplanmaz. */
  var lkey='\u0001logs:'+teamBase+'/'+aid,lm=memo&&memo[lkey],ldeps=memo?[aid].concat(logList,logArrs):null;
  var reuse=lm&&smDepsEq(lm.deps,ldeps)&&lm.paths.every(function(p){var m=memo[p];return m&&prev&&prev[p]===m.out;});
  if(reuse){
    lm.paths.forEach(function(p){ctx.out[p]=memo[p].out;ctx.seen[p]=1;});
    ctx.seen[lkey]=1;
  }else{
    var buckets={};
    logList.forEach(function(c,ci){
      var arr=logArrs[ci];
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
    var bpaths=[];
    Object.keys(buckets).forEach(function(m){
      var bp=teamBase+'/logs/'+aid+'_'+m;bpaths.push(bp);
      put(bp,function(){return ldeps.concat([m]);},function(){return buckets[m];});
    });
    if(memo){memo[lkey]={deps:ldeps,paths:bpaths};ctx.seen[lkey]=1;}
  }
  var daysSplit='days'in a&&smDaysSplittable(a.days);
  if(daysSplit)smDaysToDocs(a.days,teamBase,null,aid,used.athleteSessions,ctx);
  var adSkip=SM_ATH_SUBS.concat(Object.keys(SM_ATH_LOGS),['days']);
  put(base,function(){
    var d=smEntries(a,adSkip).concat([order,splitList.join('\u0001'),logList.join('\u0001'),daysSplit,daysSplit?null:a.days,'days'in a]);
    SM_ATH_SUBS.forEach(function(c){if(c in a&&splitList.indexOf(c)<0)d.push(c,a[c]);});
    Object.keys(SM_ATH_LOGS).forEach(function(c){if(c in a&&logList.indexOf(c)<0)d.push(c,a[c]);});
    return d;
  },function(){
    var ad=smOmit(a,adSkip);
    ad._o=order;ad._split=splitList.slice();ad._logs=logList.slice();
    SM_ATH_SUBS.forEach(function(c){if(c in a&&splitList.indexOf(c)<0)ad[c]=a[c];});
    Object.keys(SM_ATH_LOGS).forEach(function(c){if(c in a&&logList.indexOf(c)<0)ad[c]=a[c];});
    if('days'in a){if(daysSplit)ad._hasDays=true;else ad.days=a.days;}
    return ad;
  });
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
  var data=smOmit(ws,['schemaVersion','_fmt','_split','_hasTeams']);
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
        (logs[aid]||[]).forEach(function(b){var m=b[f];if(m)for(var k in m)if(smLogEntryOk(k,m[k]))rows.push({o:m[k]._o,k:k,v:m[k].v});});
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
   derinliğe kadar inilerek yazılır. Silinen alan { del: true }.
   Anahtarlı listede (smEnc) `_kl` ve girdinin `v`'si derinlik saymaz; `_kl`'ye her zaman inilir —
   boşalan bir liste bütün değer olarak yazılsaydı öbür cihazın o sırada eklediğini silerdi. */
var SM_DIFF_DEPTH=6;
function smDiffFields(a,b,path,depth,out,mode){   // mode: undefined | 'kl' (girdiler) | 'entry' ({v,_o})
  var keys={},k;
  for(k in a)keys[k]=1;for(k in b)keys[k]=1;
  for(k in keys){
    var p=path.concat([k]);
    if(!(k in b)){out.push({path:p,del:true});continue;}
    if(!(k in a)){out.push({path:p,value:b[k]});continue;}
    if(smCanon(a[k])===smCanon(b[k]))continue;
    var both=smIsObj(a[k])&&smIsObj(b[k]);
    if(both&&!mode&&k==='_kl'&&smIsKl(a)&&smIsKl(b))smDiffFields(a[k],b[k],p,depth,out,'kl');
    else if(both&&mode==='entry'&&k==='v'&&Object.keys(b[k]).length)smDiffFields(a[k],b[k],p,depth,out);
    else if(both&&depth<SM_DIFF_DEPTH&&(mode==='kl'||Object.keys(b[k]).length))smDiffFields(a[k],b[k],p,depth+1,out,mode==='kl'?'entry':undefined);
    else out.push({path:p,value:b[k]});
  }
}
function smDiff(prev,next){
  var ops=[],p;
  prev=prev||{};
  for(p in next){
    if(!(p in prev)){ops.push({op:'set',path:p,data:next[p]});continue;}
    if(prev[p]===next[p])continue;   // aynı nesne (ezber, R3): metne çevirmeye gerek yok
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

/* <store-io> — Firestore bağlantısı. rules-test/test/store-io.test.js bu bölümü emulator'de, gerçek
   Firestore'a karşı iki ayrı istemciyle (iki cihaz gibi) çalıştırır. Yalnızca düz JavaScript.
   fs: firebase.firestore() (compat), K: { FieldPath, FieldValue, uid } — uygulama ve test kendi
   firebase ad alanından verir. wsPath: 'workspaces/<ws>'. */
var SM_META=['_at','_by'];         // yazarken eklenir, okurken atılır (fark hesabına girmez)
var SM_BATCH=400;

/* Eşlemedeki '' (verinin üst düzey alanları) çalışma alanı belgesinin kendisine DEĞİL,
   state/root'a yazılır: workspaces/{ws} yalnızca kimlik bilgisini (name, ownerUid…) taşır ve
   kurallar sahipliğin değiştirilmesine izin vermez. */
var SM_ROOT='state/root';
function smRef(fs,wsPath,rel){return fs.doc(wsPath+'/'+(rel===''?SM_ROOT:rel));}

/* Yazım listesini Firestore'a uygular. Toplu yazım (batch) atomiktir: içindeki bir update var
   olmayan belgeye düşerse (başka cihaz silmiş) bütün paket reddedilir. O zaman paketin işlemleri
   tek tek yeniden denenir; yalnızca düşen update'ler `failed`'a yazılır, gerisi kalır.
   Yetki ya da ağ hatası olduğu gibi yukarı çıkar (çağıran yeniden dener / kullanıcıya söyler). */
/* opts.noRetry (pipeWrite): paket "silinmiş belgeye düzenleme" ile reddedilirse işlemler tek tek ESKİ
   değerleriyle yeniden denenmez — arkasından daha yeni bir yazım çoktan gitmiş olabilir, eski değer onu ezerdi.
   Reddedilen paket ve sonrası `retry` olarak döner; çağıran (denetleyici) o yolları EN GÜNCEL hâlden yeniden yazar. */
async function smWrite(fs,wsPath,ops,K,opts){
  var meta=function(){var m={_at:K.FieldValue.serverTimestamp()};if(K.uid)m._by=K.uid;return m;};
  var one=function(b,op){
    var ref=smRef(fs,wsPath,op.path);
    if(op.op==='set')b.set(ref,Object.assign({},op.data,meta()));
    else if(op.op==='delete')b.delete(ref);
    else{
      var args=[];
      op.fields.forEach(function(f){args.push(new (Function.prototype.bind.apply(K.FieldPath,[null].concat(f.path)))(),f.del?K.FieldValue.delete():f.value);});
      var m=meta();Object.keys(m).forEach(function(k){args.push(k,m[k]);});
      b.update.apply(b,[ref].concat(args));
    }
  };
  var failed=[],written=0;
  for(var i=0;i<ops.length;i+=SM_BATCH){
    var chunk=ops.slice(i,i+SM_BATCH);
    var b=fs.batch();chunk.forEach(function(op){one(b,op);});
    try{await b.commit();written+=chunk.length;}
    catch(e){
      if(!e||e.code!=='not-found')throw e;
      if(opts&&opts.noRetry)return{written:written,failed:failed,retry:ops.slice(i)};
      for(var j=0;j<chunk.length;j++){
        var b1=fs.batch();one(b1,chunk[j]);
        try{await b1.commit();written++;}
        catch(e1){if(e1&&e1.code==='not-found')failed.push(chunk[j].path);else throw e1;}
      }
    }
  }
  return{written:written,failed:failed};
}

/* Çalışma alanını canlı dinler: çalışma alanı belgesi, kütüphane koleksiyonları, takımlar ve her
   takımın düz koleksiyonları (takım başına 10 dinleyici). onDocs(docs, info) her değişiklikte, bütün
   dinleyiciler ilk cevabını verdikten sonra çağrılır. info: { fromCache, pending }.
   Dönen işlev bütün dinleyicileri kapatır. */
var SM_TEAM_COLS=['seasons','days','sessions','athletes','tests','injuries','measurements','athleteDays','athleteSessions','logs'];
/* teams: üyenin erişebildiği takımlar. ['*'] ya da verilmezse bütün takım koleksiyonu dinlenir;
   bir liste verilirse (yalnız belirli takımlara erişen antrenör) her takımın belgesi tek tek dinlenir —
   kurallar bütün koleksiyonun listelenmesini o üyeye izin vermez. */
/* info.changed: son onDocs'tan beri bir belge gerçekten değişti mi (eklendi, değişti, silindi). false ise
   olay yalnızca üst veridir — yazımın sunucu onayı (bekleyen → oturdu), önbellekten sunucuya geçiş — ve
   belgeler bir öncekiyle aynıdır (senkron hız planı R2 → metaSkip). Kuşkuda true (tam yol). */
function smListen(fs,wsPath,onDocs,onError,teams){
  var docs={},waiting={},subs={},teamSubs={},dead=false,queued=false,lastInfo={fromCache:false,pending:false};
  var changed=true,docSig={},paths={},pend={};   // paths: son onDocs'tan beri içeriği değişen belgeler (echoSkip); pend: onlardan onaylanmamış yerel yazım taşıyanlar (staleEcho)
  var strip=function(d){var r={};for(var k in d)if(SM_META.indexOf(k)<0)r[k]=d[k];return r;};
  var emit=function(){
    if(queued||dead)return;queued=true;
    Promise.resolve().then(function(){
      queued=false;
      if(dead||Object.keys(waiting).length)return;
      var copy={};for(var p in docs)copy[p]=docs[p];
      var info={fromCache:lastInfo.fromCache,pending:lastInfo.pending,changed:changed,paths:Object.keys(paths),pend:pend};
      changed=false;paths={};pend={};
      onDocs(copy,info);
    });
  };
  /* Tek belge dinleyicisi (kök, takım belgesi) üst veri değişiminde de uyanır: içerik bir öncekiyle aynı mı? */
  var docChanged=function(key,data){var s=data===undefined?'∅':JSON.stringify(data);if(docSig[key]===s)return false;docSig[key]=s;return true;};
  var err=function(e){if(onError)onError(e);};
  var listenCol=function(key,colRel,onFirst){
    waiting[key]=1;
    subs[key]=fs.collection(wsPath+'/'+colRel).onSnapshot({includeMetadataChanges:true},function(snap){
      /* Seçeneksiz docChanges() üst veri değişimlerini saymaz. Ama her yazım `_at: serverTimestamp()` taşıdığı
         için sunucu onayı da bir "değişti" olarak gelir (damga null → gerçek zaman). `_at`/`_by` okurken
         atıldığından içerik aynıysa bu bir içerik değişimi değildir: eski nesne korunur, olay sessiz kalır. */
      snap.docChanges().forEach(function(ch){
        var rel=colRel+'/'+ch.doc.id;
        if(ch.type==='removed'){delete docs[rel];changed=true;paths[rel]=1;delete pend[rel];return;}
        var nd=strip(ch.doc.data());
        if(ch.type==='modified'&&docs[rel]!==undefined&&smCanon(docs[rel])===smCanon(nd))return;
        docs[rel]=nd;changed=true;paths[rel]=1;
        if(ch.doc.metadata&&ch.doc.metadata.hasPendingWrites)pend[rel]=1;else delete pend[rel];
      });
      lastInfo={fromCache:snap.metadata.fromCache,pending:snap.metadata.hasPendingWrites};
      if(onFirst)onFirst(snap);
      delete waiting[key];emit();
    },err);
  };
  var addTeam=function(tid){
    if(teamSubs[tid])return;teamSubs[tid]=[];
    SM_TEAM_COLS.forEach(function(c){var k='t:'+tid+':'+c;teamSubs[tid].push(k);listenCol(k,'teams/'+tid+'/'+c);});
  };
  var dropTeam=function(tid){
    (teamSubs[tid]||[]).forEach(function(k){if(subs[k])subs[k]();delete subs[k];delete waiting[k];});
    delete teamSubs[tid];
    var pre='teams/'+tid+'/';for(var p in docs)if(p.indexOf(pre)===0){delete docs[p];paths[p]=1;}
    changed=true;
  };
  waiting.ws=1;
  subs.ws=fs.doc(wsPath+'/'+SM_ROOT).onSnapshot({includeMetadataChanges:true},function(snap){
    if(snap.exists)docs['']=strip(snap.data());else delete docs[''];
    if(docChanged('',docs[''])){changed=true;paths['']=1;if(snap.metadata&&snap.metadata.hasPendingWrites)pend['']=1;else delete pend[''];}
    delete waiting.ws;emit();
  },err);
  SM_WS_COLS.forEach(function(c){listenCol('c:'+c,c);});
  if(!teams||teams.indexOf('*')>=0){
    listenCol('teams','teams',function(snap){
      var now={};snap.docs.forEach(function(d){now[d.id]=1;addTeam(d.id);});
      Object.keys(teamSubs).forEach(function(t){if(!now[t])dropTeam(t);});
    });
  }else{
    teams.forEach(function(tid){
      var key='td:'+tid;waiting[key]=1;
      subs[key]=fs.doc(wsPath+'/teams/'+tid).onSnapshot({includeMetadataChanges:true},function(snap){
        if(snap.exists){docs['teams/'+tid]=strip(snap.data());addTeam(tid);}
        else{delete docs['teams/'+tid];dropTeam(tid);}
        if(docChanged('teams/'+tid,docs['teams/'+tid])){changed=true;paths['teams/'+tid]=1;if(snap.metadata&&snap.metadata.hasPendingWrites)pend['teams/'+tid]=1;else delete pend['teams/'+tid];}
        delete waiting[key];emit();
      },err);
    });
  }
  return function(){dead=true;Object.keys(subs).forEach(function(k){try{subs[k]();}catch(e){}});};
}

/* Denetleyici: bir cihazın yeni yapıyla senkronu (React'tan bağımsız; emulator testinde iki cihaz
   olarak çalıştırılır). o: {
     fs, wsPath, K,                     Firestore (compat), 'workspaces/<ws>', {FieldPath, FieldValue, uid}
     teams                              üyenin erişebildiği takımlar (['*'] = hepsi; Faz 5)
     getData()                          ekrandaki güncel veri (nesne kimliği önemli)
     apply(data)                        buluttan gelen veriyi ekrana koy (aynı nesneyi koymalı)
     prep(data)  → data                 buluta gidecek hâl (cihaza ait alanlar atılmış)
     fromDocs(docs) → data              belgeler → ekran verisi (eşleme + gerekiyorsa migrate)
     status(s), note(msg), error(e)     'syncing' | 'synced'; kullanıcıya not; hata
     slow(tür, ms, ayrıntı)             (isteğe bağlı) ana iş parçacığında SM_SLOW_MS'yi aşan tur
     flag(ad) → bool                    (isteğe bağlı) senkron bayrakları (447); yoksa hepsi kapalı.
                                        Yeni bir davranış YALNIZCA bununla açılır (senkron hız planı G2)
     shadow(ad, ayrıntı)                (isteğe bağlı) gölge/doğrulama uyuşmazlığı: yeni yol farklı sonuç verirdi
     trip(ad, sebep)                    (isteğe bağlı) bayrağı bu oturumda kapat (onarım ağı, G5)
   }
   Kural: yerel değişiklik her zaman ÖNCE gönderilir. Başka cihazdan güncelleme gelirken ekranda
   henüz gönderilmemiş bir düzenleme varsa, o düzenlemenin farkı gelen belgelerin üstüne uygulanır
   ve gönderilir; ekrana birleşik hâl konur. Böylece hiçbir yerel düzenleme gelen veriyle ezilmez. */
/* Ölçüm (senkron hız planı R0/R1): yalnızca sayar, hiçbir kararı değiştirmez. Ana iş parçacığında
   SM_SLOW_MS'yi aşan bir tur o.slow(tür, ms, ayrıntı) ile bildirilir (uygulama günlüğe yazar). */
var SM_SLOW_MS=50;
var smNow=function(){return (typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();};
function smStatsNew(){return{flushN:0,flushMs:0,flushMax:0,opsN:0,docs:0,echoN:0,echoMs:0,echoMax:0,applyN:0,writeN:0,ackMs:0,ackMax:0,slowN:0,
  quietN:0,quietSkip:0,quietMiss:0,quietRevert:0,ownN:0,ownHit:0,ownSkip:0,ownMiss:0,ownRevert:0,pipeN:0,pipeRetry:0,staleHit:0,staleSkip:0,staleRevert:0};}
/* staleEcho: bir belge için bu cihazın gönderdiği sürümlerden en çok bu kadarı hatırlanır (belge başına). */
var SM_SENT_KEEP=24;
/* Belgenin içindeki bir alan yolunun değeri (yoksa undefined). */
function smGetIn(o,path){for(var i=0;i<path.length;i++){if(!smIsObj(o))return undefined;o=o[path[i]];}return o;}
/* İki gelen belge kümesi aynı nesnelerden mi oluşuyor? smListen içeriği değişmeyen belgede eski nesneyi
   korur; bu yüzden "hiçbir belge değişmedi" iddiası metne çevirmeden, yalnızca kimlikle doğrulanır. */
/* smSameRefs'in listedeki yollar dışındaki hâli: liste dışında kalan her belge aynı nesne mi, aynı yollar mı. */
function smSameRefsExcept(a,b,skip){
  if(!a||!b)return false;
  var sk={},i,k,n=0;for(i=0;i<skip.length;i++)sk[skip[i]]=1;
  for(k in a){if(sk[k])continue;if(a[k]!==b[k])return false;n++;}
  for(k in b){if(!sk[k])n--;}
  return n===0;
}
function smSameRefs(a,b){
  if(!a||!b)return false;
  var n=0,k;
  for(k in a){if(a[k]!==b[k])return false;n++;}
  for(k in b)n--;
  return n===0;
}
function smController(o){
  var docs=null,handled=null,off=null,chain=Promise.resolve(),inflight=0,lastPending=false,newer=false,lastIn=null;
  /* sent[yol]: bu cihazın o belge için gönderdiği sürümlerin özeti (eskiden yeniye). Belge onaylanmamış yerel
     yazım taşımadan gelince (sunucu son sözü söyledi) sıfırlanır. staleEcho bununla kendi eski yankısını tanır. */
  var sent={};
  var noteSent=function(ops,nd){
    ops.forEach(function(op){
      var h=sent[op.path]||(sent[op.path]=[]);
      h.push(nd[op.path]===undefined?'∅':smCanon(nd[op.path]));
      if(h.length>SM_SENT_KEEP)h.shift();
    });
  };
  var st=smStatsNew();
  var slow=function(kind,ms,info){st.slowN++;if(o.slow)try{o.slow(kind,Math.round(ms),info);}catch(e){}};
  var report=function(){o.status(inflight||lastPending?'syncing':'synced');};
  /* Veri bu uygulamadan daha yeni bir biçimle yazılmışsa ne okunur ne yazılır; uygulama yenilenmeli. */
  var tooNew=function(incoming){var r=incoming&&incoming[''],f=r&&r._fmt;return typeof f==='number'&&f>SM_FORMAT;};
  /* ARDIŞIK GÖNDERİM (pipeWrite, senkron hız planı R2). Sıralı yolda her yazım bir öncekinin SUNUCU ONAYINI
     bekler; bekleyen yazım Firestore'a henüz verilmediği için arada gelen bir olay onu içermez ve tam yol
     ekranı (ve docs'u) bir an onsuz hâle döndürür (geri alma yarışı). Bayrak açıkken yazım hemen Firestore'a
     verilir: Firestore aynı istemcinin yazımlarını sırasıyla işler ve yerel görünümü sonraki her olayda onları
     içerir. Kurallar:
       • Sıralı yolda bekleyen bir yazım varken ardışık gönderilmez (sıra bozulmasın).
       • Paket "silinmiş belgeye düzenleme" ile reddedilirse yollar ESKİ değerle değil, EN GÜNCEL hâlden (docs)
         yeniden yazılır (reassert); gerçekten silinmiş belgeye düşen düzenleme bildirilir.
       • Başka bir hata (yetki vb.) → bayrak bu oturumda kapanır, hata her zamanki gibi bildirilir. */
  var serialWait=0;
  var ack=function(t0){var dt=smNow()-t0;st.writeN++;st.ackMs+=dt;if(dt>st.ackMax)st.ackMax=dt;};
  var reassert=async function(rops){
    var seen={},paths=[],failed=[];
    rops.forEach(function(op){if(!seen[op.path]){seen[op.path]=op;paths.push(op.path);}else if(op.op==='update'&&seen[op.path].op==='update')seen[op.path]={op:'update',path:op.path,fields:seen[op.path].fields.concat(op.fields)};});
    for(var i=0;i<paths.length;i++){
      var p=paths[i],orig=seen[p],cur=docs?docs[p]:undefined,op;
      // İşlem şimdi, EN GÜNCEL hâlden kurulur ve aynı anda (eşzamanlı) Firestore'a verilir: arkasından gelen
      // her yazım Firestore'da bundan sonra işlenir.
      if(cur===undefined)op={op:'delete',path:p};
      else if(orig.op==='update')op={op:'update',path:p,fields:orig.fields.map(function(f){var v=smGetIn(cur,f.path);return v===undefined?{path:f.path,del:true}:{path:f.path,value:v};})};
      else op={op:'set',path:p,data:cur};
      var r=await smWrite(o.fs,o.wsPath,[op],o.K,{noRetry:true});
      if(r.retry)failed.push(p);
    }
    if(failed.length)o.note(failed.length);
  };
  var send=function(ops){
    inflight++;report();
    if(!serialWait&&o.flag&&o.flag('pipeWrite')){
      st.pipeN++;
      var t1=smNow();
      var p=smWrite(o.fs,o.wsPath,ops,o.K,{noRetry:true}).then(function(r){
        ack(t1);
        if(r.retry){st.pipeRetry++;return reassert(r.retry);}
      }).catch(function(e){
        if(o.trip)try{o.trip('pipeWrite','yazım hatası: '+String((e&&(e.code||e.message))||e));}catch(x){}
        o.error(e);
      }).then(function(){inflight--;report();});
      chain=chain.then(function(){return p;});
      return chain;
    }
    serialWait++;
    var t0=0;
    chain=chain.then(function(){t0=smNow();return smWrite(o.fs,o.wsPath,ops,o.K);}).then(function(r){
      ack(t0);
      if(r.failed.length)o.note(r.failed.length);
    }).catch(function(e){o.error(e);}).then(function(){serialWait--;inflight--;report();});
    return chain;
  };
  /* Ekrandaki veri en son gönderilenden farklıysa farkı gönder; uygulanan yazım listesini döner. */
  var flush=function(){
    var d=o.getData();
    if(!docs||newer||d===handled)return[];
    handled=d;
    var t0=smNow();
    var next=smToDocs(o.prep(d),docs);
    var ops=smDiff(docs,next);
    var dt=smNow()-t0;
    st.flushN++;st.flushMs+=dt;if(dt>st.flushMax)st.flushMax=dt;st.opsN+=ops.length;
    docs=next;
    if(ops.length){noteSent(ops,next);send(ops);}
    if(dt>SM_SLOW_MS){var nd=0;for(var k in next)nd++;st.docs=nd;slow('gönderim',dt,'belge='+nd+' yazım='+ops.length);}
    return ops;
  };
  var onDocs=function(incoming,info){
    if(tooNew(incoming)){
      if(!newer){newer=true;var e=new Error('Veri bu uygulamadan daha yeni bir sürümle yazılmış; sayfayı yenile.');e.code='newer-format';o.error(e);}
      return;
    }
    newer=false;
    lastPending=!!info.pending;
    /* SESSİZ OLAY (metaSkip, senkron hız planı R2): hiçbir belge değişmedi — yazımın sunucu onayı ya da
       önbellek→sunucu geçişi. Gelen belgeler bir öncekinin AYNISI olduğundan yeniden birleştirmenin
       yapabileceği tek şey, gönderilmiş ama henüz yankısı gelmemiş bir yerel düzenlemeyi ekranda bir an geri
       almaktır (eski bir onay olayı, sonraki düzenlemeden önce işlenirse). Bayrak açıkken atlanır; ekranda
       gönderilmemiş bir düzenleme varsa her zamanki gibi gönderilir.
       Atlamanın dayandığı tek varsayım ("hiçbir belge değişmedi") HER sessiz olayda kimlikle doğrulanır
       (ucuz; bayrak kapalıyken de: gölge). Tutmazsa sayılır, bayrak bu oturumda kapanır ve tam yol yürür. */
    var quiet=info.changed===false&&docs!==null,skipOn=false;
    if(quiet){
      st.quietN++;
      skipOn=!!(o.flag&&o.flag('metaSkip'));
      if(!smSameRefs(lastIn,incoming)){
        st.quietMiss++;quiet=false;
        if(o.shadow)try{o.shadow('metaSkip',skipOn?'açık':'gölge');}catch(e){}
        if(skipOn&&o.trip)try{o.trip('metaSkip','sessiz denen olayda belgeler değişmişti');}catch(e){}
      }else if(skipOn){st.quietSkip++;flush();report();return;}
    }
    var prevIn=lastIn;lastIn=incoming;
    /* KENDİ YAZIMININ YANKISI (echoSkip, senkron hız planı R2): değişen belgelerin HEPSİ bu cihazın son
       gönderdiğiyle (docs) içerikçe aynıysa gelen hâl ekrandakinin aynısıdır: tam yol (bütün belgelerden
       veriyi kurup bütün veriyi metne çevirmek) yalnızca bunu doğrulardı. Karar ucuz: yalnızca değişen
       birkaç belge karşılaştırılır. Dayandığı tek varsayım — listede olmayan belge değişmedi — nesne
       kimliğiyle doğrulanır (bayrak kapalıyken de: gölge); tutmazsa sayılır, bayrak bu oturumda kapanır.
       Gönderilmiş daha yeni bir sürümün arkasından gelen ESKİ yankı (aynı belge, eski içerik) yankı
       sayılmaz: başka cihaz aynı değeri yazmış olabilir; o hâlde tam yol yürür. */
    var echo=false,echoOn=false;
    if(!quiet&&docs&&info.paths&&info.paths.length&&prevIn){
      st.ownN++;
      echoOn=!!(o.flag&&o.flag('echoSkip'));
      if(!smSameRefsExcept(prevIn,incoming,info.paths)){
        st.ownMiss++;
        if(o.shadow)try{o.shadow('echoSkip',echoOn?'açık':'gölge');}catch(e){}
        if(echoOn&&o.trip)try{o.trip('echoSkip','değişen belge listesi eksikti');}catch(e){}
      }else{
        /* Her değişen belge: (a) son gönderilenle aynı (yankı) ya da (b) STALEECHO: Firestore'da bu cihazın
           onaylanmamış yazımını taşıyor VE içeriği bu cihazın o belge için gönderdiği eski sürümlerden biri —
           yani daha yeni sürüm zaten ekranda ve yolda (Firestore yazımları sırasıyla uygular). Onaylanmamış yazım
           yoksa (sunucunun son sözü; başka cihaz aynı değeri yazmış olabilir) (b) asla sayılmaz → tam yol. */
        var stale=false;
        echo=info.paths.every(function(p){
          var inI=incoming[p]!==undefined,inD=docs[p]!==undefined;
          var ci=inI?smCanon(incoming[p]):'∅';
          if(inI===inD&&(!inI||ci===smCanon(docs[p])))return true;
          if(info.pend&&info.pend[p]&&sent[p]&&sent[p].indexOf(ci)>=0){stale=true;return true;}
          return false;
        });
        if(echo&&!stale)st.ownHit++;
        if(echo&&stale)st.staleHit++;
        var staleOn=stale&&!!(o.flag&&o.flag('staleEcho'));
        if(echo&&(stale?staleOn:echoOn)){if(stale)st.staleSkip++;else st.ownSkip++;flush();report();return;}
      }
    }
    // Sunucunun son sözünü taşıyan (onaylanmamış yazımı olmayan) belgelerin gönderim geçmişi sıfırlanır.
    if(info.paths)info.paths.forEach(function(p){if(!(info.pend&&info.pend[p]))delete sent[p];});
    var t0=smNow();
    var base=docs,local=[];
    if(base){
      var d=o.getData();
      if(d!==handled){var ld=smToDocs(o.prep(d),base);local=smDiff(base,ld);handled=d;if(local.length){noteSent(local,ld);send(local);}}
    }
    var merged=local.length?smApply(incoming,local).docs:incoming;
    docs=merged;
    var remote=o.fromDocs(merged);
    var cur=o.getData();
    var applied=!base||smCanon(o.prep(remote))!==smCanon(o.prep(cur));
    if(applied){handled=remote;o.apply(remote);st.applyN++;}
    else handled=cur;
    if(quiet&&applied)st.quietRevert++;
    if(echo&&applied){if(stale)st.staleRevert++;else st.ownRevert++;}   // gölge: tam yol yankı olayında ekranı değiştirdi (geri aldı)   // gölge: tam yol sessiz olayda ekranı değiştirdi (yankısı gelmemiş düzenlemeyi geri aldı)
    var dt=smNow()-t0;
    st.echoN++;st.echoMs+=dt;if(dt>st.echoMax)st.echoMax=dt;
    if(dt>SM_SLOW_MS){var nd=0;for(var k in merged)nd++;st.docs=nd;slow('gelen',dt,'belge='+nd+(applied?' ekrana kondu':' ekran aynı'));}
    report();
  };
  return{
    start:function(){if(!off)off=smListen(o.fs,o.wsPath,onDocs,o.error,o.teams);},
    stop:function(){if(off){off();off=null;}},
    changed:flush,                      // ekranda veri değişti
    ready:function(){return docs!==null;},
    idle:function(){return chain;},     // bekleyen yazımlar bitince çözülür (testler, çıkış)
    stats:function(){var r={};for(var k in st)r[k]=st[k];return r;},   // ölçüm (tanı penceresi)
  };
}

/* ── TAŞIMA (senkron Faz 3) ─────────────────────────────────────────────────
   Eski tek-JSON hesabını yeni yapıya taşır. o: {
     fs, uid, K, data            veri: buluta gidecek hâl (cihaza ait alanlar atılmış), eski manifestin
                                 `rev`'ine karşılık gelen, ekranda senkronlanmış durum
     lockLegacy()                eski yapıyı kilitler (manifeste migratedTo); başka cihaz arada yazdıysa
                                 hata fırlatır (iyimser kilit: base == rev) → taşıma "tamamlanmadı" kalır
     log(adım, ayrıntı)
   }
   Adımlar: ön kontrol → çalışma alanı + sahip üyeliği (migrated:false) → var olanla hedef arasındaki
   fark yazılır (yarıda kalmış deneme kaldığı yerden sürer) → SUNUCUDAN geri okunup birebir
   karşılaştırılır → eski yapı kilitlenir → migrated:true. Herhangi bir adım düşerse işaret konmaz,
   uygulama eski düzende kalır; eski veri hiçbir zaman silinmez. */
function smReadAll(fs,wsPath){
  return new Promise(function(res,rej){
    var off=smListen(fs,wsPath,function(docs,info){if(info.fromCache)return;off();res(docs);},function(e){try{off();}catch(x){}rej(e);});
  });
}
async function smMigrate(o){
  var wsPath='workspaces/'+o.uid,log=o.log||function(){};
  var target=smToDocs(o.data);
  // 1) ön kontrol
  var chk=smCheckDocs(target);
  var bad=chk.issues.filter(function(i){return i.kind!=='nested-array';});
  if(bad.length)return{ok:false,step:'precheck',issues:bad};
  if(smCanon(smFromDocs(target))!==smCanon(o.data))return{ok:false,step:'precheck',issues:[{kind:'round-trip'}]};
  log('ön kontrol',chk.count+' belge');
  // 2) çalışma alanı + sahip üyeliği
  var wsRef=o.fs.doc(wsPath),ws=await wsRef.get();
  if(ws.exists&&ws.data().migrated===true)return{ok:true,step:'done',already:true};
  if(!ws.exists){
    var b=o.fs.batch();
    b.set(wsRef,{name:'',ownerUid:o.uid,schemaVersion:SM_VERSION,migrated:false,createdAt:o.K.FieldValue.serverTimestamp()});
    b.set(o.fs.doc(wsPath+'/members/'+o.uid),{uid:o.uid,role:'owner',teams:['*']});
    await b.commit();
    log('çalışma alanı','kuruldu');
  }
  // 3) var olanla hedefin farkı (önceki yarım deneme dahil)
  var existing=await smReadAll(o.fs,wsPath);
  var ops=smDiff(existing,target);
  var w=await smWrite(o.fs,wsPath,ops,o.K);
  log('yazım',w.written+' işlem');
  if(w.failed.length)return{ok:false,step:'write',failed:w.failed};
  // 4) sunucudan geri oku, birebir karşılaştır
  var back=await smReadAll(o.fs,wsPath);
  if(smCanon(smFromDocs(back))!==smCanon(o.data))return{ok:false,step:'verify'};
  log('doğrulama','birebir');
  // 5) eski yapıyı kilitle (arada başka cihaz yazdıysa burada düşer)
  try{await o.lockLegacy();}catch(e){return{ok:false,step:'lock',error:String((e&&(e.code||e.message))||e)};}
  log('eski yapı','kilitlendi');
  // 6) işaret: uygulama yeni yapıya geçer
  await wsRef.update({migrated:true,migratedAt:o.K.FieldValue.serverTimestamp()});
  log('işaret','migrated=true');
  return{ok:true,step:'done',docs:chk.count,written:w.written};
}
/* </store-io> */

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
