// DROP ZONE Telegram bot — Supabase Edge Function (Deno)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_IDS = (Deno.env.get("TELEGRAM_ADMIN_IDS") ?? "")
  .split(",").map((v) => v.trim()).filter(Boolean);

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type TgUser = { id: number; username?: string; first_name?: string; last_name?: string };
type TgMessage = { message_id: number; text?: string; from?: TgUser; chat: { id: number; type: string } };
type TgCallback = { id: string; from: TgUser; message?: TgMessage; data?: string };
type TgUpdate = { update_id: number; message?: TgMessage; callback_query?: TgCallback };

async function telegram(method: string, payload: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) console.error("Telegram API error", method, data);
  return data;
}

async function say(chatId: number, text: string, keyboard?: unknown[][]) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function makeReferralCode(id: number) {
  return `dz${id.toString(36)}`;
}

async function upsertUser(user: TgUser, startArg?: string) {
  const { data: existing } = await db.from("telegram_users")
    .select("telegram_id,referral_code,referred_by,points,submission_state,submission_mission_id,is_blocked")
    .eq("telegram_id", user.id).maybeSingle();

  if (existing) {
    const { data } = await db.from("telegram_users").update({
      username: user.username ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      updated_at: new Date().toISOString(),
    }).eq("telegram_id", user.id).select().single();
    return data ?? existing;
  }

  let referrer: number | null = null;
  if (startArg?.startsWith("ref_")) {
    const code = startArg.slice(4);
    const { data: ref } = await db.from("telegram_users").select("telegram_id")
      .eq("referral_code", code).maybeSingle();
    if (ref && ref.telegram_id !== user.id) referrer = ref.telegram_id;
  }

  const row = {
    telegram_id: user.id,
    username: user.username ?? null,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    referral_code: makeReferralCode(user.id),
    referred_by: referrer,
  };
  const { data, error } = await db.from("telegram_users").insert(row).select().single();
  if (error) throw error;

  return data;
}

async function showHome(chatId: number, user: TgUser) {
  const { data: profile } = await db.from("telegram_users").select("points,referral_code,is_blocked")
    .eq("telegram_id", user.id).single();
  if (profile?.is_blocked) return say(chatId, "⛔ Your account is restricted. Contact support if you think this is a mistake.");

  const botUsername = Deno.env.get("TELEGRAM_BOT_USERNAME") ?? "YOUR_BOT_USERNAME";
  const referral = `https://t.me/${botUsername}?start=ref_${profile.referral_code}`;
  await say(chatId,
    `🪂 <b>DROP ZONE</b>\n\nWelcome, ${escapeHtml(user.first_name ?? "Airdrop Hunter")}!\n\n⭐ Points: <b>${profile.points ?? 0}</b>\n\nChoose an option below:`,
    [
      [{ text: "🚀 Available Missions", callback_data: "missions" }],
      [{ text: "👤 My Profile", callback_data: "profile" }, { text: "🎁 Referral", callback_data: "referral" }],
      [{ text: "🏆 Leaderboard", callback_data: "leaderboard" }, { text: "ℹ️ Help", callback_data: "help" }],
    ]);
}

async function showMissions(chatId: number) {
  const { data, error } = await db.from("bot_missions")
    .select("id,title,description,category,reward_points,action_url,ends_at")
    .eq("status", "active").order("created_at", { ascending: false }).limit(10);
  if (error) throw error;
  if (!data?.length) return say(chatId, "📭 No active missions right now. Please check again later.");
  for (const m of data) {
    const text = `🚀 <b>${escapeHtml(m.title)}</b>\n🏷 ${escapeHtml(m.category)} · ⭐ ${m.reward_points} points\n\n${escapeHtml(m.description || "Complete this mission and submit proof.")}${m.ends_at ? `\n\n⏳ Ends: ${new Date(m.ends_at).toLocaleString("en-US", { timeZone: "UTC" })} UTC` : ""}`;
    const rows = [];
    if (m.action_url) rows.push([{ text: "🔗 Open Mission", url: m.action_url }]);
    rows.push([{ text: "📤 Submit Proof", callback_data: `submit:${m.id}` }]);
    await say(chatId, text, rows);
  }
}

async function handleMessage(message: TgMessage) {
  const user = message.from;
  if (!user || message.chat.type !== "private") return;
  const text = (message.text ?? "").trim();

  if (text.startsWith("/start")) {
    const arg = text.split(/\s+/)[1];
    const profile = await upsertUser(user, arg);
    if (profile.is_blocked) return say(message.chat.id, "⛔ Your account is restricted.");
    return showHome(message.chat.id, user);
  }

  const { data: profile } = await db.from("telegram_users")
    .select("submission_state,submission_mission_id,is_blocked")
    .eq("telegram_id", user.id).maybeSingle();
  if (!profile) return say(message.chat.id, "Please start the bot first using /start.");
  if (profile.is_blocked) return say(message.chat.id, "⛔ Your account is restricted.");

  if (profile.submission_state === "awaiting_proof" && profile.submission_mission_id) {
    if (!text || text.startsWith("/")) return say(message.chat.id, "Please send a proof link or short text.");
    const { error } = await db.from("bot_submissions").insert({
      telegram_id: user.id,
      mission_id: profile.submission_mission_id,
      proof: text.slice(0, 4000),
    });
    await db.from("telegram_users").update({ submission_state: null, submission_mission_id: null })
      .eq("telegram_id", user.id);
    if (error?.code === "23505") return say(message.chat.id, "⚠️ You have already submitted this mission.");
    if (error) throw error;
    return say(message.chat.id, "✅ Proof submitted! Your submission is pending admin review.");
  }

  if (text === "/help") return say(message.chat.id, "Use /start to open the menu. Choose Available Missions, complete a task, then submit your proof.");
  if (text === "/missions") return showMissions(message.chat.id);
  if (ADMIN_IDS.includes(String(user.id)) && text === "/admin_help") {
    return say(message.chat.id,
      "🛠 <b>Admin Commands</b>\\n\\n" +
      "/mission_list — list missions\\n" +
      "/mission_add Title | Description | Category | Points | URL\\n" +
      "/mission_pause UUID — pause mission\\n" +
      "/mission_resume UUID — activate mission\\n" +
      "/mission_delete UUID — permanently delete mission\\n" +
      "/admin_pending — review submissions\\n" +
      "/approve UUID — approve and credit points\\n\\n" +
      "Use | between fields. Use - if no URL.");
  }
  if (ADMIN_IDS.includes(String(user.id)) && text === "/mission_list") {
    const { data, error } = await db.from("bot_missions")
      .select("id,title,status,reward_points").order("created_at", { ascending: false }).limit(30);
    if (error) return say(message.chat.id, "Could not load missions: " + escapeHtml(error.message));
    if (!data?.length) return say(message.chat.id, "No missions found.");
    for (const m of data) await say(message.chat.id,
      `🚀 <b>${escapeHtml(m.title)}</b>\\nStatus: ${m.status} · ⭐ ${m.reward_points}\\n<code>${m.id}</code>`);
    return;
  }
  if (ADMIN_IDS.includes(String(user.id)) && text.startsWith("/mission_add ")) {
    const parts = text.slice(12).split("|").map((v) => v.trim());
    if (parts.length !== 5 || !parts[0] || !parts[1] || !parts[2] || !/^\d+$/.test(parts[3])) {
      return say(message.chat.id, "Format:\\n/mission_add Title | Description | Category | Points | URL\\nUse - for no URL.");
    }
    const { data, error } = await db.from("bot_missions").insert({
      title: parts[0].slice(0,120), description: parts[1].slice(0,1000),
      category: parts[2].slice(0,40), reward_points: Number(parts[3]),
      action_url: parts[4] === "-" ? null : parts[4], status: "active"
    }).select("id").single();
    if (error) return say(message.chat.id, "Could not create mission: " + escapeHtml(error.message));
    return say(message.chat.id, "✅ Mission created. ID: <code>" + data.id + "</code>");
  }
  if (ADMIN_IDS.includes(String(user.id)) && (text.startsWith("/mission_pause ") || text.startsWith("/mission_resume ") || text.startsWith("/mission_delete "))) {
    const [command, id] = text.split(/\s+/);
    const action = command.replace("/mission_", "");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return say(message.chat.id, "Usage: /mission_pause UUID, /mission_resume UUID, or /mission_delete UUID");
    if (action === "delete") {
      const { error } = await db.from("bot_missions").delete().eq("id", id);
      if (error) return say(message.chat.id, "Delete failed: " + escapeHtml(error.message));
      return say(message.chat.id, "🗑 Mission deleted.");
    }
    const status = action === "pause" ? "paused" : "active";
    const { error } = await db.from("bot_missions").update({ status }).eq("id", id);
    if (error) return say(message.chat.id, "Update failed: " + escapeHtml(error.message));
    return say(message.chat.id, action === "pause" ? "⏸ Mission paused." : "✅ Mission activated.");
  }
  if (text === "/admin_pending" && ADMIN_IDS.includes(String(user.id))) {
    const { data } = await db.from("bot_submissions").select("id,telegram_id,mission_id,proof,created_at")
      .eq("status", "pending").order("created_at").limit(10);
    if (!data?.length) return say(message.chat.id, "No pending submissions.");
    for (const s of data) await say(message.chat.id,
      `🧾 <b>Submission</b>\nID: <code>${s.id}</code>\nUser: <code>${s.telegram_id}</code>\nMission: <code>${s.mission_id}</code>\nProof: ${escapeHtml(s.proof)}`);
    return;
  }
  if (text.startsWith("/approve ") && ADMIN_IDS.includes(String(user.id))) {
    const id = text.split(/\s+/)[1];
    if (!id) return say(message.chat.id, "Usage: /approve <submission_uuid>");
    const { data, error } = await db.rpc("admin_approve_bot_submission", { p_submission_id: id });
    if (error) return say(message.chat.id, "Could not approve: " + escapeHtml(error.message));
    await say(message.chat.id, "✅ Submission approved. " + data.reward_points + " points credited.");
    await say(Number(data.telegram_id), "🎉 Your mission was approved! You earned " + data.reward_points + " points. Total: " + data.total_points + " points.");
    return;
  }
}

async function handleCallback(callback: TgCallback) {
  const chatId = callback.message?.chat.id;
  if (!chatId) return;
  const userId = callback.from.id;
  const data = callback.data ?? "";
  await telegram("answerCallbackQuery", { callback_query_id: callback.id });

  if (data === "missions") return showMissions(chatId);
  if (data === "profile") {
    const { data: p } = await db.from("telegram_users").select("points,created_at,referral_code")
      .eq("telegram_id", userId).single();
    return say(chatId, `👤 <b>Your Profile</b>\nTelegram ID: <code>${userId}</code>\n⭐ Points: <b>${p?.points ?? 0}</b>\n📅 Joined: ${p?.created_at ? new Date(p.created_at).toLocaleDateString("en-US") : "—"}`);
  }
  if (data === "referral") {
    const { data: p } = await db.from("telegram_users").select("referral_code").eq("telegram_id", userId).single();
    const botUsername = Deno.env.get("TELEGRAM_BOT_USERNAME") ?? "YOUR_BOT_USERNAME";
    const link = `https://t.me/${botUsername}?start=ref_${p?.referral_code}`;
    const { count } = await db.from("telegram_users").select("*", { count: "exact", head: true }).eq("referred_by", userId);
    return say(chatId, `🎁 <b>Invite Friends</b>\nYour referrals: ${count ?? 0}\n\nYour link:\n<code>${link}</code>\n\nShare this link with friends.`);
  }
  if (data === "leaderboard") {
    const { data } = await db.from("telegram_users").select("first_name,username,points")
      .eq("is_blocked", false).order("points", { ascending: false }).limit(10);
    const lines = (data ?? []).map((p, i) => `${i + 1}. ${escapeHtml(p.username ? "@" + p.username : p.first_name ?? "Hunter")} — ⭐ ${p.points}`);
    return say(chatId, `🏆 <b>Top Hunters</b>\n\n${lines.join("\n") || "No rankings yet."}`);
  }
  if (data === "help") return say(chatId, "🚀 Open Available Missions, follow the instructions, then tap Submit Proof and send a link or text. Rewards are credited after admin review.");
  if (data.startsWith("submit:")) {
    const missionId = data.slice(7);
    const { data: mission } = await db.from("bot_missions").select("id,title")
      .eq("id", missionId).eq("status", "active").maybeSingle();
    if (!mission) return say(chatId, "This mission is no longer available.");
    const { data: prior } = await db.from("bot_submissions").select("id")
      .eq("telegram_id", userId).eq("mission_id", missionId).maybeSingle();
    if (prior) return say(chatId, "You have already submitted this mission.");
    await db.from("telegram_users").update({
      submission_state: "awaiting_proof",
      submission_mission_id: missionId,
    }).eq("telegram_id", userId);
    return say(chatId, `📤 Send your proof for <b>${escapeHtml(mission.title)}</b> in your next message.\n\nSend a URL or short text. Do not share passwords or seed phrases.`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("DROP ZONE bot is running", { status: 200 });
  if (req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const update = await req.json() as TgUpdate;
    if (update.message) await handleMessage(update.message);
    if (update.callback_query) await handleCallback(update.callback_query);
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Bot update failed", error);
    return new Response("Internal error", { status: 500 });
  }
});
