# חברותא – תיעוד מערכת מלא

> אפליקציית לימוד תורה אינטראקטיבית עם AI, המשלבת חברותא דיגיטלית עם רבי בניהו

---

## תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [ארכיטקטורה](#ארכיטקטורה)
3. [קבצים ותפקידיהם](#קבצים-ותפקידיהם)
4. [API Endpoints](#api-endpoints)
5. [מאגרי תוכן](#מאגרי-תוכן)
6. [מצב האפליקציה (State)](#מצב-האפליקציה)
7. [ניהול משתמשים](#ניהול-משתמשים)
8. [מנגנון הניקוד](#מנגנון-הניקוד)
9. [היסטוריה ו-Streak](#היסטוריה-ו-streak)
10. [פאנל ניהול](#פאנל-ניהול)
11. [מיילים](#מיילים)
12. [משתני סביבה](#משתני-סביבה)
13. [עיצוב ו-UI](#עיצוב-ו-ui)
14. [אבטחה](#אבטחה)
15. [Deploy](#deploy)
16. [מצב "ללמוד עם חבר"](#מצב-ללמוד-עם-חבר-friend-chavruta-mode)

---

## סקירה כללית

**חברותא** היא אפליקציית לימוד תורה אינטראקטיבית שמאפשרת למשתמשים ללמוד טקסטים יהודיים קלאסיים בשיטת חברותא מול AI.

- **רב AI**: "רבי בניהו" — מציג פסוקים/יחידות, שואל שאלות, נותן פידבק ומנקד
- **מקורות**: תנ"ך, משנה, ש"ס בבלי, רמב"ם, שולחן ערוך (דרך Sefaria API)
- **מודל AI**: Claude (ברירת מחדל: `anthropic/claude-opus-4`) דרך OpenRouter
- **כתובת**: https://chavruta-iota.vercel.app

---

## ארכיטקטורה

```
┌─────────────────────────────────────────────┐
│              Browser (Frontend)              │
│  index.html + app.js (vanilla JS + Tailwind) │
└────────────────────┬────────────────────────┘
                     │ fetch()
┌────────────────────▼────────────────────────┐
│         Vercel Serverless Functions          │
│  api/chat.js      → OpenRouter API (AI)      │
│  api/users.js     → Vercel KV (משתמשים)     │
│  api/history.js   → Vercel KV (היסטוריה)    │
│  api/config.js    → Vercel KV (הגדרות)      │
│  api/email-templates.js → Vercel KV          │
└────────────────────┬────────────────────────┘
          ┌──────────┴──────────┐
          ▼                     ▼
   Vercel KV (Redis)     OpenRouter API
   (משתמשים, היסטוריה,   (Claude, Gemini,
    הגדרות, תבניות)       DeepSeek, Qwen...)
```

**זרימה עיקרית:**
1. משתמש בוחר אוסף → ספר → יחידה
2. frontend מושך טקסט מ-Sefaria API ישירות
3. frontend שולח לשרת את הטקסט + שיחה עד כה
4. השרת מעביר ל-OpenRouter → Claude
5. Claude מחזיר JSON מובנה עם פידבק, ניקוד, פסוק הבא ושאלה
6. Frontend מציג ומנהל state

---

## קבצים ותפקידיהם

### `index.html`
- כל ה-HTML של האפליקציה (SPA יחידה)
- Tailwind CSS דרך CDN (+ config מותאם)
- CSS מוטבע לאנימציות, layout ועיצוב
- **מודאלים**: הרשמה, pending, ניהול, סיום שיחה, היסטוריה
- **מבנה מסך ראשי**: header → chat area → input area

### `app.js`
- כל לוגיקת ה-frontend (~1370 שורות)
- ראה פירוט בסעיפים הבאים

### `api/chat.js`
- Serverless function לתקשורת עם OpenRouter
- בונה system prompt לפי האוסף הנבחר
- מחזיר JSON מובנה (ראה [פורמט תשובת AI](#פורמט-תשובת-ai))

### `api/users.js`
- ניהול רישום ואישור משתמשים
- שמירה ב-Vercel KV
- שליחת מיילים דרך Resend API

### `api/history.js`
- שמירה ושליפת היסטוריית למידה
- עד 300 רשומות למשתמש

### `api/config.js`
- קריאה ושמירת הגדרת מודל AI
- מוגן: רק admin יכול לשנות

### `api/email-templates.js`
- ניהול תבניות מייל (welcome, approval, admin_notify)
- מוגן: רק admin

### `vercel.json`
- הגדרת build ו-functions
- `api/chat.js` עם maxDuration 30 שניות
- Security headers: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`

### `package.json`
- תלות יחידה: `@vercel/kv@^2.0.0`
- Node.js >= 18, ES Modules

---

## API Endpoints

### `POST /api/chat`
**תפקיד**: ממיר פנייה מה-frontend לשיחת AI דרך OpenRouter

**Body:**
```json
{
  "messages": [...],         // מערך שיחה (role: user/assistant)
  "chapter_text": "...",     // טקסט הפרק/יחידה (ממוספר)
  "book_name": "בראשית",
  "chapter_num": "פרק א׳",
  "total_verses": 31,
  "collection_type": "tanach",
  "custom_prompt": "...",    // אופציונלי — מ-admin
  "model": "anthropic/..."   // אופציונלי — עוקף ברירת מחדל
}
```

**תשובה (JSON מובנה):**
```json
{
  "feedback": "פידבק על התשובה הקודמת",
  "score": 5,
  "next_verse_num": 3,
  "next_verse": "טקסט הפסוק הבא",
  "next_question": "שאלה על הפסוק",
  "explanation": "",
  "is_finished": false
}
```

**ניקוד**: `5` = נכון לגמרי | `2` = חלקי | `0` = שגוי

---

### `POST /api/users` — רישום משתמש
```json
{ "name": "...", "email": "..." }
```
- אם admin — מאושר אוטומטית
- אחרת — סטטוס `pending` + מייל ברוכים הבאים + התראה לאדמין

### `GET /api/users?email=...` — בדיקת סטטוס
- מחזיר `{ status: "approved" | "pending" | "not_found" }`

### `GET /api/users?adminEmail=...` — רשימת כל המשתמשים (admin)
- מחזיר מערך של כל המשתמשים ממוין לפי תאריך

### `PATCH /api/users` — עדכון סטטוס (admin)
```json
{ "email": "...", "status": "approved|pending", "adminEmail": "..." }
```
- אישור שולח מייל אישור למשתמש

---

### `POST /api/history` — שמירת סשן
```json
{
  "email": "...",
  "record": {
    "collection": "tanach",
    "collectionLabel": "תנ\"ך",
    "book": "בראשית",
    "unit": "פרק א׳",
    "unitRaw": "1",
    "score": 25,
    "exchanges": 5,
    "bookTotal": 50
  }
}
```

### `GET /api/history?email=...` — שליפת היסטוריה
- מחזיר עד 300 רשומות (ממוינות לפי תאריך יורד)

---

### `GET /api/config` — קריאת מודל AI
- מחזיר `{ model: "anthropic/claude-opus-4" }`

### `POST /api/config` — עדכון מודל (admin)
```json
{ "adminEmail": "...", "model": "anthropic/claude-opus-4" }
```

---

### `GET /api/email-templates?adminEmail=...`
- מחזיר תבניות מייל מ-KV

### `PATCH /api/email-templates`
```json
{ "adminEmail": "...", "type": "welcome|approval|admin_notify", "subject": "...", "body": "..." }
```

---

## מאגרי תוכן

### תנ"ך (TANACH) — 39 ספרים
- תורה: בראשית–דברים
- נביאים: יהושע–מלאכי
- כתובים: תהילים–דברי הימים ב
- **API Sefaria**: `GET https://www.sefaria.org/api/texts/{ספר}.{פרק}?lang=he&commentary=0&context=0`

### משנה (MISHNAH) — 63 מסכתות
- 6 סדרים: זרעים, מועד, נשים, נזיקין, קדשים, טהרות
- **Sefaria ref**: `Mishnah_{sf}.{פרק}`

### ש"ס בבלי (SHAS) — 37 מסכתות
- סוג יחידה: **דף** (עמוד א/ב), מ-2a עד מספר הדפים
- **Sefaria ref**: `{sf}.{דף}` (למשל: `Berakhot.2a`)

### רמב"ם (RAMBAM) — 27 ספרים נבחרים
- **Sefaria ref**: `Mishneh Torah, {Book Title}.{פרק}`

### שולחן ערוך (SHULCHAN) — 4 חלקים
- אורח חיים (697 סימנים), יורה דעה, אבן העזר, חושן משפט

---

## מצב האפליקציה

אובייקט גלובלי `S`:

```js
const S = {
  collectionKey: 'tanach',  // אוסף נוכחי
  book:          null,       // פריט ספר (מהמערך המתאים)
  unit:          null,       // פרק (int) או דף (string: '2a'/'2b')
  verses:        [],         // מערך פסוקים/יחידות מ-Sefaria
  messages:      [],         // היסטוריית שיחה עם AI
  totalScore:    0,          // ניקוד מצטבר (מ-localStorage)
  sessionScore:  0,          // ניקוד הסשן הנוכחי
  loading:       false,      // האם יש קריאת AI בתהליך
  adminAuthed:   false,      // האם המשתמש הוא admin
  sessionStarted:false,      // האם סשן למידה פעיל
  greetingMode:  false,      // האם במצב ברכה/בחירה
};
```

---

## ניהול משתמשים

### רישום
1. משתמש מזין שם + אימייל
2. `POST /api/users` — נשמר ב-KV עם סטטוס `pending`
3. Admin מאשר דרך פאנל הניהול → `PATCH /api/users`
4. נשלח מייל אישור

### localStorage
```
chavruta_user      → { name, email }
chavruta_score     → מספר (ניקוד כולל)
chavruta_streak    → { count, lastDate }
chavruta_prompt_*  → system prompt מותאם לכל אוסף
```

### Admin
- אימייל: `a0583298194@gmail.com`
- מזוהה בצד לקוח דרך `isAdmin()` שבודקת localStorage
- כל API רגיש מאמת `adminEmail` בצד השרת מול קבוע `ADMIN`

---

## מנגנון הניקוד

- **5 נקודות**: תשובה נכונה לגמרי
- **2 נקודות**: תשובה חלקית / כיוון נכון
- **0 נקודות**: תשובה שגויה

האנימציה `scoreFloat` מציגה pop-up בזהב שעולה ונעלם.
הניקוד הכולל נשמר ב-`localStorage('chavruta_score')`.

---

## היסטוריה ו-Streak

### היסטוריה
- נשמרת ב-Vercel KV כ-array עד 300 רשומות
- מכילה: collection, book, unit, score, exchanges, timestamp
- מציגה: גרופינג לפי תאריך + progress bar לפי ספר

### Streak
- מחושב לוקלית (localStorage)
- מעודכן בסיום סשן עם ניקוד > 0
- מציג רצף ימי למידה רצוף + אש 🔥

---

## פאנל ניהול

נגיש רק ל-admin (כפתור ⚙️ ניהול בheader).

### יכולות:
1. **ניהול משתמשים** — צפייה ברשימה + אישור/ביטול
2. **בחירת מודל AI** — Claude (Opus/Sonnet/Haiku), Gemini, DeepSeek, Qwen, Mistral
3. **עריכת system prompts** — לכל אוסף בנפרד (נשמר ב-localStorage של Admin)
4. **תבניות מייל** — welcome, approval, admin_notify (HTML, עם `{{name}}` ו-`{{email}}`)

---

## מיילים

**ספק**: Resend API
**שלישיית מיילים:**

| סוג | נשלח מתי |
|-----|----------|
| `welcome` | עם הרשמה — למשתמש החדש |
| `admin_notify` | עם הרשמה — לאדמין |
| `approval` | עם אישור משתמש — למשתמש |

**משתנים בתבניות**: `{{name}}`, `{{email}}`

---

## משתני סביבה

| משתנה | תפקיד | חובה |
|-------|--------|------|
| `OPENROUTER_API_KEY` | גישה ל-OpenRouter API | ✅ |
| `KV_URL` / `KV_REST_API_*` | Vercel KV (Redis) | ✅ |
| `RESEND_API_KEY` | שליחת מיילים | ⚠️ אופציונלי |
| `RESEND_FROM` | כתובת שולח מייל | ⚠️ ברירת מחדל: onboarding@resend.dev |
| `ALLOWED_ORIGIN` | CORS origin ל-chat API | ⚠️ ברירת מחדל: `*` |
| `APP_URL` | URL האפליקציה ל-HTTP-Referer | ⚠️ ברירת מחדל: chavruta.vercel.app |
| `OPENROUTER_MODEL` | מודל ברירת מחדל | ⚠️ ברירת מחדל: anthropic/claude-opus-4 |

---

## עיצוב ו-UI

### פלטת צבעים
| שם | Hex | שימוש |
|----|-----|--------|
| `parchment` | `#FDF8EF` | רקע ראשי |
| `parchmentDark` | `#F0E6C8` | גבולות, הפרדות |
| `ink` | `#2C1810` | טקסט ראשי |
| `navy` | `#1B3A6B` | header, כפתורים, בועות משתמש |
| `navyDark` | `#0F2240` | hover states |
| `gold` | `#B8860B` | הדגשה, מספרי פסוקים, ניקוד |
| `goldLight` | `#F0C040` | לוגו, badge ניקוד |

### טיפוגרפיה
- פונט: **Noto Serif Hebrew** (Google Fonts)
- RTL throughout

### רכיבי UI מרכזיים
- **Header**: לוגו + ניהול + spinner + ניקוד + streak + ברכה + היסטוריה + יציאה
- **chat**: אזור הודעות גמיש עם scroll
- **input-area**: picker (בחירת אוסף/ספר/יחידה) + שורת טקסט + שלח
- **Thinking indicator**: progress bar + הודעות סיבוביות בעברית
- **Score popup**: אנימציית float בזהב
- **Modals**: register, pending, admin, finished, history

### אנימציות
| שם | תיאור |
|----|--------|
| `fadeUp` | כניסת אלמנטים בעמוד הפתיחה |
| `scoreFloat` | pop-up של ניקוד (2.4 שניות) |
| `bounce` | נקודות typing |
| `spin` | spinner בheader |

### ריספונסיביות
- Mobile breakpoint: `max-width: 640px`
- Mobile: header מתקפל לעמודה, פונט קטן יותר, `safe-area-inset-bottom` לiPhone

---

## אבטחה

### צד שרת
- כל פעולת admin מאמתת `adminEmail` מול קבוע hardcoded
- Security headers ב-`vercel.json`: nosniff, X-Frame-Options: DENY, Referrer-Policy
- API key נשמר רק בצד שרת (לא נחשף ל-frontend)

### צד לקוח
- XSS prevention: כל תוכן משתמש עובר `esc()` לפני הכנסה ל-DOM
- Admin buttons: כפתור ⚙️ מוצג רק ל-admin (בדיקת אימייל)
- כניסת admin לפאנל: ישירה לאחר אימות אימייל (ללא password gate)

### ידוע ולא מטופל
- `/api/history`: ללא auth — כל מי שיודע אימייל יכול לקרוא/לכתוב היסטוריה

---

## Deploy

### Vercel
- **Framework**: None (static files + serverless functions)
- **Build command**: (ריק)
- **Output directory**: `.`
- **Functions**: כל קבצי `api/*.js`

### תלויות שצריכות להיות מוגדרות ב-Vercel:
1. Vercel KV (Redis) — מחובר דרך Environment Variables אוטומטית
2. `OPENROUTER_API_KEY`
3. `RESEND_API_KEY` (אופציונלי)

### גרסאות Node.js
- דרישה: >= 18
- ES Modules (`"type": "module"`)

---

## מצב "ללמוד עם חבר" (Friend Chavruta Mode)

### סקירה כללית
מצב דו-משתתפי שבו שני אנשים אמיתיים לומדים יחד מול רבי בניהו. שניהם עונים על אותה שאלה, הרב מנקד כל אחד בנפרד, ובוחר מי ענה טוב יותר. אופציה לראות אחד את השני בוידאו (WebRTC).

### קבצים חדשים

| קובץ | תפקיד |
|------|--------|
| `chavruta.html` | דף "ללמוד עם חבר" — UI נפרד לחלוטין, עיצוב זהה (parchment/navy/gold, Noto Serif Hebrew) |
| `chavruta.js` | לוגיקת frontend: state, polling, render, WebRTC |
| `api/room.js` | ניהול חדרי לימוד: create / join / start / answer / next / end |
| `api/signal.js` | WebRTC signaling relay דרך Vercel KV |
| `api/chat-friend.js` | AI לשני תלמידים — מירור של `api/chat.js` עם פרומפט ו-JSON shape חדש |

### שינויים בקבצים קיימים (מינימליים בלבד)
- **`index.html`**: כפתור `👥 ללמוד עם חבר` בהדר + CSS לכפתור. כלום אחר.
- **`vercel.json`**: `Permissions-Policy` הורחב ל-`microphone=(self), camera=(self)` לאפשר WebRTC. נוספו `chat-friend.js` ו-`room.js` ל-`functions` (35s timeout ל-room כי כולל קריאת AI).

### KV Schema (namespace `friend:*` — לא מתנגש עם שום דבר קיים)

| מפתח | ערך | TTL |
|------|-----|-----|
| `friend:room:{roomId}` | אובייקט החדר (version, phase, host, guest, messages, scores…) | 6 שעות |
| `friend:lock:{roomId}` | `"1"` — נעילה אטומית למניעת קריאת AI כפולה | 35 שניות |
| `friend:signal:{roomId}:host` | queue של WebRTC signals לכיוון host | 6 שעות |
| `friend:signal:{roomId}:guest` | queue של WebRTC signals לכיוון guest | 6 שעות |
| `friend:history:{email}` | array עד 100 רשומות סשני חברותא (נפרד מ-`history:{email}`) | ללא TTL |

### מכונת מצבים של חדר (`phase`)
```
waiting_for_guest → ready → asking → evaluating → showing_feedback → asking (לולאה)
                                                                    → finished
```

### זרימת משתמש
1. משתמש לוחץ **👥 ללמוד עם חבר** בהדר → נפתח `/chavruta.html`
2. בוחר אוסף/ספר/יחידה → **"צור חדר"** → מקבל קישור לשיתוף
3. חבר פותח את הקישור → נכנס עם חשבון מאושר → מצטרף
4. המארח לוחץ **"התחל שיעור"** → שרת שולח ל-`chat-friend` → מחזיר פסוק ראשון + שאלה
5. שניהם כותבים תשובה → שולחים
6. כשהתשובה **השנייה** מגיעה לשרת → נעילה אטומית → קריאת AI → verdict (פידבק+ניקוד+מנצח)
7. polling (~1.5s) מסנכרן את שני הצדדים
8. אחרי 4-5 שאלות: `is_finished:true` → מסך סיום עם ניקוד סופי

### AI — `/api/chat-friend.js`
**Request מוסיף:** `host_answer`, `guest_answer`, `host_name`, `guest_name`

**Response shape:**
```json
{
  "feedback_host":  "פידבק לתלמיד הראשון",
  "feedback_guest": "פידבק לתלמיד השני",
  "score_host":     5,
  "score_guest":    2,
  "winner":         "host",
  "winner_reason":  "...",
  "next_verse_num": 2,
  "next_verse":     "...",
  "next_question":  "...",
  "explanation":    "",
  "is_finished":    false
}
```

### וידאו (WebRTC)
- **P2P** — הוידאו עצמו לא עובר דרך שרת כלל
- **Signaling** (offer/answer/ICE) עובר דרך `/api/signal` → KV
- **STUN**: שרתי Google חינמיים (`stun.l.google.com:19302`)
- **אופציונלי**: כפתור "🎥 הפעל וידאו" — אם WebRTC נכשל (NAT סימטרי), הלימוד ממשיך בטקסט
- **Host = offerer**, Guest = answerer

### בידוד מהמערכת הקיימת
- לא נכתב שום דבר ל-`localStorage` (רק קריאה של `chavruta_user`)
- לא נגע ב-`chavruta_score`, `chavruta_streak`, `history:{email}`
- כל מפתחות KV תחת `friend:*` בלבד
- קוד `app.js`, `api/chat.js` ועוד — לא שונו כלל

### טיפול ב-Race Conditions
כשהתשובה השנייה מגיעה, המנגנון:
1. כל handler כותב את `pendingAnswers[role]`
2. אם שתי התשובות נמצאות ו-`evaluating===false` → `kv.set(lockKey, '1', { nx:true, ex:35 })`
3. רק המנצח בנעילה קורא ל-AI. השני מחזיר 202.
4. אם ה-AI נכשל — הנעילה פגה ב-35s → ניסיון חוזר אפשרי
