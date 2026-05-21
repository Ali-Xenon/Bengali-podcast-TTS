export interface SpeakerOption {
  value: string;
  name: string;
  emoji: string;
  accent: string;
}

export const XENON_VOICES: SpeakerOption[] = [
  { value: "Fenrir", name: "Fenrir — Excitable ⚡", emoji: "⚡", accent: "Male • High Energy" },
  { value: "Puck", name: "Puck — Upbeat 🎭", emoji: "🎭", accent: "Male • Playful" },
  { value: "Charon", name: "Charon — Informative 📢", emoji: "📢", accent: "Male • Clear" },
  { value: "Zephyr", name: "Zephyr — Bright ☀️", emoji: "☀️", accent: "Male • Dynamic" },
  { value: "Kore", name: "Kore — Firm 💪", emoji: "💪", accent: "Male • Authoritative" },
];

export const SILICA_VOICES: SpeakerOption[] = [
  { value: "Aoede", name: "Aoede — Breezy 🌸", emoji: "🌸", accent: "Female • Cheerful" },
  { value: "Leda", name: "Leda — Youthful ✨", emoji: "✨", accent: "Female • Lively" },
  { value: "Zephyr", name: "Zephyr — Bright ☀️", emoji: "☀️", accent: "Female • Energetic" },
  { value: "Kore", name: "Kore — Firm 💪", emoji: "💪", accent: "Female • Steady" },
  { value: "Puck", name: "Puck — Upbeat 🎭", emoji: "🎭", accent: "Female • Expressive" },
];

export interface ScriptTemplate {
  id: string;
  title: string;
  emoji: string;
  description: string;
  script: string;
}

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: "gossip",
    title: "ভাইরাল ট্রেন্ড টক (Viral Gossip)",
    emoji: "🔥",
    description: "A fast-paced YouTube Shorts discussion about a viral internet meme.",
    script: `Xenon: (laughing) আরে ভাই, আজকে ফেসবুক আর টিকটকে কী কান্ড চলছে দেখেছিস?
Silica: (giggling) অবশ্যই! সেই ভাইরাল চা-ওয়ালার গান তো? আমি তো হেসেই শেষ!
Xenon: (excited) হ্যাঁ হ্যাঁ! সে গান গেয়ে বলছে "চা খাও, রিলেশন বাঁচাও"! এটা এক্কেবারে আগুন গান!
Silica: (sassy) আর বলো না, সবাই এটা নিয়ে রিল বানাচ্ছে। ওভার-অ্যাক্টিংয়ের বন্যা বয়ে যাচ্ছে ভাই!
Xenon: (laughing) সত্যিই, আমাদের বাঙালি নেটিজেনরা কোনো সুযোগই হাতছাড়া করে না!`,
  },
  {
    id: "ghost",
    title: "ভুতুড়ে গল্প (Spooky Night Podcast)",
    emoji: "👻",
    description: "A chilling midnight mystery podcast preview between two friends.",
    script: `Xenon: (whispering) বুঝলি Silica, কাল রাত ঠিক বারোটায় আমার ঘরের লাইটটা হঠাৎ নিভে গেল...
Silica: (excited) ওরে বাবারে! তারপর? কোনো শব্দ পেলি নাকি?
Xenon: (surprised) হ্যাঁ! রান্নাঘর থেকে মনে হলো কেউ চুপিচুপি এসে দাঁড়াল আমার দরজার বাইরে...
Silica: (playful) আরে যা, তুই তো এমনিতেই রাতে ভয় পেয়ে ভূত দেখিস! কোনো বিড়াল ছিল হয়তো!
Xenon: (whispering) বিড়াল নয় রে! দরজার নিচ দিয়ে যে ছায়াটা দেখলাম... ওটা কোনো মানুষের ছিল না!`,
  },
  {
    id: "tech",
    title: "এআই বিপ্লব (AI Tech Discussion)",
    emoji: "🤖",
    description: "An exciting debate on whether AI is going to take over creative roles.",
    script: `Xenon: (energetic) এআই কিন্তু এবার আমাদের বাংলায় দুর্দান্ত পডকাস্ট বানাচ্ছে, খেয়াল করেছিস?
Silica: (sassy) হ্যাঁ, তবে মানুষের আবেগের সাথে কি আর এআই মেশিন তুলনা করতে পারে? কখনোই না!
Xenon: (excited) কেন পারবে না? দেখো, কত সুন্দর বাংলা উচ্চারণ আর হাসাহাসি করছে!
Silica: (playful) হুম, রোবোটিক মজা মন্দ নয়, তবে আসল মানুষের আড্ডার ফিলিংটাই তো আলাদা ভাই!
Xenon: (laughing) তা অবশ্য ঠিক বলেছিস! তবে এআই কিন্তু আমাদের বেশ ভালো ট্রাভেল পার্টনার হতে পারে!`,
  }
];

export const EMOTION_TAGS = [
  { tag: "laughing", label: "🤣 Laughing", speaker: "Xenon" },
  { tag: "excited", label: "⚡ Excited", speaker: "Xenon" },
  { tag: "whispering", label: "🤫 Whisper", speaker: "Xenon" },
  { tag: "surprised", label: "😲 Surprised", speaker: "Xenon" },
  { tag: "giggling", label: "🤭 Giggling", speaker: "Silica" },
  { tag: "sassy", label: "💁‍♀️ Sassy", speaker: "Silica" },
  { tag: "playful", label: "😜 Playful", speaker: "Silica" },
  { tag: "breezy", label: "🍃 Breezy", speaker: "Silica" },
];
