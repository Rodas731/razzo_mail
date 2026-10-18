# 🚀 Razzo Mail — Locker Digitale Effimero & Sicuro

**Razzo Mail** è un'applicazione web e server ad altissima efficienza scritta in **Rust** per lo scambio effimero e anonimo di file e messaggi temporanei protetti da codice di scambio a 8 caratteri misti (`XXXX-XXXX`, lettere maiuscole/minuscole, numeri e simboli speciali) e PIN opzionale, senza bisogno di registrazione o account permanenti.

---

## ✨ Caratteristiche Principali

- **Codice a 8 Caratteri Misti (`XXXX-XXXX`):** Diviso in due gruppi da 4 caratteri (es. `K8$m-2!pX`), include lettere maiuscole, minuscole, numeri e simboli speciali sicuri. Oltre 57.000 miliardi di combinazioni per azzerare collisioni e attacchi brute-force.
- **Mobile 1-Click con Fotocamera Nativa:** Pulsanti rapidi per scattare direttamente una foto o girare un video dalla fotocamera dello smartphone (o scegliere dalla galleria) e inviarlo all'istante in un click.
- **Persistenza Atomica dello Stato (`data/lockers.json`):** Anche se il computer viene spento o riavviato, tutti i locker attivi e non ancora scaduti vengono ricaricati e rimangono validi.
- **Registro di Audit & Tracciabilità Legale (`data/audit_log.jsonl`):** Memorizzazione permanente e append-only di indirizzo IP reale del client, timestamp esatto UTC, User-Agent ed impronta crittografica SHA-256 del file depositato. In caso di abusi, le prove legali rimangono disponibili anche dopo l'autodistruzione del file fisico.
- **Garbage Collector all'Avvio:** Scansione e rimozione automatica all'avvio del server di eventuali file orfani sul disco non riconducibili a locker attivi.
- **Real-Time via WebSockets:** Se il mittente o il destinatario hanno la schermata aperta, gli aggiornamenti avvengono all'istante senza bisogno di ricaricare la pagina.
- **Autodistruzione Garantita (Burn after reading):** Il file viene cancellato fisicamente dal disco non appena scaricato dal destinatario, o alla scadenza del timer (1h, 12h, 24h).
- **Anti-Brute Force:** Massimo 5 tentativi di PIN errati, superati i quali il Locker si autodistrugge.
- **Capacità:** Fino a **25 MB** per singolo file.
- **Costi di gestione minimi:** Scritto in Rust su framework Axum e Tokio; consuma meno di 25 MB di RAM e può girare su un server VPS da 4€/mese.

---

## 🛠️ Come Avviare il Progetto in Locale

### 1. Avvio rapido per sviluppo:
```bash
cargo run
```
Il server sarà attivo all'indirizzo:
**http://localhost:3000**

### 2. Accesso da Cellulare (Stessa Rete Wi-Fi):
Trova l'indirizzo IP locale del tuo PC (es. `ipconfig` su Windows, cerca l'IPv4 come `192.168.1.X`) e apri dal browser dello smartphone:
```text
http://192.168.1.X:3000
```

### 3. Compilazione del Binario Autonomo di Produzione (Singolo Eseguibile):
```bash
cargo build --release
```
L'eseguibile ottimizzato si troverà in `target/release/razzo_mail.exe`.

---

## 🔒 Misure Anti-Abuso e Sicurezza Integrata

1. **Effimerità Radicale:** Nessun archivio permanente dei file; i dati scaduti o ritirati vengono distrutti fisicamente dal disco.
2. **Audit Trail Immutabile:** Tracciamento legale di IP, timestamp, dispositivo e hash SHA-256 in append-only su `data/audit_log.jsonl`.
3. **Nessun Indice Pubblico:** I codici non sono enumerabili né esposti in directory pubbliche.
4. **Password Salata con SHA-256:** Le password non vengono mai salvate in chiaro.
5. **Protezione da Denial of Storage:** Limite rigido a 25 MB per file e pulizia automatica ogni 30 secondi dei file scaduti.

