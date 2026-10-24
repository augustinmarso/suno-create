// Panneau Create façon Suno, branché sur ACE-Step (modèle open source) via son Space Hugging Face, gratuit.
// HF_TOKEN facultatif dans .env.local : il donne un quota GPU plus large que l'accès anonyme.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Client } = require('@gradio/client');

const PORT = process.env.PORT || 5340;
const HOST = '127.0.0.1';
const SPACE = 'ACE-Step/ACE-Step';
const OUT = path.join(__dirname, 'songs');
fs.mkdirSync(OUT, { recursive: true });

let space; // connexion au Space réutilisée entre les requêtes
const connect = () => (space ||= Client.connect(SPACE, process.env.HF_TOKEN ? { hf_token: process.env.HF_TOKEN } : {}).catch(e => { space = null; throw e; }));

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => {
      body += c;
      if (body.length > 20000) { req.destroy(); reject(new Error('Requête trop longue')); }
    });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('JSON invalide')); } });
  });
}

// ACE-Step sépare le style (tags) des paroles ; [inst] = morceau sans voix.
// Simple : la description sert de style, sans paroles. Advanced : styles + paroles.
function toAceStep(b) {
  const tags = (b.mode === 'advanced' ? b.style : b.prompt) || '';
  const lyrics = b.instrumental || b.mode !== 'advanced' || !b.lyrics?.trim() ? '[inst]' : b.lyrics;
  return { tags: tags.trim(), lyrics };
}

async function create(req, res) {
  const b = await readJson(req);
  const { tags, lyrics } = toAceStep(b);
  if (!tags) return send(res, 400, { error: b.mode === 'advanced' ? 'Indique au moins un style.' : 'Décris ta chanson avant de créer.' });
  if (tags.length + lyrics.length > 4100) return send(res, 400, { error: 'Texte trop long (4100 caractères max).' });
  const seconds = Math.min(240, Math.max(3, Number(b.seconds) || 30));

  let file;
  try {
    const result = await (await connect()).predict('/__call__', { audio_duration: seconds, prompt: tags, lyrics });
    file = result.data[0];
  } catch (e) {
    // quota GPU gratuit épuisé, Space en veille ou surchargé : le message de Gradio le dit
    return send(res, 502, { error: `ACE-Step : ${e.message || e.title || JSON.stringify(e).slice(0, 300)}` });
  }

  const r = await fetch(file.url);
  if (!r.ok) return send(res, 502, { error: `Téléchargement du morceau : ${r.status}` });
  const ext = path.extname(new URL(file.url).pathname) || '.wav';
  const id = Date.now().toString(36);
  fs.writeFileSync(path.join(OUT, id + ext), Buffer.from(await r.arrayBuffer()));
  const prompt = lyrics === '[inst]' ? tags : `${tags} · ${lyrics.replace(/\s+/g, ' ')}`;
  send(res, 200, { id, url: `/songs/${id}${ext}`, title: b.title || tags.split(/[.,\n]/)[0].slice(0, 40), prompt, model: 'ACE-Step', seconds });
}

function send(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac', '.ogg': 'audio/ogg' };
const SELF = [`http://localhost:${PORT}`, `http://${HOST}:${PORT}`];

http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/create') {
      // seul le panneau lui-même peut lancer une génération (pas un autre site ouvert dans le navigateur)
      if (!SELF.includes(req.headers.origin) || !String(req.headers['content-type']).startsWith('application/json'))
        return send(res, 403, { error: 'Origine refusée' });
      return await create(req, res);
    }
    if (req.method !== 'GET') return send(res, 405, { error: 'Méthode non permise' });
    const url = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
    const file = path.normalize(path.join(__dirname, url));
    // seuls index.html et songs/ sont servis (pas .env.local ni server.js)
    if (file !== path.join(__dirname, 'index.html') && !file.startsWith(OUT + path.sep)) return send(res, 404, { error: 'Introuvable' });
    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, { error: 'Introuvable' });
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) {
    if (!res.headersSent) send(res, 500, { error: e.message });
  }
}).listen(PORT, HOST, () => console.log(`Create → http://localhost:${PORT}`));
