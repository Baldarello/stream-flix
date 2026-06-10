# Remote Slave – Architettura e Funzionalità

Documento che descrive il flow **Remote Slave** di StreamFlix: come funziona, quali sono i messaggi scambiati, e cosa è possibile fare sia dal lato **TV (slave)** che dal lato **telecomando (master)**.

---

## Architettura generale

Il sistema prevede due ruoli che comunicano tramite WebSocket attraverso un server centrale (Elysia, in `backend/src/wss.js`):

- **Slave (TV)** – un'istanza dell'app in modalità Smart TV (`?tv=1` o rilevata automaticamente) che riceve contenuti e li riproduce. Ha un `slaveId` persistente e un `shortCode` a 5 caratteri.
- **Master (telecomando)** – un telefono/browser che scansiona il QR o inserisce lo short code e prende il controllo della TV.

La "stanza" che lega i due è una `remoteSession` (`Map<slaveId, {slaveWs, masterWs}>`) mantenuta nel backend.

```
+-----------------+        WebSocket         +-----------------+
|  MASTER (phone) | <----------------------> |  WSS backend    |
+-----------------+                           |  (Elysia)       |
                                              |  remoteSessions |
+-----------------+        WebSocket          |  shortCode map  |
|  SLAVE (TV)     | <---------------------->  +-----------------+
+-----------------+
```

---

## 1. Fase di accoppiamento (pairing)

### Lato Slave (TV)

1. L'utente apre l'app sulla TV in modalità Smart TV.
2. Il componente `features/tv/TvApp.jsx` mostra `TvHomeView` → l'utente preme "QR Pairing".
3. `remoteStore.enableSmartTVMode()` viene chiamato: imposta `isSmartTV=true`, mostra `isSmartTVPairingVisible=true`, poi `websocketService.registerSlave({...})` con `slaveId` e `shortCode` (entrambi opzionali).
4. Il backend gestisce `quix-register-slave`:
   - se lo slave fornisce uno `shortCode` già mappato a un `slaveId` noto, lo riusa (`slaveIdToShortCode` è una mappa persistente);
   - altrimenti genera un nuovo codice di 5 caratteri uppercase (`generateShortCode()`);
   - crea la `remoteSession` (`{slaveWs, masterWs:null}`) o aggiorna quella esistente;
   - risponde con `quix-slave-registered {slaveId, shortCode}`.
5. Il TV salva su `IndexedDB` (`selfSlaveId`, `selfShortCode`, `isConfiguredAsSlave`) in modo che al refresh mantenga la stessa identità.
6. La `TvPairingView` mostra un QR (che codifica `${origin}/?remote_for=${slaveId}`) + lo short code a 5 caratteri in monospazio.

### Lato Master (telecomando)

1. L'utente apre `MasterScreen.jsx` (icona QR scanner nella `FloatingDock` o in `ConnectionIndicator`).
2. Viene mostrato un QR scanner (`html5-qrcode`) + campo di input manuale per lo short code.
3. Quando il QR viene letto o il codice inserito, `connectAsRemoteMaster(slaveId)` viene chiamato:
   - imposta `isRemoteMaster=true`, `slaveId=slaveId`;
   - salva `remoteMasterForSlaveId` su IndexedDB per la riconnessione automatica;
   - invia `quix-register-master` al backend;
   - salva lo slave in `knownSlaves` (IndexedDB) con `lastSeen` e `shortCode`.

---

## 2. Connessione e handshake

Il backend, su `quix-register-master`:

1. Risolve lo `slaveId`: se è uno short code lo converte in ID completo tramite `shortCodeToSlaveId`.
2. Controlla la `remoteSession`:
   - **slave offline** → invia `quix-master-connection-status: slave-not-found` (o `slave-reconnecting` se è in ricarica intenzionale);
   - **master già connesso** → `slave-busy`, a meno che non sia un re-connect intenzionale;
   - **tutto ok** → setta `masterWs=ws`, invia `quix-master-connected` sia al master che allo slave.

Lo slave, ricevendo `quix-master-connected`, nasconde la pairing view e mostra la `SlaveConnectedView`. Il master riceve `connection-established` e fa partire il `startPingInterval()`.

---

## 3. Heartbeat (keepalive + qualità connessione)

Il master invia `heartbeat-ping` ogni 10s. Lo slave risponde con `heartbeat-pong`. Dopo 12s senza pong il master incrementa `missedPings`:

| `missedPings` | `connectionHealth` |
|---|---|
| 0 | `good` |
| 1 | `degraded` |
| ≥3 | `poor` |

Lo stato è reso visibile in `ConnectionIndicator.jsx`.

---

## 4. Comandi remoti (master → slave)

Il master usa `remoteStore.sendRemoteCommand(cmd)`, che invia `quix-remote-command` con il `slaveId`. Il backend fa da proxy e inoltra al TV. Lo slave riceve in `handleRemoteCommand(payload)`:

| Comando | Effetto |
|---|---|
| `play_item` | `mediaStore.startPlayback(item)` + auto-fullscreen |
| `stop` | `mediaStore.stopPlayback()` |
| `select_item` | Apre la detail view sul TV |
| `clear_selection` | Chiude la detail view |
| `play` / `pause` | Play/pausa del `<video>` |
| `seek_forward` / `seek_backward` | ±10s |
| `seek_to` | `currentTime = time` |
| `skip_intro` | Salta a `intro_end_s` (se disponibile) o +N secondi |
| `request_status` | Forza un `sendSlaveStatusUpdate()` |
| `request-media-sync` | Apre `MediaSyncModal` sul TV |

Dopo ogni comando che tocca il player, lo slave invia `quix-slave-status-update` al master con `{isPlaying, nowPlayingItem, currentTime, duration, isIntroSkippable}`. Il master aggiorna `remoteSlaveState` e mostra il player control.

Il master può anche:
- **Risolvere il link video**: `playRemoteItem(item)` sceglie la `video_url` (rispettando `preferredSources`), o apre un selettore (`isLinkSelectionModalOpen` con `linkSelectionContext='remote'`).
- **Episodi successivi/precedenti**: `remoteNextEpisode` / `remotePreviousEpisode` calcolati su `remoteFullItem` (recuperato via `fetchRemoteFullItem`).
- **Drawer episodi**: `EpisodesDrawer` mostra la lista completa delle stagioni/episodi del TV-show corrente.
- **Stop globale**: `stopRemotePlayback()` con ottimismo UI (`isStoppingRemotePlayback`).

---

## 5. Auto-fullscreen

`triggerAutoFullscreen()` setta `shouldAutoFullscreen=true` se non si è già in fullscreen; il `SlaveVideoPlayer` lo osserva ed entra in fullscreen quando parte la riproduzione.

---

## 6. Media Sync (clone della libreria master → slave)

Quando il master si connette, il backend invia `quix-master-connection-status` e l'app apre la `MediaSyncModal` sul master (o sul TV a seconda del flow). Il flusso completo:

1. Il master raccoglie i `mediaItems` da sincronizzare (la sua libreria / My List).
2. Invia `quix-sync-media-request {mediaItems, slaveId}` al backend.
3. Il backend inoltra al TV; lo slave riceve e chiama `openMediaSyncModal` con il payload.
4. Il TV mostra la modale di conferma; l'utente accetta/rifiuta.
5. Se accettato, `syncMediaFromMaster(mediaItems)` salva tutto in IndexedDB locale:
   - `cachedItems` per i metadata
   - `myList` con ordine
   - `mediaLinks` per i link video
6. Invia `sync-progress-update {completed, total}` durante il processo, poi `tv-sync-completed`.
7. Il master riceve `quix-sync-completed` e mostra snackbar di successo.
8. Lo slave ricarica i suoi dati con `mediaStore.reloadAllData()` per riflettere la nuova libreria.

---

## 7. Riconnessione e resilienza

Diversi scenari gestiti dal backend + dallo store:

- **TV ricarica la pagina** → `quix-slave-disconnecting` → sessione preservata con `intentionallyDisconnectingSlaves`; al nuovo `quix-register-slave` con lo stesso `slaveId`, lo short code viene mantenuto (persistenza di `slaveIdToShortCode`).
- **Master ricarica** → `quix-master-disconnecting` → `intentionallyDisconnectingMasters`; al nuovo `quix-register-master` la stessa sessione viene ricollegata.
- **Slave perso** → `connection-terminated target=slave` → `handleSlaveDisconnected()` mostra QR scanner, avvia `startMasterReconnectTimer` (5s × 12 tentativi).
- **Slave disconnesso durante un comando** → backend invia `quix-slave-not-connected` al master; il `MasterRemotePlayerControlView` mostra snackbar e invita a riscansionare.
- **Conflitti** → `slave-busy` (master già collegato) o `slave-not-found` (TV spenta).

Persistenza IndexedDB usata come memoria:

| Chiave | Ruolo |
|---|---|
| `isConfiguredAsSlave` | La TV è in modalità slave |
| `selfSlaveId`, `selfShortCode` | Identità persistente della TV |
| `remoteMasterForSlaveId` | Il master ricorda a quale TV era collegato |
| `knownSlaves` (su master) | Elenco TV conosciute con `lastSeen`, `shortCode`, `isOnline` |

---

## 8. Cosa si può fare da master (telecomando)

Una volta connesso a una TV, il master (`MasterRemotePlayerControlView.jsx`) ha a disposizione:

- **Riproduzione**: play, pausa, +10s, -10s, seek-to, skip-intro
- **Stop**: termina la riproduzione sulla TV
- **Selezione media**: naviga la libreria del master e "invia" un item alla TV (apre la detail view sul TV) con `selectMedia(item, 'remoteControl')`
- **Play di film/episodi**: `playRemoteItem` risolve la URL migliore e fa partire la riproduzione sul TV
- **Navigazione episodi**: ep successivo/precedente, drawer stagioni completo
- **Sync libreria**: clona interi pezzi di libreria sulla TV (`MediaSyncModal`)
- **Stato live**: vede `currentTime/duration/isPlaying` in tempo reale via `quix-slave-status-update`
- **Auto-reconnect**: se la TV cade, ritenta ogni 5s per 12 volte; in caso di fallimento riapre il QR scanner
- **Quality indicator**: vede lo stato della connessione (`good/degraded/poor`)

---

## 9. Cosa si può fare lato slave (TV)

- Mostrare QR + short code per il pairing (`TvPairingView` / `SlavePairingView`)
- Ricevere qualsiasi media selezionato dal master e riprodurlo (`SlaveVideoPlayer`)
- Andare in fullscreen automatico
- Skippare l'intro (inviando `isIntroSkippable` al master)
- Rifiutare/confermare un sync di libreria
- Persistere la propria identità (stesso short code dopo refresh)
- Mostrare uno stato "reconnecting" / "loading" durante le fasi transienti (`SlaveLoadingView`, `SlaveReconnectingView`, `SlaveConnectedView`)
- Disconnettersi dal master con un `quix-slave-disconnecting`

---

## 10. File chiave del flow

| File | Ruolo |
|---|---|
| `frontend/store/remoteStore.js` | Store MobX centrale di tutto il flow |
| `frontend/services/websocketService.js` | Trasporto WS (registerSlave/registerMaster/sendMessage/events) |
| `frontend/components/remote/slave/*` | UI slave (pairing, loading, reconnecting, connected) |
| `frontend/components/remote/master/*` | UI master (player control, slider, drawer episodi) |
| `frontend/components/remote/MasterScreen.jsx` | QR scanner + input manuale codice |
| `frontend/components/media/SlaveVideoPlayer.jsx` | Player video sul TV |
| `frontend/features/tv/*` | Smart TV mode (UI leggera, navigazione frecce) |
| `frontend/views/playback/SlavePlaybackView.jsx` | Wrapper per `SlaveVideoPlayer` |
| `backend/src/wss.js` | Router WS, sessioni, registrazione, comandi, sync |
