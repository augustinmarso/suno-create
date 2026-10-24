# suno-create

Panneau « Create » inspiré de Suno (modes Simple et Advanced), qui génère de la musique gratuitement avec
[ACE-Step](https://huggingface.co/spaces/ACE-Step/ACE-Step), un modèle open source, via son Space Hugging Face.

**En ligne : https://augustinmarso.github.io/suno-create/**

- **Simple** : la description sert de style ; le morceau est instrumental.
- **Advanced** : styles + paroles (balises `[verse]`, `[chorus]`, `[bridge]`) pour un morceau chanté.
- Durée de 3 à 240 s. Comptez 20 s à 3 min par morceau selon l'affluence sur le Space.

Page statique d'un seul fichier (`index.html`) : le navigateur appelle directement le Space avec
`@gradio/client`. Aucun serveur ni clé d'API. Le quota GPU gratuit de Hugging Face peut être épuisé
aux heures chargées : réessayer plus tard.

## En local

```bash
python -m http.server 5340
```
