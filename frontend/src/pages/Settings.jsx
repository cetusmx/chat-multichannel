import { useState } from 'react';
import useAuthStore from '../stores/useAuthStore.js';
import CompanyProfileSection from '../features/settings/CompanyProfileSection.jsx';
import BranchListSection from '../features/settings/BranchListSection.jsx';
import GroupListSection from '../features/settings/GroupListSection.jsx';
import WhatsAppSettingsSection from '../features/settings/WhatsAppSettingsSection.jsx';

const tabs = [
  { id: 'company', label: 'Empresa', roles: ['ADMIN', 'COORDINATOR'] },
  { id: 'branches', label: 'Sucursales', roles: ['ADMIN', 'COORDINATOR'] },
  { id: 'groups', label: 'Grupos', roles: ['ADMIN', 'COORDINATOR'] },
  { id: 'whatsapp', label: 'WhatsApp API', roles: ['ADMIN'] },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const user = useAuthStore((s) => s.user);

  const visibleTabs = tabs.filter((t) => t.roles.includes(user?.role));

  function renderTab() {
    switch (activeTab) {
      case 'company': return <CompanyProfileSection />;
      case 'branches': return <BranchListSection />;
      case 'groups': return <GroupListSection />;
      case 'whatsapp': return <WhatsAppSettingsSection />;
      default: return null;
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-sales-slate-100">Configuración</h1>

      <div className="mb-6 flex gap-1 border-b border-slate-800">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab.id
                ? 'border-sales-coral text-sales-coral'
                : 'border-transparent text-sales-slate-400 hover:text-sales-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderTab()}
    </div>
  );
}
