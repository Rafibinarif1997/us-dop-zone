import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const DEFAULT_CONFIG = {
  // Put your Supabase URL and anon key in localStorage through Settings/Setup.
  url: "",
  anonKey: ""
};

const CATS = [
  ["all","All","✨","All campaigns"],
  ["telegram-bots","Telegram Bots","🤖","Bot campaigns"],
  ["testnets","Testnets","⛓️","Testnet activity"],
  ["nft-whitelist","NFT Whitelist","🖼️","Allowlist campaigns"],
  ["nft-gtd","NFT GTD","🎟️","GTD campaigns"],
  ["free-mint","Free Mint","🆓","Free mint campaigns"],
  ["other-web3","Other Web3","🌐","Other campaigns"]
];

let supabase = null;
let session = null;
let profile = null;
let appConfig = loadConfig();

const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money = n => `$${Number(n||0).toFixed(2)}`;
const slugify = s => String(s||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
function loadConfig(){try{return {...DEFAULT_CONFIG,...JSON.parse(localStorage.getItem("adpx-config")||"{}")}}catch{return DEFAULT_CONFIG}}
function saveConfig(c){localStorage.setItem("adpx-config",JSON.stringify(c)); appConfig=c; connect();}
function connect(){
  if(appConfig.url && appConfig.anonKey){
    supabase=createClient(appConfig.url,appConfig.anonKey);
    supabase.auth.getSession().then(({data})=>{session=data.session||null; loadProfile().then(render);});
    supabase.auth.onAuthStateChange((_e,s)=>{session=s; loadProfile().then(render)});
  } else {supabase=null;session=null;profile=null;render();}
}
async function loadProfile(){
  if(!supabase||!session){profile=null;return}
  const {data}=await supabase.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
  profile=data||null;
}
function toast(msg){const el=document.createElement("div");el.className="toast";el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),3200)}
function navigate(path){history.pushState({},'',path);render()}
window.addEventListener("popstate",render);

function layout(content){
  const path=location.pathname;
  const active=p=>path===p||path.startsWith(p+"/");
  return `<div class="topbar"><div class="container"><span>WEB3 MICRO-REWARDS</span><span>${session?`Signed in as ${esc(session.user.email)}`:"Complete tasks. Earn rewards."}</span></div></div>
  <nav class="nav"><div class="container navin">
    <a class="logo" href="/"><span class="logo-mark">✦</span><span>AIRDROPX</span></a>
    <button class="btn small mobile-menu" id="mobileBtn">MENU</button>
    <div class="navlinks" id="navlinks">
      <a class="${active('/airdrops')?'active':''}" href="/airdrops">Airdrops</a>
      <a class="${active('/earn')?'active':''}" href="/earn">Earn</a>
      ${session?`<a class="${active('/wallet')?'active':''}" href="/wallet">Wallet</a><a class="${active('/leaderboard')?'active':''}" href="/leaderboard">Leaderboard</a>`:""}
      <a href="/faq">FAQ</a>
      ${session?`<button class="btn small" id="logoutBtn">Logout</button>`:`<a class="btn small primary" href="/login">Login</a>`}
    </div>
  </div></nav>
  <main>${content}</main>
  <footer class="footer"><div class="container footerin"><div><b>AIRDROPX</b><div>Web3 campaigns, verified tasks and rewards.</div></div><div><a href="/faq">FAQ</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></div></div></footer>`;
}

async function render(){
  const root=$("#app");
  const path=location.pathname.replace(/\/+$/,"")||"/";
  let html;
  if(path==="/") html=await home();
  else if(path==="/airdrops") html=await airdrops("all");
  else if(path.startsWith("/airdrops/") && path.split("/").length===3){
    const second=path.split("/")[2];
    const cat=CATS.find(c=>c[1].toLowerCase().replace(/\s+/g,"-")===second || c[0]===second);
    html=cat?await airdrops(cat[0]):await campaignBySlug(second);
  } else if(path.startsWith("/airdrops/") && path.split("/").length>=4) html=await campaignBySlug(path.split("/").slice(3).join("/"));
  else if(path==="/earn") html=await airdrops("all",true);
  else if(path==="/login") html=authPage();
  else if(path==="/register") html=authPage(true);
  else if(path==="/wallet"||path==="/earnings") html=await walletPage();
  else if(path==="/withdraw") html=await withdrawPage();
  else if(path==="/leaderboard") html=await leaderboard();
  else if(path==="/faq") html=faqPage();
  else if(path==="/terms") html=legalPage("Terms");
  else if(path==="/privacy") html=legalPage("Privacy");
  else if(path==="/admin") html=await adminDashboard();
  else if(path.startsWith("/admin/campaign/")) html=await adminCampaignPage(path.split("/")[3]);
  else if(path==="/setup") html=setupPage();
  else html=`<section class="page container"><div class="empty"><h2>404</h2><p>Page not found.</p><a class="btn primary" href="/">Back Home</a></div></section>`;
  root.innerHTML=layout(html);
  bind();
}

async function home(){
  const campaigns=await getCampaigns(6);
  return `<section class="hero"><div class="container hero-grid"><div>
    <span class="eyebrow">● LIVE WEB3 EARNING PLATFORM</span>
    <h1>Complete Web3 Tasks.<br><span style="color:var(--accent)">Earn Rewards.</span></h1>
    <p>Discover Airdrops, Telegram campaigns, Testnets, NFT Whitelists, GTD, Free Mints and other Web3 opportunities. Complete verified tasks and build your reward balance.</p>
    <div class="hero-actions"><a class="btn primary" href="/airdrops">Explore Airdrops →</a>${session?`<a class="btn" href="/wallet">Open Wallet</a>`:`<a class="btn" href="/register">Create Account</a>`}</div>
  </div><div class="hero-card"><div class="metric"><span>Active Campaigns</span><b>${campaigns.length||0}+</b></div><div class="metric"><span>Minimum Withdrawal</span><b>$1.00</b></div><div class="metric"><span>Proof Review</span><b>Manual</b></div><div class="metric"><span>Reward Ledger</span><b>On-chain ready</b></div></div></div></section>
  <section class="section"><div class="container"><div class="section-head"><h2>Explore Categories</h2><a class="muted" href="/airdrops">View all →</a></div><div class="categories">${CATS.slice(1).map(c=>`<a class="cat" href="/airdrops/${c[0]}"><div class="icon">${c[2]}</div><b>${c[1]}</b><small>${c[3]}</small></a>`).join("")}</div></div></section>
  <section class="section"><div class="container"><div class="section-head"><h2>Featured Airdrops</h2><a class="muted" href="/airdrops">See all →</a></div>${campaignGrid(campaigns)}</div></section>`;
}

async function getCampaigns(limit=50, category=null){
  if(!supabase) return [];
  let q=supabase.from("campaigns").select("*,categories(name,slug,icon)").eq("status","active").order("created_at",{ascending:false}).limit(limit);
  if(category&&category!=="all") q=q.eq("categories.slug",category);
  const {data,error}=await q; if(error){console.error(error);return []} return data||[];
}
function campaignGrid(items){
  if(!items.length)return `<div class="empty">No live campaigns yet. Add campaigns from Admin.</div>`;
  return `<div class="grid">${items.map(c=>`<article class="card"><div class="card-top"><div class="logo-box">${c.logo_url?`<img src="${esc(c.logo_url)}">`:(c.categories?.icon||"🪂")}</div><span class="badge">${esc(c.categories?.name||"Airdrop")}</span></div><h3>${esc(c.title)}</h3><p>${esc((c.description||"").slice(0,130))}</p><div class="stats"><span>⏱ ${esc(c.estimated_time||"—")}</span><span class="reward">up to ${money(c.total_reward)}</span></div><div class="card-actions"><a class="btn primary" href="/airdrops/${esc(c.categories?.slug||"other-web3")}/${esc(c.slug)}">View Airdrop →</a></div></article>`).join("")}</div>`;
}

async function airdrops(category="all",earn=false){
  const items=await getCampaigns(100,category);
  const cat=CATS.find(c=>c[0]===category)||CATS[0];
  return `<section class="page container"><span class="eyebrow">🪂 AIRDROPS</span><h1 class="page-title">${earn?"Earn":"Airdrops"}</h1><p class="muted">Complete campaigns, submit proof and earn the listed reward.</p>
  <div class="toolbar"><input class="input search" id="search" placeholder="Search campaigns..."><div class="filters">${CATS.map(c=>`<button class="btn small ${c[0]===category?'active':''}" data-cat="${c[0]}">${c[2]} ${c[1]}</button>`).join("")}</div></div>
  <div id="campaignGrid">${campaignGrid(items)}</div></section>`;
}

async function campaignBySlug(slug){
  if(!supabase)return `<section class="page container"><div class="notice warn">Connect Supabase first from <a href="/setup">Setup</a>.</div></section>`;
  const {data:c,error}=await supabase.from("campaigns").select("*,categories(name,slug,icon)").eq("slug",slug).maybeSingle();
  if(error||!c)return `<section class="page container"><div class="empty"><h2>Airdrop not found</h2><a class="btn primary" href="/airdrops">Browse Airdrops</a></div></section>`;
  const {data:tasks}=await supabase.from("tasks").select("*").eq("campaign_id",c.id).eq("status","active").order("sort_order");
  return `<section class="page container"><div class="detail"><div><div class="panel"><div class="detail-hero"><div class="detail-logo">${c.logo_url?`<img src="${esc(c.logo_url)}">`:(c.categories?.icon||"🪂")}</div><div><span class="badge">${esc(c.categories?.name||"Airdrop")}</span><h1 class="page-title" style="margin:8px 0">${esc(c.title)}</h1><div class="reward">Earn up to ${money(c.total_reward)}</div></div></div><hr style="border:0;border-top:1px solid var(--line);margin:22px 0"><p class="muted" style="line-height:1.75">${esc(c.description||"No description provided.")}</p></div>
  <div class="panel" style="margin-top:18px"><h2>Tasks</h2>${tasks?.length?tasks.map((t,i)=>`<div class="task"><div class="task-row"><div><h4>${i+1}. ${esc(t.title)}</h4><p>${esc(t.description||"Complete this task and submit proof.")}</p></div><div style="text-align:right"><div class="reward">${money(t.reward)}</div><button class="btn primary small taskBtn" data-task="${t.id}" data-campaign="${c.id}">Start Task</button></div></div></div>`).join(""):`<div class="empty">No tasks published.</div>`}</div></div>
  <aside><div class="panel"><h3>Campaign Info</h3><div class="metric"><span>Category</span><b>${esc(c.categories?.name||"Airdrop")}</b></div><div class="metric"><span>Estimated Time</span><b>${esc(c.estimated_time||"—")}</b></div><div class="metric"><span>Completed</span><b>${Number(c.completed_count||0)}</b></div><div class="metric"><span>Status</span><b>ACTIVE</b></div></div><div class="panel" style="margin-top:18px"><h3>Important</h3><p class="muted">${esc(c.notes||"Follow the task instructions exactly. Invalid or duplicate proof can be rejected.")}</p></div></aside></div></section>`;
}

function authPage(register=false){
  return `<section class="auth container"><div class="auth-card"><span class="eyebrow">${register?"CREATE ACCOUNT":"WELCOME BACK"}</span><h1 style="font-size:38px">${register?"Join AIRDROPX":"Login"}</h1><p class="muted">${register?"Create an account to start earning.":"Access your earning wallet and submissions."}</p><form id="authForm"><div class="field"><label>Email</label><input class="input" type="email" id="email" required></div><div class="field"><label>Password</label><input class="input" type="password" id="password" minlength="6" required></div>${register?`<div class="field"><label>Username</label><input class="input" id="username" required></div>`:""}<button class="btn primary" style="width:100%">${register?"Create Account":"Login"}</button></form><p class="muted" style="margin-top:16px">${register?`Already have an account? <a href="/login" style="color:var(--accent)">Login</a>`:`Need an account? <a href="/register" style="color:var(--accent)">Register</a>`}</p></div></section>`;
}

async function walletPage(){
  if(!session)return authRequired();
  const {data:tx}=await supabase.from("wallet_transactions").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(50);
  return `<section class="page container"><span class="eyebrow">WALLET</span><h1 class="page-title">My Earnings</h1><div class="dashboard-grid"><div class="stat"><small>Available</small><b>${money(profile?.available_balance)}</b></div><div class="stat"><small>Pending</small><b>${money(profile?.pending_balance)}</b></div><div class="stat"><small>Total Earned</small><b>${money(profile?.total_earned)}</b></div><div class="stat"><small>Minimum Withdraw</small><b>$1.00</b></div></div><div style="margin:18px 0"><a class="btn primary" href="/withdraw">Withdraw →</a></div><div class="panel"><h2>Transaction History</h2>${tx?.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead><tbody>${tx.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString()}</td><td>${esc(x.description)}</td><td>${esc(x.type)}</td><td class="${Number(x.amount)>=0?'reward':''}">${Number(x.amount)>=0?"+":""}${money(x.amount)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No transactions yet.</div>`}</div></section>`;
}
function authRequired(){return `<section class="page container"><div class="empty"><h2>Login required</h2><a class="btn primary" href="/login">Login</a></div></section>`}

async function withdrawPage(){
  if(!session)return authRequired();
  const {data:w}=await supabase.from("withdrawals").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false});
  const bal=Number(profile?.available_balance||0);
  return `<section class="page container"><div class="detail"><div class="panel"><span class="eyebrow">WITHDRAW</span><h1 class="page-title">Request Payout</h1><div class="notice">${money(bal)} available · Minimum $1.00</div><form id="withdrawForm" style="margin-top:20px"><div class="field"><label>Amount</label><input class="input" id="wAmount" type="number" min="1" step=".01" max="${bal}" required></div><div class="field"><label>Method</label><select class="select" id="wMethod"><option value="usdt">USDT</option><option value="manual">Other / Manual</option></select></div><div class="field"><label>Destination / Wallet Address</label><input class="input" id="wDestination" required></div><button class="btn primary" ${bal<1?"disabled":""}>Request Withdrawal</button></form></div><div class="panel"><h3>Withdrawal History</h3>${w?.length?w.map(x=>`<div class="task"><div class="task-row"><div><b>${money(x.amount)}</b><p>${esc(x.method)} · ${esc(x.status)}</p></div><span class="badge">${esc(x.status)}</span></div></div>`).join(""):`<div class="empty">No withdrawals yet.</div>`}</div></div></section>`;
}

async function leaderboard(){
  if(!supabase)return `<section class="page container"><div class="empty">Connect Supabase to load leaderboard.</div></section>`;
  const {data}=await supabase.from("profiles").select("username,total_earned").order("total_earned",{ascending:false}).limit(50);
  return `<section class="page container"><span class="eyebrow">LEADERBOARD</span><h1 class="page-title">Top Earners</h1><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>User</th><th>Total Earned</th></tr></thead><tbody>${(data||[]).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.username||"User")}</td><td class="reward">${money(x.total_earned)}</td></tr>`).join("")}</tbody></table></div></div></section>`;
}

function faqPage(){return `<section class="page container"><span class="eyebrow">HELP</span><h1 class="page-title">FAQ</h1><div class="panel"><h3>How do I earn?</h3><p class="muted">Open an Airdrop, complete its listed tasks and submit the requested proof.</p><h3>When is my reward credited?</h3><p class="muted">Rewards are credited after your proof is reviewed and approved.</p><h3>What is the minimum withdrawal?</h3><p class="muted">The default minimum is $1.00.</p><h3>Can a task be submitted twice?</h3><p class="muted">No. Each user can receive a reward for a specific task only once.</p><h3>Why was my proof rejected?</h3><p class="muted">The reviewer may reject incomplete, invalid, duplicated or unverifiable proof. A rejection reason is shown when available.</p></div></section>`}
function legalPage(title){return `<section class="page container"><span class="eyebrow">${title.toUpperCase()}</span><h1 class="page-title">${title}</h1><div class="panel"><p class="muted">Replace this placeholder with your final ${title.toLowerCase()} text before public launch. The site structure is ready for it.</p></div></section>`}

function setupPage(){return `<section class="auth container"><div class="auth-card"><span class="eyebrow">ONE-TIME SETUP</span><h1 style="font-size:36px">Connect Supabase</h1><p class="muted">Paste your Supabase project URL and anon public key. They are stored only in this browser. Do not enter a service-role key.</p><form id="setupForm"><div class="field"><label>Supabase URL</label><input class="input" id="sUrl" placeholder="https://xxxx.supabase.co" value="${esc(appConfig.url)}" required></div><div class="field"><label>Anon Public Key</label><textarea class="textarea" id="sKey" required>${esc(appConfig.anonKey)}</textarea></div><button class="btn primary">Save & Connect</button></form><p class="muted" style="margin-top:15px">After the database SQL is installed in Supabase, this setup is enough for the frontend.</p></div></section>`}

async function adminDashboard(){
  if(!session)return authRequired();
  const {data:admin}=await supabase.from("admin_users").select("*").eq("user_id",session.user.id).maybeSingle();
  if(!admin)return `<section class="page container"><div class="empty"><h2>Admin access required</h2><p>Sign in with an account listed in admin_users.</p></div></section>`;
  const [{count:users},{count:subs},{count:withdrawals},{data:campaigns}]=await Promise.all([
    supabase.from("profiles").select("*",{count:"exact",head:true}),
    supabase.from("task_submissions").select("*",{count:"exact",head:true}).eq("status","pending"),
    supabase.from("withdrawals").select("*",{count:"exact",head:true}).eq("status","pending"),
    supabase.from("campaigns").select("*,categories(name,slug,icon)").order("created_at",{ascending:false}).limit(100)
  ]);
  return `<section class="page container"><span class="eyebrow">ADMIN CONTROL</span><h1 class="page-title">Dashboard</h1><div class="dashboard-grid"><div class="stat"><small>Users</small><b>${users||0}</b></div><div class="stat"><small>Pending Proofs</small><b>${subs||0}</b></div><div class="stat"><small>Pending Withdrawals</small><b>${withdrawals||0}</b></div><div class="stat"><small>Campaigns</small><b>${campaigns?.length||0}</b></div></div><div class="hero-actions"><button class="btn primary" id="addCampaign">+ Add Campaign</button><a class="btn" href="/airdrops">View Public Site</a></div><div class="panel" style="margin-top:20px"><div class="section-head"><h2>Campaigns</h2><a class="btn small" href="/admin/submissions">Review Proofs</a><a class="btn small" href="/admin/withdrawals">Withdrawals</a></div><div class="table-wrap"><table class="table"><thead><tr><th>Campaign</th><th>Category</th><th>Reward</th><th>Status</th><th>Action</th></tr></thead><tbody>${(campaigns||[]).map(c=>`<tr><td>${esc(c.title)}</td><td>${esc(c.categories?.name||"")}</td><td>${money(c.total_reward)}</td><td>${esc(c.status)}</td><td><button class="btn small editCampaign" data-id="${c.id}">Edit</button> <a class="btn small" href="/admin/campaign/${c.id}">Tasks</a></td></tr>`).join("")}</tbody></table></div></div></section>`;
}


async function adminCampaignPage(campaignId){
  if(!session)return authRequired();
  const {data:adm}=await supabase.from("admin_users").select("*").eq("user_id",session.user.id).maybeSingle();
  if(!adm)return `<section class="page container"><div class="empty">Admin access required.</div></section>`;
  const {data:c}=await supabase.from("campaigns").select("*,categories(name,slug)").eq("id",campaignId).single();
  if(!c)return `<section class="page container"><div class="empty">Campaign not found.</div></section>`;
  const {data:tasks}=await supabase.from("tasks").select("*").eq("campaign_id",campaignId).order("sort_order");
  return `<section class="page container"><span class="eyebrow">ADMIN · CAMPAIGN</span>
    <h1 class="page-title">${esc(c.title)}</h1>
    <div class="hero-actions"><button class="btn primary" id="addTask" data-campaign="${c.id}">+ Add Task</button><a class="btn" href="/airdrops/${esc(c.categories?.slug||"other-web3")}/${esc(c.slug)}">Open Public Page</a><a class="btn" href="/admin">Back Admin</a></div>
    <div class="panel" style="margin-top:20px"><div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Task</th><th>Reward</th><th>Type</th><th>URL</th><th>Status</th><th>Action</th></tr></thead><tbody>
    ${(tasks||[]).map(t=>`<tr><td>${t.sort_order}</td><td><b>${esc(t.title)}</b><br><span class="muted">${esc((t.description||"").slice(0,80))}</span></td><td>${money(t.reward)}</td><td>${esc(t.task_type)}</td><td>${t.external_url?`<a target="_blank" href="${esc(t.external_url)}">Open</a>`:"—"}</td><td>${esc(t.status)}</td><td><button class="btn small editTask" data-id="${t.id}">Edit</button></td></tr>`).join("")}
    </tbody></table></div></div></section>`;
}

function bind(){
  $("#mobileBtn")?.addEventListener("click",()=>$("#navlinks").classList.toggle("open"));
  $("#logoutBtn")?.addEventListener("click",async()=>{await supabase.auth.signOut();navigate("/")});
  document.querySelectorAll("[data-cat]").forEach(b=>b.addEventListener("click",()=>navigate("/airdrops/"+b.dataset.cat)));
  $("#search")?.addEventListener("input",e=>{const q=e.target.value.toLowerCase();document.querySelectorAll("#campaignGrid .card").forEach(c=>c.style.display=c.textContent.toLowerCase().includes(q)?"":"none")});
  $("#authForm")?.addEventListener("submit",async e=>{
    e.preventDefault(); if(!supabase){toast("Set up Supabase first.");navigate("/setup");return}
    const email=$("#email").value.trim(), password=$("#password").value, username=$("#username")?.value.trim();
    const register=!!$("#username");
    const r=register?await supabase.auth.signUp({email,password,options:{data:{username}}}):await supabase.auth.signInWithPassword({email,password});
    if(r.error){toast(r.error.message);return}
    if(register && r.data.user) await supabase.from("profiles").insert({id:r.data.user.id,username:username||email.split("@")[0],email});
    toast(register?"Account created. Check email if confirmation is enabled.":"Logged in.");
    navigate(register?"/wallet":"/airdrops");
  });
  $("#setupForm")?.addEventListener("submit",e=>{e.preventDefault();saveConfig({url:$("#sUrl").value.trim(),anonKey:$("#sKey").value.trim()});toast("Supabase connected.");navigate("/")});
  document.querySelectorAll(".taskBtn").forEach(b=>b.addEventListener("click",()=>openTask(b.dataset.task,b.dataset.campaign)));
  $("#withdrawForm")?.addEventListener("submit",submitWithdrawal);
  $("#addCampaign")?.addEventListener("click",()=>openCampaignModal());
  $("#addTask")?.addEventListener("click",()=>openTaskAdminModal($("#addTask").dataset.campaign));
  document.querySelectorAll(".editTask").forEach(b=>b.addEventListener("click",()=>openTaskAdminModal(null,b.dataset.id)));

  document.querySelectorAll(".editCampaign").forEach(b=>b.addEventListener("click",()=>openCampaignModal(b.dataset.id)));
}

async function openTask(taskId,campaignId){
  if(!session){toast("Login to complete tasks.");navigate("/login");return}
  const {data:t}=await supabase.from("tasks").select("*").eq("id",taskId).single();
  if(!t)return;
  const modal=document.createElement("div");modal.className="modal";modal.innerHTML=`<div class="modal-card"><div class="section-head"><h2>${esc(t.title)}</h2><button class="btn small" id="closeM">Close</button></div><p class="muted">${esc(t.description||"Complete the task, then provide the requested proof.")}</p><div class="notice">Reward: <b>${money(t.reward)}</b></div>${t.external_url?`<p><a class="btn primary" target="_blank" rel="noopener" href="${esc(t.external_url)}">Open Task →</a></p>`:""}<form id="proofForm" style="margin-top:18px"><div class="field"><label>Proof / Transaction / Username</label><textarea class="textarea" id="proofText" required placeholder="Paste the requested proof here..."></textarea></div><div class="field"><label>Proof screenshot (optional)</label><input class="input" id="proofFile" type="file" accept="image/*"></div><button class="btn primary">Submit Proof</button></form></div>`;
  document.body.appendChild(modal);$("#closeM").onclick=()=>modal.remove();
  $("#proofForm").onsubmit=async e=>{
    e.preventDefault();
    let imageUrl=null;
    const file=$("#proofFile")?.files?.[0];
    if(file){
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
      const path=`${session.user.id}/${crypto.randomUUID()}-${safe}`;
      const up=await supabase.storage.from("proofs").upload(path,file,{upsert:false});
      if(up.error){toast(up.error.message);return}
      const pub=supabase.storage.from("proofs").getPublicUrl(path);
      imageUrl=pub.data.publicUrl;
    }
    const r=await supabase.from("task_submissions").insert({user_id:session.user.id,task_id:taskId,campaign_id:campaignId,proof_text:$("#proofText").value,proof_image_url:imageUrl,status:"pending"});
    if(r.error)toast(r.error.message);else{toast("Proof submitted for review.");modal.remove()}
  };
}

async function submitWithdrawal(e){
  e.preventDefault();const amount=Number($("#wAmount").value), bal=Number(profile?.available_balance||0);
  if(amount<1||amount>bal){toast("Minimum is $1 and balance is insufficient.");return}
  const r=await supabase.rpc("request_withdrawal",{p_amount:amount,p_method:$("#wMethod").value,p_destination:$("#wDestination").value});
  if(r.error){toast(r.error.message);return}toast("Withdrawal request submitted.");navigate("/wallet");
}


async function openTaskAdminModal(campaignId=null, taskId=null){
  if(!session)return;
  if(!campaignId && taskId){
    const {data:t}=await supabase.from("tasks").select("*").eq("id",taskId).single();
    campaignId=t?.campaign_id;
  }
  let t={title:"",description:"",reward:0,task_type:"manual",proof_type:"text",external_url:"",sort_order:0,status:"active"};
  if(taskId){const {data}=await supabase.from("tasks").select("*").eq("id",taskId).single();if(data)t=data}
  const modal=document.createElement("div");modal.className="modal";modal.innerHTML=`<div class="modal-card"><div class="section-head"><h2>${taskId?"Edit":"Add"} Task</h2><button class="btn small" id="closeM">Close</button></div>
  <form id="taskAdminForm"><div class="form-grid">
  <div class="field"><label>Task Title</label><input class="input" id="ttitle" value="${esc(t.title)}" required></div>
  <div class="field"><label>Reward</label><input class="input" id="treward" type="number" min="0" step=".01" value="${Number(t.reward||0)}" required></div>
  <div class="field"><label>Task Type</label><select class="select" id="ttype"><option value="manual" ${t.task_type==="manual"?"selected":""}>Manual</option><option value="telegram" ${t.task_type==="telegram"?"selected":""}>Telegram</option><option value="testnet" ${t.task_type==="testnet"?"selected":""}>Testnet</option><option value="social" ${t.task_type==="social"?"selected":""}>Social</option></select></div>
  <div class="field"><label>Proof Type</label><select class="select" id="tproof"><option value="text" ${t.proof_type==="text"?"selected":""}>Text / Transaction</option><option value="screenshot" ${t.proof_type==="screenshot"?"selected":""}>Screenshot</option><option value="both" ${t.proof_type==="both"?"selected":""}>Both</option></select></div>
  <div class="field"><label>Sort Order</label><input class="input" id="torder" type="number" value="${Number(t.sort_order||0)}"></div>
  <div class="field"><label>External URL</label><input class="input" id="turl" value="${esc(t.external_url||"")}"></div>
  <div class="field full"><label>Instructions</label><textarea class="textarea" id="tdesc">${esc(t.description||"")}</textarea></div>
  </div><button class="btn primary">Save Task</button></form></div>`;
  document.body.appendChild(modal);$("#closeM").onclick=()=>modal.remove();
  $("#taskAdminForm").onsubmit=async e=>{e.preventDefault();const obj={campaign_id:campaignId,title:$("#ttitle").value,description:$("#tdesc").value,reward:Number($("#treward").value),task_type:$("#ttype").value,proof_type:$("#tproof").value,external_url:$("#turl").value||null,sort_order:Number($("#torder").value||0),status:"active"};const r=taskId?await supabase.from("tasks").update(obj).eq("id",taskId):await supabase.from("tasks").insert(obj);if(r.error)toast(r.error.message);else{toast("Task saved.");modal.remove();navigate("/admin/campaign/"+campaignId)}};
}

async function openCampaignModal(id=null){
  let c={title:"",description:"",slug:"",category_id:"",logo_url:"",estimated_time:"",total_reward:0,status:"active",notes:""};
  if(id){const {data}=await supabase.from("campaigns").select("*").eq("id",id).single();if(data)c=data}
  const {data:cats}=await supabase.from("categories").select("*").order("sort_order");
  const modal=document.createElement("div");modal.className="modal";modal.innerHTML=`<div class="modal-card"><div class="section-head"><h2>${id?"Edit":"Add"} Campaign</h2><button class="btn small" id="closeM">Close</button></div><form id="campaignForm"><div class="form-grid"><div class="field"><label>Title</label><input class="input" id="ctitle" value="${esc(c.title)}" required></div><div class="field"><label>Slug</label><input class="input" id="cslug" value="${esc(c.slug)}" placeholder="auto-from-title"></div><div class="field"><label>Category</label><select class="select" id="ccat" required>${(cats||[]).map(x=>`<option value="${x.id}" ${x.id===c.category_id?"selected":""}>${esc(x.name)}</option>`).join("")}</select></div><div class="field"><label>Estimated Time</label><input class="input" id="ctime" value="${esc(c.estimated_time||"5 min")}"></div><div class="field"><label>Total Reward</label><input class="input" id="creward" type="number" min="0" step=".01" value="${Number(c.total_reward||0)}"></div><div class="field"><label>Logo URL</label><input class="input" id="clogo" value="${esc(c.logo_url||"")}"></div><div class="field full"><label>Description</label><textarea class="textarea" id="cdesc">${esc(c.description||"")}</textarea></div><div class="field full"><label>Notes</label><textarea class="textarea" id="cnotes">${esc(c.notes||"")}</textarea></div></div><button class="btn primary">Save Campaign</button></form></div>`;
  document.body.appendChild(modal);$("#closeM").onclick=()=>modal.remove();
  $("#ctitle").addEventListener("input",()=>{if(!id&&!$("#cslug").dataset.edited)$("#cslug").value=slugify($("#ctitle").value)});
  $("#cslug").addEventListener("input",()=>$("#cslug").dataset.edited="1");
  $("#campaignForm").onsubmit=async e=>{e.preventDefault();const obj={title:$("#ctitle").value,slug:$("#cslug").value||slugify($("#ctitle").value),category_id:$("#ccat").value,estimated_time:$("#ctime").value,total_reward:Number($("#creward").value),logo_url:$("#clogo").value||null,description:$("#cdesc").value,notes:$("#cnotes").value,status:"active"};const r=id?await supabase.from("campaigns").update(obj).eq("id",id):await supabase.from("campaigns").insert(obj);if(r.error)toast(r.error.message);else{toast("Campaign saved.");modal.remove();render()}};
}

// Simple admin routes for proof/withdrawal review
if(location.pathname==="/admin/submissions"){
  // Rendered by a lightweight interception below.
}
const originalRender=render;
render=async function(){
  const p=location.pathname.replace(/\/+$/,"")||"/";
  if(p==="/admin/submissions"){await renderAdminList("submissions");return}
  if(p==="/admin/withdrawals"){await renderAdminList("withdrawals");return}
  return originalRender();
};
async function renderAdminList(kind){
  const root=$("#app");
  if(!session){root.innerHTML=layout(authRequired());bind();return}
  const {data:adm}=await supabase.from("admin_users").select("*").eq("user_id",session.user.id).maybeSingle();
  if(!adm){root.innerHTML=layout(`<section class="page container"><div class="empty">Admin access required.</div></section>`);bind();return}
  let html="";
  if(kind==="submissions"){
    const {data}=await supabase.from("task_submissions").select("*,profiles(username,email),tasks(title,reward),campaigns(title)").eq("status","pending").order("created_at",{ascending:true});
    html=`<section class="page container"><span class="eyebrow">ADMIN</span><h1 class="page-title">Proof Submissions</h1><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Campaign</th><th>Task</th><th>Proof</th><th>Reward</th><th>Action</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${esc(x.profiles?.username||x.profiles?.email)}</td><td>${esc(x.campaigns?.title)}</td><td>${esc(x.tasks?.title)}</td><td>${esc(x.proof_text)}${x.proof_image_url?`<br><a target="_blank" href="${esc(x.proof_image_url)}">Image</a>`:""}</td><td>${money(x.tasks?.reward)}</td><td><button class="btn small primary approve" data-id="${x.id}" data-reward="${x.tasks?.reward||0}" data-user="${x.user_id}" data-task="${x.task_id}">Approve</button> <button class="btn small danger reject" data-id="${x.id}">Reject</button></td></tr>`).join("")}</tbody></table></div></div></section>`;
  }else{
    const {data}=await supabase.from("withdrawals").select("*,profiles(username,email)").eq("status","pending").order("created_at",{ascending:true});
    html=`<section class="page container"><span class="eyebrow">ADMIN</span><h1 class="page-title">Withdrawals</h1><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Amount</th><th>Method</th><th>Destination</th><th>Action</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${esc(x.profiles?.username||x.profiles?.email)}</td><td>${money(x.amount)}</td><td>${esc(x.method)}</td><td>${esc(x.destination)}</td><td><button class="btn small primary paid" data-id="${x.id}">Mark Paid</button> <button class="btn small danger wreject" data-id="${x.id}">Reject</button></td></tr>`).join("")}</tbody></table></div></div></section>`;
  }
  root.innerHTML=layout(html);bind();
  document.querySelectorAll(".approve").forEach(b=>b.onclick=async()=>{const r=await supabase.rpc("approve_task_submission",{p_submission_id:b.dataset.id});if(r.error)toast(r.error.message);else{toast("Approved and reward credited.");renderAdminList("submissions")}});
  document.querySelectorAll(".reject").forEach(b=>b.onclick=async()=>{const reason=prompt("Rejection reason:")||"Invalid proof";const r=await supabase.from("task_submissions").update({status:"rejected",rejection_reason:reason,reviewed_by:session.user.id,reviewed_at:new Date().toISOString()}).eq("id",b.dataset.id);if(r.error)toast(r.error.message);else renderAdminList("submissions")});
  document.querySelectorAll(".paid").forEach(b=>b.onclick=async()=>{const r=await supabase.rpc("mark_withdrawal_paid",{p_withdrawal_id:b.dataset.id});if(r.error)toast(r.error.message);else{toast("Marked paid.");renderAdminList("withdrawals")}});
  document.querySelectorAll(".wreject").forEach(b=>b.onclick=async()=>{const reason=prompt("Reason:")||"Rejected";const r=await supabase.rpc("reject_withdrawal",{p_withdrawal_id:b.dataset.id,p_reason:reason});if(r.error)toast(r.error.message);else renderAdminList("withdrawals")});
}
connect();
