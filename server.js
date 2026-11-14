#!/usr/bin/env node
// PrepWell API — zero dependencies, Node 18+.   Run:  WRITE_KEY=yourSecret node server.js
const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||8787,WRITE_KEY=process.env.WRITE_KEY||'dev-key',DB=path.join(__dirname,'data.json');
// item id: [national base price per unit, unit, search term]  (ids match the PrepWell app)
const ITEMS={"chk":[3.5,"lb","chicken breast"],"thg":[3,"lb","boneless chicken thighs"],"trk":[4.4,"lb","ground turkey"],"beef":[5.2,"lb","ground beef"],"stk":[8.5,"lb","sirloin steak"],"pork":[2.9,"lb","pork shoulder"],"saus":[4.5,"lb","italian sausage"],"sal":[9,"lb","salmon fillets"],"cod":[6.5,"lb","white fish"],"shr":[7.5,"lb","shrimp"],"egg":[0.28,"ea","eggs"],"tofu":[2.2,"block","extra-firm tofu"],"milk":[0.25,"cup","milk"],"yog":[1.1,"cup","plain greek yogurt"],"ch":[1.2,"cup","shredded cheese"],"cream":[1.75,"cup","heavy cream"],"parm":[2.2,"cup","grated parmesan"],"butter":[1.1,"stick","butter"],"rice":[1.1,"lb","long-grain rice"],"pasta":[1.3,"lb","pasta"],"nood":[0.19,"oz","rice noodles"],"quin":[3.5,"lb","quinoa"],"oats":[0.28,"cup","rolled oats"],"lent":[1.6,"lb","dry lentils"],"bean":[0.95,"can","black beans"],"chick":[0.95,"can","chickpeas"],"tom":[1.6,"can","crushed tomatoes"],"coco":[1.6,"can","coconut milk"],"broth":[2,"carton","broth"],"tort":[0.25,"ea","flour tortillas"],"bun":[0.25,"ea","burger buns"],"soy":[1.6,"cup","soy sauce"],"teri":[2.4,"cup","teriyaki sauce"],"bbq":[1.1,"cup","bbq sauce"],"salsa":[1.3,"cup","salsa"],"pest":[4,"cup","pesto"],"marin":[0.9,"cup","marinara"],"tikka":[2,"cup","tikka masala sauce"],"enchi":[1,"cup","enchilada sauce"],"buff":[2.2,"cup","buffalo sauce"],"hon":[4,"cup","honey"],"pb":[1.3,"cup","peanut butter"],"spice":[1.2,"packet","seasoning blend"],"onion":[0.7,"ea","onions"],"garl":[0.6,"head","garlic"],"gin":[0.5,"knob","fresh ginger"],"pep":[1,"ea","bell peppers"],"brc":[1.9,"lb","broccoli"],"pot":[0.9,"lb","potatoes"],"swp":[1.2,"lb","sweet potatoes"],"car":[1,"lb","carrots"],"spin":[0.5,"oz","baby spinach"],"lett":[1.2,"head","romaine hearts"],"cuc":[0.8,"ea","cucumbers"],"tomf":[1.8,"lb","tomatoes"],"avo":[1.1,"ea","avocados"],"lime":[0.35,"ea","limes"],"lem":[0.6,"ea","lemons"],"ban":[0.25,"ea","bananas"],"zuc":[1.6,"lb","zucchini"],"cab":[2,"bag","coleslaw mix"],"mush":[0.28,"oz","mushrooms"],"cil":[0.9,"bunch","cilantro"],"fv":[1.6,"bag","frozen mixed veggies"],"fb":[0.85,"cup","frozen berries"]};
const CHAINS={Walmart:.88,'Hy-Vee':1.05,Aldi:.82,Kroger:.97,Target:1,Costco:.85,Meijer:.98,'Sam’s Club':.84};
const REG={0:1.08,1:1.1,2:1,3:.97,4:.95,5:.93,6:.95,7:.96,8:1,9:1.1};
let db={prices:[],deals:[]};try{db=JSON.parse(fs.readFileSync(DB,'utf8'))}catch{}
const save=()=>fs.writeFileSync(DB,JSON.stringify(db));
const today=()=>new Date().toISOString().slice(0,10),addDays=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967296};
// ---- Provider 1: demo estimates (drift daily so prices "change"). NOT real store data. ----
const demoPrice=(zip,chain,item)=>+(ITEMS[item][0]*(REG[zip[0]]||1)*CHAINS[chain]*(1+(hash(item+chain+today())-.5)*.12)).toFixed(2);
function demoDeals(zip,chains){const o=[];for(const c of chains)for(const i in ITEMS)if(hash(c+zip+today()+i)<.1){const pc=10+Math.floor(hash(i+c+zip)*25);o.push({i,s:c,p:+(demoPrice(zip,c,i)*(1-pc/100)).toFixed(2),pc,u:addDays(1+Math.floor(hash(c+i)*6)),source:'demo'})}return o}
// ---- Provider 2: Kroger official API (needs KROGER_CLIENT_ID/SECRET; UNTESTED here — verify against developer.kroger.com) ----
const K={id:process.env.KROGER_CLIENT_ID,sec:process.env.KROGER_CLIENT_SECRET,tok:null,exp:0,cache:new Map()};
async function ktoken(){if(K.tok&&Date.now()<K.exp)return K.tok;const r=await fetch('https://api.kroger.com/v1/connect/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(K.id+':'+K.sec).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials&scope=product.compact'});const j=await r.json();K.tok=j.access_token;K.exp=Date.now()+(j.expires_in-60)*1e3;return K.tok}
async function kget(u){const r=await fetch('https://api.kroger.com'+u,{headers:{Authorization:'Bearer '+await ktoken(),Accept:'application/json'}});if(!r.ok)throw new Error('kroger '+r.status);return r.json()}
function perUnit(price,size,unit){if(unit=='ea')return price;if(unit=='lb'){const m=/([\d.]+)\s*(oz|lb)/i.exec(size||'');if(m)return price/(m[2].toLowerCase()=='oz'?m[1]/16:+m[1])}if(unit=='oz'){const m=/([\d.]+)\s*(oz|lb)/i.exec(size||'');if(m)return price/(m[2].toLowerCase()=='oz'?+m[1]:m[1]*16)}return null}
async function kroger(zip,item){const key=zip+item,c=K.cache.get(key);if(c&&Date.now()-c.t<216e5)return c.v;let v=null;
 const loc=(await kget(`/v1/locations?filter.zipCode.near=${zip}&filter.limit=1`)).data?.[0]?.locationId;
 if(loc){const it=(await kget(`/v1/products?filter.term=${encodeURIComponent(ITEMS[item][2])}&filter.locationId=${loc}&filter.limit=1`)).data?.[0]?.items?.[0];
  if(it?.price){const reg=perUnit(it.price.regular,it.size,ITEMS[item][1]),pr=it.price.promo?perUnit(it.price.promo,it.size,ITEMS[item][1]):null;if(reg)v={regular:+reg.toFixed(2),promo:pr?+pr.toFixed(2):0}}}
 K.cache.set(key,{t:Date.now(),v});return v}
// ---- Merge: crowd-submitted (≤14 days) > Kroger API > demo estimate ----
async function prices(zip,chains,items){const out=[],z3=zip.slice(0,3),cut=Date.now()-14*864e5;
 await Promise.all(chains.flatMap(s=>items.map(async item=>{
  const c=db.prices.filter(p=>p.store==s&&p.item==item&&p.zip.slice(0,3)==z3&&Date.parse(p.asOf)>cut).sort((a,b)=>b.asOf.localeCompare(a.asOf))[0];
  if(c)return out.push({item,store:s,unit:ITEMS[item][1],price:c.price,promo:false,asOf:c.asOf,source:'crowd'});
  if(s=='Kroger'&&K.id){try{const k=await kroger(zip,item);if(k)return out.push({item,store:s,unit:ITEMS[item][1],price:k.promo||k.regular,promo:!!k.promo,asOf:new Date().toISOString(),source:'kroger'})}catch(e){}}
  out.push({item,store:s,unit:ITEMS[item][1],price:demoPrice(zip,s,item),promo:false,asOf:today()+'T00:00:00Z',source:'estimate'})})));
 return out}
function deals(zip,chains,demo){const o=db.deals.filter(d=>d.u>=today()&&chains.includes(d.s)&&d.zip.slice(0,3)==zip.slice(0,3)).map(d=>({i:d.i,s:d.s,p:d.p,pc:Math.max(1,Math.round((1-d.p/demoPrice(zip,d.s,d.i))*100)),u:d.u,source:'crowd'}));return demo?o.concat(demoDeals(zip,chains)):o}
// ---- HTTP ----
const hits=new Map();
const send=(res,c,b)=>{res.writeHead(c,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,x-api-key','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});res.end(JSON.stringify(b))};
const body=req=>new Promise((ok,no)=>{let d='';req.on('data',c=>{d+=c;if(d.length>2e4)no(new Error('too big'))});req.on('end',()=>{try{ok(JSON.parse(d||'{}'))}catch(e){no(e)}})});
const handler=async(req,res)=>{try{
 if(req.method=='OPTIONS')return send(res,204,{});
 const ip=req.socket.remoteAddress,n=(hits.get(ip)||0)+1;hits.set(ip,n);if(n>300)return send(res,429,{error:'rate limited'});
 const u=new URL(req.url,'http://x'),q=u.searchParams,zip=(q.get('zip')||'').replace(/\D/g,'').slice(0,5)||'50309';
 const chains=(q.get('stores')||Object.keys(CHAINS).join(',')).split(',').filter(s=>CHAINS[s]),items=(q.get('items')||Object.keys(ITEMS).join(',')).split(',').filter(i=>ITEMS[i]);
 const auth=req.headers['x-api-key']==WRITE_KEY;
 if(req.method=='GET'&&u.pathname=='/'){let h=fs.readFileSync(path.join(__dirname,'public/index.html'),'utf8').replace("const CFG={api:''","const CFG={api:location.origin");res.writeHead(200,{'Content-Type':'text/html'});return res.end(h)}
 if(u.pathname=='/v1/health')return send(res,200,{ok:true,kroger:!!K.id,crowdPrices:db.prices.length,crowdDeals:db.deals.length});
 if(u.pathname=='/v1/stores')return send(res,200,{stores:chains.map(c=>({id:c+'_'+zip,chain:c,name:c+' (demo location)',zip,distanceMiles:null,source:'demo'}))});
 if(req.method=='GET'&&u.pathname=='/v1/prices')return send(res,200,{zip,prices:await prices(zip,chains,items)});
 if(req.method=='GET'&&u.pathname=='/v1/deals')return send(res,200,{zip,deals:deals(zip,chains,q.get('includeDemo')!='0')});
 if(req.method=='POST'&&(u.pathname=='/v1/prices'||u.pathname=='/v1/deals')){
  if(!auth)return send(res,401,{error:'missing or wrong x-api-key'});
  const b=await body(req),p=+b.price,z=String(b.zip||'').replace(/\D/g,'').slice(0,5);
  if(!ITEMS[b.item]||!CHAINS[b.store]||!(p>.05&&p<200)||z.length<3)return send(res,400,{error:'need zip, store, item (known id) and price'});
  if(u.pathname=='/v1/prices'){db.prices.push({zip:z,store:b.store,item:b.item,price:p,asOf:new Date().toISOString()});db.prices=db.prices.slice(-5000)}
  else{db.deals.push({zip:z,s:b.store,i:b.item,p,u:b.until||addDays(7)});db.deals=db.deals.slice(-2000)}
  save();return send(res,201,{ok:true})}
 send(res,404,{error:'not found'})}catch(e){send(res,500,{error:String(e.message||e)})}};
if(require.main===module){http.createServer(handler).listen(PORT,()=>console.log(`PrepWell API on :${PORT}`));setInterval(()=>hits.clear(),6e4)}
module.exports={ITEMS,CHAINS,prices,deals,db};
