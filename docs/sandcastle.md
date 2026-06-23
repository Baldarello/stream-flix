# Guida a Sandcastle — Orchestrazione AI Agent

Sandcastle esegue agent AI in container Docker isolati, su branch Git dedicati. Le modifiche vengono committate e mergiate automaticamente.

---

## 1. Setup iniziale

### API Key MiniMax

Apri `.sandcastle/.env` e imposta la tua chiave:

```bash
MINIMAX_API_KEY=<tua-key>
```

Oppure da terminale:

```bash
# Mac/Linux
export MINIMAX_API_KEY=<tua-key>

# Windows (PowerShell)
$env:MINIMAX_API_KEY="<tua-key>"
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
# Task

Trova e correggi il bug nel componente MediaCard che causa un errore
quando il titolo è più lungo di 50 caratteri. Non modificare altri file.
Output <promise>COMPLETE</promise> quando hai finito.
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

## 3. Come funziona (architettura)

```
Host (stream-flix)
│
├── .sandcastle/
│   ├── prompt.md          ← descrizione del task
│   ├── main.mts           ← script di orchestrazione
│   ├── minimax-agent.cjs  ← agente (generato automaticamente)
│   └── .env               ← MINIMAX_API_KEY
│
└── .sandcastle/logs/     ← log degli agenti

Container Docker (sandcastle:stream-flix)
│
├── /home/agent/workspace ← bind-mount del repo host (worktree)
└── .sandcastle/           ← copy del .sandcastle/ host
```

**Flusso:**
1. `bun run sandcastle` → genera `minimax-agent.cjs` e avvia `run()`
2. Sandcastle crea un git worktree isolato su `feature/monorepo`
3. Avvia il container Docker con il worktree montato
4. L'agente MiniMax riceve `prompt.md` come input
5. L'agente lavora nel container sul codice del repo
6. Sandcastle raccoglie i commit e li mostra

---

## 4. Modalità di iterazione

### Una singola iterazione (default)

L'agente riceve il prompt, lavora, e termina.

```bash
# Già il default — una iterazione
await run({ ..., maxIterations: 1 });
```

### Multipla iterazione

L'agente può fare più giri, utile per task complessi:

```bash
await run({ ..., maxIterations: 5 });
```

Per terminare prima, nel prompt l'agente deve scrivere:
```
<promise>COMPLETE</promise>
```

---

## 5. Variabili d'ambiente

`.sandcastle/.env`:

```bash
# Chiave API MiniMax (obbligatoria)
MINIMAX_API_KEY=sk-cp-...

# Endpoint API (default: https://api.minimax.io/v1)
# Non serve modificarlo normalmente
MINIMAX_BASE_URL=

# Modello (default: MiniMax-Text-01)
MODEL=
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

### Verificare i branch worktree attivi

```bash
git worktree list
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

### Modificare il prompt da riga di comando

Invece di usare `prompt.md`, passa il prompt inline in `main.mts`:

```typescript
await run({
  agent: minimax(),
  sandbox: docker(),
  prompt: "Fammi un refactor di MediaCard.tsx...",
});
```

### Agganci (hooks)

Esegui comandi prima/dopo l'avvio del container:

```typescript
await run({
  agent: minimax(),
  sandbox: docker(),
  promptFile: "./.sandcastle/prompt.md",
  hooks: {
    sandbox: {
      onSandboxReady: [
        { command: "npm install" },  // installa dipendenze nel container
      ],
    },
  },
});
```

### Timeout personalizzati

```typescript
await run({
  agent: minimax(),
  sandbox: docker(),
  promptFile: "./.sandcastle/prompt.md",
  idleTimeoutSeconds: 300,       // 5 minuti senza output → fail
  completionTimeoutSeconds: 120,  // 2 minuti dopo COMPLETE → warn
});
```

### Logging su file custom

```typescript
await run({
  agent: minimax(),
  sandbox: docker(),
  promptFile: "./.sandcastle/prompt.md",
  logging: { type: "file", path: ".sandcastle/logs/mio-task.log" },
});
```

---

## 8. Risolvere problemi

### "MINIMAX_API_KEY not set"

```bash
# Verifica che la variabile sia caricata
cat .sandcastle/.env
# Se hai cambiato il file, riavvia il terminale
```

### "401 invalid api key"

La API key è scaduta o non è valida. Verifica su [MiniMax dashboard](https://platform.minimax.chat/).

### Container non parte

```bash
docker ps -a | grep sandcastle
docker logs <container-id>
```

### Agente bloccato (nessun output per >10 min)

```bash
# Ctrl+C per terminare
# Poi cleanup:
docker kill $(docker ps -q --filter "ancestor=sandcastle:stream-flix")
```

### Worktree bloccato

```bash
git worktree prune
```

---

## 9. Struttura dei file

```
.sandcastle/
├── .env              ← API key (non committare!)
├── .env.example      ← template per .env
├── .gitignore        ← ignora .env e logs/
├── Dockerfile        ← ambiente container
├── main.mts         ← entry point (modifica qui per customizzare)
├── minimax-agent.cjs ← generato automaticamente
├── prompt.md         ← task per l'agente (scrivi qui)
└── SETUP_ISSUE_TRACKER.md  ← (per issue tracker custom, ignorare)
```

---

## 10. Workflow consigliato

```
1. Scrivi il task in .sandcastle/prompt.md
2. Esegui: bun run sandcastle
3. Monitora: tail -f .sandcastle/logs/feature-monorepo.log
4. L'agente lavora, committa, e mergea su feature/monorepo
5. Review dei commit: git log --oneline feature/monorepo -5
6. Se tutto ok: git merge feature/monorepo
```

---

## 11. Modelli disponibili

| Variabile | Valore default | Note |
|-----------|---------------|------|
| `MODEL` | `MiniMax-Text-01` | Modello principale MiniMax |
| — | `MiniMax-Text-01` | Flag `--thinking` supportato |
| — | `MiniMax-VL-01` | Modello visione (non testato) |

Per usare un modello diverso:

```bash
MODEL=MiniMax-VL-01 bun run sandcastle
```

Oppure in `.env`:
```
MODEL=MiniMax-VL-01
```
