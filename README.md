# KBK OFFICE

Biurowa gra w stylu Bombermana (bohater **Swoosh**, bomby-spinacze, kartony z dokumentami zamiast skrzynek) na event dla handlowców. Gracz wpisuje nick, gra 90 sekund, wynik trafia do rankingu widocznego na żywo w menu i na ekranie końcowym.

Zero build stepu — czysty HTML/CSS/JS + jedna funkcja serverless do rankingu. Gotowe do wrzucenia na Vercel.

## Struktura

```
index.html          ekran menu / gry / wyników
game.js              cała logika gry (canvas)
assets/cover.jpg      okładka użyta jako tło menu
api/leaderboard.js    GET (top 20) / POST (zapis wyniku) — Node function
```

## Wdrożenie na Vercel (ok. 5 minut)

Potrzebujesz konta na [vercel.com](https://vercel.com) (darmowy plan wystarczy) oraz Node.js zainstalowanego lokalnie (żeby użyć `npx vercel`), **albo** możesz wgrać ten folder przez `git push` na GitHub i zaimportować repo w panelu Vercel — bez lokalnego Node.

### Opcja A — z terminala (najszybsza)

```bash
cd kbk-office
npx vercel login          # zaloguj się (raz)
npx vercel                # pierwszy deploy -> stwórz nowy projekt, potwierdź ustawienia domyślne
```

### Opcja B — przez GitHub + panel Vercel

1. Wrzuć zawartość folderu `kbk-office` do nowego repo na GitHub.
2. Na [vercel.com/new](https://vercel.com/new) kliknij **Import Project**, wskaż to repo.
3. Framework Preset: **Other** (nic nie trzeba zmieniać — brak build commandu).
4. Deploy.

### Podłącz bazę do rankingu (WYMAGANE, żeby ranking działał)

1. W projekcie na Vercel wejdź w zakładkę **Storage**.
2. **Create Database** → wybierz **Redis** (Upstash, w darmowym planie).
3. **Connect** do projektu KBK OFFICE — Vercel sam doda zmienne środowiskowe (`KV_REST_API_URL`, `KV_REST_API_TOKEN`).
4. Zrób redeploy (Deployments → ⋮ → Redeploy), żeby funkcja zobaczyła nowe zmienne.

Bez tego kroku gra działa, ale zapis/odczyt rankingu zwróci błąd 500 — front i tak nie wywali się (pokaże "Ranking niedostępny").

### Link pod kod QR

Po deployu Vercel poda adres w stylu `https://kbk-office.vercel.app` (albo Twoją własną nazwę projektu). To właśnie ten link wklej do generatora kodu QR i wstaw w miejsce oznaczone na okładce gry ("MIEJSCE NA KOD QR").

Na 3 dni eventu to w zupełności wystarczy — kiedy będziecie podpinać docelową domenę/środowisko, wystarczy dodać własną domenę w **Settings → Domains** tego samego projektu Vercel, żaden kod się nie zmienia.

## Zasady gry (dla obsługi stoiska)

- Sterowanie: strzałki / WASD + spacja (klawiatura), albo D-pad + przycisk 📎 na ekranie (dotyk/tablet).
- 90 sekund, 3 "życia" (spinacze u góry ekranu).
- Wysadzasz kartony bombą-spinaczem → punkty. Power-upy z kartonów: ☕ szybkość, 📎 większy zasięg, 🧷 druga bomba, ⏱️ +5 sekund.
- Zbuntowane zszywacze (przeciwnicy) odbierają życie przy dotyku — można je też wysadzić bombą za dodatkowe punkty.
- Do rankingu liczy się najlepszy wynik danego nicku (kolejne gorsze podejścia nie nadpisują).

## Lokalny podgląd bez Vercela

Ranking wymaga funkcji serverless, więc do pełnego testu potrzebny jest `vercel dev` (albo `npx vercel dev` w folderze projektu — poprosi o zalogowanie i link do projektu). Samą planszę/rozgrywkę (bez rankingu) możesz też podejrzeć, otwierając `index.html` bezpośrednio w przeglądarce — zapytania do `/api/leaderboard` po prostu nie powiodą się.
