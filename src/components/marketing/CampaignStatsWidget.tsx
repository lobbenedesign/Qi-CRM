import { Users, MailOpen, MousePointerClick, UserX, AlertTriangle } from 'lucide-react';
import type { EmailCampaign } from '../../store/campaignsStore';

interface Props {
  campaign: EmailCampaign;
}

export function CampaignStatsWidget({ campaign }: Props) {
  const { sent, opened, clicked, bounced, unsubscribed } = campaign.stats;
  
  const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0';
  const clickRate = opened > 0 ? ((clicked / opened) * 100).toFixed(1) : '0';

  return (
    <div className="bg-surface-50 dark:bg-surface-800/50 rounded-xl p-4 border border-surface-200 dark:border-surface-700">
      <h4 className="text-xs font-bold text-surface-900 dark:text-white mb-3 flex items-center justify-between">
        Performance Campagna
        <span className="text-[10px] font-medium text-surface-500 bg-surface-200 dark:bg-surface-700 px-2 py-0.5 rounded-full">Inviata {campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString() : ''}</span>
      </h4>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-surface-500 mb-1">
            <Users size={14} className="text-blue-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Inviate</span>
          </div>
          <p className="text-lg font-bold text-surface-900 dark:text-white">{sent}</p>
        </div>
        
        <div>
          <div className="flex items-center gap-1.5 text-surface-500 mb-1">
            <MailOpen size={14} className="text-emerald-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Aperte</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold text-surface-900 dark:text-white">{opened}</p>
            <span className="text-[10px] text-emerald-600 font-medium">{openRate}%</span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-1.5 text-surface-500 mb-1">
            <MousePointerClick size={14} className="text-purple-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Cliccate</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold text-surface-900 dark:text-white">{clicked}</p>
            <span className="text-[10px] text-purple-600 font-medium">{clickRate}%</span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-1.5 text-surface-500 mb-1">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Bounce</span>
          </div>
          <p className="text-lg font-bold text-surface-900 dark:text-white">{bounced}</p>
        </div>
        
        <div>
          <div className="flex items-center gap-1.5 text-surface-500 mb-1">
            <UserX size={14} className="text-red-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Disiscritti</span>
          </div>
          <p className="text-lg font-bold text-surface-900 dark:text-white">{unsubscribed}</p>
        </div>
      </div>
      
      {/* Funnel Visual */}
      <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-surface-200 dark:bg-surface-700">
        <div style={{ width: `${(opened / Math.max(sent, 1)) * 100}%` }} className="bg-emerald-500 h-full"></div>
        <div style={{ width: `${((sent - opened) / Math.max(sent, 1)) * 100}%` }} className="bg-blue-500 h-full opacity-50"></div>
      </div>
    </div>
  );
}
