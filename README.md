# PrepWell – scheduled data file setup (no server)

How it works: a free GitHub Action runs `build-data.js` every day and saves `data/prices.json`. The app (`index.html`), hosted on GitHub Pages next to that file, reads it on load.

## Setup
1. Create a GitHub repo and upload everything in this folder (including the hidden `.github` folder).
2. Turn on GitHub Pages for the repo (Settings → Pages → deploy from the main branch). Your app will be at `https://YOURNAME.github.io/REPO/`.
3. Open the Actions tab and run "Update prices" once by hand; after that it runs daily.
4. Edit `regions.json` to the ZIP codes you want covered (the app uses the first 3 digits of the user's ZIP; others fall back to the first region).

## Where the numbers come from
- **Kroger-family stores:** add repo secrets `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET` (from developer.kroger.com). Untested adapter — check it against Kroger's docs.
- **Everything else:** generated placeholder estimates, tagged `estimate`/`demo`, **not real store prices**. For real Walmart/Hy-Vee/Aldi numbers, add prices or deals by hand in `manual.json`:
  `{"prices":[{"zip":"50309","store":"Walmart","item":"chk","price":2.49}],"deals":[{"zip":"50309","s":"Hy-Vee","i":"egg","p":0.15,"u":"2026-12-31"}]}`
  or add a paid data vendor inside `build-data.js`. Check any source's terms first.

GitHub's menus and free-tier rules change; check their current docs.

## Online recipes (TheMealDB)
The daily job also imports recipes from TheMealDB into `data/recipes.json`, and the app adds them to the Recipes tab under "🌐 Online". Ingredients are matched to PrepWell's grocery items for pricing. Recipes where under 75% of ingredients could be priced show in the library but aren't used in auto-generated plans.
- The free test key "1" is meant for development. TheMealDB asks publicly released apps to become a supporter and use their own key: add it as the repo secret `MEALDB_KEY`. Check their current terms.
- TheMealDB has several hundred meals, not thousands. For thousands, a paid API such as Spoonacular or Edamam would plug in the same way (check their caching and display terms).

## Weekly-ad deals (Flipp data via Apify)
The daily job can pull real weekly-ad sale prices for each ZIP in `regions.json`, using the Apify actor `haketa/flipp-scraper` (an independent tool, not affiliated with Flipp).
1. Create an Apify account at apify.com and copy your API token (Settings → API & Integrations).
2. Add it as the repo secret `APIFY_TOKEN`.
3. Run "Update prices". Deals are fetched about once a week per ZIP (`dealsEveryDays`) and cached in `data/deals-cache.json`, since weekly ads change weekly.
- Cost: the actor lists pricing from $2.00 per 1,000 results. With 30 grocery search terms, expect roughly 1,000–2,500 results per ZIP per run, so about $2–$5 per ZIP per week. Set `dealsMaxItems` to cap it. Check current pricing.
- Matching is best-guess: each deal is matched to an ingredient by name and to a store by merchant name. Deals whose size can't be read (for example "2 for $5" with no weight) are shown as "as advertised" but not used in plan pricing.
- Conditions such as loyalty cards, digital coupons and limits are kept and shown to users.
- These tools read Flipp's public deal listings through undocumented endpoints. Review Flipp's and Apify's terms, or get a licensed data source, before charging customers.
