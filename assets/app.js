import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const KEY="airdropx-config";
const CATS=[
 {slug:"all",name:"All",icon:"✨",desc:"Every campaign"},
 {slug:"telegram-bots",name:"Telegram Bots",icon:"🤖",desc:"Bot campaigns"},
 {slug:"testnets",name:"Testnets",icon:"⛓️",desc:"Testnet activity"},
 {slug:"nft-whitelist",name:"NFT Whitelist",icon:"🖼️",desc:"Allowlist campaigns"},
 {slug:"nft-gtd",name:"NFT GTD",icon:"🎟️",desc:"GTD campaigns"},
 {slug:"free-mint",name:"Free Mint",icon:"🆓",desc:"Free mint campaigns"},
 {slug:"other-web3",name:"Other Web3",icon:"🌐",desc:"Other campaigns"}
];
const DEMO=[
 {id:"demo-1",title:"Telegram Bot Starter",slug:"telegram-bot-starter",description:"Complete a Telegram campaign and submit the requested proof.",total_reward:.05,estimated_time:"2 min",completed_count:184,categories:{name:"Telegram Bots",slug:"telegram-bots",icon:"🤖"}},
 {id:"demo-2",title:"Nova Testnet Sprint",slug:"nova-testnet-sprint",description:"Try a testnet campaign and submit transaction proof.",total_reward:.10,estimated_time:"7 min",completed_count:92,categories:{name:"Testnets",slug:"testnets",icon:"⛓️"}},
 {id:"demo-3",title:"Pixel Bears Whitelist",slug:"pixel-bears-whitelist",description:"Complete whitelist campaign tasks and submit proof.",total_reward:.03,estimated_time:"3 min",completed_count:311,categories:{name:"NFT Whitelist",slug:"nft-whitelist",icon:"🖼️"}},
 {id:"demo-4",title:"Free Mint Scout",slug:"free-mint-scout",description:"Find the official mint and complete the campaign instructions.",total_reward:.02,estimated_time:"3 min",completed_count:77,categories:{name:"Free Mint",slug:"free-mint",icon:"🆓"}},
 {id:"demo-5",title:"Web3 Quest Alpha",slug:"web3-quest-alpha",description:"Complete a short Web3 campaign and provide proof.",total_reward:.07,estimated_time:"5 min",completed_count:145,categories:{name:"Other Web3",slug:"other-web3",icon:"🌐"}}
];

let cfg=loadCfg(), sb=null, session=null, profile=null;
function loadCfg(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return{}}}
function esc(v){return String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[x]))}
function money(n){return "$"+Number(n||0).toFixed(2)}
function slugify(s){return String(s||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)}
function toast(m){let x=document.createElement("div");x.className="toast";x.textContent=m;document.body.append(x);setTimeout(()=>x.remove(),3200)}
function go(p){history.pushState({},'',p);route()}
function saveCfg(c){localStorage.setItem(KEY,JSON.stringify(c));cfg=c;init()}
async function init(){
 if(cfg.url&&cfg.anonKey){
  sb=createClient(cfg.url,cfg.anonKey);
  const s=await sb.auth.getSession();session=s.data.session;
  await loadProfile();
  sb.auth.onAuthStateChange((_e,s)=>{session=s;loadProfile().then(route)});
 }else{sb=null;session=null;profile=null}
 route();
}
async function loadProfile(){if(!sb||!session){profile=null;return}const r=await sb.from("profiles").select("*").eq("id",session.user.id).maybeSingle();profile=r.data||null}
function demoByCat(cat){return cat==="all"?DEMO:DEMO.filter(x=>x.categories.slug===cat)}
async function campaigns(cat="all"){
 if(!sb)return demoByCat(cat);
 let q=sb.from("campaigns").select("*,categories(name,slug,icon)").eq("status","active").order("created_at",{ascending:false}).limit(100);
 if(cat!=="all")q=q.eq("categories.slug",cat);
 const r=await q;return r.error?[]:(r.data||[])
}
function shell(content){
 const p=location.pathname;
 const active=x=>p===x||p.startsWith(x+"/");
 return `<div class="top"><div class="wrap"><span>WEB3 MICRO-REWARDS</span><span>${session?"SIGNED IN":"COMPLETE · PROVE · EARN"}</span></div></div>
 <nav class="nav"><div class="wrap navin"><a class="brand" href="/"><span class="brandmark">✦</span>AIRDROPX</a><button class="btn sm mobile" id="mobile">MENU</button><div class="links" id="links">
 <a class="${active("/airdrops")?"active":""}" href="/airdrops">Airdrops</a><a class="${active("/earn")?"active":""}" href="/earn">Earn</a>${session?`<a class="${active("/wallet")?"active":""}" href="/wallet">Wallet</a><a class="${active("/leaderboard")?"active":""}" href="/leaderboard">Leaderboard</a>`:""}<a href="/faq">FAQ</a>${session?`<button class="btn sm" id="logout">Logout</button>`:`<a class="btn sm primary" href="/login">Login</a>`}</div></div></nav>
 <main>${content}</main><footer class="footer"><div class="wrap foot"><div><b>AIRDROPX</b><br>Web3 tasks and rewards.</div><div><a href="/faq">FAQ</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></div></div></footer>`;
}
async function route(){
 let saved=sessionStorage.getItem("airdropx-route");if(saved){sessionStorage.removeItem("airdropx-route");history.replaceState({},'',saved)}
 const p=location.pathname.replace(/\/+$/,"")||"/";let c;
 if(p==="/")c=await home();
 else if(p==="/airdrops")c=await listing("all");
 else if(p==="/earn")c=await listing("all");
 else if(/^\/airdrops\/[^/]+\/[^/]+$/.test(p))c=await detail(p.split("/")[3]);
 else if(/^\/airdrops\/[^/]+$/.test(p))c=await listing(p.split("/")[2]);
 else if(p==="/login")c=auth(false);
 else if(p==="/register")c=auth(true);
 else if(p==="/wallet"||p==="/earnings")c=await wallet();
 else if(p==="/withdraw")c=await withdraw();
 else if(p==="/leaderboard")c=await leaderboard();
 else if(p==="/faq")c=faq();
 else if(p==="/terms"||p==="/privacy")c=legal(p.slice(1));
 else if(p==="/setup")c=setup();
 else if(p==="/admin")c=await admin();
 else if(p==="/admin/submissions")c=await adminReview("submissions");
 else if(p==="/admin/withdrawals")c=await adminReview("withdrawals");
 else if(p.startsWith("/admin/campaign/"))c=await adminCampaign(p.split("/")[3]);
 else c=`<section class="page wrap"><div class="empty"><h2>404</h2><a class="btn primary" href="/">Back Home</a></div></section>`;
 document.querySelector("#app").innerHTML=shell(c);bind()
}
function grid(arr){
 if(!arr.length)return `<div class="empty">No campaigns found.</div>`;
 return `<div class="grid">${arr.map(x=>`<article class="card"><div class="cardtop"><div class="logo">${x.logo_url?`<img src="${esc(x.logo_url)}">`:esc(x.categories?.icon||"🪂")}</div><span class="badge">${esc(x.categories?.name||"Airdrop")}</span></div><h3>${esc(x.title)}</h3><p>${esc((x.description||"").slice(0,120))}</p><div class="stats"><span>⏱ ${esc(x.estimated_time||"—")}</span><span>👥 ${Number(x.completed_count||0)}</span><b class="reward">up to ${money(x.total_reward)}</b></div><a class="btn primary" href="/airdrops/${esc(x.categories?.slug||"other-web3")}/${esc(x.slug)}">View Airdrop →</a></article>`).join("")}</div>`
}
async function home(){
 const arr=await campaigns();
 return `<section class="hero"><div class="wrap heroGrid"><div><span class="eyebrow">● LIVE WEB3 EARNING PLATFORM</span><h1>Complete Web3 Tasks.<br><span>Earn Rewards.</span></h1><p>Discover Airdrops, Telegram campaigns, Testnets, NFT Whitelists, GTD, Free Mints and other Web3 opportunities. Complete tasks, submit proof and build your reward balance.</p><div class="actions"><a class="btn primary" href="/airdrops">Explore Airdrops →</a>${session?`<a class="btn" href="/wallet">Open Wallet</a>`:`<a class="btn" href="/register">Create Account</a>`}</div></div><div class="heroCard"><div class="metric"><span>Active Campaigns</span><b>${arr.length||0}+</b></div><div class="metric"><span>Minimum Withdrawal</span><b>$1.00</b></div><div class="metric"><span>Proof Review</span><b>Manual</b></div><div class="metric"><span>Reward Tracking</span><b>Ledger</b></div></div></div></section>
 <section class="section"><div class="wrap"><div class="head"><h2>Categories</h2><a class="muted" href="/airdrops">All →</a></div><div class="cats">${CATS.slice(1).map(x=>`<a class="cat" href="/airdrops/${x.slug}"><i>${x.icon}</i><b>${x.name}</b><small>${x.desc}</small></a>`).join("")}</div></div></section>
 <section class="section"><div class="wrap"><div class="head"><h2>Featured Airdrops</h2><a class="muted" href="/airdrops">See all →</a></div>${grid(arr.slice(0,6))}</div></section>`
}
async function listing(cat){
 const x=CATS.find(c=>c.slug===cat)||CATS[0],arr=await campaigns(x.slug);
 return `<section class="page wrap"><span class="eyebrow">🪂 AIRDROPS</span><h1>${x.name}</h1><p class="muted">Complete campaigns, submit proof and earn the listed reward.</p><div class="toolbar"><input class="input search" id="search" placeholder="Search campaigns..."><div class="filters">${CATS.map(c=>`<button class="btn sm ${c.slug===x.slug?"active":""}" data-cat="${c.slug}">${c.icon} ${c.name}</button>`).join("")}</div></div><div id="results">${grid(arr)}</div></section>`
}
async function detail(slug){
 let c,tasks=[];
 if(!sb){c=DEMO.find(x=>x.slug===slug);if(c)tasks=[{id:"demo",title:"Complete campaign action",description:"Demo task. Connect Supabase to publish real tasks and accept real proofs.",reward:c.total_reward,external_url:"#"}]}
 else{let r=await sb.from("campaigns").select("*,categories(name,slug,icon)").eq("slug",slug).maybeSingle();c=r.data;if(c){let q=await sb.from("tasks").select("*").eq("campaign_id",c.id).eq("status","active").order("sort_order");tasks=q.data||[]}}
 if(!c)return `<section class="page wrap"><div class="empty"><h2>Airdrop not found</h2><a class="btn primary" href="/airdrops">Browse Airdrops</a></div></section>`;
 return `<section class="page wrap"><div class="detail"><div><div class="panel"><div class="detailHero"><div class="detailLogo">${c.logo_url?`<img src="${esc(c.logo_url)}">`:esc(c.categories.icon)}</div><div><span class="badge">${esc(c.categories.name)}</span><h1>${esc(c.title)}</h1><b class="reward">Earn up to ${money(c.total_reward)}</b></div></div><hr style="border:0;border-top:1px solid var(--line);margin:20px 0"><p class="muted">${esc(c.description||"")}</p></div><div class="panel" style="margin-top:16px"><div class="head"><h2>Tasks</h2></div>${tasks.length?tasks.map((t,i)=>`<div class="task"><div class="taskRow"><div><b>${i+1}. ${esc(t.title)}</b><p>${esc(t.description||"")}</p></div><div class="taskActions"><b class="reward">${money(t.reward)}</b><button class="btn sm primary taskBtn" data-id="${t.id}" data-campaign="${c.id}">Start</button></div></div></div>`).join(""):`<div class="empty">No tasks published.</div>`}</div></div><aside><div class="panel"><h3>Campaign Info</h3><div class="metric"><span>Category</span><b>${esc(c.categories.name)}</b></div><div class="metric"><span>Time</span><b>${esc(c.estimated_time||"—")}</b></div><div class="metric"><span>Completed</span><b>${Number(c.completed_count||0)}</b></div><div class="metric"><span>Status</span><b>ACTIVE</b></div></div>${!sb?`<div class="panel" style="margin-top:16px"><div class="notice warn">Demo mode: connect Supabase at <a href="/setup" style="color:var(--a)">/setup</a> for real earning.</div></div>`:""}</aside></div></section>`
}
function auth(reg){
 return `<section class="auth wrap"><div class="authbox"><span class="eyebrow">${reg?"CREATE ACCOUNT":"WELCOME BACK"}</span><h1>${reg?"Join AIRDROPX":"Login"}</h1><p class="muted">${reg?"Create an account to start earning.":"Access your wallet and submissions."}</p><form id="authForm"><div class="field"><label>Email</label><input class="input" id="email" type="email" required></div><div class="field"><label>Password</label><input class="input" id="pass" type="password" minlength="6" required></div>${reg?`<div class="field"><label>Username</label><input class="input" id="user" required></div>`:""}<button class="btn primary" style="width:100%">${reg?"Create Account":"Login"}</button></form><p class="muted">${reg?`Already registered? <a style="color:var(--a)" href="/login">Login</a>`:`New here? <a style="color:var(--a)" href="/register">Create account</a>`}</p></div></section>`
}
async function wallet(){
 if(!session)return authRequired();
 let q=await sb.from("wallet_transactions").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(50);
 return `<section class="page wrap"><span class="eyebrow">WALLET</span><h1>My Earnings</h1><div class="dash"><div class="stat"><small>Available</small><b>${money(profile?.available_balance)}</b></div><div class="stat"><small>Pending</small><b>${money(profile?.pending_balance)}</b></div><div class="stat"><small>Total Earned</small><b>${money(profile?.total_earned)}</b></div><div class="stat"><small>Minimum Withdraw</small><b>$1.00</b></div></div><div class="actions"><a class="btn primary" href="/withdraw">Withdraw →</a></div><div class="panel" style="margin-top:18px"><h2>Transactions</h2>${q.data?.length?`<div class="tableWrap"><table class="table"><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead><tbody>${q.data.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString()}</td><td>${esc(x.description)}</td><td>${esc(x.type)}</td><td class="reward">${Number(x.amount)>=0?"+":""}${money(x.amount)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No transactions yet.</div>`}</div></section>`
}
async function withdraw(){
 if(!session)return authRequired();
 let w=await sb.from("withdrawals").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false});
 let bal=Number(profile?.available_balance||0);
 return `<section class="page wrap"><div class="detail"><div class="panel"><span class="eyebrow">WITHDRAW</span><h1>Request Payout</h1><div class="notice">${money(bal)} available · Minimum $1.00</div><form id="withdrawForm" style="margin-top:18px"><div class="field"><label>Amount</label><input class="input" id="amount" type="number" min="1" max="${bal}" step=".01" required></div><div class="field"><label>Method</label><select class="select" id="method"><option>USDT</option><option>Manual</option></select></div><div class="field"><label>Destination</label><input class="input" id="dest" required></div><button class="btn primary" ${bal<1?"disabled":""}>Request Withdrawal</button></form></div><div class="panel"><h2>History</h2>${w.data?.length?w.data.map(x=>`<div class="task"><b>${money(x.amount)}</b><p>${esc(x.method)} · ${esc(x.status)}</p></div>`).join(""):`<div class="empty">No withdrawals yet.</div>`}</div></div></section>`
}
async function leaderboard(){
 if(!sb)return `<section class="page wrap"><div class="empty">Connect Supabase to load the live leaderboard.</div></section>`;
 let q=await sb.from("profiles").select("username,total_earned").order("total_earned",{ascending:false}).limit(50);
 return `<section class="page wrap"><span class="eyebrow">LEADERBOARD</span><h1>Top Earners</h1><div class="panel"><div class="tableWrap"><table class="table"><thead><tr><th>#</th><th>User</th><th>Total Earned</th></tr></thead><tbody>${(q.data||[]).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.username||"User")}</td><td class="reward">${money(x.total_earned)}</td></tr>`).join("")}</tbody></table></div></div></section>`
}
function faq(){return `<section class="page wrap"><span class="eyebrow">HELP</span><h1>FAQ</h1><div class="panel"><h3>How do I earn?</h3><p class="muted">Open a campaign, complete its tasks and submit the requested proof.</p><h3>When is a reward credited?</h3><p class="muted">After an admin reviews and approves the proof.</p><h3>Minimum withdrawal?</h3><p class="muted">$1.00 by default.</p><h3>Can I submit a task twice?</h3><p class="muted">No. The database prevents duplicate user/task submissions.</p></div></section>`}
function legal(t){return `<section class="page wrap"><span class="eyebrow">${t.toUpperCase()}</span><h1>${t}</h1><div class="panel"><p class="muted">Replace this text with your final ${t} before public launch.</p></div></section>`}
function setup(){return `<section class="auth wrap"><div class="authbox"><span class="eyebrow">ONE-TIME SETUP</span><h1>Connect Supabase</h1><p class="muted">Use only the Supabase URL and anon public key. Never use the service-role key here.</p><form id="setup"><div class="field"><label>Project URL</label><input class="input" id="url" value="${esc(cfg.url||"")}" required></div><div class="field"><label>Anon Public Key</label><textarea class="textarea" id="key" required>${esc(cfg.anonKey||"")}</textarea></div><button class="btn primary">Save & Connect</button></form></div></section>`}
function authRequired(){return `<section class="page wrap"><div class="empty"><h2>Login required</h2><a class="btn primary" href="/login">Login</a></div></section>`}

async function admin(){
 if(!session)return authRequired();if(!await isAdmin())return `<section class="page wrap"><div class="empty"><h2>Admin access required</h2></div></section>`;
 let [u,s,w,c]=await Promise.all([
  sb.from("profiles").select("*",{count:"exact",head:true}),
  sb.from("task_submissions").select("*",{count:"exact",head:true}).eq("status","pending"),
  sb.from("withdrawals").select("*",{count:"exact",head:true}).eq("status","pending"),
  sb.from("campaigns").select("*,categories(name,slug)").order("created_at",{ascending:false}).limit(100)
 ]);
 return `<section class="page wrap"><span class="eyebrow">ADMIN CONTROL</span><h1>Dashboard</h1><div class="dash"><div class="stat"><small>Users</small><b>${u.count||0}</b></div><div class="stat"><small>Pending Proofs</small><b>${s.count||0}</b></div><div class="stat"><small>Pending Withdrawals</small><b>${w.count||0}</b></div><div class="stat"><small>Campaigns</small><b>${c.data?.length||0}</b></div></div><div class="actions"><button class="btn primary" id="addCampaign">+ Add Campaign</button><a class="btn" href="/admin/submissions">Review Proofs</a><a class="btn" href="/admin/withdrawals">Withdrawals</a></div><div class="panel" style="margin-top:18px"><div class="tableWrap"><table class="table"><thead><tr><th>Campaign</th><th>Category</th><th>Reward</th><th>Status</th><th></th></tr></thead><tbody>${(c.data||[]).map(x=>`<tr><td>${esc(x.title)}</td><td>${esc(x.categories?.name)}</td><td>${money(x.total_reward)}</td><td>${esc(x.status)}</td><td><button class="btn sm editCampaign" data-id="${x.id}">Edit</button> <a class="btn sm" href="/admin/campaign/${x.id}">Tasks</a></td></tr>`).join("")}</tbody></table></div></div></section>`
}
async function isAdmin(){let r=await sb.from("admin_users").select("user_id").eq("user_id",session.user.id).maybeSingle();return !!r.data}
async function adminCampaign(id){
 if(!session||!await isAdmin())return authRequired();
 let c=await sb.from("campaigns").select("*,categories(name,slug)").eq("id",id).single(),t=await sb.from("tasks").select("*").eq("campaign_id",id).order("sort_order");
 if(!c.data)return `<section class="page wrap"><div class="empty">Campaign not found.</div></section>`;
 return `<section class="page wrap"><span class="eyebrow">ADMIN · TASKS</span><h1>${esc(c.data.title)}</h1><div class="actions"><button class="btn primary" id="addTask" data-campaign="${id}">+ Add Task</button><a class="btn" href="/admin">Back</a></div><div class="panel" style="margin-top:18px"><div class="tableWrap"><table class="table"><thead><tr><th>Order</th><th>Task</th><th>Reward</th><th>URL</th><th></th></tr></thead><tbody>${(t.data||[]).map(x=>`<tr><td>${x.sort_order}</td><td>${esc(x.title)}</td><td>${money(x.reward)}</td><td>${x.external_url?`<a target="_blank" href="${esc(x.external_url)}">Open</a>`:"—"}</td><td><button class="btn sm editTask" data-id="${x.id}">Edit</button></td></tr>`).join("")}</tbody></table></div></div></section>`
}
async function adminReview(kind){
 if(!session||!await isAdmin())return authRequired();
 if(kind==="submissions"){
  let q=await sb.from("task_submissions").select("*,profiles(username,email),tasks(title,reward),campaigns(title)").eq("status","pending").order("created_at");
  return `<section class="page wrap"><span class="eyebrow">ADMIN</span><h1>Proof Submissions</h1><div class="panel"><div class="tableWrap"><table class="table"><thead><tr><th>User</th><th>Campaign</th><th>Task</th><th>Proof</th><th>Reward</th><th></th></tr></thead><tbody>${(q.data||[]).map(x=>`<tr><td>${esc(x.profiles?.username||x.profiles?.email)}</td><td>${esc(x.campaigns?.title)}</td><td>${esc(x.tasks?.title)}</td><td>${esc(x.proof_text||"")}${x.proof_image_url?`<br><a target="_blank" href="${esc(x.proof_image_url)}">Screenshot</a>`:""}</td><td>${money(x.tasks?.reward)}</td><td><button class="btn sm primary approve" data-id="${x.id}">Approve</button> <button class="btn sm danger reject" data-id="${x.id}">Reject</button></td></tr>`).join("")}</tbody></table></div></div></section>`
 }
 let q=await sb.from("withdrawals").select("*,profiles(username,email)").eq("status","pending").order("created_at");
 return `<section class="page wrap"><span class="eyebrow">ADMIN</span><h1>Withdrawals</h1><div class="panel"><div class="tableWrap"><table class="table"><thead><tr><th>User</th><th>Amount</th><th>Method</th><th>Destination</th><th></th></tr></thead><tbody>${(q.data||[]).map(x=>`<tr><td>${esc(x.profiles?.username||x.profiles?.email)}</td><td>${money(x.amount)}</td><td>${esc(x.method)}</td><td>${esc(x.destination)}</td><td><button class="btn sm primary paid" data-id="${x.id}">Mark Paid</button> <button class="btn sm danger wr" data-id="${x.id}">Reject</button></td></tr>`).join("")}</tbody></table></div></div></section>`
}
function bind(){
 document.querySelector("#mobile")?.addEventListener("click",()=>document.querySelector("#links").classList.toggle("open"));
 document.querySelector("#logout")?.addEventListener("click",async()=>{await sb.auth.signOut();go("/")});
 document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>go("/airdrops/"+b.dataset.cat));
 document.querySelector("#search")?.addEventListener("input",e=>{let q=e.target.value.toLowerCase();document.querySelectorAll("#results .card").forEach(x=>x.style.display=x.textContent.toLowerCase().includes(q)?"":"none")});
 document.querySelector("#setup")?.addEventListener("submit",e=>{e.preventDefault();saveCfg({url:document.querySelector("#url").value.trim(),anonKey:document.querySelector("#key").value.trim()});toast("Supabase saved.")});
 document.querySelector("#authForm")?.addEventListener("submit",authSubmit);
 document.querySelector("#withdrawForm")?.addEventListener("submit",withdrawSubmit);
 document.querySelectorAll(".taskBtn").forEach(b=>b.onclick=()=>openTask(b.dataset.id,b.dataset.campaign));
 document.querySelector("#addCampaign")?.addEventListener("click",()=>campaignModal());
 document.querySelectorAll(".editCampaign").forEach(b=>b.onclick=()=>campaignModal(b.dataset.id));
 document.querySelector("#addTask")?.addEventListener("click",()=>taskModal(null,document.querySelector("#addTask").dataset.campaign));
 document.querySelectorAll(".editTask").forEach(b=>b.onclick=()=>taskModal(b.dataset.id));
 document.querySelectorAll(".approve").forEach(b=>b.onclick=async()=>{let r=await sb.rpc("approve_task_submission",{p_submission_id:b.dataset.id});toast(r.error?.message||"Approved and reward credited.");if(!r.error)go("/admin/submissions")});
 document.querySelectorAll(".reject").forEach(b=>b.onclick=async()=>{let reason=prompt("Rejection reason:")||"Invalid proof";let r=await sb.from("task_submissions").update({status:"rejected",rejection_reason:reason,reviewed_by:session.user.id,reviewed_at:new Date().toISOString()}).eq("id",b.dataset.id);toast(r.error?.message||"Rejected.");if(!r.error)go("/admin/submissions")});
 document.querySelectorAll(".paid").forEach(b=>b.onclick=async()=>{let r=await sb.rpc("mark_withdrawal_paid",{p_withdrawal_id:b.dataset.id});toast(r.error?.message||"Marked paid.");if(!r.error)go("/admin/withdrawals")});
 document.querySelectorAll(".wr").forEach(b=>b.onclick=async()=>{let reason=prompt("Reason:")||"Rejected";let r=await sb.rpc("reject_withdrawal",{p_withdrawal_id:b.dataset.id,p_reason:reason});toast(r.error?.message||"Withdrawal rejected.");if(!r.error)go("/admin/withdrawals")});
}
async function authSubmit(e){e.preventDefault();if(!sb){toast("Connect Supabase at /setup first.");go("/setup");return}let email=$("#email").value.trim(),password=$("#pass").value,reg=!!$("#user"),r=reg?await sb.auth.signUp({email,password,options:{data:{username:$("#user").value.trim()}}}):await sb.auth.signInWithPassword({email,password});if(r.error){toast(r.error.message);return}toast(reg?"Account created. Check email if confirmation is enabled.":"Logged in.");go("/wallet")}
function $(x){return document.querySelector(x)}
async function openTask(taskId,campaignId){
 if(!session){toast("Login to complete tasks.");go("/login");return}
 let r=await sb.from("tasks").select("*").eq("id",taskId).single();if(r.error)return;
 let t=r.data,m=document.createElement("div");m.className="modal";m.innerHTML=`<div class="modalbox"><div class="head"><h2>${esc(t.title)}</h2><button class="btn sm" id="close">Close</button></div><p class="muted">${esc(t.description||"Complete the task and submit proof.")}</p><div class="notice">Reward: <b>${money(t.reward)}</b></div>${t.external_url?`<p><a class="btn primary" target="_blank" rel="noopener" href="${esc(t.external_url)}">Open Task →</a></p>`:""}<form id="proof"><div class="field"><label>Proof / Transaction / Username</label><textarea class="textarea" id="proofText" required></textarea></div><div class="field"><label>Screenshot (optional)</label><input class="input" id="proofFile" type="file" accept="image/*"></div><button class="btn primary">Submit Proof</button></form></div>`;document.body.append(m);$("#close").onclick=()=>m.remove();$("#proof").onsubmit=async e=>{e.preventDefault();let image=null,f=$("#proofFile").files[0];if(f){let path=`${session.user.id}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`,u=await sb.storage.from("proofs").upload(path,f);if(u.error){toast(u.error.message);return}image=sb.storage.from("proofs").getPublicUrl(path).data.publicUrl}let q=await sb.from("task_submissions").insert({user_id:session.user.id,task_id:taskId,campaign_id:campaignId,proof_text:$("#proofText").value,proof_image_url:image,status:"pending"});toast(q.error?.message||"Proof submitted.");if(!q.error)m.remove()}}
async function withdrawSubmit(e){e.preventDefault();let amount=Number($("#amount").value);if(amount<1){toast("Minimum withdrawal is $1.00.");return}let r=await sb.rpc("request_withdrawal",{p_amount:amount,p_method:$("#method").value,p_destination:$("#dest").value});toast(r.error?.message||"Withdrawal request submitted.");if(!r.error)go("/wallet")}
async function campaignModal(id=null){
 let c={title:"",slug:"",category_id:"",description:"",logo_url:"",estimated_time:"5 min",total_reward:0,notes:"",status:"active"};if(id){let r=await sb.from("campaigns").select("*").eq("id",id).single();c=r.data||c}
 let cats=await sb.from("categories").select("*").order("sort_order"),m=document.createElement("div");m.className="modal";m.innerHTML=`<div class="modalbox"><div class="head"><h2>${id?"Edit":"Add"} Campaign</h2><button class="btn sm" id="close">Close</button></div><form id="cf"><div class="formgrid"><div class="field"><label>Title</label><input class="input" id="ct" value="${esc(c.title)}" required></div><div class="field"><label>Slug</label><input class="input" id="cs" value="${esc(c.slug)}"></div><div class="field"><label>Category</label><select class="select" id="cc">${(cats.data||[]).map(x=>`<option value="${x.id}" ${x.id===c.category_id?"selected":""}>${esc(x.name)}</option>`).join("")}</select></div><div class="field"><label>Estimated Time</label><input class="input" id="ce" value="${esc(c.estimated_time)}"></div><div class="field"><label>Total Reward</label><input class="input" id="cr" type="number" min="0" step=".01" value="${Number(c.total_reward)}"></div><div class="field"><label>Logo URL</label><input class="input" id="cl" value="${esc(c.logo_url||"")}"></div><div class="field full"><label>Description</label><textarea class="textarea" id="cd">${esc(c.description||"")}</textarea></div><div class="field full"><label>Notes</label><textarea class="textarea" id="cn">${esc(c.notes||"")}</textarea></div></div><button class="btn primary">Save Campaign</button></form></div>`;document.body.append(m);$("#close").onclick=()=>m.remove();$("#ct").oninput=()=>{if(!$("#cs").dataset.manual)$("#cs").value=slugify($("#ct").value)};$("#cs").oninput=()=>$("#cs").dataset.manual=1;$("#cf").onsubmit=async e=>{e.preventDefault();let o={title:$("#ct").value,slug:$("#cs").value||slugify($("#ct").value),category_id:$("#cc").value,estimated_time:$("#ce").value,total_reward:Number($("#cr").value),logo_url:$("#cl").value||null,description:$("#cd").value,notes:$("#cn").value,status:"active"};let r=id?await sb.from("campaigns").update(o).eq("id",id):await sb.from("campaigns").insert(o);toast(r.error?.message||"Campaign saved.");if(!r.error){m.remove();go("/admin")}}}
async function taskModal(id=null,campaignId=null){
 let t={title:"",description:"",reward:0,task_type:"manual",proof_type:"text",external_url:"",sort_order:0,status:"active"};if(id){let r=await sb.from("tasks").select("*").eq("id",id).single();t=r.data;campaignId=t.campaign_id}
 let m=document.createElement("div");m.className="modal";m.innerHTML=`<div class="modalbox"><div class="head"><h2>${id?"Edit":"Add"} Task</h2><button class="btn sm" id="close">Close</button></div><form id="tf"><div class="formgrid"><div class="field"><label>Title</label><input class="input" id="tt" value="${esc(t.title)}" required></div><div class="field"><label>Reward</label><input class="input" id="tr" type="number" min="0" step=".01" value="${Number(t.reward)}" required></div><div class="field"><label>Task Type</label><select class="select" id="ty"><option>manual</option><option>telegram</option><option>testnet</option><option>social</option></select></div><div class="field"><label>Proof Type</label><select class="select" id="tp"><option>text</option><option>screenshot</option><option>both</option></select></div><div class="field"><label>Sort Order</label><input class="input" id="to" type="number" value="${Number(t.sort_order)}"></div><div class="field"><label>External URL</label><input class="input" id="tu" value="${esc(t.external_url||"")}"></div><div class="field full"><label>Instructions</label><textarea class="textarea" id="td">${esc(t.description||"")}</textarea></div></div><button class="btn primary">Save Task</button></form></div>`;document.body.append(m);$("#close").onclick=()=>m.remove();$("#ty").value=t.task_type;$("#tp").value=t.proof_type;$("#tf").onsubmit=async e=>{e.preventDefault();let o={campaign_id:campaignId,title:$("#tt").value,description:$("#td").value,reward:Number($("#tr").value),task_type:$("#ty").value,proof_type:$("#tp").value,external_url:$("#tu").value||null,sort_order:Number($("#to").value),status:"active"};let r=id?await sb.from("tasks").update(o).eq("id",id):await sb.from("tasks").insert(o);toast(r.error?.message||"Task saved.");if(!r.error){m.remove();go("/admin/campaign/"+campaignId)}}}
window.addEventListener("popstate",route);
init();