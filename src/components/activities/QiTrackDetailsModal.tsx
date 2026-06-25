import { X, Calendar, Clock, Monitor, Globe } from 'lucide-react';
import type { Activity } from '../../types/crm';
import { formatDate } from '../../lib/utils';

interface Props {
  activity: Activity;
  onClose: () => void;
}

export function QiTrackDetailsModal({ activity, onClose }: Props) {
  const track = activity.qi_track;

  if (!track) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-surface-900 rounded-xl shadow-xl w-full max-w-md border border-surface-200 dark:border-surface-800 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-800">
          <div>
            <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">Dettagli Qi-Track</h3>
            <p className="text-xs text-surface-500 mt-0.5 truncate max-w-[250px]">{activity.subject}</p>
          </div>
          <button onClick={onClose} className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-50 dark:bg-surface-800 p-3 rounded-lg text-center">
              <span className="text-xs text-surface-500 font-medium">Stato</span>
              <p className="text-lg font-bold text-brand-600 dark:text-brand-400">
                {track.opened ? 'Aperta' : 'Non letta'}
              </p>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 p-3 rounded-lg text-center">
              <span className="text-xs text-surface-500 font-medium">Click Totali</span>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {track.clickCount}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider mb-3">Cronologia Eventi</h4>
            {track.history.length === 0 ? (
              <p className="text-xs text-surface-500 italic text-center py-4">Nessun evento registrato.</p>
            ) : (
              <div className="space-y-4">
                {track.history.slice().reverse().map((event, i) => (
                  <div key={i} className="flex gap-3 text-sm relative">
                    {i !== track.history.length - 1 && (
                      <div className="absolute left-[7px] top-4 bottom-[-16px] w-[2px] bg-surface-200 dark:bg-surface-700" />
                    )}
                    <div className="mt-0.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 
                                      ${event.type === 'open' ? 'bg-brand-100 text-brand-600' : 'bg-purple-100 text-purple-600'}`}>
                        {event.type === 'open' ? <Monitor size={9} /> : <Globe size={9} />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-surface-900 dark:text-surface-100 text-xs">
                        {event.type === 'open' ? 'Email Aperta' : 'Link Cliccato'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-surface-500">
                        <span className="flex items-center gap-1"><Calendar size={10} /> {formatDate(event.timestamp)}</span>
                        {event.ip && <span>• IP: {event.ip}</span>}
                      </div>
                      {event.userAgent && (
                        <p className="text-[9px] text-surface-400 mt-0.5 truncate max-w-[300px]" title={event.userAgent}>
                          {event.userAgent}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Evento Iniziale Inviata */}
                <div className="flex gap-3 text-sm relative">
                  <div className="mt-0.5">
                    <div className="w-4 h-4 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-500 flex items-center justify-center shrink-0">
                      <Clock size={9} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-surface-500 text-xs">Email Inviata</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-surface-400">
                      <span className="flex items-center gap-1"><Calendar size={10} /> {formatDate(activity.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
