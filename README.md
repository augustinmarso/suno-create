# suno-create

Panneau « Create » inspiré de Suno (modes Simple et Advanced), branché gratuitement sur
[ACE-Step](https://huggingface.co/spaces/ACE-Step/ACE-Step), un modèle de musique open source,
via son Space Hugging Face.

- **Simple** : la description sert de style ; le morceau est instrumental.
- **Advanced** : styles + paroles (balises `[verse]`, `[chorus]`, `[bridge]`) pour un morceau chanté.
- Durée de 3 à 240 s. Les morceaux sont enregistrés dans `songs/`.

## Lancer

```bash
npm install
npm start            # http://localhost:5340
```

Facultatif : `HF_TOKEN=…` dans `.env.local` (jeton Hugging Face en lecture) donne un quota GPU
plus large que l'accès anonyme. Le serveur n'écoute que sur 127.0.0.1.
