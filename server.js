// Panneau Create façon Suno, branché sur l'API Eleven Music. Node zéro dépendance.
// Clé : ELEVENLABS_API_KEY, chargée depuis .env.local par `node --env-file=.env.local` (npm start).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

const eleven = new ElevenLabsClient();

const PORT = process.env.PORT || 5340;
const OUT = path.join(__dirname, 'songs');
fs.mkdirSync(OUT, { recursive: true });

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 20000) reject(new Error('Requête trop longue')); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('JSON invalide')); } });
  });
}

// Simple : la description seule. Advanced : style + paroles (ou instrumental) assemblés en un prompt.
function buildPrompt(b) {
  if (b.mode === 'advanced') {
    const parts = [];
    if (b.style) parts.push(`Style : ${b.style}`);
    if (b.instrumental) parts.push('Instrumental, sans voix.');
    else if (b.lyrics) parts.push(`Paroles :\n${b.lyrics}`);
    return parts.join('\n\n');
  }
  return b.instrumental ? `${b.prompt}\n\nInstrumental, sans voix.` : b.prompt;
}

async function create(req, res) {
  const b = await readJson(req);
  const prompt = (buildPrompt(b) || '').trim();
  if (!prompt) return send(res, 400, { error: 'Décris ta chanson avant de créer.' });
  if (prompt.length > 4100) return send(res, 400, { error: 'Prompt trop long (4100 caractères max).' });
  const seconds = Math.min(600, Math.max(3, Number(b.seconds) || 60));
  const model = ['music_v1', 'music_v2', 'music_v2_5'].includes(b.model) ? b.model : 'music_v2_5';
  if (!process.env.ELEVENLABS_API_KEY) return send(res, 503, { error: 'Pas de clé : lance le serveur avec `npm start` (il lit .env.local).' });

  let audio;
  try {
    audio = await eleven.music.compose({ prompt, musicLengthMs: seconds * 1000, modelId: model });
  } catch (e) {
    // bad_prompt (artiste ou paroles protégées citées) : l'API renvoie une reformulation dans le corps
    const detail = e.body ? JSON.stringify(e.body).slice(0, 400) : e.message;
    return send(res, e.statusCode || 502, { error: `Eleven Music : ${detail}` });
  }

  const id = Date.now().toString(36);
  fs.writeFileSync(path.join(OUT, `${id}.mp3`), Buffer.from(await new Response(audio).arrayBuffer()));
  send(res, 200, { id, url: `/songs/${id}.mp3`, title: b.title || prompt.split(/[.\n]/)[0].slice(0, 40), prompt, model, seconds });
}

function send(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg' };

http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/create') return await create(req, res);
    if (req.method !== 'GET') return send(res, 405, { error: 'Méthode non permise' });
    const url = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
    const file = path.normalize(path.join(__dirname, url));
    // seuls index.html et songs/ sont servis (pas .env ni server.js)
    if (file !== path.join(__dirname, 'index.html') && !file.startsWith(OUT + path.sep)) return send(res, 404, { error: 'Introuvable' });
    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, { error: 'Introuvable' });
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
}).listen(PORT, () => console.log(`Create → http://localhost:${PORT}`));
