# Guida a Sandcastle — Orchestrazione AI Agent

Sandcastle esegue agent AI in container Docker isolati, su branch Git dedicati. Le modifiche vengono committate e mergiate automaticamente.

---

## 1. Setup iniziale

### API Key MiniMax

Apri `.sandcastle/.env` e imposta la tua chiave MiniMax:

```bash
# Get your key from https://platform.minimax.chat/
MINIMAX_API_KEY=<tua-key>
```

### Verifica che Docker sia attivo

```bash
docker --version
docker ps
```

---

## 2. Eseguire un task

### Scrivi il prompt

Apri `.sandcastle/prompt.md` e descrivi il task:

```markdown
# Context

<!-- Dynamic context — replace with your tracker commands -->

# Task

Fix the bug in the MediaCard component where the title overflows
when it exceeds 50 characters. Do not modify other files.

# Done

When the task is complete, output <promise>COMPLETE</promise> to signal early termination.
```

### Esegui

```bash
bun run sandcastle
```

L'output mostra:
```
[Agent] Started on branch feature/monorepo
  tail -f .sandcastle\logs\feature-monorepo.log
```

Al termine:
```
Run complete: agent finished after 1 iteration(s).
```

---

## 3. Architettura

```
Host (stream-flix)
│
├── .sandcastle/
│   ├── prompt.md          ← descrizione del task
│   ├── main.mts           ← script di orchestrazione (usa opencode agent)
│   ├── Dockerfile         ← ambiente container (opencode-ai installato)
│   └── .env               ← MINIMAX_API_KEY
│
└── .sandcastle/logs/     ← log degli agenti

Container Docker (sandcastle:stream-flix)
│
├── /home/agent/workspace ← bind-mount del repo host (worktree)
└── opencode-ai CLI        ← usato per eseguire l'agente MiniMax
```

**Flusso:**
1. `bun run sandcastle` → avvia `run()` da `main.mts`
2. Sandcastle crea un git worktree isolato su `feature/monorepo`
3. Avvia il container Docker con il worktree montato
4. OpenCode riceve il prompt e si connette a MiniMax API
5. L'agente lavora nel container sul codice del repo
6. Sandcastle raccoglie i commit e li mostra

---

## 4. Modello usato

Il modello configurato è `minimax/MiniMax-M2.7` (MiniMax M2.7).

Formato: `provider/model` dove:
- **provider**: `minimax` (provider MiniMax in opencode)
- **model**: `MiniMax-M2.7` (modello M2.7)

Per cambiare modello, modifica `.sandcastle/main.mts`:
```typescript
agent: opencode("minimax/MiniMax-M2.7"),
// oppure altri modelli disponibili:
agent: opencode("minimax/MiniMax-M2.7-highspeed"),
agent: opencode("minimax/MiniMax-Text-01"),
```

---

## 5. Variabili d'ambiente

`.sandcastle/.env`:

```bash
# Chiave API MiniMax (obbligatoria)
MINIMAX_API_KEY=sk-cp-...

# Chiave API OpenCode (solo per modelli OpenCode propri)
OPENCODE_API_KEY=
```

---

## 6. Comandi utili

### Log in tempo reale

```bash
# In un terminale separato
tail -f .sandcastle/logs/feature-monorepo.log
```

### Forzare il rebuild dell'immagine Docker

Se modifichi il Dockerfile:

```bash
npx @ai-hero/sandcastle docker build-image
```

### Rimuovere l'immagine Docker

```bash
npx @ai-hero/sandcastle docker remove-image
```

### Vedere i commit fatti dall'agente

```bash
git log --oneline feature/monorepo -5
```

### Annullare un run bloccato

```bash
# Ctrl+C nel terminale sandcastle
# Oppure:
docker ps  # trova il container sandcastle
docker kill <container-id>
```

---

## 7. Configurazione avanzata

### Prompt inline invece di file

```typescript
await run({
  agent: opencode("minimax/MiniMax-M2.7"),
  sandbox: docker(),
  prompt: "Fammi un refactor di MediaCard.tsx...",
});
```

### Multipla iterazione

```typescript
await run({
  agent: opencode("minimax/MiniMax-M2.7"),
  sandbox: docker(),
  promptFile: "./.sandcastle/prompt.md",
  maxIterations: 5,
});
```

### Hooks (comandi pre/post container)

```typescript
await run({
  agent: opencode("minimax/MiniMax-M2.7"),
  sandbox: docker(),
  promptFile: "./.sandcastle/prompt.md",
  hooks: {
    sandbox: {
      onSandboxReady: [
        { command: "npm install" },
      ],
    },
  },
});
```

### Timeout personalizzati

```typescript
await run({
  agent: opencode("minimax/MiniMax-M2.7"),
  sandbox: docker(),
  promptFile: "./.sandcastle/prompt.md",
  idleTimeoutSeconds: 300,
  completionTimeoutSeconds: 120,
});
```

---

## 8. Struttura dei file

```
.sandcastle/
├── .env              ← API key (NON committare!)
├── .env.example      ← template per .env
├── .gitignore        ← ignora .env e logs/
├── Dockerfile        ← ambiente container con opencode-ai
├── main.mts         ← entry point (modifica qui per customizzare)
├── prompt.md         ← task per l'agente (scrivi qui)
└── SETUP_ISSUE_TRACKER.md  ← (per issue tracker custom — ignorare per blank)
```

---

## 9. Risoluzione problemi

### "Model not found" o 401

La API key non è valida o non è stata passata. Verifica:
```bash
cat .sandcastle/.env
# La chiave deve essere in MINIMAX_API_KEY
```

### Container non parte

```bash
docker ps -a | grep sandcastle
docker logs <container-id>
```

### Agente bloccato

```bash
docker kill $(docker ps -q --filter "ancestor=sandcastle:stream-flix")
git worktree prune
```
