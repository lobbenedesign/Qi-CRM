import { useState, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { Bot, Send, Sparkles, Loader2, User, ThumbsUp, ThumbsDown, Cpu, Gauge, MessageSquare } from 'lucide-react';
import { askAssistant, SUGGESTED_PROMPTS, type AssistantReply } from '../lib/ai/assistant';
import { getGeminiNanoCapabilities, askGeminiNano, type GeminiNanoCapabilities } from '../lib/ai/geminiNano';
import { useEvaluationStore } from '../store/evaluationStore';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  bullets?: string[];
  evaluationId?: string;
  deterministic?: {
    text: string;
    bullets?: string[];
    durationMs: number;
  };
  geminiNano?: {
    text: string;
    durationMs: number;
    error?: string;
  };
}

export default function AiHub() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'Ciao Giuseppe 👋 Sono il tuo AI Strategy Assistant. Analizzo la tua pipeline in tempo reale e ti dico dove concentrarti. Cosa vuoi sapere?',
      bullets: SUGGESTED_PROMPTS,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<GeminiNanoCapabilities | null>(null);
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const endRef = useRef<HTMLDivElement>(null);
  
  const { evaluations, addEvaluation, rateDeterministic, rateGeminiNano, addComment } = useEvaluationStore(
    useShallow((s) => ({ evaluations: s.evaluations, addEvaluation: s.addEvaluation, rateDeterministic: s.rateDeterministic, rateGeminiNano: s.rateGeminiNano, addComment: s.addComment }))
  );

  useEffect(() => {
    // Rileva le capacità di Gemini Nano all'avvio
    async function checkCaps() {
      const caps = await getGeminiNanoCapabilities();
      setCapabilities(caps);
    }
    checkCaps();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    const isNanoActive = capabilities?.available ?? false;

    // Eseguiamo i test in parallelo misurando i tempi di risposta
    const startDet = performance.now();
    let detReply: AssistantReply | null = null;
    let detError: string | null = null;
    try {
      detReply = await askAssistant(text);
    } catch (e: any) {
      detError = e.message || 'Errore nel motore deterministico';
    }
    const endDet = performance.now();
    const detDuration = Math.round(endDet - startDet);

    let nanoText = '';
    let nanoError = '';
    const startNano = performance.now();
    
    if (isNanoActive) {
      try {
        nanoText = await askGeminiNano(text);
      } catch (e: any) {
        nanoError = e.message || 'Impossibile interrogare Gemini Nano';
      }
    }
    const endNano = performance.now();
    const nanoDuration = isNanoActive ? Math.round(endNano - startNano) : 0;

    setLoading(false);

    if (isNanoActive) {
      // Salva la valutazione nell'evaluationStore per le statistiche
      const evalId = addEvaluation({
        query: text,
        deterministicResponse: detReply ? `${detReply.text}\n${(detReply.bullets ?? []).join('\n')}` : (detError || ''),
        geminiNanoResponse: nanoError ? `Errore: ${nanoError}` : nanoText,
        deterministicRating: null,
        geminiNanoRating: null,
        comment: '',
        deterministicDurationMs: detDuration,
        geminiNanoDurationMs: nanoDuration,
      });

      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'Confronto risposte elaborato:',
          evaluationId: evalId,
          deterministic: {
            text: detReply?.text || detError || '',
            bullets: detReply?.bullets,
            durationMs: detDuration,
          },
          geminiNano: {
            text: nanoText,
            durationMs: nanoDuration,
            error: nanoError || undefined,
          },
        },
      ]);
    } else {
      // Se Gemini Nano non è attivo, mostriamo solo la risposta del motore deterministico come al solito
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: detReply?.text || detError || 'Nessuna risposta ricevuta.',
          bullets: detReply?.bullets,
        },
      ]);
    }
  };

  const handleVoteDeterministic = (evalId: string, rating: 'up' | 'down') => {
    rateDeterministic(evalId, rating);
    setActiveFeedbackId(evalId);
  };

  const handleVoteGeminiNano = (evalId: string, rating: 'up' | 'down') => {
    rateGeminiNano(evalId, rating);
    setActiveFeedbackId(evalId);
  };

  const submitComment = (evalId: string) => {
    addComment(evalId, commentText);
    setCommentText('');
    setActiveFeedbackId(null);
  };

  // Statistiche rapide calcolate in base alle valutazioni archiviate
  const detUpvotes = evaluations.filter((e) => e.deterministicRating === 'up').length;
  const nanoUpvotes = evaluations.filter((e) => e.geminiNanoRating === 'up').length;
  const avgDetTime = evaluations.length
    ? Math.round(evaluations.reduce((acc, curr) => acc + curr.deterministicDurationMs, 0) / evaluations.length)
    : 0;
  const avgNanoTime = evaluations.length
    ? Math.round(evaluations.reduce((acc, curr) => acc + curr.geminiNanoDurationMs, 0) / evaluations.length)
    : 0;

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto space-y-4">
      
      {/* Diagnostica & Statistiche di Confronto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        
        {/* Stato di Rilevamento Gemini Nano */}
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${capabilities?.available ? 'bg-success-50 dark:bg-success-950/20 text-success-600' : 'bg-warning-50 dark:bg-warning-950/20 text-warning-600'}`}>
              <Cpu size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-1.5">
                Stato LLM Locale (Gemini Nano)
                <span className={`w-2.5 h-2.5 rounded-full inline-block ${capabilities?.available ? 'bg-success-500 animate-pulse' : 'bg-warning-500'}`} />
              </h2>
              {capabilities?.available ? (
                <p className="text-xs text-surface-500 mt-1">
                  Gemini Nano è attivo e pronto a rispondere utilizzando i dati locali del tuo CRM.
                </p>
              ) : (
                <div className="space-y-1 mt-1 text-xs text-surface-500">
                  <p className="font-semibold text-warning-600 dark:text-warning-400">Non pronto o non supportato su questo dispositivo.</p>
                  <p className="text-[11px] leading-relaxed">
                    Per attivarlo: 1) Apri <code className="bg-surface-100 dark:bg-surface-800 px-1 rounded">chrome://flags</code> 2) Abilita <code className="bg-surface-100 dark:bg-surface-800 px-1 rounded">Optimization Guide On Device Model</code> (Bypass) e <code className="bg-surface-100 dark:bg-surface-800 px-1 rounded">Prompt API for Gemini Nano</code> 3) Riavvia Google Chrome.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistiche di Valutazione */}
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600">
              <Gauge size={20} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                Statistiche e Affidabilità AI
              </h2>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="bg-surface-50 dark:bg-surface-800/40 p-2 rounded-lg">
                  <p className="text-surface-400">Voti Preferiti</p>
                  <p className="font-medium mt-0.5 text-surface-800 dark:text-surface-200">
                    Deterministico: <span className="text-brand-600 font-bold">{detUpvotes}</span> | LLM Nano: <span className="text-brand-600 font-bold">{nanoUpvotes}</span>
                  </p>
                </div>
                <div className="bg-surface-50 dark:bg-surface-800/40 p-2 rounded-lg">
                  <p className="text-surface-400">Tempo Risposta Medio</p>
                  <p className="font-medium mt-0.5 text-surface-800 dark:text-surface-200">
                    Det: {avgDetTime}ms | Nano: {avgNanoTime}ms
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header Principale */}
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
          <Bot className="text-white" size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">AI Strategy Assistant</h1>
          <p className="text-xs text-surface-400">Confronto prestazionale tra Calcolo Deterministico e Modello Generativo locale</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-2 min-h-[300px]">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              m.role === 'assistant' ? 'bg-brand-600' : 'bg-surface-300 dark:bg-surface-700'
            }`}>
              {m.role === 'assistant' ? <Sparkles size={14} className="text-white" /> : <User size={14} className="text-surface-600 dark:text-surface-200" />}
            </div>

            {/* Corpo Messaggio */}
            <div className="flex-1 space-y-3">
              {/* Se è un messaggio dell'utente o un messaggio iniziale dell'assistente standard */}
              {!m.deterministic && (
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  m.role === 'assistant'
                    ? 'bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700'
                    : 'bg-brand-600 text-white ml-auto'
                }`}>
                  <p className={`text-sm ${m.role === 'assistant' ? 'text-surface-800 dark:text-surface-100' : ''}`}>{m.text}</p>
                  {m.bullets && m.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {m.bullets.map((b, j) => (
                        m.role === 'assistant' && i === 0 ? (
                          <li key={j}>
                            <button
                              onClick={() => send(b)}
                              className="text-left text-sm text-brand-600 dark:text-brand-400 hover:underline"
                            >
                              → {b}
                            </button>
                          </li>
                        ) : (
                          <li key={j} className="text-sm flex gap-2 text-surface-600 dark:text-surface-300">
                            <span className="opacity-50">•</span><span>{b}</span>
                          </li>
                        )
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Se abbiamo entrambe le risposte da confrontare */}
              {m.deterministic && m.geminiNano && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Colonna A: Motore Deterministico */}
                    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold px-2 py-0.5 bg-brand-50 dark:bg-brand-950/20 text-brand-600 rounded-full flex items-center gap-1">
                            Motore Deterministico (Matematico)
                          </span>
                          <span className="text-[10px] text-surface-400 flex items-center gap-1">
                            <Gauge size={10} /> {m.deterministic.durationMs}ms
                          </span>
                        </div>
                        <p className="text-sm text-surface-800 dark:text-surface-100 whitespace-pre-line">{m.deterministic.text}</p>
                        {m.deterministic.bullets && m.deterministic.bullets.length > 0 && (
                          <ul className="mt-2 space-y-1.5 border-t border-surface-100 dark:border-surface-800 pt-2">
                            {m.deterministic.bullets.map((b, j) => (
                              <li key={j} className="text-xs flex gap-2 text-surface-600 dark:text-surface-300">
                                <span className="opacity-50">•</span><span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Votazione Deterministica */}
                      {m.evaluationId && (
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-100 dark:border-surface-800 justify-end">
                          <span className="text-xs text-surface-400 mr-auto">Quanto è affidabile?</span>
                          <button
                            onClick={() => handleVoteDeterministic(m.evaluationId!, 'up')}
                            className={`p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors ${
                              evaluations.find(e => e.id === m.evaluationId)?.deterministicRating === 'up'
                                ? 'text-success-600'
                                : 'text-surface-400'
                            }`}
                          >
                            <ThumbsUp size={14} />
                          </button>
                          <button
                            onClick={() => handleVoteDeterministic(m.evaluationId!, 'down')}
                            className={`p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors ${
                              evaluations.find(e => e.id === m.evaluationId)?.deterministicRating === 'down'
                                ? 'text-risk-high'
                                : 'text-surface-400'
                            }`}
                          >
                            <ThumbsDown size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Colonna B: Gemini Nano */}
                    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold px-2 py-0.5 bg-purple-50 dark:bg-purple-950/20 text-purple-600 rounded-full flex items-center gap-1">
                            Gemini Nano (LLM Locale)
                          </span>
                          <span className="text-[10px] text-surface-400 flex items-center gap-1">
                            <Gauge size={10} /> {m.geminiNano.durationMs}ms
                          </span>
                        </div>
                        {m.geminiNano.error ? (
                          <p className="text-xs text-risk-high bg-risk-high/10 p-2 rounded border border-risk-high/20 whitespace-pre-wrap">{m.geminiNano.error}</p>
                        ) : (
                          <p className="text-sm text-surface-800 dark:text-surface-100 whitespace-pre-line leading-relaxed">{m.geminiNano.text}</p>
                        )}
                      </div>

                      {/* Votazione Gemini Nano */}
                      {m.evaluationId && !m.geminiNano.error && (
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-100 dark:border-surface-800 justify-end">
                          <span className="text-xs text-surface-400 mr-auto">Quanto è affidabile?</span>
                          <button
                            onClick={() => handleVoteGeminiNano(m.evaluationId!, 'up')}
                            className={`p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors ${
                              evaluations.find(e => e.id === m.evaluationId)?.geminiNanoRating === 'up'
                                ? 'text-success-600'
                                : 'text-surface-400'
                            }`}
                          >
                            <ThumbsUp size={14} />
                          </button>
                          <button
                            onClick={() => handleVoteGeminiNano(m.evaluationId!, 'down')}
                            className={`p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors ${
                              evaluations.find(e => e.id === m.evaluationId)?.geminiNanoRating === 'down'
                                ? 'text-risk-high'
                                : 'text-surface-400'
                            }`}
                          >
                            <ThumbsDown size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Commento qualitativo extra se un voto è stato espresso */}
                  {m.evaluationId && activeFeedbackId === m.evaluationId && (
                    <div className="bg-surface-50 dark:bg-surface-800/50 rounded-xl p-3 border border-surface-200 dark:border-surface-700 animate-fadeIn max-w-xl">
                      <p className="text-xs text-surface-500 font-semibold mb-2 flex items-center gap-1">
                        <MessageSquare size={12} /> Dicci perché: quale risposta preferisci e perché la trovi più attendibile?
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Scrivi qui le tue considerazioni..."
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 outline-none"
                        />
                        <button
                          onClick={() => submitComment(m.evaluationId!)}
                          className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1 text-xs rounded-lg font-medium"
                        >
                          Invia
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Feedback salvato in precedenza per questa query */}
                  {m.evaluationId && evaluations.find(e => e.id === m.evaluationId)?.comment && (
                    <div className="bg-surface-50 dark:bg-surface-800/30 rounded-xl p-2.5 border border-surface-200 dark:border-surface-700 max-w-xl text-xs text-surface-600 dark:text-surface-300">
                      <span className="font-semibold text-brand-600 dark:text-brand-400">Le tue note:</span> "{evaluations.find(e => e.id === m.evaluationId)?.comment}"
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl px-4 py-3">
              <Loader2 size={16} className="animate-spin text-brand-500" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 shrink-0 pt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={capabilities?.available ? "Fai una domanda per confrontare i due sistemi..." : "Chiedi qualcosa sulla tua pipeline…"}
          className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-surface-200 dark:border-surface-700
                     bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 outline-none
                     focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
