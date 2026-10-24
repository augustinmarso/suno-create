# suno-create

Panneau « Create » inspiré de Suno (modes Simple et Advanced), qui génère de la musique gratuitement avec
[ACE-Step](https://huggingface.co/spaces/ACE-Step/ACE-Step), un modèle open source, via son Space Hugging Face.

**En ligne : https://augustinmarso.github.io/suno-create/**

- **Simple** : la description sert de style ; le morceau est instrumental.
- **Advanced** : styles + paroles (balises `[verse]`, `[chorus]`, `[bridge]`) pour un morceau chanté.
- Durée de 3 à 240 s. Comptez 20 s à 3 min par morceau selon l'affluence sur le Space.

Page statique d'un seul fichier (`index.html`) : le navigateur appelle directement le Space avec
`@gradio/client`. Aucun serveur.
Chaque morceau réserve 60 s de GPU : le quota anonyme de Hugging Face s’épuise vite. Avec un jeton
Hugging Face « Fine-grained » sans aucune permission, collé dans la page, le quota est bien plus large.
Le jeton est gardé dans le navigateur et envoyé au Space ACE-Step (code tiers) : jamais de jeton à droits.

## En local

```bash
python -m http.server 5340
```
