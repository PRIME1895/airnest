import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Globe,
  Info,
  MapPin,
  Mic,
  MicOff,
  Send,
  Volume2,
  Wrench,
} from 'lucide-react';
import { t } from '../../packages/shared/i18n/index';
import type { AqiSnapshot, Citation, UserProfile } from '../../packages/shared/schemas';

interface AssistantViewProps {
  profile: UserProfile;
  aqiSnapshot: AqiSnapshot;
}

interface UiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  toolCallsExecuted?: string[];
  citations?: Citation[];
  safetyEscalation?: boolean;
}

const QUICK_PROMPTS = [
  'Why is AQI high right now and what is my best ₹0 step?',
  'How do I build a DIY Corsi-Rosenthal filter for my bedroom?',
  'What changes if 500 families in my city switch to metro/carpool?',
  'Find parks or indoor clean-air spaces near me',
];

function float32ToBase64Pcm16(samples: Float32Array): string {
  const buf = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Safely parses inline markdown tokens (**bold**, _italic_, *italic*, `code`) into
 * clean chatbot typography with zero raw asterisks/underscores and zero innerHTML.
 */
function renderInlineTokens(text: string, isUser: boolean): React.ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      nodes.push(
        <strong
          key={`b-${keyIdx++}`}
          className={
            isUser
              ? 'font-semibold text-white'
              : 'font-semibold text-[#0F261E] dark:text-[#F0FAF4]'
          }
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={`c-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded bg-[#E6F3EC] dark:bg-[#1E352B] font-mono-tabular text-[12.5px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (
      (token.startsWith('_') && token.endsWith('_')) ||
      (token.startsWith('*') && token.endsWith('*'))
    ) {
      nodes.push(
        <span
          key={`i-${keyIdx++}`}
          className={
            isUser
              ? 'opacity-90'
              : 'text-[#49635A] dark:text-[#A6C2B6] text-[13px]'
          }
        >
          {token.slice(1, -1)}
        </span>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

const FormattedChatMessage: React.FC<{ content: string; isUser: boolean }> = ({
  content,
  isUser,
}) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: Array<{ ordered: boolean; text: string }> = [];

  const flushList = (keySeed: number) => {
    if (listItems.length === 0) return;
    const isOrdered = listItems[0].ordered;
    const ListTag = isOrdered ? 'ol' : 'ul';
    blocks.push(
      <ListTag
        key={`list-${keySeed}`}
        className={`${
          isOrdered ? 'list-decimal' : 'list-disc'
        } pl-5 space-y-1.5 text-[14.5px] leading-relaxed`}
      >
        {listItems.map((item, idx) => (
          <li key={idx} className="pl-0.5">
            {renderInlineTokens(item.text, isUser)}
          </li>
        ))}
      </ListTag>
    );
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList(index);
      return;
    }

    const bulletMatch = trimmed.match(/^[-•*]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);

    if (bulletMatch) {
      listItems.push({ ordered: false, text: bulletMatch[1] });
      return;
    }
    if (orderedMatch) {
      listItems.push({ ordered: true, text: orderedMatch[1] });
      return;
    }

    flushList(index);

    const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      blocks.push(
        <p
          key={`h-${index}`}
          className={`text-[14.5px] font-semibold tracking-tight ${
            isUser ? 'text-white' : 'text-[#0F261E] dark:text-[#F0FAF4]'
          }`}
        >
          {renderInlineTokens(headingMatch[1], isUser)}
        </p>
      );
      return;
    }

    const isNoteLine =
      /^_?Note:/i.test(trimmed) || (trimmed.startsWith('_') && trimmed.endsWith('_'));
    if (isNoteLine && !isUser) {
      const cleaned = trimmed.replace(/^_+/, '').replace(/_+$/, '');
      blocks.push(
        <p
          key={`note-${index}`}
          className="text-[12.5px] leading-relaxed text-[#4F6B61] dark:text-[#9CB8AC] pt-2 mt-1 border-t border-[#DFECE4] dark:border-[#243B31]"
        >
          {renderInlineTokens(cleaned, false)}
        </p>
      );
      return;
    }

    blocks.push(
      <p key={`p-${index}`} className="text-[14.5px] leading-[1.65] font-normal">
        {renderInlineTokens(trimmed, isUser)}
      </p>
    );
  });

  flushList(lines.length);

  return <div className="space-y-2">{blocks}</div>;
};

export const AssistantView: React.FC<AssistantViewProps> = ({ profile, aqiSnapshot }) => {
  const [messages, setMessages] = useState<UiChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello ${profile.displayName}! I'm AirNest Assistant, grounded in live ${aqiSnapshot.city} AQI (${aqiSnapshot.aqi} · ${aqiSnapshot.band}) and verified CPCB/WHO/EPA guidance. Ask me what to do today, how your choices cut PM2.5 & CO2e, or test a zero-cost indoor hack.`,
      toolCallsExecuted: ['get_aqi'],
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [liveActive, setLiveActive] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string>('');
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopLiveVoice();
    };
  }, []);

  const stopLiveVoice = () => {
    try {
      wsRef.current?.close();
    } catch {
      // Ignore
    }
    wsRef.current = null;
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    playbackCtxRef.current?.close().catch(() => undefined);
    playbackCtxRef.current = null;
    setLiveActive(false);
    setLiveStatus('');
  };

  const startLiveVoice = async () => {
    if (liveActive) {
      stopLiveVoice();
      return;
    }
    try {
      setLiveStatus('Connecting to Gemini Live Voice...');
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${window.location.host}/api/live`);
      wsRef.current = ws;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const captureCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = captureCtx;
      const playCtx = new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = playCtx;
      nextPlayTimeRef.current = playCtx.currentTime;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'init',
            language: profile.language,
            city: aqiSnapshot.city,
            aqi: aqiSnapshot.aqi,
            eli10Mode: profile.eli10Mode,
            elderMode: profile.elderMode,
          })
        );
        setLiveActive(true);
        setLiveStatus('Listening — speak naturally about air quality or indoor protection.');

        const source = captureCtx.createMediaStreamSource(stream);
        const processor = captureCtx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (ev) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const pcm = ev.inputBuffer.getChannelData(0);
          ws.send(JSON.stringify({ type: 'audio', audio: float32ToBase64Pcm16(pcm) }));
        };
        source.connect(processor);
        processor.connect(captureCtx.destination);
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as {
            type?: string;
            audio?: string;
            text?: string;
            message?: string;
          };
          if (msg.type === 'outputTranscript' && msg.text) {
            setLiveTranscript((prev) => `${prev}${msg.text}`);
          } else if (msg.type === 'audio' && msg.audio && playbackCtxRef.current) {
            const raw = atob(msg.audio);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
            const pCtx = playbackCtxRef.current;
            const buffer = pCtx.createBuffer(1, float32.length, 24000);
            buffer.getChannelData(0).set(float32);
            const node = pCtx.createBufferSource();
            node.buffer = buffer;
            node.connect(pCtx.destination);
            const startAt = Math.max(pCtx.currentTime, nextPlayTimeRef.current);
            node.start(startAt);
            nextPlayTimeRef.current = startAt + buffer.duration;
          } else if (msg.type === 'error') {
            setLiveStatus(msg.message ?? 'Live Voice unavailable right now.');
            stopLiveVoice();
          }
        } catch {
          // Ignore malformed message
        }
      };

      ws.onclose = () => {
        setLiveActive(false);
      };
    } catch (err) {
      setLiveStatus(
        err instanceof Error
          ? `Microphone or Live Voice unavailable: ${err.message}`
          : 'Microphone unavailable'
      );
      stopLiveVoice();
    }
  };

  const handleSpeakMessage = async (msg: UiChatMessage) => {
    setSpeakingId(msg.id);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.content, language: profile.language }),
      });
      if (res.ok) {
        const data = (await res.json()) as { audioBase64: string; mimeType: string };
        const audio = new Audio(`data:${data.mimeType};base64,${data.audioBase64}`);
        audio.onended = () => setSpeakingId(null);
        await audio.play();
        return;
      }
    } catch {
      // Fallback to browser Web Speech API
    }
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(msg.content.replace(/[#*_`]/g, ''));
      utter.lang = profile.language === 'hi' ? 'hi-IN' : profile.language === 'ta' ? 'ta-IN' : 'en-IN';
      utter.onend = () => setSpeakingId(null);
      window.speechSynthesis.speak(utter);
    } else {
      setSpeakingId(null);
    }
  };

  const sendMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || streaming) return;

    const userMsg: UiChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const assistantId = `a-${Date.now() + 1}`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          profile,
          currentAqi: aqiSnapshot,
          useSearchGrounding,
          useMapsGrounding,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith('data:')) continue;
          const payload = JSON.parse(line.slice(5).trim()) as {
            type: 'delta' | 'done';
            text?: string;
            meta?: {
              reply: string;
              modelUsed: string;
              toolCallsExecuted: string[];
              citations: Citation[];
              safetyEscalation: boolean;
            };
          };
          if (payload.type === 'delta' && payload.text) {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + payload.text } : m))
            );
          } else if (payload.type === 'done' && payload.meta) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: payload.meta!.reply,
                      modelUsed: payload.meta!.modelUsed,
                      toolCallsExecuted: payload.meta!.toolCallsExecuted,
                      citations: payload.meta!.citations,
                      safetyEscalation: payload.meta!.safetyEscalation,
                    }
                  : m
              )
            );
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  'Could not reach the assistant right now. Offline tip (₹0): Keep windows closed during smog peaks and cross-ventilate during your cleanest afternoon window.',
              }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header + Grounding & Live Voice Controls */}
      <section className="airnest-sky-backdrop rounded-2xl border border-[#D8E8DF] dark:border-[#253F34] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#122620] dark:text-[#EDF7F2]">
            {t(profile.language, 'assistantTitle')}
          </h1>
          <p className="text-sm text-[#49635A] dark:text-[#A6C2B6] mt-0.5">
            {t(profile.language, 'assistantSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setUseSearchGrounding((v) => !v)}
            aria-pressed={useSearchGrounding}
            className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold border inline-flex items-center gap-1.5 ${
              useSearchGrounding
                ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                : 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2] border-[#D8E8DF] dark:border-[#253F34]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" aria-hidden="true" />
            Search Grounding
          </button>

          <button
            type="button"
            onClick={() => setUseMapsGrounding((v) => !v)}
            aria-pressed={useMapsGrounding}
            className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold border inline-flex items-center gap-1.5 ${
              useMapsGrounding
                ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                : 'bg-white dark:bg-[#13221C] text-[#122620] dark:text-[#EDF7F2] border-[#D8E8DF] dark:border-[#253F34]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            Maps Grounding
          </button>

          <button
            type="button"
            onClick={startLiveVoice}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 ${
              liveActive
                ? 'bg-rose-700 text-white'
                : 'bg-[#1B4D3E] hover:bg-[#143D30] text-white'
            }`}
          >
            {liveActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {liveActive
              ? t(profile.language, 'voiceLiveStop')
              : t(profile.language, 'voiceLiveStart')}
          </button>
        </div>
      </section>

      {liveStatus && (
        <div
          role="status"
          className="rounded-xl bg-[#EAF4EE] dark:bg-[#192E25] border border-[#CBE4D5] dark:border-[#253F34] p-3.5 text-xs space-y-1"
        >
          <div className="font-bold text-[#1B4D3E] dark:text-[#4ADE80]">{liveStatus}</div>
          {liveTranscript && <p className="text-[#122620] dark:text-[#EDF7F2]">{liveTranscript}</p>}
        </div>
      )}

      {/* Chat Conversation Box */}
      <section className="rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-4 sm:p-5 shadow-sm space-y-4">
        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={streaming}
              onClick={() => sendMessage(q)}
              className="px-3 py-1.5 min-h-[36px] rounded-xl bg-[#F4FAF6] dark:bg-[#172A22] hover:bg-[#E5F3EC] dark:hover:bg-[#1F352B] border border-[#D8E8DF] dark:border-[#253F34] text-xs font-medium text-[#122620] dark:text-[#EDF7F2] text-left"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div
          aria-live="polite"
          className="space-y-3 max-h-[430px] overflow-y-auto pr-1"
        >
          {messages.map((msg) => (
            <article
              key={msg.id}
              className={`rounded-2xl p-4 space-y-2 ${
                msg.role === 'user'
                  ? 'bg-[#1B4D3E] text-white ml-8 sm:ml-16'
                  : msg.safetyEscalation
                    ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 mr-4 sm:mr-12'
                    : 'bg-[#F4FAF6] dark:bg-[#172A22] border border-[#DCEBE2] dark:border-[#243B31] mr-4 sm:mr-12'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span
                  className={`font-semibold inline-flex items-center gap-1.5 ${
                    msg.role === 'user'
                      ? 'text-white/90'
                      : 'text-[#315246] dark:text-[#9BC2B2]'
                  }`}
                >
                  {msg.safetyEscalation && (
                    <AlertTriangle
                      className="w-3.5 h-3.5 text-rose-700 dark:text-rose-300"
                      aria-hidden="true"
                    />
                  )}
                  {msg.role === 'user' ? profile.displayName : 'AirNest'}
                </span>

                {msg.role === 'assistant' && msg.content && (
                  <button
                    type="button"
                    onClick={() => handleSpeakMessage(msg)}
                    disabled={speakingId === msg.id}
                    aria-label={t(profile.language, 'listenTts')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#13221C] border border-[#DCEBE2] dark:border-[#243B31] text-[#1B4D3E] dark:text-[#4ADE80] text-[11px] font-semibold"
                  >
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                    {speakingId === msg.id ? 'Playing...' : t(profile.language, 'listenTts')}
                  </button>
                )}
              </div>

              <div className={msg.role === 'user' ? 'text-white' : 'text-[#183028] dark:text-[#E6F4EC]'}>
                {msg.content ? (
                  <FormattedChatMessage content={msg.content} isUser={msg.role === 'user'} />
                ) : (
                  <p className="text-sm text-[#49635A] dark:text-[#A6C2B6]">
                    Checking live air data and verified guidance...
                  </p>
                )}
              </div>

              {/* Tool Calls Executed */}
              {msg.toolCallsExecuted && msg.toolCallsExecuted.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Wrench className="w-3 h-3 text-[#49635A] dark:text-[#A6C2B6]" aria-hidden="true" />
                  {msg.toolCallsExecuted.map((tool) => (
                    <span
                      key={tool}
                      className="px-2 py-0.5 rounded bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] text-[11px] font-mono-tabular text-[#49635A] dark:text-[#A6C2B6]"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              )}

              {/* Grounded Citations (Knowledge, Web Search, Google Maps) */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2 border-t border-[#DCEBE2] dark:border-[#253F34] space-y-1">
                  <div className="text-[11px] font-bold text-[#49635A] dark:text-[#A6C2B6]">
                    Sources & Citations:
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {msg.citations.map((cit, i) => (
                      <li key={`${cit.uri}-${i}`}>
                        {cit.uri.startsWith('http') ? (
                          <a
                            href={cit.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B4D3E] dark:text-[#4ADE80] underline"
                          >
                            <span>{cit.title}</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-[#49635A] dark:text-[#A6C2B6]">
                            [{cit.sourceType}] {cit.title}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2 pt-2 border-t border-[#E4EFE9] dark:border-[#21382E]"
        >
          <label htmlFor="assistant-chat-input" className="sr-only">
            Ask AirNest Assistant
          </label>
          <input
            id="assistant-chat-input"
            type="text"
            value={input}
            maxLength={1000}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about smog safety, ₹0 indoor hacks, or impact math..."
            className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#F8FCF9] dark:bg-[#0F1D17] border border-[#D8E8DF] dark:border-[#253F34] text-sm"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            aria-label="Send message"
            className="min-w-[46px] min-h-[46px] px-4 rounded-xl bg-[#1B4D3E] hover:bg-[#143D30] disabled:opacity-50 text-white font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </section>

      {/* Visible Medical Disclaimer */}
      <div className="rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3.5 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200">
        <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <p>{t(profile.language, 'medicalDisclaimer')}</p>
      </div>
    </div>
  );
};
