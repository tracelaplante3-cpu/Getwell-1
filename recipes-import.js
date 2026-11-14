// Imports recipes from TheMealDB (https://www.themealdb.com) into PrepWell's format.
// Free test key "1" is for development; TheMealDB asks apps released publicly to become a supporter
// and use their own key (set MEALDB_KEY). Check their current terms before launch.
const MAP=[[/chicken stock|beef stock|vegetable stock|stock|broth/,'broth'],[/peanut butter/,'pb'],[/coconut milk|coconut cream/,'coco'],[/egg noodle|rice noodle|noodle/,'nood'],
[/chicken breast/,'chk'],[/chicken thigh/,'thg'],[/chicken/,'chk'],[/minced beef|ground beef|beef mince/,'beef'],[/beef|steak|sirloin/,'stk'],[/sausage|chorizo/,'saus'],[/pork/,'pork'],
[/salmon/,'sal'],[/cod|haddock|white fish/,'cod'],[/prawn|shrimp/,'shr'],[/^eggs?$|egg yolk|egg white|^egg/,'egg'],[/tofu/,'tofu'],[/yogurt|yoghurt/,'yog'],[/parmesan/,'parm'],
[/double cream|heavy cream|single cream|^cream$/,'cream'],[/cheese|cheddar|mozzarella/,'ch'],[/butter/,'butter'],[/milk/,'milk'],[/basmati|rice/,'rice'],
[/spaghetti|penne|linguine|macaroni|fusilli|tagliatelle|lasagne|pasta/,'pasta'],[/quinoa/,'quin'],[/oats/,'oats'],[/lentil/,'lent'],[/black beans|kidney beans|beans/,'bean'],[/chickpea/,'chick'],
[/chopped tomatoes|tinned tomatoes|canned tomatoes|tomato puree|tomato paste|passata/,'tom'],[/tomato/,'tomf'],[/tortilla/,'tort'],[/soy sauce/,'soy'],[/honey/,'hon'],
[/sweet potato/,'swp'],[/potato/,'pot'],[/spring onion|scallion|onion|shallot/,'onion'],[/garlic/,'garl'],[/ginger/,'gin'],[/red pepper|green pepper|yellow pepper|bell pepper/,'pep'],
[/broccoli/,'brc'],[/carrot/,'car'],[/spinach/,'spin'],[/lettuce|romaine/,'lett'],[/cucumber/,'cuc'],[/avocado/,'avo'],[/lime/,'lime'],[/lemon/,'lem'],[/banana/,'ban'],
[/courgette|zucchini/,'zuc'],[/cabbage/,'cab'],[/mushroom/,'mush'],[/coriander leaves|fresh coriander|cilantro/,'cil'],[/peas|vegetables|sweetcorn|stir-fry veg/,'fv']];
const BASIC=/salt|black pepper|^pepper$|oil|water|sugar|cumin|paprika|oregano|thyme|basil|parsley|rosemary|cinnamon|chil+i powder|turmeric|garam masala|bay lea|nutmeg|cayenne|^coriander$|ground coriander|cardamom|^cloves$|stock cube|vinegar|mustard|worcestershire|flour|baking|spice|seasoning|herbs|^ground |cornstarch|cornflour|corn starch/;
const W={g:1/453.6,gram:1/453.6,grams:1/453.6,kg:2.2046,lb:1,lbs:1,pound:1,pounds:1,oz:1/16,ounce:1/16,ounces:1/16};
const V={ml:1/240,l:4.17,litre:4.17,liter:4.17,cup:1,cups:1,tbsp:1/16,tbs:1/16,tblsp:1/16,tablespoon:1/16,tablespoons:1/16,tsp:1/48,teaspoon:1/48,teaspoons:1/48};
function parse(m){m=(m||'').toLowerCase().replace(/½/g,' 1/2').replace(/¼/g,' 1/4').replace(/¾/g,' 3/4').trim().replace(/^\d+\s*\(([^)]*)\)/,'$1');
 const nm=/^([\d\s\/.]+)/.exec(m);let n=null;if(nm)n=nm[1].trim().split(/\s+/).reduce((a,p)=>{const f=p.split('/');return a+(f.length==2?+f[0]/+f[1]:+p||0)},0)||null;
 const um=/(\d|\s|^)(kg|grams?|g|lbs?|pounds?|oz|ounces?|ml|litre|liter|l|cups?|tbsp|tbs|tblsp|tablespoons?|tsp|teaspoons?|cloves?|cans?|tins?|bunch|handful|pinch|slices?)\b/.exec(m);
 return{n,u:um?um[2]:''}}
function conv(id,unit,{n,u}){const k=n||1,lb=W[u]!=null?k*W[u]:V[u]!=null?k*V[u]*.5:null,cup=V[u]!=null?k*V[u]:W[u]!=null?k*W[u]*2:null;
 switch(unit){case 'lb':return lb??k*.4;case 'oz':return lb!=null?lb*16:k*4;case 'cup':return cup??k*.25;
 case 'head':return /clove/.test(u)?k/10:k*(u?.2:1);case 'can':return /can|tin/.test(u)||!u?k:lb!=null?lb*453.6/425:cup*240/425;
 case 'carton':return cup!=null?cup/4:1;case 'bag':return lb!=null?lb/.85:1;case 'stick':return lb!=null?lb*4:cup!=null?cup*2:1;
 default:return u&&!/clove|slice/.test(u)&&(lb!=null||cup!=null)?Math.max(1,k*.5):k}}
const EMO={Beef:'🥩',Chicken:'🍗',Lamb:'🍖',Goat:'🍖',Pasta:'🍝',Pork:'🐖',Seafood:'🐟',Vegetarian:'🥗',Vegan:'🌱',Breakfast:'🍳'};
function convert(meal,ITEMS){if(/Dessert|Starter|Side|Miscellaneous/.test(meal.strCategory||''))return null;
 const ing={},extra=[],names=[];
 for(let k=1;k<=20;k++){const nm=(meal['strIngredient'+k]||'').trim(),ms=(meal['strMeasure'+k]||'').trim();if(!nm)continue;const low=nm.toLowerCase();names.push(low);
  const hit=/^ground (ginger|cinnamon|cumin|coriander|nutmeg|cloves|black pepper|allspice)/.test(low)?null:MAP.find(([re])=>re.test(low));if(hit&&ITEMS[hit[1]]&&!(hit[1]=='pep'&&/black/.test(low))){const q=conv(hit[1],ITEMS[hit[1]][1],parse(ms));ing[hit[1]]=+((ing[hit[1]]||0)+q).toFixed(2)}
  else if(!BASIC.test(low))extra.push((ms?ms+' ':'')+nm)}
 const all=names.join(' | ');if(!Object.keys(ing).length)return null;
 const meat=/chicken|beef|pork|lamb|goat|sausage|bacon|ham|turkey|salmon|cod|fish|prawn|shrimp|tuna|anchov|chorizo|duck|mince/.test(all);
 const veg=meat?0:/egg|milk|cheese|butter|cream|yog|honey|parmesan/.test(all.replace(/coconut milk|peanut butter/g,''))?1:2;
 const alg=[[/milk|cheese|butter|cream|yog|parmesan/,'dairy'],[/egg/,'egg'],[/flour|bread|pasta|spaghetti|noodle|tortilla|soy sauce|penne|macaroni|lasagne|couscous/,'gluten'],[/soy|tofu/,'soy'],[/peanut/,'peanut'],[/salmon|cod|tuna|anchov|fish|haddock|mackerel/,'fish'],[/prawn|shrimp|crab|lobster|mussel|clam|scallop/,'shellfish']]
  .filter(([re])=>re.test(all.replace(/coconut milk|peanut butter|butternut/g,''))).map(x=>x[1]);
 let st=(meal.strInstructions||'').split(/\r?\n+/).map(s=>s.replace(/^\s*(step\s*\d+[:.)]?|\d+[.)])\s*/i,'').trim()).filter(s=>s.length>2&&!/^step\s*\d+$/i.test(s));
 if(st.length<3)st=(meal.strInstructions||'').split(/(?<=[.!?])\s+/).reduce((a,s,i)=>{if(i%2==0)a.push(s);else a[a.length-1]+=' '+s;return a},[]).map(s=>s.trim()).filter(Boolean);
 const n=meal.strMeal,low=n.toLowerCase(),tags=[[/soup|stew|chowder|chili|curry/,'soup'],[/pasta|spaghetti|lasagn|penne|macaroni|linguine/,'pasta'],[/taco|burrito|wrap|quesadilla|fajita/,'taco'],[/stir|fried rice|noodle|chow mein/,'stir'],[/bowl/,'bowl'],[/salad/,'salad'],[/bake|casserole|pie|roast|pot/,'comfort']].filter(([re])=>re.test(low)).map(x=>x[1]);
 const priced=Object.keys(ing).length/(Object.keys(ing).length+extra.length);
 return{id:'mdb'+meal.idMeal,n,e:EMO[meal.strCategory]||'🍽️',t:meal.strCategory=='Breakfast'?'b':'m',min:null,veg:meal.strCategory=='Vegan'?2:meal.strCategory=='Vegetarian'?Math.max(veg,1):veg,
  sp:/scotch bonnet|habanero/.test(all)?2:/chil+i|cayenne|jalape|sriracha|hot sauce/.test(all)?1:0,tags,cu:meal.strArea&&meal.strArea!='Unknown'?meal.strArea:'World',kcal:null,pro:null,ing,extra,alg,
  part:priced<.75,desc:`${meal.strArea&&meal.strArea!='Unknown'?meal.strArea+' ':''}${(meal.strCategory||'').toLowerCase()} recipe from TheMealDB.`,steps:st.slice(0,12),img:meal.strMealThumb||'',src:'TheMealDB',url:`https://www.themealdb.com/meal/${meal.idMeal}`}}
async function importMealDB(key,ITEMS){const out=[],seen=new Set();
 for(const c of 'abcdefghijklmnopqrstuvwxyz'){try{const r=await fetch(`https://www.themealdb.com/api/json/v1/${key}/search.php?f=${c}`);const j=await r.json();
  for(const m of j.meals||[]){if(seen.has(m.idMeal))continue;seen.add(m.idMeal);const x=convert(m,ITEMS);if(x)out.push(x)}}catch(e){console.log('MealDB',c,e.message)}
  await new Promise(r=>setTimeout(r,500))}
 return out}
module.exports={convert,importMealDB,parse};
