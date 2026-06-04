export const it = {
    "common": {
        "close": "Chiudi"
    },
    "header": {
        "home": "Home",
        "series": "Serie TV",
        "movies": "Film",
        "anime": "Anime",
        "searchPlaceholder": "Cerca titoli..."
    },
    "hero": {
        "play": "Riproduci",
        "moreInfo": "Altre Info"
    },
    "contentRow": {
        "scrollLeft": "scorri a sinistra",
        "scrollRight": "scorri a destra",
        "editOrder": "Modifica ordine",
        "reorderInstructions": "Trascina gli elementi per riordinare, oppure usa le frecce",
        "saveOrder": "Salva ordine",
        "openDetail": "Apri la schermata di dettaglio"
    },
    "myListDetail": {
        "title": "La mia lista",
        "subtitle": "{count, plural, one {# contenuto salvato} other {# contenuti salvati}}",
        "subtitle_one": "{count} contenuto salvato",
        "subtitle_other": "{count} contenuti salvati",
        "searchPlaceholder": "Cerca nella tua lista…",
        "reorderOn": "Modalità riordino",
        "reorderOff": "Esci dal riordino",
        "removeTooltip": "Rimuovi dalla lista",
        "emptyTitle": "La tua lista è vuota",
        "emptySubtitle": "Aggiungi film e serie TV per vederli qui.",
        "emptyCta": "Esplora il catalogo",
        "stats": {
            "total": "Totale: {count}",
            "movies": "Film: {count}",
            "series": "Serie TV: {count}"
        },
        "filter": {
            "all": "Tutto",
            "movie": "Film",
            "tv": "Serie TV"
        },
        "sort": {
            "recent": "Più recenti",
            "title": "Titolo (A-Z)",
            "edited": "Ultima modifica"
        }
    },
    "card": {
        "detailsFor": "Vedi dettagli per {title}",
        "removeFromList": "Rimuovi dalla mia lista",
        "addToList": "Aggiungi alla mia lista",
        "removeFromContinueWatching": "Rimuovi da Continua a guardare",
        "moveToTop": "Sposta in alto",
        "moveToBottom": "Sposta in basso"
    },
    "detail": {
        "close": "Chiudi dettaglio",
        "seasons": "Stagioni",
        "vote": "Voto",
        "play": "Riproduci",
        "removeFromList": "Rimuovi dalla mia lista",
        "addToList": "Aggiungi alla mia lista",
        "watchTogether": "Guarda Insieme",
        "episodes": "Episodi",
        "linkEpisodesTooltip": "Collega file video",
        "introDuration": "Durata Intro",
        "season": "Stagione",
        "scrollEpisodesLeft": "scorri episodi a sinistra",
        "scrollEpisodesRight": "scorri episodi a destra",
        "markAsWatched": "Segna come visto",
        "markAsUnwatched": "Segna come non visto",
        "filterLanguage": "Lingua",
        "filterType": "Tipo",
        "episodeDetails": "Dettagli episodio",
        "episode": "Episodio",
        "availableIn": "Disponibile in",
        "playEpisode": "Riproduci Episodio"
    },
    "gridView": {
        "myListTitle": "La mia lista",
        "searchResultsFor": "Risultati per \"{query}\"",
        "seriesTitle": "Serie TV",
        "moviesTitle": "Film",
        "animeTitle": "Anime",
        "empty": {
            "default": {
                "title": "Nessun contenuto disponibile",
                "subtitle": "Torna più tardi per nuovi contenuti."
            },
            "myList": {
                "title": "La tua lista è vuota",
                "subtitle": "Aggiungi film e serie TV per vederli qui."
            },
            "search": {
                "title": "Nessun risultato trovato",
                "subtitle": "Prova a cercare qualcos'altro o controlla che il titolo sia corretto."
            }
        }
    },
    "videoPlayer": {
        "back": "indietro",
        "nextEpisode": "Prossimo Episodio",
        "episodeList": "Lista Episodi",
        "skipIntro": "Salta Intro",
        "playbackSpeed": "Velocità di Riproduzione",
        "downloadVideo": "Scarica Video",
        "skipBack10": "Indietro 10s",
        "forward10": "Avanti 10s"
    },
    "episodesDrawer": {
        "title": "Episodi",
        "season": "Stagione {number}",
        "markWatched": "Visto",
        "markUnwatched": "Non visto",
        "details": "Dettagli",
        "availableLanguages": "Lingue Disponibili",
        "airDate": "Data di Messa in Onda",
        "runtime": "Durata",
        "episode": "Episodio",
        "empty": "Nessun episodio disponibile per questa stagione."
    },
    "linkMovieModal": {
        "title": "Collega Video per {title}",
        "addLink": "Aggiungi Link",
        "url": "URL",
        "label": "Etichetta (opzionale)",
        "add": "Aggiungi",
        "noLinks": "Nessun link video associato a questo film.",
        "deleteLink": "Elimina Link",
        "language": "Lingua",
        "type": "Tipo",
        "sub": "Sottotitolato",
        "dub": "Doppiato"
    },
    "linkEpisodesModal": {
        "title": "Collega Episodi per {name}",
        "selectSeason": "Seleziona la stagione",
        "addLinks": "Aggiungi Link",
        "manageLinks": "Gestisci Link",
        "add": {
            "pattern": "Pattern",
            "list": "Lista",
            "json": "JSON",
            "save": "Aggiungi Link",
            "patternInfo": "Usa [@EP] come segnaposto per il numero dell'episodio. Sarà sostituito per ogni episodio della stagione.",
            "patternUrl": "Pattern URL",
            "linkLabel": "Etichetta Link (opzionale)",
            "linkLabelHelper": "Usa [@EP] anche qui. Es: SUB ITA - Ep. [@EP]",
            "padding": "Padding numero episodio",
            "paddingHelper": "Es. 2 per '01', 3 per '001'",
            "listInfo": "Incolla un elenco di link, uno per riga. Il numero di link deve corrispondere al numero di episodi ({count}).",
            "listLinks": "Lista di link",
            "jsonInfo": "Incolla un array JSON di stringhe (link) o di oggetti (es. {\"url\": \"...\", \"label\": \"...\", \"language\": \"ENG\", \"type\": \"dub\"}).",
            "jsonArray": "Array JSON",
            "jsonPlaceholder": "[ \"http://link1.mp4\", \"http://link2.mp4\" ]",
            "advancedConfig": "Configurazione avanzata",
            "startEpisode": "Da episodio",
            "endEpisode": "A episodio",
            "startNumberPlaceholder": "Numero partenza per [@EP]",
            "endNumberPlaceholder": "Numero fine per [@EP]",
            "language": "Lingua",
            "type": "Tipo",
            "sub": "Sottotitolato",
            "dub": "Doppiato",
            "method": "Metodo",
            "errors": {
                "emptyPattern": "Il pattern non può essere vuoto.",
                "missingPlaceholder": "Il pattern deve includere il segnaposto [@EP].",
                "emptyList": "La lista non può essere vuota.",
                "emptyJson": "Il JSON non può essere vuoto."
            },
            "preview": {
                "title": "Anteprima URL generati",
                "empty": "Compila il pattern per vedere l'anteprima.",
                "more": "e altri {count}…"
            }
        },
        "manage": {
            "deleteAllSeasonLinks": "Elimina tutti i link per questa stagione",
            "linksCount": "Link: {count}",
            "noLinks": "Nessun link associato.",
            "copyUrl": "Copia URL",
            "deleteLink": "Elimina Link",
            "groupOps": "Operazioni di Gruppo",
            "groupOpsInfo": "Modifica in blocco il dominio per tutti i link che condividono la stessa origine.",
            "linksFrom": "{count} link da:",
            "newDomain": "Nuovo Dominio/Origine",
            "update": "Aggiorna",
            "setAsPreferred": "Imposta come fonte preferita",
            "removePreferred": "Rimuovi preferenza",
            "editLink": "Modifica Link",
            "save": "Salva",
            "cancel": "Annulla",
            "deleteAllFromDomainTooltip": "Elimina tutti i link da questo dominio",
            "deleteAllFromDomainConfirm": "Sei sicuro di voler eliminare tutti i {count} link da {domain}?"
        }
    },
    "linkSelectionModal": {
        "title": "Ep {episode}: {name}",
        "defaultTitle": "Seleziona un link",
        "subtitle": "Scegli quale link avviare:"
    },
    "profileDrawer": {
        "profile": "Profilo",
        "backup": "Backup su Google Drive",
        "restore": "Ripristina da Google Drive",
        "logout": "Logout",
        "login": "Accedi con Google",
        "scanQR": "Scansiona QR Code TV",
        "showQR": "Mostra QR Code per Telecomando",
        "language": "Lingua",
        "library": "Libreria",
        "share": "Condividi Libreria",
        "import": "Importa Libreria",
        "history": "Cronologia Modifiche",
        "manageLibrary": "Gestisci Libreria",
        "savedDevices": "Dispositivi TV Salvati",
        "noSavedDevices": "Nessun dispositivo TV salvato.",
        "connect": "Connetti",
        "editName": "Modifica Nome",
        "forgetDevice": "Dimentica Dispositivo",
        "save": "Salva",
        "cancel": "Annulla",
        "online": "Online",
        "offline": "Offline",
        "changeName": "Cambia Nome"
    },
    "qrScanner": {
        "close": "Chiudi scanner",
        "title": "Inquadra il QR Code sulla TV",
        "error": "Codice QR non valido. Assicurati di scansionare il codice mostrato sulla TV.",
        "or": "OPPURE",
        "enterCode": "Inserisci Codice TV",
        "connect": "Connetti",
        "scanInstructions": "Posiziona il codice QR all'interno della cornice per risultati ottimali",
        "connecting": "Connessione in corso...",
        "connectingMessage": "Attendi mentre stabiliamo la connessione",
        "success": "Connessione riuscita!"
    },
    "smartTV": {
        "connected": "Telecomando Connesso!",
        "connectedSubtitle": "Usa il tuo dispositivo per scegliere cosa guardare.",
        "connectTitle": "Controlla la TV con il tuo Telefono",
        "qrAlt": "QR Code per il controllo remoto",
        "instructions": "1. Apri la fotocamera sul tuo telefono.\n2. Inquadra il codice QR per connetterti.",
        "initializing": "Inizializzazione del dispositivo...",
        "browseOnTV": "Sfoglia il catalogo direttamente sulla TV",
        "orEnterCode": "Oppure inserisci manualmente il codice:",
        "reconnecting": "Riconnessione in corso..."
    },
    "watchTogether": {
        "joinRoomTitle": "Unisciti alla stanza",
        "createRoomTitle": "Guarda insieme ai tuoi amici",
        "yourName": "Il tuo nome",
        "selectEpisode": "Seleziona un episodio per iniziare",
        "episodes": "Episodi",
        "season": "Stagione",
        "createRoom": "Crea una nuova stanza",
        "or": "oppure",
        "roomCodePlaceholder": "Inserisci codice stanza",
        "join": "Unisciti",
        "roomTitle": "Stanza: {title}",
        "roomCode": "Codice Stanza",
        "copyLink": "Copia Link Stanza",
        "copied": "Copiato!",
        "changeCode": "Cambia Codice",
        "participants": "Partecipanti ({count})",
        "host": "Host",
        "changeContent": "Cambia Contenuto",
        "startForAll": "Inizia per tutti",
        "waitingForHost": "In attesa che l'host inizi...",
        "changeContentTitle": "Cambia Contenuto",
        "searchPlaceholder": "Cerca film o serie tv",
        "cancel": "Annulla",
        "transferHostTitle": "Trasferisci Host",
        "transferHostConfirm": "Sei sicuro di voler trasferire lo host a {name}?",
        "confirm": "Conferma"
    },
    "chat": {
        "title": "Chat della stanza",
        "participants": "Partecipanti ({count})",
        "makeHost": "Rendi Host",
        "sentImageAlt": "Immagine inviata",
        "uploadImage": "upload image",
        "placeholder": "Scrivi un messaggio...",
        "imageTooLarge": "L'immagine supera il limite di 5MB",
        "imageAttached": "Immagine allegata",
        "previewAlt": "Anteprima immagine",
        "removeImage": "Rimuovi immagine"
    },
    "remote": {
        "title": "Telecomando Quix",
        "chooseForTV": "Scegli cosa guardare sulla TV",
        "detail": {
            "back": "Indietro",
            "episodes": "Episodi",
            "season": "Stagione",
            "playOnTV": "Riproduci sulla TV"
        },
        "player": {
            "title": "Telecomando",
            "back": "indietro",
            "nowPlaying": "In riproduzione sulla TV",
            "connectionLost": "Connessione Persa",
            "connectionLostDesc": "La TV si è disconnessa. Scansiona il codice QR per riconnetterti.",
            "reconnect": "Riconnetti",
            "noContent": "Nessun contenuto in riproduzione.",
            "seekBackward": "indietro 10 secondi",
            "seekForward": "avanti 10 secondi",
            "play": "play",
            "pause": "pausa",
            "skipIntro": "Salta Intro",
            "episodes": "Episodi",
            "introDuration": "Durata Intro (sec)",
            "nextEpisode": "prossimo episodio",
            "previousEpisode": "episodio precedente",
            "disconnect": "Disconnetti"
        }
    },
    "misc": {
        "continueWatching": "Continua a guardare",
        "myList": "La mia lista",
        "latestReleases": "Ultime Uscite",
        "topRated": "I più Votati",
        "popularSeries": "Serie TV Popolari",
        "mustWatchAnime": "Anime da non Perdere",
        "searchPrompt": {
            "title": "Cerca film, serie TV e tanto altro",
            "subtitle": "Trova subito i tuoi contenuti preferiti."
        }
    },
    "shareAndImport": {
        "shareTitle": "Condividi Libreria",
        "importTitle": "Importa Libreria",
        "selectShows": "Seleziona gli show da includere:",
        "selectAll": "Seleziona tutti ({count})",
        "generateLink": "Genera Link di Condivisione",
        "generating": "Generazione in corso...",
        "shareLinkReady": "Il tuo link di condivisione è pronto:",
        "copyLink": "Copia Link",
        "back": "Indietro",
        "pasteLink": "Incolla un link di condivisione per aggiungere i contenuti alla tua libreria.",
        "linkPlaceholder": "https://...",
        "import": "Importa",
        "importing": "Importazione in corso...",
        "loginRequired": "Devi aver effettuato l'accesso con Google per condividere la tua libreria."
    },
    "revisions": {
        "title": "Cronologia Modifiche",
        "revert": "Annulla",
        "revertConfirm": "Sei sicuro di voler annullare questa modifica?",
        "noHistory": "Nessuna modifica registrata.",
        "loading": "Caricamento cronologia...",
        "showRawData": "Mostra Dati Grezzi",
        "hideRawData": "Nascondi Dati Grezzi",
        "errors": {
            "missingOldObject": "Impossibile ripristinare: i dati della vecchia versione non sono disponibili nella cronologia."
        },
        "descriptions": {
            "myList": {
                "add": "Aggiunto '{name}' alla tua lista",
                "remove": "Rimosso '{name}' dalla tua lista"
            },
            "cachedItems": {
                "add": "Messo in cache '{name}'",
                "update": "Aggiornati dati cache per '{name}'",
                "remove": "Rimosso '{name}' dalla cache"
            },
            "episodeLinks": {
                "add": "Collegato video a '{show}' S{s}E{e}",
                "remove": "Rimosso link da '{show}' S{s}E{e}",
                "update": "Aggiornato link per '{show}' S{s}E{e}"
            },
            "showIntroDurations": {
                "set": "Impostata durata intro a {duration}s per '{show}'",
                "remove": "Rimossa durata intro per '{show}'"
            },
            "viewingHistory": {
                "add": "Visto episodio: {show} S{s}E{e}"
            },
            "unknown": "Azione '{type}' sulla tabella '{table}'"
        }
    },
    "syncConflict": {
        "title": "Conflitto Sincronizzazione",
        "overviewInfo": "Sono state trovate differenze tra i dati locali e quelli nel cloud. Clicca \"Continua\" per scegliere cosa prendere da dove per ogni show, oppure usa una delle azioni rapide qui sotto.",
        "chooseInfo": "Seleziona per ogni show cosa prendere da dove. Puoi anche eliminare show che non vuoi mantenere.",
        "stepOverview": "Panoramica",
        "stepChoose": "Scegli",
        "bulkLocal": "Prendi tutto da Locale",
        "bulkRemote": "Prendi tutto da Remoto",
        "bulkBoth": "Prendi da entrambi",
        "deleteLocalOnly": "Elimina show solo locali ({count})",
        "deleteRemoteOnly": "Elimina show solo remoti ({count})",
        "stats": {
            "total": "Totale: {count}",
            "conflicts": "Con conflitti: {count}",
            "localOnly": "Solo locale: {count}",
            "remoteOnly": "Solo remoto: {count}",
            "toDelete": "Da eliminare: {count}"
        },
        "rowsCount": "{count} show",
        "rowsCountWithDelete": "{count} show ({toDelete} da eliminare)",
        "noConflict": "Nessun conflitto",
        "myList": "La mia lista",
        "links": "Link ({local} local / {remote} remote)",
        "progress": "Progresso ({local} local / {remote} remote)",
        "actions": {
            "continue": "Continua e scegli per ogni show",
            "mergeAuto": "Unisci automaticamente (mantiene tutto)",
            "overwriteLocal": "Sovrascrivi dati locali con quelli remoti",
            "overwriteRemote": "Sovrascrivi dati remoti con quelli locali",
            "cancel": "Annulla sync (logout)",
            "back": "Indietro",
            "confirmMerge": "Conferma Merge ({count} show)"
        },
        "processing": "Elaborazione in corso...",
        "showId": "ID: {id}",
        "deleted": "ELIMINATO",
        "labels": {
            "myListBadge": "My List",
            "linksBadge": "Links",
            "progressBadge": "Progress"
        },
        "options": {
            "locale": "Locale",
            "remote": "Remoto",
            "both": "Entrambi",
            "notIncluded": "Non incluso",
            "inBoth": "In entrambi",
            "onlyLocal": "Solo locale",
            "onlyRemote": "Solo remoto"
        }
    },
    "libraryManagement": {
        "title": "Gestione Libreria",
        "tabs": {
            "myList": "La mia lista",
            "continueWatching": "Continua a guardare",
            "links": "Link Video",
            "preferredSources": "Fonti Preferite"
        },
        "type": {
            "series": "Serie TV",
            "movie": "Film"
        },
        "links": "link",
        "empty": {
            "myList": "La tua lista è vuota. Aggiungi film e serie TV per vederli qui.",
            "continueWatching": "Non c'è nulla da continuare a guardare.",
            "links": "Nessun link video associato.",
            "preferredSources": "Nessuna fonte preferita impostata."
        },
        "removeFromMyList": "Rimuovi dalla lista",
        "removeFromContinue": "Rimuovi da Continua a guardare",
        "clearAllLinks": "Elimina tutti i link",
        "markWatched": "Segna visto",
        "markUnwatched": "Segna non visto",
        "sub": "SUB",
        "dub": "DUB",
        "remove": "Rimuovi",
        "deleteConfirm": {
            "title": "Conferma eliminazione",
            "message": "Sei sicuro di voler eliminare \"{name}\"?"
        },
        "cancel": "Annulla",
        "delete": "Elimina",
        "filters": {
            "allShows": "Tutte le serie",
            "showOnlyInvalid": "Solo link scaduti",
            "deleteAllInvalid": "Cancella tutti gli scaduti",
            "invalidLink": "Link scaduto",
            "noInvalidLinks": "Nessun link scaduto"
        },
        "confirmDeleteAllInvalid": {
            "title": "Cancella tutti i link scaduti",
            "message": "Sei sicuro di voler eliminare tutti i {count} link scaduti? Questa azione non può essere annullata."
        },
        "deletedAllInvalid": "{count} link scaduti eliminati con successo.",
        "dashboard": {
            "searchPlaceholder": "Cerca nella libreria…",
            "searchAriaLabel": "Cerca nella libreria",
            "counters": {
                "myList": "La mia lista",
                "continueWatching": "Continua",
                "links": "Link",
                "invalid": "Scaduti"
            },
            "noResults": "Nessun risultato per \"{query}\""
        },
        "common": {
            "lastEdited": "Ultima modifica: {date}",
            "editLink": "Modifica link",
            "copyUrl": "Copia URL",
            "delete": "Elimina"
        },
        "myList": {
            "lastEdited": "Ultima modifica {date}",
            "removeConfirm": "Rimuovere \"{name}\" dalla tua lista?",
            "exploreCta": "Esplora il catalogo"
        },
        "continueWatching": {
            "removeConfirm": "Rimuovere \"{name}\" da Continua a guardare?",
            "emptyCta": "Vai al catalogo",
            "play": "Riproduci",
            "playAria": "Riproduci {name}"
        },
        "videoLinks": {
            "bulkBar": {
                "selected": "{count} selezionati",
                "changeLanguage": "Cambia lingua",
                "changeType": "Cambia tipo",
                "deleteN": "Elimina {count}",
                "clearSelection": "Pulisci selezione",
                "selectAll": "Seleziona tutti",
                "languagePrompt": "Lingua (3 caratteri)",
                "apply": "Applica",
                "type": "Tipo"
            },
            "showInfo": {
                "title": "Info per show",
                "episodes": "{count} episodi",
                "links": "{count} link",
                "invalid": "{count} scaduti",
                "lastEdited": "Ultima modifica: {date}",
                "preferredSource": "Fonte preferita"
            },
            "emptySearch": "Nessun link corrisponde a \"{query}\""
        },
        "linkEdit": {
            "title": "Modifica link",
            "showContext": "{show} - S{season}E{episode}",
            "urlLabel": "URL",
            "urlPreview": "Anteprima: {preview}",
            "labelLabel": "Etichetta",
            "languageLabel": "Lingua (3 caratteri)",
            "typeLabel": "Tipo",
            "preferredSwitch": "Imposta come fonte preferita per questo show",
            "validateNow": "Valida ora",
            "validating": "Validazione...",
            "valid": "Link valido",
            "invalid": "Link non valido",
            "save": "Salva",
            "cancel": "Annulla",
            "missingUrl": "Inserisci un URL valido.",
            "savedSuccess": "Link salvato con successo.",
            "validatedSuccess": "Link valido.",
            "validatedInvalid": "Il link non risponde o non è raggiungibile."
        },
        "preferredSources": {
            "linksAvailable": "{count} link disponibili",
            "emptySearch": "Nessuna fonte preferita corrisponde a \"{query}\"",
            "edit": "Modifica",
            "editAria": "Modifica fonte preferita per {name}",
            "editTitle": "Modifica fonte preferita - {name}",
            "editInfo": "Inserisci l'URL completo della fonte. L'origine (schema + host) verrà salvata come preferita per questo show.",
            "editUrl": "URL della fonte",
            "editPreview": "Anteprima: {preview}",
            "editSave": "Salva",
            "editCancel": "Annulla",
            "editInvalidUrl": "Inserisci un URL valido (es. https://esempio.com/...)."
        }
    },
    "notifications": {
        "roomCreated": "Stanza creata! Condividi il codice per invitare amici.",
        "tvReady": "Dispositivo TV pronto. Scansiona il QR code per connetterti.",
        "connectedToTV": "Connesso alla TV con successo!",
        "disconnectedFromTV": "Disconnesso dalla TV.",
        "remoteConnected": "Telecomando connesso!",
        "slaveBusy": "La TV è attualmente connessa a un altro dispositivo. Disconnettila prima.",
        "slaveNotFound": "Dispositivo non trovato. Assicurati che la TV sia accesa e pronta per la connessione.",
        "slaveReconnecting": "La TV si sta riconnettendo. Attendi...",
        "slaveReconnected": "TV riconnessa!",
        "slaveDisconnected": "TV disconnessa. Scansiona il codice QR per riconnetterti.",
        "masterDisconnected": "Telecomando disconnesso.",
        "reconnectingAsRemote": "Riconnessione come telecomando...",


        "failedToLoadSeriesDetails": "Impossibile caricare i dettagli della serie.",
        "noPlayableEpisodes": "Nessun episodio riproducibile trovato per questa serie.",
        "noVideoLinks": "Nessun link video trovato per questo contenuto.",
        "linkCountMismatch": "Il numero di link ({linkCount}) non corrisponde al numero di episodi ({episodeCount}).",
        "processingError": "Errore nell'elaborazione dei dati: {error}",
        "linksAddedSuccess": "{count} link aggiunti con successo!",
        "savingLinksError": "Errore durante il salvataggio dei link.",
        "copiedToClipboard": "Copiato negli appunti!",
        "allSeasonLinksDeleted": "Tutti i {count} link per la stagione {season} sono stati eliminati.",
        "noLinksToDelete": "Nessun link da eliminare per la stagione {season}.",
        "welcomeUser": "Benvenuto, {name}!",
        "logoutSuccess": "Logout effettuato.",
        "backupFound": "Backup trovato su Google Drive. Vuoi ripristinare?",
        "restore": "Ripristina",
        "loginRequired": "Devi effettuare il login per usare questa funzione.",
        "backupInProgress": "Salvataggio su Google Drive in corso...",
        "backupError": "Errore durante la preparazione del backup.",
        "backupComplete": "Backup completato con successo!",
        "backupSaveError": "Errore durante il salvataggio su Google Drive.",
        "restoreInProgress": "Ripristino da Google Drive in corso...",
        "noBackupFound": "Nessun backup trovato su Google Drive.",
        "restoreComplete": "Ripristino completato!",
        "restoreError": "Errore durante il ripristino: {error}",
        "linksUpdated": "{count} link aggiornati con successo.",
        "domainUpdateError": "Errore nell'aggiornamento dei domini: {error}",
        "shareNoShowsSelected": "Seleziona almeno uno show da condividere.",
        "importInvalidFile": "File di importazione non valido o corrotto.",
        "importInvalidLink": "Link di condivisione non valido.",
        "importInProgress": "Importazione della libreria in corso...",
        "importSuccess": "{showCount} show e {linkCount} link importati e aggiunti a 'La mia lista'!",
        "importError": "Errore durante l'importazione: {error}",
        "revertSuccess": "Modifica annullata con successo.",
        "revertError": "Impossibile annullare la modifica: {error}",
        "preferredSourceSet": "Fonte preferita impostata con successo.",
        "syncChecking": "Verifica dei dati nel cloud...",
        "syncError": "Errore di sincronizzazione con il cloud.",
        "noBackupFoundCreating": "Nessun backup cloud trovato. Creazione in corso...",
        "restoringFromCloud": "Dati più recenti trovati nel cloud. Ripristino in corso...",
        "shareLinkCreateError": "Creazione del link di condivisione non riuscita: {error}",
        "syncUpToDate": "I tuoi dati sono già aggiornati.",
        "removedFromContinueWatching": "Rimosso da 'Continua a guardare'.",
        "removeFromContinueWatchingError": "Errore durante la rimozione da 'Continua a guardare'.",
        "markedAsWatched": "Episodio segnato come visto.",
        "markedAsUnwatched": "Episodio segnato come non visto.",
        "invalidEpisodeRange": "Intervallo episodi non valido.",
        "episodeNumberRangeMismatch": "L'intervallo di episodi ({epRange}) e l'intervallo di numerazione ({numRange}) devono avere la stessa lunghezza.",
        "linkUpdatedSuccess": "Link aggiornato con successo.",
        "linksFromDomainDeletedSuccess": "{count} link da {domain} eliminati con successo.",
        "syncMergeComplete": "Unione completata con successo!",
        "syncMergeError": "Errore durante l'unione dei dati: {error}",
        "syncOverwriteLocalComplete": "Dati locali sovrascritti con quelli remoti.",
        "syncOverwriteLocalError": "Errore durante la sovrascrittura locale: {error}",
        "syncOverwriteRemoteComplete": "Dati remoti sovrascritti con quelli locali.",
        "syncOverwriteRemoteError": "Errore durante la sovrascrittura remota: {error}",
        "syncCancelled": "Sincronizzazione annullata. Logout effettuato.",
        "title": "Notifiche",
        "noNotifications": "Nessuna notifica",
        "markAllRead": "Segna tutti come letti",
        "clearAll": "Elimina tutti",
        "invalidLinks": "Link non validi trovati",
        "invalidLinksDesc": "{count} link video potrebbero non essere più validi.",
        "manageLinks": "Gestisci Link",
        "dismiss": "Ignora",
        "new": "Nuovo",
        "season": "Stagione",
        "episode": "Episodio",
        "bulkLinksUpdated": "{count} link aggiornati ({language}/{type}).",
        "bulkLinksDeleted": "{count} link eliminati.",
        "linkValidatedSuccess": "Link validato con successo."
    }
}