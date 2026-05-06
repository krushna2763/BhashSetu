import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  UploadCloud,
  Volume2,
  Square,
  Trash2,
  History,
  Languages,
  ImagePlus,
  X,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import SimpleSelect from "../components/ui/SimpleSelect";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

const LANGUAGES = [
  { code: "hi", name: "Hindi (हिन्दी)", speech: "hi-IN" },
  { code: "mr", name: "Marathi (मराठी)", speech: "mr-IN" },
  { code: "ta", name: "Tamil (தமிழ்)", speech: "ta-IN" },
  { code: "te", name: "Telugu (తెలుగు)", speech: "te-IN" },
  { code: "es", name: "Spanish (Español)", speech: "es-ES" },
  { code: "fr", name: "French (Français)", speech: "fr-FR" },
];

function getSessionId() {
  let sid = localStorage.getItem("bhasha_session_id");
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("bhasha_session_id", sid);
  }
  return sid;
}

const PRIMARY_BTN =
  "bg-[#1a3a6b] text-white hover:bg-[#132a4d] disabled:opacity-50 disabled:cursor-not-allowed rounded-full min-h-[64px] px-8 py-4 text-xl sm:text-2xl font-bold transition-colors w-full shadow-md focus:outline-none focus:ring-4 focus:ring-[#1a3a6b]/30";

const VOICE_BTN =
  "bg-white border-2 border-[#1a3a6b] text-[#1a3a6b] hover:bg-[#fdf8f0] rounded-full min-h-[56px] px-7 py-2 text-lg sm:text-xl font-semibold inline-flex items-center gap-3 justify-center transition-colors";

const VOICE_STOP_BTN =
  "bg-white border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-full min-h-[56px] px-7 py-2 text-lg sm:text-xl font-semibold inline-flex items-center gap-3 justify-center transition-colors";

export default function BhashaSetu() {
  const sessionId = useMemo(() => getSessionId(), []);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [targetLang, setTargetLang] = useState("hi");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);
  const utteranceRef = useRef(null);

  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get(`${API}/history`, {
        headers: { "x-session-id": sessionId },
      });
      setHistory(data || []);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn("history fetch failed", e);
      }
    }
  };

  useEffect(() => {
    fetchHistory();
    return () => {
      if (speechSupported) window.speechSynthesis.cancel();
    };
  }, [speechSupported]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onFileSelected = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("कृपया एक image file चुनें। (Please choose an image file.)");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error(
        "फाइल बहुत बड़ी है (10MB से कम होनी चाहिए)। File too large (must be under 10MB).",
      );
      return;
    }
    setFile(f);
    setOriginalText("");
    setTranslatedText("");
    
    // Mobile feedback
    if (window.innerWidth < 640) {
      toast.success("फोटो अपलोड हो गई! (Photo uploaded!)");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    onFileSelected(f);
  };

  const onProcess = async () => {
    if (!file) {
      toast.error("कृपया पहले एक फोटो अपलोड करें। (Please upload an image first.)");
      return;
    }
    setIsProcessing(true);
    setOriginalText("");
    setTranslatedText("");
    setLoadingMsg("Reading image...");

    const fd = new FormData();
    fd.append("image", file);
    fd.append("targetLanguage", targetLang);

    const switchTimer = setTimeout(() => setLoadingMsg("Translating..."), 1800);

    try {
      const { data } = await axios.post(`${API}/process`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-session-id": sessionId,
        },
        timeout: 120000,
      });
      clearTimeout(switchTimer);
      setLoadingMsg("Done");
      setOriginalText(data.originalText || "");
      setTranslatedText(data.translatedText || "");
      toast.success("तैयार है! (Done)");
      fetchHistory();
      setTimeout(() => setLoadingMsg(""), 1200);
    } catch (err) {
      clearTimeout(switchTimer);
      setLoadingMsg("");
      const apiErr = err?.response?.data?.error;
      const status = err?.response?.status;
      if (status === 400) {
        toast.error(
          apiErr || "कृपया एक फोटो अपलोड करें। (Please upload an image.)",
        );
      } else if (status === 413) {
        toast.error(
          "फाइल बहुत बड़ी है (10MB से कम होनी चाहिए)। File too large (must be under 10MB).",
        );
      } else if (status === 422) {
        toast.error(
          apiErr ||
            "टेक्स्ट नहीं मिला। कृपया साफ फोटो लें। (Could not read text. Please try a clearer image.)",
        );
      } else if (status === 502) {
        toast.error("Translation unavailable. Please try again.");
      } else {
        toast.error(
          apiErr ||
            "कुछ गलत हुआ। कृपया फिर से प्रयास करें। (Something went wrong. Please try again.)",
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const speak = (text) => {
    if (!speechSupported) {
      toast.error("Voice not available on this device.");
      return;
    }
    if (!text) return;
    window.speechSynthesis.cancel();
    const lang = LANGUAGES.find((l) => l.code === targetLang)?.speech || "hi-IN";
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = 0.95;
    utt.pitch = 1;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => {
      setIsSpeaking(false);
      toast.error("Voice not available on this device.");
    };
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
  };

  const stopSpeak = () => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const onClear = () => {
    setFile(null);
    setPreviewUrl("");
    setOriginalText("");
    setTranslatedText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    stopSpeak();
  };

  const onClearHistory = async () => {
    try {
      await axios.delete(`${API}/history`, {
        headers: { "x-session-id": sessionId },
      });
      setHistory([]);
      toast.success("इतिहास साफ कर दिया गया। (History cleared.)");
    } catch (e) {
      toast.error("History clear नहीं हो सका।");
    }
  };

  const loadFromHistory = (item) => {
    setOriginalText(item.originalText);
    setTranslatedText(item.translatedText);
    setTargetLang(item.targetLanguage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#fdf8f0]" data-testid="bhasha-setu-app">
      <header
        className="relative overflow-hidden border-b-4 border-[#f5a623]"
        data-testid="app-header"
      >
        <div className="bhasha-mandala-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-5xl px-6 py-10 text-center sm:py-14">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-[#f5a623]/40 bg-white/70 px-5 py-1.5 backdrop-blur-sm">
            <Languages className="h-4 w-4 text-[#1a3a6b]" strokeWidth={2.5} />
            <span className="text-sm font-semibold tracking-wide text-[#1a3a6b]">
              Photo से Translation
            </span>
          </div>
          <h1
            className="font-brand text-5xl leading-tight text-[#1a3a6b] sm:text-6xl md:text-7xl"
            data-testid="app-title"
          >
            भाषा सेतु
          </h1>
          <p className="mt-3 text-lg font-medium text-[#1a3a6b]/80 sm:text-xl">
            Bhasha Setu
          </p>
          <p
            className="mx-auto mt-4 max-w-2xl text-lg text-gray-700 sm:text-xl"
            data-testid="app-tagline"
          >
            English text को अपनी भाषा में समझें
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#1a3a6b] sm:text-3xl">
            <span className="mr-3 inline-block h-9 w-9 rounded-full bg-[#f5a623] text-center font-bold leading-9 text-[#1a3a6b]">
              1
            </span>
            फोटो अपलोड करें
          </h2>

          {!previewUrl ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onTouchStart={(e) => e.preventDefault()}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-4 border-dashed border-[#1a3a6b]/30 bg-white p-6 text-center transition-colors active:border-[#1a3a6b]/60 active:bg-[#fdf8f0] focus:outline-none focus:ring-4 focus:ring-[#1a3a6b]/20 sm:p-16 sm:gap-5"
                data-testid="image-upload-zone"
                aria-label="Upload an image"
              >
                <div className="rounded-full bg-[#1a3a6b]/5 p-4 sm:p-6">
                  <UploadCloud
                    className="h-12 w-12 text-[#1a3a6b] sm:h-20 sm:w-20"
                    strokeWidth={2.2}
                  />
                </div>
                <div className="px-2">
                  <p className="text-lg font-bold text-[#1a3a6b] sm:text-3xl">
                    यहाँ click करें या photo drop करें
                  </p>
                  <p className="mt-2 text-sm text-gray-600 sm:text-lg">
                    JPG, PNG, WEBP — 10MB तक
                  </p>
                </div>
              </button>
              
              {/* Mobile camera button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="sm:hidden flex w-full items-center justify-center gap-3 rounded-full bg-[#1a3a6b] px-6 py-4 text-lg font-semibold text-white shadow-lg transition-colors active:bg-[#132a4d]"
                aria-label="Take photo with camera"
              >
                <Camera className="h-5 w-5" strokeWidth={2.5} />
                कैमरा से फोटो लें
              </button>
            </div>
          ) : (
            <div
              className="rounded-3xl border-2 border-[#1a3a6b]/15 bg-white p-4 shadow-sm sm:p-6"
              data-testid="image-preview-container"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-lg font-semibold text-[#1a3a6b]">
                  <ImagePlus className="h-5 w-5" strokeWidth={2.5} />
                  आपकी फोटो
                </p>
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex items-center gap-1.5 text-base font-semibold text-gray-600 hover:text-red-600"
                  data-testid="clear-image-btn"
                >
                  <X className="h-5 w-5" strokeWidth={2.5} />
                  हटाएं
                </button>
              </div>
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[420px] w-full rounded-2xl bg-[#fdf8f0] object-contain"
                data-testid="image-preview"
              />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            data-testid="image-file-input"
            onChange={(e) => onFileSelected(e.target.files?.[0])}
          />
        </section>

        <section className="space-y-5">
          <h2 className="text-2xl font-semibold text-[#1a3a6b] sm:text-3xl">
            <span className="mr-3 inline-block h-9 w-9 rounded-full bg-[#f5a623] text-center font-bold leading-9 text-[#1a3a6b]">
              2
            </span>
            भाषा चुनें
          </h2>
          <SimpleSelect
            value={targetLang}
            onValueChange={setTargetLang}
            options={LANGUAGES.map(l => ({ value: l.code, label: l.name }))}
            placeholder="Choose language"
            data-testid="language-selector"
          />
        </section>

        <section className="space-y-5">
          <h2 className="text-2xl font-semibold text-[#1a3a6b] sm:text-3xl">
            <span className="mr-3 inline-block h-9 w-9 rounded-full bg-[#f5a623] text-center font-bold leading-9 text-[#1a3a6b]">
              3
            </span>
            Translate करें
          </h2>
          <button
            type="button"
            onClick={onProcess}
            disabled={!file || isProcessing}
            className={PRIMARY_BTN}
            data-testid="extract-translate-btn"
          >
            {isProcessing ? (
              <span
                className="bhasha-pulse inline-flex items-center gap-3"
                data-testid="loading-message"
              >
                {loadingMsg || "Working..."}
              </span>
            ) : (
              "Extract & Translate"
            )}
          </button>
          {isProcessing && (
            <p className="text-center text-base text-gray-600">
              कृपया प्रतीक्षा करें... यह 30-60 सेकंड ले सकता है।
            </p>
          )}
        </section>

        {(originalText || translatedText) && (
          <section
            className="grid gap-6 md:grid-cols-2"
            data-testid="results-section"
          >
            <div className="min-h-[260px] rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 className="text-lg font-bold text-[#1a3a6b] sm:text-xl">
                  Original Text (English)
                </h3>
              </div>
              <p
                className="whitespace-pre-wrap leading-relaxed text-gray-900"
                style={{ fontSize: "20px" }}
                data-testid="original-text-output"
              >
                {originalText || "—"}
              </p>
            </div>

            <div className="min-h-[260px] rounded-2xl border-2 border-[#1a3a6b]/30 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 className="text-lg font-bold text-[#1a3a6b] sm:text-xl">
                  Translated Text (
                  {LANGUAGES.find((l) => l.code === targetLang)?.name})
                </h3>
              </div>
              <p
                className="mb-6 whitespace-pre-wrap leading-relaxed text-gray-900"
                style={{ fontSize: "20px" }}
                data-testid="translated-text-output"
              >
                {translatedText || "—"}
              </p>
              {translatedText && (
                <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row">
                  {!isSpeaking ? (
                    <button
                      type="button"
                      onClick={() => speak(translatedText)}
                      className={VOICE_BTN}
                      data-testid="listen-audio-btn"
                    >
                      <Volume2 className="h-6 w-6" strokeWidth={2.5} />
                      सुनें (Listen)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopSpeak}
                      className={VOICE_STOP_BTN}
                      data-testid="stop-audio-btn"
                    >
                      <Square
                        className="h-6 w-6 fill-current"
                        strokeWidth={2.5}
                      />
                      रोकें (Stop)
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-3 text-2xl font-semibold text-[#1a3a6b] sm:text-3xl">
              <History className="h-7 w-7" strokeWidth={2.5} />
              पिछले अनुवाद ({history.length})
            </h2>
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-2 rounded-full border-2 border-red-200 px-5 py-2.5 text-base font-semibold text-red-600 hover:bg-red-50"
                data-testid="clear-history-btn"
              >
                <Trash2 className="h-5 w-5" strokeWidth={2.5} />
                इतिहास साफ करें
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p
              className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-600"
              data-testid="history-empty"
            >
              अभी तक कोई अनुवाद नहीं। ऊपर एक फोटो अपलोड करके शुरू करें।
            </p>
          ) : (
            <ul className="space-y-3" data-testid="history-list">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-[#1a3a6b]/40"
                  onClick={() => loadFromHistory(item)}
                  data-testid={`history-item-${item.id}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-[200px] flex-1">
                      <p className="mb-1 text-sm text-gray-500">
                        {new Date(item.createdAt).toLocaleString()} ·{" "}
                        {item.targetLanguageName}
                      </p>
                      <p
                        className="line-clamp-2 text-gray-700"
                        style={{ fontSize: "16px" }}
                      >
                        EN: {item.originalText}
                      </p>
                      <p
                        className="mt-1 line-clamp-2 font-medium text-[#1a3a6b]"
                        style={{ fontSize: "17px" }}
                      >
                        {item.translatedText}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="mt-10 border-t border-[#f5a623]/30 bg-white/60">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center text-sm text-gray-600">
          भाषा सेतु · OCR + Translation · MERN
        </div>
      </footer>
    </div>
  );
}
