// Weekly-ad deals for PrepWell, via the Apify actor "Grocery Deals & Flyer Scraper for Flipp" (haketa/flipp-scraper).
// That actor is an independent third-party tool, not affiliated with Flipp. Review Flipp's and Apify's terms before production use.
// Needs the APIFY_TOKEN secret. Pricing listed by the actor author: from $2.00 per 1,000 results (check current price).
const TERMS={chk:'chicken breast',thg:'chicken thighs',beef:'ground beef',trk:'ground turkey',stk:'sirloin steak',pork:'pork shoulder',saus:'italian sausage',sal:'salmon',shr:'shrimp',cod:'cod',egg:'eggs',milk:'milk',ch:'shredded cheese',butter:'butter',yog:'greek yogurt',rice:'rice',pasta:'pasta',bean:'black beans',tort:'tortillas',pot:'potatoes',onion:'onions',pep:'bell peppers',brc:'broccoli',ban:'bananas',avo:'avocados',spin:'spinach',car:'carrots',swp:'sweet potatoes',fb:'frozen berries',fv:'frozen vegetables'};
const BAD=/chocolate|cookie|candy|soup|broth|chips?\b|cracker|cake|\bbars?\b|sauce|seasoning|dog|cat food|baby|rolls?\b|nugget|tender|strips?\b|dinner|pizza|\bdip\b|bread|muffin|snack|cereal|treat|drink|shake|creamer|almond|oat ?milk|peanut butter|butterfinger|egg roll|noodle|salad kit|pie\b/;
const STORES=[[/walmart/,'Walmart'],[/hy-?\s?vee/,'Hy-Vee'],[/aldi/,'Aldi'],[/kroger|fry's|king soopers|ralphs|fred meyer|smith's|dillons|harris teeter|mariano|pick 'n save|qfc|food 4 less|baker's|city market|gerbes|jay c|pay less|metro market/,'Kroger'],[/target/,'Target'],[/costco/,'Costco'],[/meijer/,'Meijer'],[/sam'?s club/,'Sam’s Club']];
const sing=w=>w.replace(/ies$/,'y').replace(/oes$/,'o').replace(/s$/,'');
const matches=(name,term)=>{const n=name.toLowerCase();return !BAD.test(n)&&term.split(' ').every(w=>n.includes(sing(w)))};
function size(t){t=t.toLowerCase();let m;
 if((m=/(\d+(?:\.\d+)?)\s*(lb|lbs|pound)s?\b/.exec(t)))return{q:+m[1],u:'lb'};
 if(/\/\s?lb|\bper lb|\blb\b/.test(t))return{per:'lb'};
 if((m=/(\d+(?:\.\d+)?)\s*(oz|ounce)/.exec(t)))return{q:+m[1],u:'oz'};
 if(/dozen/.test(t))return{q:12,u:'ct'};
 if((m=/(\d+)\s*(ct|count|pk|pack)\b/.exec(t)))return{q:+m[1],u:'ct'};
 if(/\bea(ch)?\b/.test(t))return{q:1,u:'ct'};
 return null}
function convert(d,id,ITEMS){
 if(d.type!=='flyer'||d.currentPrice==null||!ITEMS[id])return null;
 const st=STORES.find(([re])=>re.test((d.merchant||'').toLowerCase()));if(!st)return null;
 if(!matches(d.name||'',TERMS[id]))return null;
 const pre=(d.prePriceText||'').trim(),post=(d.postPriceText||'').trim(),story=(d.saleStory||'').trim();
 let price=+d.currentPrice;const multi=/^(\d+)\s*(\/|for)?\s*$/i.exec(pre)||/\b(\d+)\s*for\b/i.exec(story);const mq=multi?+multi[1]:1;if(mq>1)price/=mq;
 const unit=ITEMS[id][1],sz=size([post,d.name,pre].join(' '));let p=null;
 if(sz&&sz.per&&unit==='lb')p=price;
 else if(sz&&sz.q){if(unit==='lb')p=sz.u==='lb'?price/sz.q:sz.u==='oz'?price/(sz.q/16):null;else if(unit==='oz')p=sz.u==='oz'?price/sz.q:sz.u==='lb'?price/(sz.q*16):null;else if(unit==='ea'&&sz.u==='ct')p=price/sz.q;else if(unit==='cup'&&id==='ch'&&sz.u==='oz')p=price/(sz.q/4)}
 else if(!sz&&unit==='ea'&&['pep','avo','cuc','lime','lem'].includes(id))p=price;
 const cond=[mq>1?`Price is for ${mq}`:pre,post.replace(/^\/?\s*(lb|lbs|ea|each)\.?\s*/i,''),story].map(s=>s.trim()).filter(Boolean).join(' · ');
 return{i:id,s:st[1],p:p!=null&&p>0?+p.toFixed(2):null,info:!(p>0),adv:(mq>1?`${mq} for $${(+d.currentPrice).toFixed(2)}`:`$${(+d.currentPrice).toFixed(2)}${pre?' '+pre:''}`)+(post?' '+post:''),n:d.name,cond,pc:d.discountPercent??null,u:(d.validTo||'').slice(0,10),source:'flipp'}}
async function importDeals(token,zip,ITEMS,opts={}){const ids=Object.keys(TERMS).filter(i=>ITEMS[i]);
 const r=await fetch(`https://api.apify.com/v2/acts/${opts.actor||'haketa~flipp-scraper'}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({searchTerms:ids.map(i=>TERMS[i]),postalCode:zip,locale:'en-us',includeEcom:false,maxItems:opts.maxItems||0,proxyConfiguration:{useApifyProxy:true}})});
 if(!r.ok)throw new Error('Apify returned '+r.status);const items=await r.json(),out=[],seen=new Set();
 for(const d of Array.isArray(items)?items:[]){const id=ids.find(i=>TERMS[i]===d.searchTerm);if(!id)continue;const x=convert(d,id,ITEMS);if(!x)continue;const k=[x.i,x.s,x.n,x.adv].join('|');if(!seen.has(k)){seen.add(k);out.push(x)}}
 return out}
module.exports={importDeals,convert,TERMS};
