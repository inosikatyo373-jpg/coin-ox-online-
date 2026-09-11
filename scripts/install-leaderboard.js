const fs=require('fs');
const path=require('path');

const serverPath=path.join(__dirname,'../server/server.js');
const indexPath=path.join(__dirname,'../public/index.html');

let server=fs.readFileSync(serverPath,'utf8');
const staticMarker='app.use(express.static(path.join(__dirname,"../public")));';
const endpoint=`app.get("/api/leaderboard",async(req,res)=>{\n  if(!accountConfigured()) return res.status(503).json({error:"ランキング機能がまだ設定されていません。"});\n  try{\n    const rows=await sbFetch("/rest/v1/profiles?select=display_name,rating&order=rating.desc,display_name.asc&limit=100",{\n      key:SUPABASE_SERVICE_ROLE_KEY,\n      headers:{Accept:"application/json"}\n    });\n    res.set("Cache-Control","no-store");\n    res.json({\n      ok:true,\n      players:(Array.isArray(rows)?rows:[]).map(row=>({\n        name:cleanDisplayName(row?.display_name,"PLAYER"),\n        rating:Number.isFinite(Number(row?.rating))?Number(row.rating):1500\n      }))\n    });\n  }catch(err){\n    console.error("leaderboard failed",err.message);\n    res.status(err.status||500).json({error:"ランキングを取得できませんでした。"});\n  }\n});\n\n`;
if(!server.includes('/api/leaderboard')){
  if(!server.includes(staticMarker)) throw new Error('static middleware marker not found');
  server=server.replace(staticMarker,endpoint+staticMarker);
  fs.writeFileSync(serverPath,server);
}

let html=fs.readFileSync(indexPath,'utf8');
const tag='<script src="/leaderboard.js?v=1"></script>';
if(!html.includes(tag)){
  if(!html.includes('</body>')) throw new Error('body end not found');
  html=html.replace('</body>',tag+'</body>');
  fs.writeFileSync(indexPath,html);
}

console.log('Leaderboard endpoint/UI ready');
