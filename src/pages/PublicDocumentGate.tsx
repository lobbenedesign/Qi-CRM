import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { useParams } from 'react-router-dom';
import { useDocumentsStore } from '../store/documentsStore';
import { 
  FileText, ShieldAlert, ArrowRight, Mail, 
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download
} from 'lucide-react';

export default function PublicDocumentGate() {
  const { id } = useParams();
  const { documents, logDocumentView } = useDocumentsStore(
    useShallow((s) => ({ documents: s.documents, logDocumentView: s.logDocumentView }))
  );
  const doc = documents.find(d => d.id === id || d.sharedLinkToken === id);

  const [email, setEmail] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [duration, setDuration] = useState(0);

  // 1. Track reading duration once authorized (hook sempre chiamato — guardia interna)
  useEffect(() => {
    if (!doc || !isAuthorized) return;

    // Initial log with 0 seconds
    logDocumentView(doc.id, email, 0);

    const interval = setInterval(() => {
      setDuration(prev => {
        const nextDuration = prev + 5;
        // Update the view log with actual duration
        logDocumentView(doc.id, email, nextDuration);
        return nextDuration;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthorized, doc?.id, email]);

  // 2. Check if document exists
  if (!doc) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl max-w-md text-center space-y-4">
          <ShieldAlert className="mx-auto text-red-500" size={48} />
          <h2 className="text-xl font-bold">Documento Non Disponibile</h2>
          <p className="text-sm text-surface-400">
            Il link inserito potrebbe essere scaduto, rimosso o errato. Contattare l'amministratore del sistema.
          </p>
        </div>
        <footer className="mt-8 text-xs text-surface-500">
          Powered by Giuseppe Lobbene / Lobbenedesign
        </footer>
      </div>
    );
  }

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    setIsAuthorized(true);
  };

  // If email is required and not verified yet
  if (doc.requireEmail && !isAuthorized) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl max-w-md w-full space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-brand-500/10 border border-brand-500/30 rounded-full flex items-center justify-center mx-auto text-brand-400">
              <FileText size={24} />
            </div>
            <h2 className="text-lg font-bold text-surface-50">Accedi al Documento</h2>
            <p className="text-xs text-surface-400">
              Questo file è protetto da tracciamento sicuro. Inserisci la tua email per sbloccarlo.
            </p>
          </div>

          <form onSubmit={handleSubmitEmail} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1">
                Indirizzo Email Aziendale
              </label>
              <div className="relative">
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="es. nome@azienda.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-white placeholder:text-surface-600"
                />
                <Mail size={16} className="absolute left-3.5 top-3.5 text-surface-500" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md transform hover:-translate-y-0.5"
            >
              Visualizza Documento
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="text-center text-[10px] text-surface-500 border-t border-white/5 pt-4">
            Documento: <strong className="text-surface-300">{doc.name}</strong> ({doc.size_kb} KB)
          </div>
        </div>

        <footer className="mt-8 text-xs text-surface-500">
          Powered by Giuseppe Lobbene / Lobbenedesign
        </footer>
      </div>
    );
  }

  // Simulated Document Viewer
  const totalPages = doc.kind === 'contract' ? 4 : 2;

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col text-white">
      {/* Header Toolbar */}
      <header className="bg-surface-900/60 backdrop-blur-md border-b border-white/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={20} className="text-brand-400 shrink-0" />
          <h1 className="text-xs font-bold truncate text-surface-100">{doc.name}</h1>
          <span className="text-[10px] text-surface-500 bg-white/5 px-2 py-0.5 rounded shrink-0">
            {doc.size_kb} KB
          </span>
        </div>

        {/* PDF Simulator Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 border border-white/5">
            <button 
              onClick={() => setZoom(z => Math.max(50, z - 10))} 
              className="p-1 hover:bg-white/5 rounded text-surface-400 hover:text-white"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] font-semibold min-w-[36px] text-center">{zoom}%</span>
            <button 
              onClick={() => setZoom(z => Math.min(200, z + 10))} 
              className="p-1 hover:bg-white/5 rounded text-surface-400 hover:text-white"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 text-surface-400 hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-medium text-surface-300">
              Pagina {currentPage} di {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 text-surface-400 hover:text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <a 
            href="#"
            onClick={(e) => { e.preventDefault(); alert('Download simulato avviato.'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-xs font-bold rounded-lg transition-colors"
          >
            <Download size={13} />
            Scarica
          </a>
        </div>
      </header>

      {/* Main Document viewport */}
      <main className="flex-1 flex justify-center p-6 bg-surface-900/35 overflow-y-auto">
        <div 
          className="bg-white text-surface-900 rounded-lg shadow-2xl p-8 md:p-12 transition-all duration-200"
          style={{ width: `${Math.round(800 * (zoom / 100))}px`, minHeight: '1000px' }}
        >
          {/* Gated Watermark */}
          {doc.requireEmail && (
            <div className="absolute right-4 top-4 select-none opacity-20 pointer-events-none text-right">
              <div className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Visualizzato da</div>
              <div className="text-xs font-semibold text-brand-600">{email}</div>
            </div>
          )}

          {/* Document Content Simulation */}
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-surface-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-surface-900 uppercase tracking-wide">
                  {doc.kind === 'contract' ? 'ACCORDO DI RISERVATEZZA (NDA)' : 'DOCUMENTO DI COMMESSA'}
                </h2>
                <p className="text-xs text-surface-500 mt-1">ID Documento: {doc.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-surface-500">Data Registrazione</p>
                <p className="text-xs text-surface-800">{new Date(doc.received_at).toLocaleDateString('it-IT')}</p>
              </div>
            </div>

            {/* Dynamic Pages contents */}
            {currentPage === 1 && (
              <div className="space-y-4 text-xs text-surface-700 leading-relaxed">
                <h3 className="font-bold text-surface-950 text-sm">Articolo 1 - Oggetto dell'Accordo</h3>
                <p>
                  Il presente accordo (l' "Accordo") viene stipulato al fine di proteggere lo scambio di informazioni riservate tra le parti firmatarie nell'ambito delle trattative commerciali relative all'utilizzo della piattaforma <strong>Qi-CRM</strong>.
                </p>
                <p>
                  Per "Informazioni Riservate" si intende qualsiasi informazione di natura tecnica, finanziaria, commerciale o operativa, inclusi a titolo esemplificativo codici sorgente, algoritmi, listini prezzi, database clienti, e logiche di business divulgate in forma scritta, elettronica o verbale.
                </p>
                <h3 className="font-bold text-surface-950 text-sm mt-6">Articolo 2 - Obblighi di Non Divulgazione</h3>
                <p>
                  La parte ricevente si impegna a mantenere strettamente riservate tutte le Informazioni Divulgate, ad astenersi dal rivelarle a terzi senza il preventivo consenso scritto della parte divulgante, e ad utilizzare tali informazioni esclusivamente per gli scopi autorizzati.
                </p>
                <p>
                  Gli obblighi di riservatezza previsti dal presente Accordo rimarranno in vigore per un periodo di cinque (5) anni a decorrere dalla data di ricezione delle informazioni.
                </p>
              </div>
            )}

            {currentPage === 2 && (
              <div className="space-y-4 text-xs text-surface-700 leading-relaxed">
                <h3 className="font-bold text-surface-950 text-sm">Articolo 3 - Limitazioni</h3>
                <p>
                  Gli obblighi di riservatezza non si applicano alle informazioni che:
                </p>
                <ul className="list-disc list-inside space-y-1.5 ml-2">
                  <li>siano o diventino di pubblico dominio non per causa imputabile alla parte ricevente;</li>
                  <li>fossero già in possesso della parte ricevente prima della divulgazione;</li>
                  <li>siano state legalmente ottenute da fonti terze che non abbiano vincoli di riservatezza.</li>
                </ul>
                <h3 className="font-bold text-surface-950 text-sm mt-6">Articolo 4 - Legge Applicabile e Foro Competente</h3>
                <p>
                  Il presente Accordo è regolato dalla legge italiana. Qualsiasi controversia derivante dall'interpretazione o dall'esecuzione del presente contratto sarà devoluta alla competenza esclusiva del Foro di Milano.
                </p>
              </div>
            )}

            {currentPage >= 3 && (
              <div className="space-y-4 text-xs text-surface-700 leading-relaxed">
                <h3 className="font-bold text-surface-950 text-sm">Firme delle Parti</h3>
                <p>
                  Letto, confermato e sottoscritto.
                </p>
                <div className="grid grid-cols-2 gap-8 pt-12">
                  <div className="border-t border-surface-300 pt-3">
                    <p className="font-bold text-surface-900">Per il Divulgante</p>
                    <p className="text-[10px] text-surface-450 mt-1">Giuseppe Lobbene (CEO)</p>
                  </div>
                  <div className="border-t border-surface-300 pt-3">
                    <p className="font-bold text-surface-900">Per il Ricevente</p>
                    <p className="text-[10px] text-surface-450 mt-1">{email || 'Rappresentante Legale'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Gated Tracking Info */}
      <footer className="bg-surface-900/60 border-t border-white/5 px-4 py-2 flex items-center justify-between text-xs text-surface-500 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
          <span>Accesso Monitorato in Tempo Reale ({duration}s di lettura)</span>
        </div>
        <span>Powered by Giuseppe Lobbene / Lobbenedesign</span>
      </footer>
    </div>
  );
}
