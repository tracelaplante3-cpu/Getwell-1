// Builds data/prices.json for the PrepWell app. Run daily by GitHub Actions:  node build-data.js
const fs=require('fs'),S=require('./server.js');
(async()=>{
 const cfg=JSON.parse(fs.readFileSync('regions.json','utf8')),man=fs.existsSync('manual.json')?JSON.parse(fs.readFileSync('manual.json','utf8')):{};
 const now=new Date().toISOString();
 S.db.prices.push(...(man.prices||[]).map(p=>({...p,asOf:p.asOf||now})));S.db.deals.push(...(man.deals||[]));
 const regions={},chains=Object.keys(S.CHAINS),items=Object.keys(S.ITEMS),today=now.slice(0,10),DC='data/deals-cache.json';let first,vend={};
 try{vend=JSON.parse(fs.readFileSync(DC,'utf8'))}catch(e){}
 for(const zip of cfg.zips){const k=zip.slice(0,3);if(regions[k])continue;first=first||k;
  if(process.env.APIFY_TOKEN&&(!vend[k]||Date.now()-Date.parse(vend[k].at)>(cfg.dealsEveryDays||6)*864e5)){
   try{vend[k]={at:now,deals:await require('./deals-import.js').importDeals(process.env.APIFY_TOKEN,zip,S.ITEMS,{maxItems:cfg.dealsMaxItems||0})};console.log('Weekly-ad deals for',k+':',vend[k].deals.length)}
   catch(e){console.log('Weekly-ad deals skipped for',k+':',e.message)}}
  const real=(vend[k]?vend[k].deals:[]).filter(d=>!d.u||d.u>=today);
  regions[k]={zip,prices:await S.prices(zip,chains,items),deals:real.concat(S.deals(zip,chains,!real.length&&cfg.includeDemoDeals!==false))}}
 fs.mkdirSync('data',{recursive:true});fs.writeFileSync(DC,JSON.stringify(vend));
 fs.mkdirSync('data',{recursive:true});
 fs.writeFileSync('data/prices.json',JSON.stringify({updatedAt:now,default:first,regions}));
 console.log('Wrote data/prices.json for regions:',Object.keys(regions).join(', '));
 if(cfg.importRecipes!==false){try{const rec=await require('./recipes-import.js').importMealDB(process.env.MEALDB_KEY||'1',S.ITEMS);
  if(rec.length){fs.writeFileSync('data/recipes.json',JSON.stringify({updatedAt:now,source:'TheMealDB',recipes:rec}));console.log('Wrote data/recipes.json with',rec.length,'recipes')}}
  catch(e){console.log('Recipe import skipped:',e.message)}}
})();
