import { useState } from 'react';
import {
  Share2, ThumbsUp, Camera, Briefcase, Plus, Trash2, Send,
  CalendarClock, MessageCircle, Mail, CheckCircle2, Link2, Reply,
} from 'lucide-react';
import {
  useSocialStore, PLATFORM_META,
  type SocialPlatform, type SocialPost,
} from '../store/socialStore';
import { useCan } from '../hooks/useCan';

const ICON: Record<SocialPlatform, React.ReactNode> = {
  facebook: <ThumbsUp size={15} />, instagram: <Camera size={15} />, linkedin: <Briefcase size={15} />,
};

export default function Social() {
  const canManage = useCan('marketing:manage');
  const { connections, posts, interactions, toggleConnection, addPost, publishPost, removePost, reply } = useSocialStore();
  const [tab, setTab] = useState<'connections' | 'calendar' | 'inbox'>('connections');

  // Composer state
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');

  // Inbox reply state
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const connectedPlatforms = connections.filter((c) => c.connected).map((c) => c.platform);

  const togglePlatform = (p: SocialPlatform) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const submitPost = () => {
    if (!content.trim() || platforms.length === 0 || !scheduledAt) return;
    addPost({ platforms, content: content.trim(), scheduledAt: new Date(scheduledAt).toISOString() });
    setContent(''); setPlatforms([]); setScheduledAt('');
  };

  const newCount = interactions.filter((i) => i.status === 'new').length;

  return (
    <div className="flex flex-col h-full gap-4 p-1">
      <div className="flex items-center gap-2 shrink-0">
        <Share2 className="text-brand-500" size={22} />
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Social Studio</h1>
          <p className="text-xs text-surface-500">Pianifica post e centralizza commenti e messaggi da Facebook, Instagram e LinkedIn</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-200 dark:border-surface-800 shrink-0">
        {([['connections', 'Connessioni'], ['calendar', 'Calendario Post'], ['inbox', `Inbox Social${newCount ? ` (${newCount})` : ''}`]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === k ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* CONNESSIONI */}
        {tab === 'connections' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {connections.map((c) => {
              const meta = PLATFORM_META[c.platform];
              return (
                <div key={c.platform} className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: meta.color }}>
                      {ICON[c.platform]}
                    </span>
                    <div>
                      <h3 className="font-bold text-surface-900 dark:text-surface-50">{meta.label}</h3>
                      {c.connected
                        ? <span className="text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> {c.account}</span>
                        : <span className="text-[11px] text-surface-400">Non collegato</span>}
                    </div>
                  </div>
                  <p className="text-[11px] text-surface-500 leading-snug mb-3">{meta.guide}</p>
                  {canManage && (
                    <button onClick={() => toggleConnection(c.platform)}
                      className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors ${
                        c.connected ? 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200' : 'bg-brand-600 hover:bg-brand-700 text-white'
                      }`}>
                      <Link2 size={13} /> {c.connected ? 'Disconnetti' : 'Collega account'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* CALENDARIO POST */}
        {tab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-4">
            {/* Composer */}
            {canManage && (
              <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 space-y-3 shadow-sm h-fit">
                <h3 className="text-xs font-bold text-surface-700 dark:text-surface-200 uppercase tracking-wide">Nuovo post</h3>
                <div>
                  <label className="block text-[11px] font-semibold text-surface-500 mb-1.5">Pubblica su</label>
                  <div className="flex gap-2">
                    {connectedPlatforms.length === 0 && <span className="text-[11px] text-amber-600">Collega un account nella tab Connessioni.</span>}
                    {connectedPlatforms.map((p) => (
                      <button key={p} onClick={() => togglePlatform(p)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          platforms.includes(p) ? 'text-white border-transparent' : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300'
                        }`}
                        style={platforms.includes(p) ? { backgroundColor: PLATFORM_META[p].color } : undefined}>
                        {ICON[p]} {PLATFORM_META[p].label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Scrivi il contenuto del post..."
                  className="w-full bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none" />
                <div>
                  <label className="block text-[11px] font-semibold text-surface-500 mb-1">Data e ora di pubblicazione</label>
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none" />
                </div>
                <button onClick={submitPost} disabled={!content.trim() || platforms.length === 0 || !scheduledAt}
                  className="w-full flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg">
                  <Plus size={14} /> Pianifica post
                </button>
              </div>
            )}

            {/* Lista post */}
            <div className="space-y-3">
              {posts.map((p) => <PostCard key={p.id} p={p} canManage={canManage} onPublish={() => publishPost(p.id)} onRemove={() => removePost(p.id)} />)}
            </div>
          </div>
        )}

        {/* INBOX SOCIAL */}
        {tab === 'inbox' && (
          <div className="space-y-3 max-w-3xl">
            {interactions.map((i) => {
              const meta = PLATFORM_META[i.platform];
              return (
                <div key={i.id} className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: meta.color }}>
                        {ICON[i.platform]}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">{i.author}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-surface-400">
                          {i.type === 'dm' ? <Mail size={10} /> : <MessageCircle size={10} />}
                          {i.type === 'dm' ? 'Messaggio diretto' : 'Commento'} · {meta.label}
                        </span>
                      </div>
                    </div>
                    {i.status === 'new'
                      ? <span className="text-[10px] font-bold bg-brand-500/10 text-brand-600 px-2 py-0.5 rounded-full">Nuovo</span>
                      : <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> Risposto</span>}
                  </div>
                  <p className="text-sm text-surface-700 dark:text-surface-200 mt-2">{i.text}</p>

                  {i.reply && (
                    <div className="mt-2 ml-4 pl-3 border-l-2 border-brand-300 text-xs text-surface-500">
                      <span className="font-semibold text-brand-600">Tu:</span> {i.reply}
                    </div>
                  )}

                  {canManage && i.status === 'new' && (
                    replyId === i.id ? (
                      <div className="mt-3 flex items-center gap-2">
                        <input autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Scrivi una risposta..."
                          className="flex-1 bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none" />
                        <button onClick={() => { if (replyText.trim()) { reply(i.id, replyText.trim()); setReplyId(null); setReplyText(''); } }}
                          className="bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-lg"><Send size={13} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setReplyId(i.id); setReplyText(''); }}
                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                        <Reply size={13} /> Rispondi
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ p, canManage, onPublish, onRemove }: { p: SocialPost; canManage: boolean; onPublish: () => void; onRemove: () => void }) {
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {p.platforms.map((pl) => (
            <span key={pl} className="w-6 h-6 rounded flex items-center justify-center text-white" style={{ backgroundColor: PLATFORM_META[pl].color }}>
              {ICON[pl]}
            </span>
          ))}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ml-1 ${p.status === 'published' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
            {p.status === 'published' ? 'Pubblicato' : 'Pianificato'}
          </span>
        </div>
        {canManage && <button onClick={onRemove} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={13} /></button>}
      </div>
      <p className="text-sm text-surface-700 dark:text-surface-200 mt-2">{p.content}</p>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-100 dark:border-surface-800">
        <span className="flex items-center gap-1 text-[11px] text-surface-400">
          <CalendarClock size={11} /> {new Date(p.scheduledAt).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
        {p.status === 'published' ? (
          <span className="text-[11px] text-surface-500">❤ {p.metrics.likes} · 💬 {p.metrics.comments} · ↻ {p.metrics.shares}</span>
        ) : canManage ? (
          <button onClick={onPublish} className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline">
            <Send size={11} /> Pubblica ora
          </button>
        ) : null}
      </div>
    </div>
  );
}
