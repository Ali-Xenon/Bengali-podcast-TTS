import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Volume2,
  Play,
  Pause,
  Download,
  RotateCw,
  Users,
  Film,
  FileText,
  HelpCircle,
  Clock,
  ChevronRight,
  Smile,
  CheckCircle2,
  X,
  AlertTriangle,
  Flame,
  Bot
} from "lucide-react";

import {
  XENON_VOICES,
  SILICA_VOICES,
  SCRIPT_TEMPLATES,
  EMOTION_TAGS,
  ScriptTemplate
} from "./data";

export default function App() {
  // Application State
  const [scriptText, setScriptText] = useState<string>(() => {
    const saved = localStorage.getItem("bengali_tts_script");
    return saved || SCRIPT_TEMPLATES[0].script;
  });
  const [xenonVoice, setXenonVoice] = useState<string>("Fenrir");
  const [silicaVoice, setSilicaVoice] = useState<string>("Aoede");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ size: string; turns: number } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-save script text
  useEffect(() => {
    localStorage.setItem("bengali_tts_script", scriptText);
  }, [scriptText]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Track simple audio playing state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  // Helper: insert text at text-cursor position
  const handleInsertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const textToInsert = `(${tag})`;

    const nextVal =
      currentVal.slice(0, start) + textToInsert + currentVal.slice(end);

    setScriptText(nextVal);
    textarea.focus();

    // Reset selection position shortly after
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 50);
  };

  // Helper: Load template script
  const handleLoadTemplate = (template: ScriptTemplate) => {
    setScriptText(template.script);
  };

  // Validate and count parsed speaker lines
  const parsedTurns = scriptText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const xenonMatch = line.match(/^Xenon\s*:\s*(?:\(([^)]+)\))?\s*(.+)/i);
      const silicaMatch = line.match(/^Silica\s*:\s*(?:\(([^)]+)\))?\s*(.+)/i);
      if (xenonMatch) {
        return { speaker: "Xenon", emotion: xenonMatch[1] || null, text: xenonMatch[2].trim() };
      }
      if (silicaMatch) {
        return { speaker: "Silica", emotion: silicaMatch[1] || null, text: silicaMatch[2].trim() };
      }
      return null;
    });

  const validTurns = parsedTurns.filter((turn) => turn !== null);
  const totalTurnsCount = validTurns.length;

  // Emotion Mapping configuration for native tags
  const emotionTagMap: Record<string, string> = {
    laughing: "[laughs]",
    laughs: "[laughs]",
    giggling: "[giggles]",
    giggles: "[giggles]",
    excited: "[excitedly]",
    excitedly: "[excitedly]",
    surprised: "[surprised]",
    sassy: "[sassily]",
    sassily: "[sassily]",
    playful: "[playfully]",
    playfully: "[playfully]",
    energetic: "[energetically]",
    whisper: "[whispers]",
    whispering: "[whispers]",
    happy: "[happily]",
    sad: "[sadly]",
    angry: "[angrily]",
    breezy: "[breezily]",
    upbeat: "[upbeat]",
  };

  // Process and convert audio PCM to standard WAV container
  const pcmToWav = (pcmData: Uint8Array, channels: number, sampleRate: number, bitDepth: number) => {
    const byteRate = sampleRate * channels * (bitDepth / 8);
    const blockAlign = channels * (bitDepth / 8);
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM Format ID
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    // Copy actual audio data
    new Uint8Array(buffer).set(pcmData, 44);
    return new Uint8Array(buffer);
  };

  // Trigger Gemini TTS API server request
  const handleGenerateAudio = async () => {
    if (validTurns.length === 0) {
      setErrorMsg("Error: Please write at least one valid line containing Xenon: or Silica:");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessInfo(null);
    setIsPlaying(false);

    // Reset current audio player if active
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setAudioBlob(null);
    }

    const steps = [
      "Analyzing podcast script and parsing characters...",
      "Connecting to Google Gemini 3.1 TTS Engine...",
      "Generating ultra-expressive multi-speaker speech...",
      "Assembling natural conversational wave assets...",
      "Synthesizing dynamic emotion-grounded wave data...",
    ];

    let currentStepIdx = 0;
    setLoadingStep(steps[0]);

    const stepInterval = setInterval(() => {
      if (currentStepIdx < steps.length - 1) {
        currentStepIdx++;
        setLoadingStep(steps[currentStepIdx]);
      }
    }, 1800);

    try {
      // Assemble structured script for Gemini multi-speaker prompt with inline formatting
      const multiSpeakerPrompt = validTurns
        .map((t) => {
          if (!t) return "";
          let lineText = t.text;
          if (t.emotion) {
            const cleanEmotion = t.emotion.toLowerCase().trim();
            const tag = emotionTagMap[cleanEmotion] || `[${cleanEmotion}]`;
            lineText = `${tag} ${lineText}`;
          }
          return `${t.speaker}: ${lineText}`;
        })
        .join("\n");

      // Assemble configurations payload
      const speakerConfigs = [
        { speaker: "Xenon", voiceName: xenonVoice },
        { speaker: "Silica", voiceName: silicaVoice },
      ];

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textPrompt: multiSpeakerPrompt,
          speakerConfigs,
        }),
      });

      const resJson = await response.json();

      if (!response.ok) {
        throw new Error(resJson.error || "Failed to make Gemini TTS API generation call.");
      }

      const { audioBase64 } = resJson;

      if (!audioBase64) {
        throw new Error("No video/audio response was received from the server endpoint.");
      }

      // Convert raw PCM bytes base64 back into an audio Blob wrapped in WAV container.
      // Gemini 3.1 Flash Speech generates raw mono PCM audio at a 24k sample-rate.
      const pcmBinary = atob(audioBase64);
      const pcmBytes = new Uint8Array(pcmBinary.length);
      for (let i = 0; i < pcmBinary.length; i++) {
        pcmBytes[i] = pcmBinary.charCodeAt(i);
      }

      const wavBytes = pcmToWav(pcmBytes, 1, 24000, 16);
      const outputBlob = new Blob([wavBytes], { type: "audio/wav" });
      const outputUrl = URL.createObjectURL(outputBlob);

      // Pre-set successful info statistics
      const fileSizeKB = (outputBlob.size / 1024).toFixed(1);

      setAudioBlob(outputBlob);
      setAudioUrl(outputUrl);
      setSuccessInfo({
        size: `${fileSizeKB} KB`,
        turns: validTurns.length,
      });

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during synthesis.");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
      setLoadingStep("");
    }
  };

  // Utility to format size
  const handleTogglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((e) => console.error("Error playing audio assets:", e));
    }
  };

  // Download logic helper
  const handleDownloadWav = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `bengali_podcast_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-neutral-950 font-sans text-neutral-100 flex flex-col justify-between selection:bg-purple-500 selection:text-white pb-12">
      {/* Dynamic ambient backgrounds */}
      <div className="absolute inset-x-0 top-0 -z-10 h-96 overflow-hidden">
        <div className="absolute left-[10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
        <div className="absolute right-[10%] top-[-5%] h-[400px] w-[400px] rounded-full bg-rose-900/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 pt-8">
        {/* HEADER SECTION */}
        <header className="mb-8 text-center pb-6 border-b border-neutral-800/60">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-950/40 border border-purple-800/40 rounded-full text-xs text-purple-300 font-mono mb-4">
            <Bot size={13} className="animate-pulse" />
            <span>GEMINI MULTI-SPEAKER SPEECH STUDIO</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2 py-1 bg-gradient-to-r from-purple-400 via-pink-400 to-rose-300 bg-clip-text text-transparent">
            Bengali Podcast TTS Studio
          </h1>

          <p className="text-sm md:text-base text-neutral-400 max-w-xl mx-auto font-medium">
            বাংলা পডকাস্ট ভয়েস জেনারেটর — Convert dialogue transcripts into natural, multi-voice podcasts with genuine emotional expression.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-4 text-[11px] font-mono text-neutral-500 justify-items-center">
            <span className="px-2 py-0.5 bg-neutral-900 rounded border border-neutral-800">
              ⚡ Gemini 3.1 Flash Speech
            </span>
            <span className="px-2 py-0.5 bg-neutral-900 rounded border border-neutral-800">
              🎙️ Multi-Speaker Audio (2 voices)
            </span>
            <span className="px-2 py-0.5 bg-neutral-900 rounded border border-neutral-800">
              🗣️ Inline Emotions
            </span>
            <span className="px-2 py-0.5 bg-neutral-900 rounded border border-neutral-800">
              💾 WAV Format Output
            </span>
          </div>
        </header>

        {/* WORKSPACE CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: SETTINGS & SPEAKER SELECTION */}
          <div className="col-span-1 lg:col-span-4 space-y-6">
            
            {/* INSTRUCTIONS PANEL */}
            <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-5 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold tracking-widest text-neutral-400 uppercase flex items-center gap-2 font-mono">
                <Smile size={14} className="text-yellow-400" />
                <span>DIRECTOR'S BRIEF</span>
              </h2>
              
              <div className="text-xs text-neutral-300 space-y-2.5 leading-relaxed">
                <p>
                  Create highly energetic dialogues styled after modern viral 
                  <strong> GenZ YouTubers</strong> or <strong>vlog video shorts</strong>!
                </p>
                <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-neutral-400 space-y-1">
                  <div className="text-neutral-300 font-semibold mb-1">💡 Formatting rules:</div>
                  <div>• <span className="text-purple-400">Xenon:</span> lines start with <span className="text-purple-300">Xenon:</span></div>
                  <div>• <span className="text-pink-400">Silica:</span> lines start with <span className="text-pink-300">Silica:</span></div>
                  <div>• Add emotions via <span className="text-neutral-250 font-bold">(excited)</span> or <span className="text-neutral-250 font-bold">(sassy)</span> trigger tags inline!</div>
                </div>
              </div>
            </div>

            {/* SPEAKERS DEFINITIONS */}
            <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-5 space-y-5 shadow-xl">
              <h2 className="text-sm font-bold tracking-widest text-neutral-400 uppercase flex items-center gap-2 font-mono">
                <Users size={14} className="text-purple-400" />
                <span>SPEAKERS CONFIGURATION</span>
              </h2>

              {/* CARD: SPEAKER XENON */}
              <div className="bg-neutral-950/70 border border-purple-900/30 rounded-xl p-4 relative overflow-hidden transition hover:border-purple-800/50">
                <div className="absolute top-0 right-0 p-1.5 bg-purple-500/10 text-purple-400 text-[10px] font-mono rounded-bl-lg font-bold">
                  SPEAKER A
                </div>
                
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-purple-950 border border-purple-500/40 flex items-center justify-center text-lg shadow-inner">
                    🧔
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-purple-300">Xenon</h3>
                    <p className="text-[11px] text-neutral-500">Male • Dynamic & Energetic</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Voice Config Profile</label>
                  <select
                    value={xenonVoice}
                    onChange={(e) => setXenonVoice(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-purple-500 transition cursor-pointer"
                  >
                    {XENON_VOICES.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.emoji} {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CARD: SPEAKER SILICA */}
              <div className="bg-neutral-950/70 border border-pink-900/30 rounded-xl p-4 relative overflow-hidden transition hover:border-pink-800/50">
                <div className="absolute top-0 right-0 p-1.5 bg-pink-500/10 text-pink-400 text-[10px] font-mono rounded-bl-lg font-bold">
                  SPEAKER B
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-pink-950 border border-pink-500/40 flex items-center justify-center text-lg shadow-inner">
                    👩
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-pink-300">Silica</h3>
                    <p className="text-[11px] text-neutral-500">Female • Playful & Giggly</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Voice Config Profile</label>
                  <select
                    value={silicaVoice}
                    onChange={(e) => setSilicaVoice(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-pink-500 transition cursor-pointer"
                  >
                    {SILICA_VOICES.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.emoji} {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT: TRANSCRIPT dialogue & FLOW CONTROL */}
          <div className="col-span-1 lg:col-span-8 space-y-6">
            
            {/* PRE- MADE TRANSCRIPTS SCHEMES */}
            <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-5 space-y-3 shadow-xl">
              <h2 className="text-sm font-bold tracking-widest text-neutral-400 uppercase flex items-center gap-2 font-mono">
                <Film size={14} className="text-rose-400" />
                <span>LOAD PODCAST SCRIPT TEMPLATE</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SCRIPT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleLoadTemplate(tmpl)}
                    className="flex flex-col text-left p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 hover:border-rose-500/50 hover:bg-neutral-900/50 transition duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{tmpl.emoji}</span>
                      <span className="text-xs font-bold text-white tracking-tight shrink-0">
                        {tmpl.title.split(" (")[0]}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 leading-snug line-clamp-2">
                      {tmpl.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* DIALOGUE EDITOR */}
            <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-400" />
                  <span className="text-sm font-bold tracking-wider uppercase font-mono text-neutral-300">
                    SCRIPT WORKSPACE
                  </span>
                </div>
                <div className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-full border border-neutral-800/80">
                  <span className="font-bold text-neutral-200">{totalTurnsCount}</span> dialogue turns detected
                </div>
              </div>

              {/* EDITOR DESK */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Xenon: (laughing) আরে ভাই, আজকে কী নিয়ে কথা বলবো? ..."
                  rows={8}
                  className="w-full bg-neutral-950 text-neutral-200 p-4 border border-neutral-800 rounded-xl text-sm font-medium leading-relaxed font-sans focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/40 outline-none transition"
                  style={{ minHeight: "220px" }}
                />

                {/* Validation indicators */}
                {totalTurnsCount > 0 && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-1 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Validated Syntax</span>
                  </div>
                )}
              </div>

              {/* EMOTIVE INJECTORS ACCENTS */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono tracking-wider font-bold text-neutral-400 uppercase block">
                  Click to insert expressive inline tags at cursor:
                </span>
                
                <div className="flex flex-wrap gap-1.5">
                  {EMOTION_TAGS.map((emo) => {
                    const isXenon = emo.speaker === "Xenon";
                    return (
                      <button
                        key={emo.tag}
                        onClick={() => handleInsertTag(emo.tag)}
                        className={`text-[10px] font-mono py-1 px-2.5 rounded-full transition duration-150 cursor-pointer border ${
                          isXenon
                            ? "bg-purple-950/30 border-purple-800/50 hover:bg-purple-950/60 hover:border-purple-400 text-purple-300"
                            : "bg-pink-950/30 border-pink-800/50 hover:bg-pink-950/60 hover:border-pink-400 text-pink-300"
                        }`}
                        title={`Insert (${emo.tag}) tag`}
                      >
                        {emo.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PRIMARY ACTION: GENERATOR AND SYNTHESIZER BUILDER */}
              <div className="pt-2 border-t border-neutral-800/60">
                <button
                  onClick={handleGenerateAudio}
                  disabled={loading || totalTurnsCount === 0}
                  className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 hover:opacity-95 text-neutral-950 py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none disabled:transform-none select-none shadow-lg shadow-purple-950/40 cursor-pointer"
                >
                  <Sparkles size={18} className="animate-spin duration-1000" />
                  <span className="font-extrabold tracking-wide uppercase text-sm">
                    {loading ? "Synthesizing AI Podcast..." : "Generate Bengali Podcast Audio"}
                  </span>
                </button>
              </div>

              {/* LOADING OVERLAY BANNER */}
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-4 flex items-center gap-4 shadow-inner"
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin shrink-0" />
                    <div className="space-y-1">
                      <div className="text-xs font-mono font-bold tracking-wider text-purple-400 uppercase">
                        POLISHING WAVEFORM SPEECH
                      </div>
                      <p className="text-xs text-neutral-300 font-mono transition-all">
                        {loadingStep}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ERROR STATE */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-xl flex gap-3 text-rose-200 text-xs text-left"
                  >
                    <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-1">Synthesis Failure</span>
                      <p className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{errorMsg}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* GENERATED AUDIO CONTROL CENTER */}
              <AnimatePresence>
                {audioUrl && successInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-purple-950/20 border border-purple-500/40 rounded-xl p-5 space-y-4 shadow-xl"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-900/30 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400 animate-bounce" />
                        <span className="text-xs font-bold font-mono text-purple-200">
                          PODCAST AUDIO RENDERED SUCCESSFULLY
                        </span>
                      </div>
                      
                      <div className="flex gap-2 text-[10px] font-mono text-neutral-400">
                        <span className="px-2 py-0.5 bg-neutral-950/80 rounded border border-neutral-800 text-purple-300">
                          {successInfo.turns} Speaker lines
                        </span>
                        <span className="px-2 py-0.5 bg-neutral-950/80 rounded border border-neutral-800 text-purple-300">
                          {successInfo.size} Mono Wave
                        </span>
                      </div>
                    </div>

                    {/* PLAYER CONTROL HUB */}
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                      {/* Play/Pause Button */}
                      <button
                        onClick={handleTogglePlayPause}
                        className="w-12 h-12 rounded-full bg-purple-500 hover:bg-purple-400 text-neutral-950 flex items-center justify-center transition select-none shadow shrink-0 cursor-pointer"
                      >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
                      </button>

                      <div className="w-full flex flex-col gap-1.5">
                        <span className="text-[10px] font-mono tracking-wider font-bold text-neutral-400 uppercase">
                          STUDIO GENERATED AUDIO WAVE WAV (24KHZ MONO)
                        </span>
                        
                        {/* Audio component element */}
                        <audio
                          ref={audioRef}
                          src={audioUrl}
                          controls
                          className="w-full h-8 custom-audio-player"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleDownloadWav}
                        className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition select-none cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Download WAV File</span>
                      </button>

                      <button
                        onClick={handleGenerateAudio}
                        className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition select-none cursor-pointer"
                      >
                        <RotateCw size={14} />
                        <span>Re-synthesize</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

          </div>

        </div>

        {/* STATS INFRASTRUCTURE NOTES MARGINS */}
        <section className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-neutral-900/40 border border-neutral-900 rounded-2xl">
          <div>
            <h3 className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase mb-2 flex items-center gap-1.5">
              <Sparkles size={11} className="text-purple-400" />
              <span>NATIVE EMOTION TAGGING GUIDE</span>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed mb-3">
              We convert custom reader emotion brackets into Gemini Speech Config's native inline instructions. For example, writing <code className="text-[11px] font-mono text-purple-300 bg-neutral-950 px-1 py-0.5 rounded">Xenon: (laughing) ...</code> outputs the text preceded by the <code className="text-[11px] font-mono text-pink-300 bg-neutral-950 px-1 py-0.5 rounded">[laughs]</code> markup trigger for realistic giggles, laughter, and high energy.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase mb-2 flex items-center gap-1.5">
              <Bot size={11} className="text-pink-400" />
              <span>GEMINI 3.1 FLASH TTS PREVIEW</span>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Gemini 3.1 Flash Speech is built specifically for low-latency conversations, fully capable of outputting native speech with natural pauses, multi-voice setups, and lifelike emotions. No API keys are leaked to client devices as the server handles the requests using private backend environment configs securely.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
