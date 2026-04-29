# Blackjack Platform

Een full-stack multiplayer blackjack applicatie gebouwd met Astro, Node.js en MongoDB. Spelers kunnen accounts aanmaken, coins verdienen, echte betalingen doen via Mollie en realtime tegen elkaar spelen.

---

## Features

- **Multiplayer blackjack** — realtime gameplay via WebSockets (max 4 spelers per tafel)
- **Authenticatie** — registreren, inloggen en sessies via JWT
- **EC systeem** — dagelijkse beloningen en EC-Punten kopen via Mollie-betalingen
- **Leaderboard** — ranglijst van spelers op basis van score
- **Shop** — EC-Punten kopen met iDEAL/andere betaalmethoden
- **Responsieve UI** — responsive CSS styling

---

## Tech Stack

| Laag | Technologie |
|------|------------|
| Frontend | [Astro](https://astro.build) (SSR) |
| Backend | Node.js + custom HTTP/WS server |
| Database | MongoDB |
| Realtime | WebSocket (`ws`) |
| Betalingen | [Mollie API](https://docs.mollie.com) |
| Auth | JWT + bcrypt |
| Provider | Render |

---

## Vereisten

- Node.js >= 22.12.0
- MongoDB instantie (lokaal of Atlas)
- Mollie API key (voor betalingen)

---

## Installatie

```bash
# Dependencies installeren
npm install

# Omgevingsvariabelen instellen
cp .env.example .env

# Development server starten
npm run dev

# Of de productieserver starten
npm start
```

---

## Omgevingsvariabelen

Maak een `.env` bestand aan in de root met de volgende variabelen:

```env
MONGODB_URI=mongodb://localhost:27017/blackjack
JWT_SECRET=jouw_geheime_sleutel
MOLLIE_API_KEY=test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Scripts

| Commando | Omschrijving |
|----------|-------------|
| `npm run dev` | Start de Astro dev server op `localhost:4321` |
| `npm run build` | Bouwt de productieversie naar `./dist/` |
| `npm run preview` | Preview van de gebouwde site |
| `npm start` | Start de Node.js productieserver (`server.mjs`) |

---

## Projectstructuur

```
/
├── public/               # Statische assets (CSS, client-side JS)
│   ├── client.js         # WebSocket client
│   ├── blackjack.js      # Blackjack spellogica (client)
│   └── shop.js           # Shop functionaliteit (client)
├── server/               # Server-side modules
│   ├── websocket.js      # WebSocket server & berichtenafhandeling
│   ├── gameManager.js    # Blackjack spellogica (server)
│   ├── db.js             # Database helperfuncties (coins, scores)
│   └── mongodb.js        # MongoDB verbinding
├── src/
│   └── pages/
│       ├── index.astro       # Lobby / startpagina
│       ├── blackjack.astro   # Spelscherm
│       ├── account.astro     # Accountoverzicht
│       ├── shop.astro        # Coin shop
│       ├── leaderboard.astro # Ranglijst
│       ├── login.astro       # Inloggen
│       ├── signup.astro      # Registreren
│       └── api/              # API endpoints
│           ├── auth/
│           ├── login.js
│           ├── signup.js
│           ├── score.json.js
│           ├── balance.json.js
│           ├── daily-reward.js
│           ├── create-payment.js
│           └── payment-webhook.json.js
├── lib/                  # Gedeelde serverlogica (auth, helpers)
├── server.mjs            # Entrypoint productieserver
└── astro.config.mjs      # Astro configuratie
```

---

## API Overzicht

| Methode | Endpoint | Omschrijving |
|---------|----------|-------------|
| POST | `/api/signup` | Nieuw account aanmaken |
| POST | `/api/login` | Inloggen, JWT ontvangen |
| GET | `/api/me` | Ingelogde gebruikersdata |
| GET | `/api/balance` | Huidige coin balance |
| GET | `/api/score.json` | Score opvragen |
| POST | `/api/daily-reward` | Dagelijkse beloning claimen |
| POST | `/api/create-payment` | Mollie betaling starten |
| POST | `/api/payment-webhook` | Mollie betaalstatus verwerken |
| GET | `/api/leaderboard.json` | Ranglijst opvragen |

---

## WebSocket Protocol

De WebSocket server draait op `/ws`. Berichten zijn JSON-objecten met een `type` veld.

**Client → Server**

| Type | Omschrijving |
|------|-------------|
| `PING` | Verbinding testen |
| `JOIN_TABLE` | Aan een tafel aanschuiven |
| `HIT` | Kaart trekken |
| `STAND` | Passen |
| `BET` | Inzet plaatsen |

**Server → Client**

| Type | Omschrijving |
|------|-------------|
| `WELCOME` | Verbinding bevestigd + client ID |
| `TABLE_LIST` | Lijst van beschikbare tafels |
| `GAME_STATE` | Volledige spelstatus |
| `CARD_DEALT` | Nieuwe kaart gedeeld |
| `ERROR` | Foutmelding |
| `PONG` | Ping-antwoord |

Design inspo:
![alt text](pokerInspo.png)




Weekly nerd:
Johan Huijkman

Een screen reader die de hele pagina voor leest is heel frusterend. Het is bij toegankelijkheid belangrijk om de groep voor wie het is erbij te betrekken. Die vier hoekstukken van WCAG zijn Perceivable, Operable, Understandalbe and Robust. WCAG = Web Content Accessibility Guidelines. Stop niet bij alleen het volgen van de WCAG, maar in gesprek te gaan met de doelgroep met de beperking. Als de afbeelding geen toegvoegde waarde heeft, kan je het bestempelen als decoratief en kan hij leeg gelaten worden. Een schermlezer heeft al veel functies hebben en daar moet je rekening mee houden. Bijvoorbeeld met skip content dingen, hier moet je ook kijken of een schermlezer dat niet zelf al kan. Formulierregelaars, lijstjes zijn een functies van een screenreader om sneller bij je doel te komen. Cookies bovenaan is fijn, want die kan je dan gelijk weg klinken

Martijn
Wat maakt het voor hem/haar moeilijk?
Lange stukken tekst raakt hij moe of zijn concentratie kwijt. Header irritant dat die vergroot als je scrolt. Vervelend als er geen feedback is bijv bij een knop die niet interacteert met hover. 

Schaalbaarheid, contrast, gerelateerde informatie bij elkaar, visuele indicatoren zoals een focusrand.

Wat heeft hij/zij nodig?
Elementen die interacteren met bijv hover. 

Op welk moment denk dat hij/zij was afgehaakt in iets wat je hebt gemaakt?
Soms vallen dingen buiten het scherm als je erg inzoomt. 

Naduah mobiliteitsproblemen
Wat maakt het voor hem/haar moeilijk?
Velle kleuren dit triggerd kleuren, heel veel informatie door elkaar staat(vermoeiend en verminderd concetratie) of als ze heel lang moet zoeken

Wat heeft hij/zij nodig?
Dark/Light mode functie

Rustige layout en vormgeving, gevens moeten wroden opgeslagen

Op welk moment denk dat hij/zij was afgehaakt in iets wat je hebt gemaakt?
Als ze te lang moet zoeken

Guido 
Wat maakt het voor hem/haar moeilijk?
Snel overprikkeld, moet heel concreet zijn als hij iets moet doen, hij wil heel snel de informatie krijgen waar hij naar opzoek is.

Wat heeft hij/zij nodig?
Rusige layout, duidelijke instructies en meldingen en voorspelbaarheid

Op welk moment denk dat hij/zij was afgehaakt in iets wat je hebt gemaakt?

TODO:
* Mollie API Payment system
* LocalStorage API
* MongoDB Database
* Leaderboard
* Websockets API Multiplayer
* (Optional) Poker

Feedback
* Geluid toevoegen, content api[]
* Layout netter maken letten op focus op ruimte [X]
* Multiplayer[] toevoegen wel belangrijk nog om voor de webAPI en localStorage niet vergeten[X]
* Focus eerst op het mooi maken daarna op de extra features zoals de database en payment system.[X]
* Poker laten zitten
* Niet te ingewikkeld maken

* Dubbel en split toevoegen [x]
* Studiepunten ipv coins is leuker voor een CMD casino [x]
* CMD style toepassen[x]
* Vakken [x]
* Easter Egg / als cyd account met profiel foto van cyd 10 M
* Refactor file structure 1U [x]
* Multiplayer (websockets werkend krijgen) 10U
* Leaderbord fixen 5M [x]
* Database werkend krijgen online 30M
* CRUD toevoegen bij gebruikers

Feedback:
* Background bij spelen is bit much
* Mist een content api, (dit wordt nu een ElevenLabs API voor dealer voice). Verder nog sounds voor 
Card deal sounds, Chip stack clicks, Win / blackjack stingers, Bust sound, Background lounge music, 
Mute / volume sliders, Smooth fade transitions met web native
* Duidelijker maken wie aan de beurt is bij multiplayer
* Favicon toevoegen






# CMD Casino

Een full-stack multiplayer casinoplatform gebouwd als schoolproject voor de opleiding Communication and Multimedia Design. Spelers kunnen meerdere casinospellen spelen, coins verdienen en echte betalingen doen.

---

## Spellen

| Spel | Modus | Omschrijving |
|------|-------|-------------|
| Blackjack | Solo | Speel tegen de dealer |
| Blackjack | Multiplayer | Tot 4 spelers in een kamer via WebSockets |
| Roulette | Solo | Gooi de bal, wed op nummers en kleuren |
| Mines | Solo | Onthul veilige tegels zonder een mijn te raken |
| Poker | Multiplayer | Texas Hold'em met meerdere spelers in een kamer |

---

## Tech Stack

| Onderdeel | Technologie | Documentatie |
|-----------|------------|--------------|
| Framework | [Astro](https://astro.build) (SSR mode) | https://docs.astro.build |
| Server | Node.js + eigen HTTP-server | https://nodejs.org/docs |
| Database | [MongoDB](https://www.mongodb.com) + officiële driver | https://www.mongodb.com/docs/drivers/node |
| Realtime | [ws](https://github.com/websockets/ws) (WebSocket library) | https://github.com/websockets/ws |
| Betalingen | [Mollie API](https://docs.mollie.com) | https://docs.mollie.com |
| Authenticatie | [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) + [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | — |
| Content API | [Wikipedia Action API](https://www.mediawiki.org/wiki/API:Main_page) | https://www.mediawiki.org/wiki/API:Query |
| Geluid / Stem | [ElevenLabs TTS API](https://elevenlabs.io/docs) | https://elevenlabs.io/docs |
| Hosting | [Render](https://render.com) | https://render.com/docs |

---

## Vereisten

- Node.js >= 22.12.0
- MongoDB instantie (lokaal of Atlas)
- Mollie API-sleutel (voor betalingen)
- ElevenLabs API-sleutel (voor dealergeluid)

---

## Installatie

```bash
npm install
cp .env.example .env   # Vul je eigen waarden in
npm run dev            # Development op localhost:4321
npm start              # Productie (vereist eerst: npm run build)
```

---

## Omgevingsvariabelen

```env
MONGODB_URI=mongodb://localhost:27017/blackjack
JWT_SECRET=jouw_geheime_sleutel
MOLLIE_API_KEY=test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_API_KEY=jouw_sleutel
```

---

## Projectstructuur

```
/
├── server.mjs                  # Productie-entrypoint: HTTP-server + WebSocket
├── astro.config.mjs            # Astro-configuratie (SSR via Node.js adapter)
│
├── server/                     # Server-side logica (draait alleen op de server)
│   ├── websocket.js            # WebSocket-server, berichtenafhandeling
│   ├── gameManager.js          # Blackjack spellogica voor multiplayer
│   ├── pokerManager.js         # Texas Hold'em spellogica en handevaluatie
│   ├── minesState.js           # Sessiebeheer en multiplier-berekening voor Mines
│   ├── db.js                   # Helperfuncties voor coins en scores (MongoDB)
│   └── mongodb.js              # MongoDB-verbinding opzetten
│
├── lib/                        # Gedeelde logica voor server én API-routes
│   └── auth.js                 # JWT aanmaken, verifiëren en token uit request halen
│
├── src/
│   ├── pages/                  # Elke .astro file is een pagina
│   │   ├── index.astro         # Lobby / startpagina met spelkeuze
│   │   ├── blackjack.astro     # Solo Blackjack
│   │   ├── multiplayer.astro   # Multiplayer Blackjack
│   │   ├── roulette.astro      # Roulette
│   │   ├── mines.astro         # Mines
│   │   ├── poker.astro         # Multiplayer Poker
│   │   ├── rules.astro         # Spelregels (via Wikipedia API)
│   │   ├── account.astro       # Accountoverzicht
│   │   ├── shop.astro          # Coins kopen via Mollie
│   │   ├── leaderboard.astro   # Ranglijst
│   │   ├── login.astro         # Inloggen
│   │   ├── signup.astro        # Registreren
│   │   └── api/                # API-endpoints (server-side functies)
│   │       ├── login.js        # POST: inloggen, JWT teruggeven
│   │       ├── signup.js       # POST: account aanmaken
│   │       ├── me.js           # GET: ingelogde gebruiker ophalen
│   │       ├── balance.json.js # GET/POST: coins opvragen of instellen
│   │       ├── daily-reward.js # POST: dagelijkse beloning claimen
│   │       ├── leaderboard.json.js  # GET: ranglijst ophalen
│   │       ├── rules.json.js        # GET: spelregels via Wikipedia ophalen
│   │       ├── tts.js               # POST: tekst naar spraak via ElevenLabs
│   │       ├── create-payment.js    # POST: Mollie-betaling starten
│   │       ├── payment-webhook.json.js  # POST: Mollie-betaalstatus verwerken
│   │       └── mines/
│   │           ├── start.json.js    # POST: nieuw Mines-spel starten
│   │           ├── reveal.json.js   # POST: tegel onthullen
│   │           └── cashout.json.js  # POST: uitbetalen
│   │
│   ├── scripts/                # Client-side JavaScript (draait in de browser)
│   │   ├── blackjack.js        # Solo Blackjack spellogica
│   │   ├── multiplayer.js      # Multiplayer Blackjack (WebSocket-client)
│   │   ├── roulette.js         # Roulette (canvas wiel, bets)
│   │   ├── mines.js            # Mines (grid, reveal, cashout)
│   │   ├── poker.js            # Poker (WebSocket-client, kaarten tonen)
│   │   ├── rules.js            # Spelregels (Wikipedia ophalen en tonen)
│   │   ├── sound.js            # Geluid en ElevenLabs dealersstem
│   │   ├── index.js            # Lobby (gebruiker laden, navigatie)
│   │   ├── account.js          # Accountpagina
│   │   ├── shop.js             # Shop (betaling starten)
│   │   └── leaderboard.js      # Ranglijst laden
│   │
│   └── styles/                 # CSS per pagina
│       ├── blackjack.css       # Gedeelde stijlen (header, controls, kaarten)
│       ├── index.css           # Lobby
│       ├── multiplayer.css     # Multiplayer tafellayout
│       ├── poker.css           # Poker-specifieke stijlen
│       ├── roulette.css        # Roulettewiel en bettingtafel
│       ├── mines.css           # Mines-grid en tegels
│       └── rules.css           # Spelregelspagina
│
└── public/                     # Statische bestanden (direct beschikbaar)
    ├── cmd-bg.png              # Achtergrondafbeelding
    └── *.svg                   # Icoontjes voor de navigatie
```

---

## API-endpoints

### Authenticatie

| Methode | Endpoint | Omschrijving |
|---------|----------|-------------|
| POST | `/api/signup` | Nieuw account aanmaken (username, email, wachtwoord) |
| POST | `/api/login` | Inloggen, ontvangt een JWT-token terug |
| GET | `/api/me` | Gegevens van de ingelogde gebruiker opvragen |

### Coins en scores

| Methode | Endpoint | Omschrijving |
|---------|----------|-------------|
| GET | `/api/balance.json` | Huidige coin-balans opvragen |
| POST | `/api/daily-reward` | Dagelijkse gratis coins claimen (1× per dag) |
| GET | `/api/leaderboard.json` | Top-ranglijst van spelers |

### Mines-spel

| Methode | Endpoint | Omschrijving |
|---------|----------|-------------|
| POST | `/api/mines/start.json` | Nieuw spel starten, inzet wordt direct afgeschreven |
| POST | `/api/mines/reveal.json` | Één tegel onthullen (geeft `safe` of `mine` terug) |
| POST | `/api/mines/cashout.json` | Huidige winst uitbetalen en spel beëindigen |

### Content

| Methode | Endpoint | Omschrijving |
|---------|----------|-------------|
| GET | `/api/rules.json` | Lijst van alle beschikbare spellen |
| GET | `/api/rules.json?game=blackjack` | Wikipedia-artikel voor een specifiek spel |
| POST | `/api/tts` | Tekst omzetten naar dealersstem via ElevenLabs |

### Betalingen

| Methode | Endpoint | Omschrijving |
|---------|----------|-------------|
| POST | `/api/create-payment` | Mollie-betaling aanmaken, ontvangt betaal-URL terug |
| POST | `/api/payment-webhook.json` | Mollie stuurt hier de betaalstatus naartoe |

---

## WebSocket-protocol

De WebSocket-server is gekoppeld aan de HTTP-server in `server.mjs` en draait op hetzelfde poort. Alle berichten zijn JSON-objecten met een verplicht `type`-veld.

### Blackjack Multiplayer

**Browser → Server**

| Type | Omschrijving |
|------|-------------|
| `JOIN_ROOM` | Kamer joinen met JWT-token en kamernummer |
| `PLACE_BET` | Inzet plaatsen voor een ronde |
| `HIT` | Extra kaart trekken |
| `STAND` | Passen met huidige hand |

**Server → Browser**

| Type | Omschrijving |
|------|-------------|
| `WELCOME` | Verbinding bevestigd, clientId ontvangen |
| `ROOM_UPDATE` | Volledige spelstatus (spelers, kaarten, fase) |

### Poker

**Browser → Server**

| Type | Omschrijving |
|------|-------------|
| `POKER_JOIN_ROOM` | Pokerkamer joinen |
| `POKER_PLACE_ANTE` | Ante (verplichte inzet) plaatsen |
| `POKER_CHECK` | Checken (niet inzetten) |
| `POKER_CALL` | Meegaan met de huidige inzet |
| `POKER_RAISE` | Verhogen |
| `POKER_FOLD` | Opgeven |

**Server → Browser**

| Type | Omschrijving |
|------|-------------|
| `POKER_ROOM_UPDATE` | Spelstatus (community cards, pot, spelers, aan-de-beurt) |

---

## Uitleg van complexe onderdelen

### JWT-authenticatie (`lib/auth.js`)

JWT staat voor JSON Web Token. Na het inloggen krijgt de gebruiker een token terug dat gebruikersgegevens bevat, versleuteld met een geheime sleutel. Bij elk volgend verzoek stuurt de browser dit token mee in de `Authorization: Bearer <token>` header. De server controleert de handtekening en weet zo wie de gebruiker is — zonder de database te raadplegen.

```
Inloggen  → server maakt JWT aan met gebruikersdata erin
Verzoek   → browser stuurt: Authorization: Bearer eyJhbGci...
Server    → verifyToken(token) → { _id, username, ... }
```

### Mines sessiebeheer (`server/minesState.js`)

De mijnenposities worden **nooit** naar de browser gestuurd — alleen een `gameId`. Posities worden server-side opgeslagen in een `Map` (geheugen). Bij elke tegelaanvraag controleert de server of de positie een mijn is. Na 15 minuten verwijdert een `setTimeout` de sessie automatisch, zodat afgebroken spellen geen geheugen lekken.

```
start   → genereer mijnposities, sla op in Map, stuur alleen gameId terug
reveal  → controleer server-side: zit index in de Set van mijnen?
cashout → verwijder sessie, schrijf winst bij in database
```

### Poker handevaluatie (`server/pokerManager.js`)

Een Texas Hold'em hand bestaat uit 2 persoonlijke kaarten + 5 community cards = 7 kaarten totaal. De beste 5-kaartshand wordt bepaald door alle mogelijke combinaties van 5 uit die 7 te proberen. Dat zijn C(7,5) = 21 combinaties. Elke combinatie krijgt een score (0 = high card tot 9 = royal flush). De hoogste score wint.

```
7 kaarten → probeer alle 21 combinaties van 5 → pak de hoogste score
```

Bij gelijkspel wordt de pot gelijk verdeeld over de winnaars.

### Wikipedia Content API (`src/pages/api/rules.json.js`)

De Wikipedia Action API geeft het volledige artikel terug als platte tekst. Secties zijn gescheiden door `== Titel ==`. Een reguliere expressie splitst de tekst op in een array van secties. Resultaten worden 1 uur in servergeheugen bewaard zodat Wikipedia niet bij elk paginabezoek opnieuw aangesproken wordt.

```
Wikipedia API → platte tekst met == koppen == → split met regex → array van secties
```

De regex `/\n+(==+)\s*(.+?)\s*\1\n/` werkt als volgt:
- `\n+` — één of meer lege regels vóór de kop
- `(==+)` — vangt de `==` tekens op (groep 1, bepaalt niveau)
- `(.+?)` — vangt de sectietitel op (groep 2)
- `\1` — terugverwijzing naar groep 1: sluitende `==` moet exact hetzelfde zijn als de openende

### Mollie betalingsflow (`src/pages/api/`)

```
1. Browser → POST /api/create-payment    → server maakt Mollie-betaling aan
2. Server  → stuurt betaal-URL terug     → browser stuurt gebruiker daarheen
3. Gebruiker betaalt op Mollie-pagina
4. Mollie  → POST /api/payment-webhook   → server controleert status bij Mollie
5. Server  → schrijft coins bij in database
```

Dit webhook-patroon is nodig omdat de gebruiker de pagina verlaat om te betalen — we kunnen niet wachten op een callback in dezelfde verbinding.

### XSS-beveiliging in `rules.js`

Tekst die van Wikipedia komt wordt niet zomaar als HTML ingevoegd. De `esc()` functie vervangt alle gevaarlijke tekens door veilige HTML-entiteiten voordat de tekst in `innerHTML` wordt gezet. Zo kan een kwaadaardige Wikipedia-bewerking geen JavaScript uitvoeren in de browser van de gebruiker.

```javascript
esc('<script>alert(1)</script>')
// → "&lt;script&gt;alert(1)&lt;/script&gt;"  (onschadelijk)
```

---

## Bronnen

- Astro documentatie: https://docs.astro.build/en/getting-started/
- Astro Node.js adapter: https://docs.astro.build/en/guides/integrations-guide/node/
- WebSocket (ws package): https://github.com/websockets/ws
- MongoDB Node.js driver: https://www.mongodb.com/docs/drivers/node/current/
- JWT (jsonwebtoken): https://github.com/auth0/node-jsonwebtoken
- Bcrypt wachtwoord-hashing: https://github.com/kelektiv/node.bcrypt.js
- Mollie betaal-API: https://docs.mollie.com/reference/create-payment
- ElevenLabs TTS: https://elevenlabs.io/docs/api-reference/text-to-speech
- Wikipedia Action API: https://www.mediawiki.org/wiki/API:Query
- Wikipedia pageimages extensie: https://www.mediawiki.org/wiki/Extension:PageImages
- CSS backdrop-filter: https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- SessionStorage API: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
- Canvas API (roulette wiel): https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- URLSearchParams: https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
- Regular expressions (MDN): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions

---

## Design inspiratie

![Poker tafel inspiratie](pokerInspo.png)

---

## Weekly Nerd aantekeningen

**Johan Huijkman — Toegankelijkheid**
Een schermlezer die de hele pagina voorleest is frustrerend. Betrek de doelgroep actief. De vier pijlers van WCAG zijn: Perceivable, Operable, Understandable en Robust. Stop niet bij WCAG, maar ga in gesprek met mensen met een beperking. Decoratieve afbeeldingen mogen een leeg `alt`-attribuut krijgen. Schermlezergebruikers hebben al ingebouwde navigatiefuncties — voeg die niet dubbel toe.

**Martijn**
Lange stukken tekst zijn vermoeiend. Geen hover-feedback bij knoppen is irritant. Heeft baat bij goed contrast, gerelateerde informatie bij elkaar en zichtbare focusranden.

**Naduah — Mobiliteitsproblemen**
Felle kleuren en veel informatie tegelijk zijn vermoeiend. Heeft baat bij een dark/light-mode, rustige layout en het automatisch opslaan van gegevens.

**Guido**
Raakt snel overprikkeld. Wil snel de gewenste informatie vinden. Heeft baat bij duidelijke instructies, meldingen en voorspelbaarheid.

---

## Ontvangen feedback

- Geluid toevoegen, content API ✅
- Layout netter maken, ruimte en focus ✅
- Multiplayer toevoegen ✅
- CMD-stijl toepassen ✅
- Studiepunten (EC) in plaats van coins ✅
- Vakken-pagina ✅
- Dubbel en split bij blackjack ✅
- Leaderboard fixen ✅
- Favicon toevoegen
- Achtergrond bij het spelen is wat druk
