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

/* ---- מפת 7 העולמות ---- */
window.WORLDS = [
  { id: "w0", title: "אַתָּה כְּבָר יוֹדֵעַ!", emoji: "✨", hue: 45,
    sub: "גַּלֵּה שֶׁאַתָּה כְּבָר מְזַהֶה כְּתָב רָשִׁ״י",
    games: [ { id: "w0-reveal", type: "intro", title: "הַגִּלּוּי", emoji: "🔦" } ] },

  { id: "w1", title: "הָאוֹתִיּוֹת הַקַּלּוֹת", emoji: "🟢", hue: 145,
    sub: "18 אוֹתִיּוֹת כִּמְעַט זֵהוֹת — קַל!", opens: "chumash",
    games: [
      { id: "w1-match", type: "match", title: "הַתְאָמָה: רָשִׁ״י ↔ מְרֻבָּע", emoji: "🔗", pool: "easy" },
      { id: "w1-id",    type: "identify", title: "מִי הָאוֹת?", emoji: "👁️", pool: "easy" },
      { id: "w1-hunt",  type: "arcade", title: "צַיָּד הָאוֹתִיּוֹת", emoji: "🕹️", pool: "easy" }
    ] },

  { id: "w2", title: "הַדּוֹמוֹת", emoji: "🟡", hue: 40,
    sub: "זוּגוֹת מִתְבַּלְבְּלִים — לוֹמְדִים זוֹ מוּל זוֹ", opens: "avot",
    games: [
      { id: "w2-contrast", type: "contrast", title: "מְצָא אֶת הַהֶבְדֵּל", emoji: "🔎" },
      { id: "w2-id",       type: "identify", title: "זִהוּי מָהִיר", emoji: "⚡", pool: "similar" }
    ] },

  { id: "w3", title: "הַבּוֹס: הַקָּשׁוֹת", emoji: "🔴", hue: 355,
    sub: "7 הָאוֹתִיּוֹת הַקָּשׁוֹת + ס/ם שֶׁהִתְחַלְּפוּ", opens: "mikraot",
    games: [
      { id: "w3-swap",     type: "swap", title: "הָאוֹת הַמִּתְחַלֶּפֶת (ם/ס)", emoji: "🔀" },
      { id: "w3-id",       type: "identify", title: "הַקָּשׁוֹת", emoji: "🎯", pool: "hard" },
      { id: "w3-contrast", type: "contrast", title: "נִגּוּד הַבּוֹס", emoji: "🥊", boss: true }
    ] },

  { id: "w4", title: "מִלִּים", emoji: "🔵", hue: 210,
    sub: "מְחַבְּרִים אוֹתִיּוֹת לְמִלִּים שְׁלֵמוֹת", opens: "ein-yaakov",
    games: [
      { id: "w4-read1", type: "readword", title: "מַהִי הַמִּלָּה?", emoji: "📖", lvl: [1, 2] },
      { id: "w4-fill",  type: "fill", title: "הַשְׁלֵם אֶת הָאוֹת", emoji: "🧩", lvl: [1, 2] },
      { id: "w4-read2", type: "readword", title: "מִלִּים גְּדוֹלוֹת", emoji: "📚", lvl: [3, 4] }
    ] },

  { id: "w5", title: "מִשְׁפָּטִים וְרַשִׁ״י", emoji: "🟣", hue: 275,
    sub: "קוֹרְאִים קֶטַע רָשִׁ״י אֲמִתִּי — עִם רְמָזִים", opens: "mishna-brura",
    games: [
      { id: "w5-read", type: "readpassage", title: "רָשִׁ״י עַל הַתּוֹרָה", emoji: "📜", lvl: 5 }
    ] },

  { id: "w6", title: "שֶׁטֶף", emoji: "🟠", hue: 25,
    sub: "קְרִיאָה שׁוֹטֶפֶת — בְּלִי רְמָזִים", opens: "gemara",
    games: [
      { id: "w6-read", type: "readpassage", title: "קֶטַע מָלֵא", emoji: "🦅", lvl: 6 },
      { id: "w6-daily", type: "readpassage", title: "אֶתְגָּר הַשֶּׁטֶף", emoji: "🏁", lvl: 6, hint: false }
    ] }
];
window.worldById = (id) => window.WORLDS.find(w => w.id === id);
