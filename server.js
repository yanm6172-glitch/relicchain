/* ============================================================
   文博链 RelicChain · 服务端 server.js
   真实软件核心：HTTP 服务 + 磁盘持久化 + 真账号鉴权 + 服务端挖矿
   零依赖（仅需 Node.js），双击 启动服务器.bat 即可运行
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 8080;
const DATA_FILE = path.join(__dirname, 'data.json');
let DB = null;

/* ---------- 工具 ---------- */
function sha256(s){ return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex'); }
function hashPass(p){ return sha256('relicchain-salt-v2:' + p); }
function blockStr(b){ return b.index + '|' + b.prevHash + '|' + b.time + '|' + JSON.stringify(b.data) + '|' + b.nonce; }
function mine(b, diff){
  const target = '0'.repeat(diff);
  b.nonce = 0;
  while (true){
    b.nonce++;
    const h = sha256(blockStr(b));
    if (h.slice(0, diff) === target){ b.hash = h; return h; }
  }
}
function permOf(t){
  if (t === 'public') return { reg:false, event:false, lic:false };
  if (t === 'exam') return { reg:false, event:true, lic:false };
  return { reg:true, event:true, lic:true };
}

/* ---------- 持久化 ---------- */
function saveDB(){ try{ fs.writeFileSync(DATA_FILE, JSON.stringify(DB, null, 2)); }catch(e){ console.error('写入失败:', e.message); } }
function addAudit(actor, action, detail){
  DB.audit.push({ time: Date.now(), actor: actor, action: action, detail: detail });
  if (DB.audit.length > 500) DB.audit = DB.audit.slice(-500);
  saveDB();
}
function newBlock(data, diff){
  const b = { index: DB.chain.length, prevHash: DB.chain[DB.chain.length - 1].hash, time: Date.now(),
              diff: diff || DB.diff, nonce: 0, hash: '', conf: 4, bad: false, data: data };
  mine(b, b.diff);
  DB.chain.push(b);
  saveDB();
  return b;
}
function canonical(a){
  const o = { name:a.name, code:a.code, dynasty:a.dynasty, material:a.material, level:a.level, desc:a.desc, org:a.org };
  if (a.photoHash) o.photoHash = a.photoHash;
  return JSON.stringify(o, null, 2);
}
function seed(){
  const t0 = Date.now();
  DB = {
    chain: [], artifacts: [],
    orgs: [
      { id:'ORG1', name:'绵阳市文物局', type:'主管部门', status:true, time:t0 },
      { id:'ORG2', name:'绵阳市博物馆', type:'馆藏单位', status:true, time:t0 },
      { id:'ORG3', name:'绵州公证处', type:'公证机构', status:true, time:t0 },
      { id:'ORG4', name:'文物检测中心', type:'检测机构', status:true, time:t0 }
    ],
    audit: [],
    accounts: [
      { id:'A1', user:'museum', pass:hashPass('123456'), org:'绵阳市博物馆', type:'museum' },
      { id:'A2', user:'exam', pass:hashPass('123456'), org:'文物检测中心', type:'exam' },
      { id:'A3', user:'admin', pass:hashPass('admin888'), org:'平台运营方', type:'admin' }
    ],
    diff: 2,
    sessions: {}
  };
  const g = { index:0, prevHash:'0'.repeat(64), time:t0, diff:1, nonce:0, hash:'', conf:4, bad:false,
              data:{ type:'GENESIS', content:'创世区块 · RelicChain 服务端启动', org:'平台运营方' } };
  mine(g, 1); DB.chain.push(g);
  const seeds = [
    { name:'摩崖造像 · 主尊龛', code:'碧水寺-001', dynasty:'隋', material:'砂岩', level:'一级', desc:'主尊造像，三维扫描建档' },
    { name:'摩崖造像 · 说法图', code:'碧水寺-002', dynasty:'隋', material:'砂岩', level:'一级', desc:'说法图龛，三维扫描建档' },
    { name:'摩崖造像 · 胁侍菩萨龛', code:'碧水寺-003', dynasty:'唐', material:'砂岩', level:'二级', desc:'胁侍菩萨造像龛，三维扫描建档' },
    { name:'碑刻 · 题记', code:'碧水寺-004', dynasty:'隋', material:'石灰岩', level:'二级', desc:'题记碑刻，高精度数字化' }
  ];
  seeds.forEach(function(s, i){
    const a = { name:s.name, code:s.code, dynasty:s.dynasty, material:s.material, level:s.level, desc:s.desc, org:'绵阳市博物馆', time:t0 + (i + 1) * 60000 };
    a.fp = sha256(canonical(a));
    DB.artifacts.push(a);
    newBlock({ type:'REGISTER', artifactId:a.code, name:a.name, level:a.level, fingerprint:a.fp, org:a.org }, 1);
  });
  newBlock({ type:'EVENT', artifactId:'碧水寺-001', name:'摩崖造像 · 主尊龛', eventType:'检测记录', content:'2026-03 完成石质病害检测，无新增开裂', org:'文物检测中心' }, 1);
  addAudit('系统', '平台初始化', '服务端创世区块与示例数据已生成');
}
function loadDB(){
  try{
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    DB = JSON.parse(raw);
    if (!DB || !DB.chain || !DB.chain.length) seed();
  }catch(e){ seed(); }
}

/* ---------- API ---------- */
function handleApi(req, res, url, body){
  const send = function(code, obj){
    res.writeHead(code, { 'Content-Type':'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  };
  const pubAccounts = function(){
    return DB.accounts.map(function(a){ return { id:a.id, user:a.user, org:a.org, type:a.type }; });
  };
  try{
    if (url === '/api/state' && req.method === 'GET'){
      send(200, { chain: DB.chain, artifacts: DB.artifacts, orgs: DB.orgs, audit: DB.audit, accounts: pubAccounts(), diff: DB.diff, online: true });
    }
    else if (url === '/api/login' && req.method === 'POST'){
      const user = (body && body.user) ? String(body.user).trim() : '';
      const pass = (body && body.pass) ? String(body.pass) : '';
      if (!user || user === 'public'){
        const token = 't' + Date.now() + Math.random().toString(36).slice(2);
        DB.sessions[token] = { user: null, type: 'public' };
        saveDB();
        send(200, { ok:true, token: token, role: { key:'public', name:'公众', org:'游客模式', perm: permOf('public'), isAdmin:false } });
        return;
      }
      const acc = DB.accounts.find(function(a){ return a.user === user && a.pass === hashPass(pass); });
      if (!acc){ send(401, { ok:false, msg:'账号或密码错误（服务端校验）' }); return; }
      const token = 't' + Date.now() + Math.random().toString(36).slice(2);
      DB.sessions[token] = { user: acc.user, type: acc.type };
      addAudit(acc.org, '登录', '账号 ' + acc.user + ' 登录成功（服务端）');
      send(200, { ok:true, token: token, role: { key: acc.type, name: acc.type === 'admin' ? '平台管理员' : (acc.type === 'museum' ? '馆藏单位' : '检测机构'), org: acc.org, perm: permOf(acc.type), isAdmin: acc.type === 'admin' } });
    }
    else if (url === '/api/block' && req.method === 'POST'){
      const b = newBlock((body && body.data) || {}, (body && body.diff) || DB.diff);
      addAudit((body && body.org) || '客户端', '上链', '新区块 #' + b.index + '（' + (b.data.type || '') + '）');
      send(200, { ok:true, block: b, height: DB.chain.length - 1 });
    }
    else if (url === '/api/artifact' && req.method === 'POST'){
      if (body && body.artifact){
        const a = body.artifact;
        if (!a.fp) a.fp = sha256(canonical(a));
        if (!DB.artifacts.find(function(x){ return x.code === a.code; })) DB.artifacts.push(a);
        saveDB();
        send(200, { ok:true, artifacts: DB.artifacts });
      } else send(400, { ok:false });
    }
    else if (url === '/api/audit' && req.method === 'POST'){
      addAudit((body && body.actor) || '客户端', (body && body.action) || '操作', (body && body.detail) || '');
      send(200, { ok:true, count: DB.audit.length });
    }
    else if (url === '/api/verify' && req.method === 'POST'){
      const items = (body && body.items) || [];
      const results = items.map(function(it){
        const hit = DB.artifacts.find(function(a){ return a.fp === it.hash; });
        return { name: it.name, ok: !!hit, hit: hit ? { name: hit.name, code: hit.code } : null };
      });
      addAudit((body && body.actor) || '客户端', '核验', items.length + ' 个文件核验');
      send(200, { ok:true, results: results });
    }
    else if (url === '/api/orgs' && req.method === 'POST'){
      DB.orgs.push({ id:'ORG' + Date.now(), name: String(body.name || '未命名机构'), type: String(body.type || '研究机构'), status:true, time:Date.now() });
      addAudit(body.actor || '管理员', '机构管理', '准入新机构：' + body.name);
      send(200, { ok:true, orgs: DB.orgs });
    }
    else if (url === '/api/org-toggle' && req.method === 'POST'){
      const o = DB.orgs.find(function(x){ return x.id === body.id; });
      if (o){ o.status = !o.status; addAudit(body.actor || '管理员', '机构管理', (o.status ? '启用' : '停用') + '机构：' + o.name); }
      send(200, { ok:true, orgs: DB.orgs });
    }
    else if (url === '/api/accounts' && req.method === 'POST'){
      if (!body || !body.user || String(body.user).trim() === ''){ send(400, { ok:false, msg:'账号不能为空' }); return; }
      if (DB.accounts.find(function(a){ return a.user === body.user; })){ send(400, { ok:false, msg:'账号已存在' }); return; }
      DB.accounts.push({ id:'A' + Date.now(), user: String(body.user), pass: hashPass(String(body.pass || '123456')), org: String(body.org || ''), type: String(body.type || 'museum') });
      addAudit(body.actor || '管理员', '账号管理', '创建账号：' + body.user + '（' + body.org + '）');
      send(200, { ok:true, accounts: pubAccounts() });
    }
    else if (url === '/api/account-del' && req.method === 'POST'){
      DB.accounts = DB.accounts.filter(function(a){ return a.id !== body.id; });
      addAudit(body.actor || '管理员', '账号管理', '删除账号：' + body.id);
      send(200, { ok:true, accounts: pubAccounts() });
    }
    else if (url === '/api/backup' && req.method === 'GET'){
      const { sessions, ...pub } = DB;
      pub.accounts = pubAccounts();
      send(200, pub);
    }
    else if (url === '/api/restore' && req.method === 'POST'){
      if (body && body.chain && body.chain.length){
        DB.chain = body.chain; DB.artifacts = body.artifacts || [];
        DB.orgs = body.orgs || []; DB.audit = body.audit || [];
        DB.accounts = body.accounts || []; DB.diff = body.diff || 2;
        addAudit('系统', '数据恢复', '从备份恢复（' + DB.chain.length + ' 块）');
        send(200, { ok:true });
      } else send(400, { ok:false, msg:'备份文件无效' });
    }
    else if (url === '/api/reset' && req.method === 'POST'){
      seed();
      send(200, { ok:true });
    }
    else { send(404, { ok:false, msg:'接口不存在：' + url }); }
  }catch(e){
    send(500, { ok:false, msg: e.message });
  }
}

/* ---------- 静态文件 ---------- */
const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png',
  '.md':'text/plain; charset=utf-8', '.bat':'text/plain; charset=utf-8', '.txt':'text/plain; charset=utf-8'
};
const server = http.createServer(function(req, res){
  const u = decodeURIComponent((req.url || '/').split('?')[0]);
  if (u.indexOf('/api/') === 0){
    let bodyRaw = '';
    req.on('data', function(c){ bodyRaw += c; if (bodyRaw.length > 5e6) req.destroy(); });
    req.on('end', function(){
      let body = null;
      try{ body = bodyRaw ? JSON.parse(bodyRaw) : null; }catch(e){ body = null; }
      handleApi(req, res, u, body);
    });
    return;
  }
  let filePath = u === '/' ? '/index.html' : u;
  filePath = path.join(__dirname, path.normalize(filePath).replace(/^(\.\.[\/\\])+/, ''));
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()){
    res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' });
    res.end('404 文件不存在');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

loadDB();
server.listen(PORT, function(){
  console.log('==========================================');
  console.log(' 文博链 RelicChain 服务端已启动');
  console.log(' 本机访问: http://localhost:' + PORT);
  console.log(' 手机访问: http://<本机IP>:' + PORT + ' (同一WiFi)');
  console.log(' 数据文件: ' + DATA_FILE);
  console.log('==========================================');
});

