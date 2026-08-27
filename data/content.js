/* ===========================================================
   content.js — מערכת התגמול והמסע:
   RANKS   — דרגות לומד (לפי נקודות)
   OPENS   — מָה נִפְתָּח בְּבֵית הַמִּדְרָשׁ בְּסִיּוּם עוֹלָם
   MEDALS  — מדליות הישג
   WORLDS  — מפת 7 העולמות והמשחקים בכל אחד
   =========================================================== */

/* ---- דרגות לומד ---- */
window.RANKS = [
  { name: "מַתְחִיל",          min: 0,    emoji: "🌱" },
  { name: "מְפַעֲנֵחַ",        min: 60,   emoji: "🔍" },
  { name: "קוֹרֵא",            min: 150,  emoji: "📖" },
  { name: "תַּלְמִיד",         min: 320,  emoji: "🎓" },
  { name: "לַמְדָן",           min: 560,  emoji: "📜" },
  { name: "בָּקִי",            min: 880,  emoji: "🕯️" },
  { name: "רָגִיל בְּרַשִׁ״י",   min: 1300, emoji: "📕" },
  { name: "חָרִיף",            min: 1800, emoji: "🦅" },
  { name: "בָּקִי וְחָרִיף",    min: 2500, emoji: "⚡" },
  { name: "גְּדוֹל בַּתּוֹרָה",  min: 3400, emoji: "🌟" },
  { name: "גָּאוֹן",           min: 4600, emoji: "💎" },
  { name: "אוֹר הַתּוֹרָה",     min: 6200, emoji: "👑" }
];
window.PRESTIGE_STEP = 1800;   // מעל הדרגה העליונה — דרגות יוקרה אינסופיות (✦) כדי שתמיד יהיה לאן להתקדם
window.rankFor = (pts) => {
  const R = window.RANKS, top = R[R.length - 1];
  if (pts >= top.min + window.PRESTIGE_STEP) {
    const n = Math.floor((pts - top.min) / window.PRESTIGE_STEP);
    return { name: top.name + " ✦" + n, min: top.min + n * window.PRESTIGE_STEP, emoji: "☀️", prestige: n };
  }
  let r = R[0]; for (const x of R) if (pts >= x.min) r = x; return r;
};
window.nextRank = (pts) => {
  const named = window.RANKS.find(x => x.min > pts);
  if (named) return named;
  const top = window.RANKS[window.RANKS.length - 1];
  const n = (window.rankFor(pts).prestige || 0) + 1;
  return { name: top.name + " ✦" + n, min: top.min + n * window.PRESTIGE_STEP, emoji: "☀️" };
};

/* ---- מָה נִפְתָּח בְּסִיּוּם עוֹלָם ----
   ד3 — עד היום סיום עולם פתח "ספר" בארון שנתן קטע של שורה-שתיים.
   מאז שנבנה בית המדרש עם 80 יחידות חומש, 12 סימני שו״ע ו-5 דפי
   גמרא — הארון היה כפילות. עכשיו סיום עולם פותח **פרק אמיתי**:
   depth = עד איזה פרק/סימן/דף נפתח בספר הזה. */
window.OPENS = {
  w1:  { kind: "chumash", depth: 1 },
  w2:  { kind: "chumash", depth: 2 },
  w3:  { kind: "halacha", depth: 3 },
  w4:  { kind: "halacha", depth: 11 },
  w5:  { kind: "gemara",  depth: 1 },
  w5h: { kind: "gemara",  depth: 2 },
  w6:  { kind: "gemara",  depth: 4 }
};
window.libItems = (kind) => {
  const d = (window.LIBRARY || {})[kind];
  return d ? (d.perakim || d.simanim || d.dapim) : [];
};
window.libUnitName = (kind, idx) => {
  const it = window.libItems(kind)[idx]; if (!it) return "";
  return kind === "chumash" ? "פֶּרֶק " + it.n : kind === "gemara" ? it.n : "סִימָן " + it.n;
};
window.libTitle = (kind) => ((window.LIBRARY || {})[kind] || {}).title || "";
window.libIcon  = (kind) => ((window.LIBRARY || {})[kind] || {}).icon || "📖";

/* ---- מדליות הישג ---- */
window.MEDALS = [
  { id: "first-letters", tier: "bronze", emoji: "🔤", name: "הָאוֹתִיּוֹת הָרִאשׁוֹנוֹת", test: p => p.mastered >= 5 },
  { id: "all-easy",      tier: "silver", emoji: "✅", name: "כָּל הַקַּלּוֹת!",          test: p => p.mastered >= 18 },
  { id: "boss-down",     tier: "gold",   emoji: "💥", name: "נִצַּחְתָּ אֶת הַבּוֹס",     test: p => !!p.worldsDone.w3 },
  { id: "first-book",    tier: "bronze", emoji: "📖", name: "פָּתַחְתָּ פֶּרֶק חָדָשׁ",     test: p => Object.keys(p.opened || {}).length >= 1 },
  { id: "swap-master",   tier: "silver", emoji: "🔀", name: "אָמָּן הַ־ם/ס",            test: p => !!p.done["w3-swap"] },
  { id: "first-passage", tier: "gold",   emoji: "📜", name: "קָרָאתָ רָשִׁ״י אֲמִתִּי",   test: p => !!p.worldsDone.w5 },
  { id: "streak-7",      tier: "silver", emoji: "🔥", name: "שָׁבוּעַ הַתְמָדָה",         test: p => p.streak.count >= 7 },
  { id: "fluent",        tier: "gold",   emoji: "👑", name: "רָגִיל בְּרַשִׁ״י",          test: p => !!p.worldsDone.w6 },
  { id: "reader-300",    tier: "silver", emoji: "📖", name: "300 נְקֻדּוֹת קְרִיאָה",     test: p => (p.readPoints || 0) >= 300 },
  { id: "no-peek",       tier: "gold",   emoji: "👁️", name: "עוֹלָם שָׁלֵם בְּלִי הַצָּצָה", test: p => !!p.worldsDone.w4 && !p.peeks }
];

/* ---- מַפַּת הַמַּסָּע — בְּנוּיָה עַל הַחוֹבֶרֶת ----
   הרצף, האשכולות והתרגילים לקוחים מחוברת "18 אותיות אתה כבר יודע".
   שלושת עקרונות היסוד שלה, שכולם חוזרים כאן:
     1. נִגּוּד לִפְנֵי שִׁנּוּן — לומדים אות תמיד מול תאומתה, לא בבידוד.
     2. תַּרְגּוּל, לֹא הַצָּגָה — כל עולם נגמר ברשת סריקה: "סמן כל X, ספור".
     3. לְמִידָה מֵחֲוָיָה — הבוס מסתיים בהפתעה שמתגלה רק אם צדקת.
   ולבסוף החומר הסמוי: מי שמכיר כל אות ולא מכיר את ת״ל — עדיין לא קורא.
   ⚠️ מזהי משחקים (w0-reveal, w3-swap, w4-*) נשמרו — MEDALS נשענות עליהם. */
window.WORLDS = [
  { id: "w0", title: "הַחִידָה הָרִאשׁוֹנָה", emoji: "🔦", hue: 45,
    sub: "כַּמָּה אַתָּה כְּבָר יוֹדֵעַ — בְּלִי שֶׁלִּמְּדוּ אוֹתְךָ?",
    games: [ { id: "w0-reveal", type: "r-open", title: "כַּמָּה אַתָּה מְזַהֶה?", emoji: "🔦" } ] },

  { id: "w1", title: "רְמָזִים גְּלוּיִים", emoji: "🟢", hue: 145,
    sub: "הָאוֹת מוּלְךָ, וְהָרֶמֶז מַסְבִּיר מָה בְּדִיּוּק אַתָּה רוֹאֶה",
    games: [
      { id: "w1-sign1", type: "r-sign", title: "מִי אֲנִי?", emoji: "❓", pool: "easy" },
      { id: "w1-fam",   type: "r-family", title: "הַבּוֹדְדוֹת וְהַפֵּאִין", emoji: "🧩", fams: ["bodedot", "pf"] },
      { id: "w1-grid",  type: "r-grid", title: "סַמֵּן כָּל בּוֹדֶדֶת. סְפֹר.", emoji: "🔍", fam: "bodedot" }
    ] },

  { id: "w2", title: "אֶשְׁכּוֹלוֹת הַבִּלְבּוּל", emoji: "🟡", hue: 40,
    sub: "נִגּוּד לִפְנֵי שִׁנּוּן: כָּל אוֹת נִלְמֶדֶת מוּל תְּאוֹמָתָהּ",
    games: [
      { id: "w2-fam1", type: "r-family", title: "א · ח · מ", emoji: "🏠", fams: ["ahm"] },
      { id: "w2-g1",   type: "r-grid",   title: "סַמֵּן כָּל אָלֶף. סְפֹר.", emoji: "🔍", fam: "ahm", target: "א" },
      { id: "w2-fam2", type: "r-family", title: "כ · ב · ש  וְ־ד · ר", emoji: "🪶", fams: ["kbsh", "dr"] },
      { id: "w2-g2",   type: "r-grid",   title: "סַמֵּן כָּל דָּלֶת. סְפֹר.", emoji: "📐", fam: "dr", target: "ד" },
      { id: "w2-fam3", type: "r-family", title: "ה · ק · ת  וְ־ע · צ · ל", emoji: "🦶", fams: ["hkt", "ayz"] },
      /* השער: 9 זוגות. גודל המשימה קובע את הזמן, בדיוק כמו בהפתעה
         (100 שנ׳) ובתיק הבלש (90). */
      { id: "w2-match9", type: "match", title: "מֵרוֹץ הַזִּהוּי", emoji: "⏱️", n: 9 },
      /* המרוץ המלא נשאר — כאתגר שיא, לא כשער באמצע העולם.
         ⚠️ הדקה היא בקשה מפורשת של מאור. לא לגעת. */
      { id: "w1-match", type: "match", title: "אֶתְגַּר שִׂיא — כָּל 27 בְּדַקָּה", emoji: "🏆", bonus: true }
    ] },

  { id: "w3", title: "הַבּוֹס: ס · ם", emoji: "🔴", hue: 355,
    sub: "טָעוּת מִסְפַּר 1 בְּכָל הַכְּתָב — וְהַהַפְתָּעָה שֶׁמְּחַכָּה בַּסּוֹף",
    games: [
      { id: "w3-swap", type: "r-family", title: "הַזּוּג שֶׁמַּפִּיל אֶת כֻּלָּם", emoji: "🔀", fams: ["sm"] },
      { id: "w3-grid", type: "r-grid", title: "סַמֵּן כָּל סָמֶךְ. סְפֹר.", emoji: "🎯", fam: "sm", target: "ס" },
      /* 54 סמ״כים מתוך 195 תאים — דקה כאן היא ~1.1 שנ׳ לכל מציאה כולל סריקה.
         זו לא משימה בגודל של 6 שאלות רב-ברירה, ולכן 100 שניות. */
      { id: "w3-star", type: "r-star", title: "הַהַפְתָּעָה", emoji: "✡️", limit: 100 },
      { id: "w3-mat",  type: "r-family", title: "מַטְרִיצַת ו · ז · ן · ץ · ך", emoji: "⬇️", fams: ["vzntzk"] },
      { id: "w3-det",  type: "r-detective", title: "תִּיק כָּל הַכְּתָב", emoji: "🕵️", pool: "all", boss: true, limit: 90 }
    ] },

  { id: "w4", title: "אוֹת נֶעֶלְמָה", emoji: "🔵", hue: 210,
    sub: "מִלָּה אֲמִתִּית, אוֹת אַחַת חֲסֵרָה. הַמִּלָּה עַצְמָהּ הִיא רֶמֶז",
    games: [
      /* קודם קוראים מילה שלמה, ורק אחר כך משלימים בה אות.
         עד היום לא הייתה באפליקציה אף משימה שבה שואלים
         "המילה הזאת בכתב רש״י, מה היא?" */
      { id: "w4-word",  type: "r-readword", title: "מָה כָּתוּב כָּאן?", emoji: "👁️", lvl: [1, 2] },
      { id: "w4-read1", type: "r-word", title: "מִלִּים קְצָרוֹת", emoji: "🔤", lvl: [1, 2] },
      { id: "w4-fill",  type: "r-word", title: "מֻשָּׂגִים", emoji: "🧩", lvl: [2, 3] },
      { id: "w4-word2", type: "r-readword", title: "מִלִּים אֲרֻכּוֹת — מָה כָּתוּב?", emoji: "🔎", lvl: [3, 4], nik: "part" },
      { id: "w4-read2", type: "r-word", title: "מִלִּים גְּדוֹלוֹת", emoji: "📚", lvl: [3, 4] }
    ] },

  { id: "w5", title: "מִלָּה נֶעֶלְמָה", emoji: "🟣", hue: 275,
    sub: "קֶטַע רָשִׁ״י אֲמִתִּי עִם חוֹר. הַהֶסְבֵּר הוּא הָרֶמֶז",
    games: [
      { id: "w5-read",  type: "r-line", title: "חִידַת הַשּׁוּרָה", emoji: "📜", lvl: 5, nik: "full" },
      /* סֻלַּם הַנִּקּוּד: מלא → חלקי → בלי. עד היום כל האימון היה מנוקד
         והיעד (רש״י על הש״ס) אינו מנוקד — קפיצה חדה בלי שלב ביניים. */
      { id: "w5-read2", type: "r-line", title: "שׁוּרוֹת אֲרֻכּוֹת", emoji: "📖", lvl: 6, nik: "full" },
      { id: "w5-part",  type: "r-line", title: "נִקּוּד חֶלְקִי", emoji: "🌗", lvl: 6, nik: "part" }
    ] },

  /* העולם שנעדר מהאפליקציה עד היום, והוא לב החוברת */
  { id: "w5h", title: "הַחֹמֶר הַסָּמוּי", emoji: "🔑", hue: 300,
    sub: "אַתָּה מַכִּיר כָּל אוֹת. וְאָז אַתָּה פּוֹגֵשׁ ת״ל וְנִתְקָע",
    games: [
      { id: "w5h-ab",  type: "r-abbr", title: "12 רָאשֵׁי הַתֵּבוֹת", emoji: "🔑", set: "abbr" },
      { id: "w5h-ger", type: "r-abbr", title: "קִצּוּרֵי גֶּרֶשׁ", emoji: "׳", set: "geresh" },
      { id: "w5h-nus", type: "r-abbr", title: "סִימָנֵי נֻסָּח", emoji: "📝", set: "nusach" },
      { id: "w5h-all", type: "r-abbr", title: "הַכֹּל בְּיַחַד", emoji: "🧠", set: "all", tries: 4 }
    ] },

  { id: "w6", title: "בְּלִי רְמָזִים", emoji: "🟠", hue: 25,
    sub: "אֵין רֶמֶז וְאֵין עֵזֶר. רַק אַתָּה וְהַכְּתָב",
    games: [
      { id: "w6-read",  type: "r-fluent", title: "קֶטַע מָלֵא", emoji: "🦅", lvl: 6, nik: "part" },
      { id: "w6-daily", type: "r-fluent", title: "חִידַת הַשֶּׁטֶף", emoji: "🏁", lvl: 6, nik: "none" },
      /* הפעולה האמיתית על הדף: לראות מילה, לחפש את הדיבור המתחיל,
         ולקרוא את הפירוש. 5 דפי בבא קמא ישבו כאן בלי שאף משימה נגעה בהם. */
      { id: "w6-find",  type: "r-find", title: "מְצָא אֶת רָשִׁ״י", emoji: "🔍", limit: 100 },
      /* שטף נמדד בקצב, לא בציון. מול העצמי בלבד. */
      { id: "w6-pace",  type: "r-pace", title: "קְרִיאָה חוֹזֶרֶת · מַד קֶצֶב", emoji: "⏱️", lvl: 6, nik: "none" }
    ] }
];
window.worldById = (id) => window.WORLDS.find(w => w.id === id);
