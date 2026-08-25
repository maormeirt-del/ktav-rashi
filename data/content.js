/* ===========================================================
   content.js — מערכת התגמול והמסע:
   RANKS   — דרגות לומד (לפי נקודות)
   SEFORIM — אֲרוֹן הַסְּפָרִים (נפתחים לפי עולם, ובכל אחד קטע אמיתי)
   SEALS   — חוֹתְמוֹת הַמַּדְפִּיסִים (מיל־סטונים היסטוריים)
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

/* ---- אֲרוֹן הַסְּפָרִים — התגמול המרכזי ----
   כל ספר נפתח בסיום עולם, ואז אפשר לקרוא בו קטע אמיתי בכתב רש״י. */
window.SEFORIM = [
  { id: "sidur", name: "סִדּוּר", icon: "🙏", unlock: null,
    snippet: "מוֹדֶה אֲנִי לְפָנֶיךָ מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה — רַבָּה אֱמוּנָתֶךָ.",
    blurb: "הַסֵּפֶר הָרִאשׁוֹן שֶׁלְּךָ. מִלִּים שֶׁאַתָּה כְּבָר מַכִּיר — עַכְשָׁו בִּכְתָב רָשִׁ״י." },

  { id: "chumash", name: "חֻמָּשׁ עִם רַשִׁ״י", icon: "📕", unlock: "w1",
    snippet: "בְּרֵאשִׁית בָּרָא אֱלֹקִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ.",
    blurb: "פָּתַחְתָּ אֶת הַחֻמָּשׁ! הַפָּסוּק הָרִאשׁוֹן בַּתּוֹרָה." },

  { id: "avot", name: "פִּרְקֵי אָבוֹת", icon: "📗", unlock: "w2",
    snippet: "עַל שְׁלֹשָׁה דְבָרִים הָעוֹלָם עוֹמֵד: עַל הַתּוֹרָה, וְעַל הָעֲבוֹדָה, וְעַל גְּמִילוּת חֲסָדִים.",
    blurb: "מִשְׁנָה מִפִּרְקֵי אָבוֹת — חָכְמָה לַחַיִּים." },

  { id: "mikraot", name: "מִקְרָאוֹת גְּדוֹלוֹת", icon: "📘", unlock: "w3",
    snippet: "בְּרֵאשִׁית — אָמַר רַבִּי יִצְחָק: לֹא הָיָה צָרִיךְ לְהַתְחִיל אֶת הַתּוֹרָה אֶלָּא מֵ׳הַחֹדֶשׁ הַזֶּה לָכֶם׳.",
    blurb: "צוּרַת הַדַּף הַקְּלַאסִית — פָּסוּק עִם פֵּרוּשׁ רָשִׁ״י מִסָּבִיב." },

  { id: "ein-yaakov", name: "עֵין יַעֲקֹב", icon: "📙", unlock: "w4",
    snippet: "אָמַר רַבִּי חֲנִינָא: תַּלְמִידֵי חֲכָמִים מַרְבִּים שָׁלוֹם בָּעוֹלָם.",
    blurb: "אַגָּדוֹת הַשַּׁ״ס — סִפּוּרֵי חֲכָמִים." },

  { id: "mishna-brura", name: "מִשְׁנָה בְּרוּרָה", icon: "📔", unlock: "w5",
    snippet: "יִתְגַּבֵּר כָּאֲרִי לַעֲמֹד בַּבֹּקֶר לַעֲבוֹדַת בּוֹרְאוֹ — שֶׁיְּהֵא הוּא מְעוֹרֵר הַשַּׁחַר.",
    blurb: "הֲלָכָה לְמַעֲשֶׂה — הַפְּתִיחָה שֶׁל הַמִּשְׁנָה בְּרוּרָה." },

  { id: "gemara", name: "דַּף גְּמָרָא (רש״י)", icon: "📚", unlock: "w6",
    snippet: "מֵאֵימָתַי קוֹרִין אֶת שְׁמַע בָּעַרְבִית? — מִשָּׁעָה שֶׁהַכֹּהֲנִים נִכְנָסִים לֶאֱכֹל בִּתְרוּמָתָן.",
    blurb: "הַיַּעַד! הַשּׁוּרָה הָרִאשׁוֹנָה בַּשַּׁ״ס — מַסֶּכֶת בְּרָכוֹת." }
];

/* ---- חוֹתְמוֹת הַמַּדְפִּיסִים (מבוסס היסטוריה אמיתית) ---- */
window.SEALS = [
  { id: "seal-bengarton", when: "w1", emoji: "🖋️", name: "חוֹתַם בֶּן־גַּרְטוֹן",
    note: "אַבְרָהָם בֶּן־גַּרְטוֹן, 1475 — הִדְפִּיס רִאשׁוֹן אֶת פֵּרוּשׁ רָשִׁ״י, וְכָךְ נוֹלַד הַכְּתָב." },
  { id: "seal-soncino",  when: "w3", emoji: "⚙️", name: "חוֹתַם שׁוֹנְצִינוֹ",
    note: "מִשְׁפַּחַת שׁוֹנְצִינוֹ — חִלּוּצֵי הַדְּפוּס הָעִבְרִי." },
  { id: "seal-bomberg",  when: "w5", emoji: "📐", name: "חוֹתַם בּוֹמְבֶּרְג",
    note: "דָּנִיֵּאל בּוֹמְבֶּרְג — עִצֵּב אֶת 'צוּרַת הַדַּף' שֶׁל הַגְּמָרָא." }
];

/* ---- מדליות הישג ---- */
window.MEDALS = [
  { id: "first-letters", tier: "bronze", emoji: "🔤", name: "הָאוֹתִיּוֹת הָרִאשׁוֹנוֹת", test: p => p.mastered >= 5 },
  { id: "all-easy",      tier: "silver", emoji: "✅", name: "כָּל הַקַּלּוֹת!",          test: p => p.mastered >= 18 },
  { id: "boss-down",     tier: "gold",   emoji: "💥", name: "נִצַּחְתָּ אֶת הַבּוֹס",     test: p => !!p.worldsDone.w3 },
  { id: "first-book",    tier: "bronze", emoji: "📖", name: "פָּתַחְתָּ סֵפֶר",          test: p => Object.keys(p.opened || {}).length >= 2 },
  { id: "swap-master",   tier: "silver", emoji: "🔀", name: "אָמָּן הַ־ם/ס",            test: p => !!p.done["w3-swap"] },
  { id: "first-passage", tier: "gold",   emoji: "📜", name: "קָרָאתָ רָשִׁ״י אֲמִתִּי",   test: p => !!p.worldsDone.w5 },
  { id: "streak-7",      tier: "silver", emoji: "🔥", name: "שָׁבוּעַ הַתְמָדָה",         test: p => p.streak.count >= 7 },
  { id: "fluent",        tier: "gold",   emoji: "👑", name: "רָגִיל בְּרַשִׁ״י",          test: p => !!p.worldsDone.w6 },
  { id: "all-seals",     tier: "gold",   emoji: "🏛️", name: "כָּל הַחוֹתָמוֹת",          test: p => (p.seals || []).length >= 3 }
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
    sub: "הָאוֹת מוּלְךָ, וְהָרֶמֶז מַסְבִּיר מָה בְּדִיּוּק אַתָּה רוֹאֶה", opens: "chumash",
    games: [
      { id: "w1-sign1", type: "r-sign", title: "מִי אֲנִי?", emoji: "❓", pool: "easy" },
      { id: "w1-fam",   type: "r-family", title: "הַבּוֹדְדוֹת וְהַפֵּאִין", emoji: "🧩", fams: ["bodedot", "pf"] },
      { id: "w1-grid",  type: "r-grid", title: "סַמֵּן כָּל בּוֹדֶדֶת. סְפֹר.", emoji: "🔍", fam: "bodedot" }
    ] },

  { id: "w2", title: "אֶשְׁכּוֹלוֹת הַבִּלְבּוּל", emoji: "🟡", hue: 40,
    sub: "נִגּוּד לִפְנֵי שִׁנּוּן: כָּל אוֹת נִלְמֶדֶת מוּל תְּאוֹמָתָהּ", opens: "avot",
    games: [
      { id: "w2-fam1", type: "r-family", title: "א · ח · מ", emoji: "🏠", fams: ["ahm"] },
      { id: "w2-g1",   type: "r-grid",   title: "סַמֵּן כָּל אָלֶף. סְפֹר.", emoji: "🔍", fam: "ahm", target: "א" },
      { id: "w2-fam2", type: "r-family", title: "כ · ב · ש  וְ־ד · ר", emoji: "🪶", fams: ["kbsh", "dr"] },
      { id: "w2-g2",   type: "r-grid",   title: "סַמֵּן כָּל דָּלֶת. סְפֹר.", emoji: "📐", fam: "dr", target: "ד" },
      { id: "w2-fam3", type: "r-family", title: "ה · ק · ת  וְ־ע · צ · ל", emoji: "🦶", fams: ["hkt", "ayz"] },
      { id: "w1-match", type: "match",   title: "מֵרוֹץ הַזִּהוּי — כָּל 27", emoji: "⏱️" }
    ] },

  { id: "w3", title: "הַבּוֹס: ס · ם", emoji: "🔴", hue: 355,
    sub: "טָעוּת מִסְפַּר 1 בְּכָל הַכְּתָב — וְהַהַפְתָּעָה שֶׁמְּחַכָּה בַּסּוֹף", opens: "mikraot",
    games: [
      { id: "w3-swap", type: "r-family", title: "הַזּוּג שֶׁמַּפִּיל אֶת כֻּלָּם", emoji: "🔀", fams: ["sm"] },
      { id: "w3-grid", type: "r-grid", title: "סַמֵּן כָּל סָמֶךְ. סְפֹר.", emoji: "🎯", fam: "sm", target: "ס" },
      { id: "w3-star", type: "r-star", title: "הַהַפְתָּעָה", emoji: "✡️" },
      { id: "w3-mat",  type: "r-family", title: "מַטְרִיצַת ו · ז · ן · ץ · ך", emoji: "⬇️", fams: ["vzntzk"] },
      { id: "w3-det",  type: "r-detective", title: "תִּיק כָּל הַכְּתָב", emoji: "🕵️", pool: "all", boss: true }
    ] },

  { id: "w4", title: "אוֹת נֶעֶלְמָה", emoji: "🔵", hue: 210,
    sub: "מִלָּה אֲמִתִּית, אוֹת אַחַת חֲסֵרָה. הַמִּלָּה עַצְמָהּ הִיא רֶמֶז", opens: "ein-yaakov",
    games: [
      { id: "w4-read1", type: "r-word", title: "מִלִּים קְצָרוֹת", emoji: "🔤", lvl: [1, 2] },
      { id: "w4-fill",  type: "r-word", title: "מֻשָּׂגִים", emoji: "🧩", lvl: [2, 3] },
      { id: "w4-read2", type: "r-word", title: "מִלִּים גְּדוֹלוֹת", emoji: "📚", lvl: [3, 4] }
    ] },

  { id: "w5", title: "מִלָּה נֶעֶלְמָה", emoji: "🟣", hue: 275,
    sub: "קֶטַע רָשִׁ״י אֲמִתִּי עִם חוֹר. הַהֶסְבֵּר הוּא הָרֶמֶז", opens: "mishna-brura",
    games: [
      { id: "w5-read",  type: "r-line", title: "חִידַת הַשּׁוּרָה", emoji: "📜", lvl: 5 },
      { id: "w5-read2", type: "r-line", title: "שׁוּרוֹת אֲרֻכּוֹת", emoji: "📖", lvl: 6 }
    ] },

  /* העולם שנעדר מהאפליקציה עד היום, והוא לב החוברת */
  { id: "w5h", title: "הַחֹמֶר הַסָּמוּי", emoji: "🔑", hue: 300,
    sub: "אַתָּה מַכִּיר כָּל אוֹת. וְאָז אַתָּה פּוֹגֵשׁ ת״ל וְנִתְקָע",
    games: [
      { id: "w5h-ab",  type: "r-abbr", title: "12 רָאשֵׁי הַתֵּבוֹת", emoji: "🔑", set: "abbr" },
      { id: "w5h-ger", type: "r-abbr", title: "קִצּוּרֵי גֶּרֶשׁ", emoji: "׳", set: "geresh" },
      { id: "w5h-nus", type: "r-abbr", title: "סִימָנֵי נֻסָּח", emoji: "📝", set: "nusach" },
      { id: "w5h-all", type: "r-abbr", title: "הַכֹּל בְּיַחַד", emoji: "🧠", set: "all" }
    ] },

  { id: "w6", title: "בְּלִי רְמָזִים", emoji: "🟠", hue: 25,
    sub: "אֵין רֶמֶז וְאֵין עֵזֶר. רַק אַתָּה וְהַכְּתָב", opens: "gemara",
    games: [
      { id: "w6-read",  type: "r-fluent", title: "קֶטַע מָלֵא", emoji: "🦅", lvl: 6 },
      { id: "w6-daily", type: "r-fluent", title: "חִידַת הַשֶּׁטֶף", emoji: "🏁", lvl: 6 }
    ] }
];
window.worldById = (id) => window.WORLDS.find(w => w.id === id);
