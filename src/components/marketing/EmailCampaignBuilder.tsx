import { useState } from 'react';
import { Type, Image as ImageIcon, Link, GripVertical, Trash2, Smartphone, Monitor, Send, Save, ArrowLeft } from 'lucide-react';
import type { CampaignBlock, EmailCampaign } from '../../store/campaignsStore';

interface Props {
  campaign: EmailCampaign;
  onSave: (patch: Partial<EmailCampaign>) => void;
  onSend: () => void;
  onBack: () => void;
}

export function EmailCampaignBuilder({ campaign, onSave, onSend, onBack }: Props) {
  const [blocks, setBlocks] = useState<CampaignBlock[]>(campaign.blocks);
  const [subject, setSubject] = useState(campaign.subject);
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');

  const addBlock = (type: CampaignBlock['type']) => {
    const newBlock: CampaignBlock = {
      id: `b-${Date.now()}`,
      type,
      content: type === 'text' ? '<p>Nuovo testo...</p>' : type === 'button' ? 'Clicca qui' : 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600&h=200',
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, patch: Partial<CampaignBlock>) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const handleSave = () => {
    onSave({ subject, blocks });
  };

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950 -m-6">
      {/* Header */}
      <div className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-full text-surface-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-surface-900 dark:text-white">{campaign.name}</h1>
            <p className="text-xs text-surface-500">Stato: {campaign.status}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
            <button
              onClick={() => setView('desktop')}
              className={`p-1.5 rounded-md ${view === 'desktop' ? 'bg-white dark:bg-surface-700 shadow-sm' : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'}`}
            >
              <Monitor size={16} />
            </button>
            <button
              onClick={() => setView('mobile')}
              className={`p-1.5 rounded-md ${view === 'mobile' ? 'bg-white dark:bg-surface-700 shadow-sm' : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'}`}
            >
              <Smartphone size={16} />
            </button>
          </div>

          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-900 dark:text-white text-sm font-semibold rounded-lg transition-colors">
            <Save size={16} /> Salva
          </button>
          {campaign.status === 'draft' && (
            <button onClick={() => { handleSave(); onSend(); }} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-brand-500/20">
              <Send size={16} /> Invia Ora
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar Tools */}
        <div className="w-72 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 flex flex-col">
          <div className="p-5 border-b border-surface-200 dark:border-surface-800">
            <label className="block">
              <span className="text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1 block">Oggetto Email</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
              />
            </label>
          </div>

          <div className="p-5 flex-1 overflow-y-auto">
            <h3 className="text-xs font-bold text-surface-500 uppercase tracking-wide mb-3">Aggiungi Blocco</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addBlock('text')} className="flex flex-col items-center justify-center p-4 bg-surface-50 hover:bg-surface-100 dark:bg-surface-800 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 rounded-xl transition-colors">
                <Type size={20} className="text-surface-600 dark:text-surface-400 mb-2" />
                <span className="text-[11px] font-semibold text-surface-700 dark:text-surface-300">Testo</span>
              </button>
              <button onClick={() => addBlock('image')} className="flex flex-col items-center justify-center p-4 bg-surface-50 hover:bg-surface-100 dark:bg-surface-800 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 rounded-xl transition-colors">
                <ImageIcon size={20} className="text-surface-600 dark:text-surface-400 mb-2" />
                <span className="text-[11px] font-semibold text-surface-700 dark:text-surface-300">Immagine</span>
              </button>
              <button onClick={() => addBlock('button')} className="flex flex-col items-center justify-center p-4 bg-surface-50 hover:bg-surface-100 dark:bg-surface-800 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 rounded-xl transition-colors">
                <Link size={20} className="text-surface-600 dark:text-surface-400 mb-2" />
                <span className="text-[11px] font-semibold text-surface-700 dark:text-surface-300">Bottone</span>
              </button>
            </div>

            <div className="mt-8 space-y-4">
              <h3 className="text-xs font-bold text-surface-500 uppercase tracking-wide mb-3">Proprietà Blocchi</h3>
              {blocks.map((b, i) => (
                <div key={b.id} className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg border border-surface-200 dark:border-surface-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-surface-500 uppercase flex items-center gap-1">
                      <GripVertical size={10} /> {b.type} {i + 1}
                    </span>
                    <button onClick={() => removeBlock(b.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  
                  {b.type === 'text' && (
                    <textarea
                      value={b.content}
                      onChange={(e) => updateBlock(b.id, { content: e.target.value })}
                      className="w-full text-xs p-2 rounded border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900"
                      rows={3}
                    />
                  )}
                  {b.type === 'image' && (
                    <input
                      type="text"
                      value={b.content}
                      onChange={(e) => updateBlock(b.id, { content: e.target.value })}
                      placeholder="URL immagine"
                      className="w-full text-xs p-2 rounded border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900"
                    />
                  )}
                  {b.type === 'button' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={b.content}
                        onChange={(e) => updateBlock(b.id, { content: e.target.value })}
                        placeholder="Testo bottone"
                        className="w-full text-xs p-2 rounded border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900"
                      />
                      <input
                        type="text"
                        value={b.url || ''}
                        onChange={(e) => updateBlock(b.id, { url: e.target.value })}
                        placeholder="Link URL"
                        className="w-full text-xs p-2 rounded border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-surface-100 dark:bg-surface-950 overflow-y-auto p-8 flex justify-center">
          <div
            className={`bg-white rounded-xl shadow-xl overflow-hidden transition-all duration-300 ease-in-out border border-surface-200
              ${view === 'mobile' ? 'w-[375px]' : 'w-full max-w-2xl'}`}
            style={{ minHeight: '600px' }}
          >
            {/* Email Canvas Header */}
            <div className="bg-surface-50 border-b border-surface-200 px-6 py-4">
              <p className="text-xs text-surface-500 mb-1">Da: <span className="font-semibold">{campaign.fromName}</span> &lt;{campaign.fromAddress}&gt;</p>
              <p className="text-sm text-surface-900 font-medium">Oggetto: {subject || 'Senza oggetto'}</p>
            </div>

            {/* Email Body Preview */}
            <div className="p-6 space-y-6">
              {blocks.map((b) => (
                <div key={b.id} className="group relative hover:ring-2 hover:ring-brand-500 hover:ring-offset-2 rounded-lg transition-all p-1">
                  {b.type === 'text' && (
                    <div className="prose prose-sm prose-surface max-w-none text-surface-800" dangerouslySetInnerHTML={{ __html: b.content }} />
                  )}
                  {b.type === 'image' && (
                    <img src={b.content} alt="Block" className="w-full rounded-lg" />
                  )}
                  {b.type === 'button' && (
                    <div className="text-center">
                      <a href={b.url || '#'} className="inline-block bg-brand-600 text-white font-semibold px-6 py-3 rounded-lg no-underline hover:bg-brand-700">
                        {b.content}
                      </a>
                    </div>
                  )}
                </div>
              ))}
              {blocks.length === 0 && (
                <div className="text-center py-20 text-surface-400 border-2 border-dashed border-surface-200 rounded-xl">
                  Trascina o aggiungi blocchi per comporre l'email
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
