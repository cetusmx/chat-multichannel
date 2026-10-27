import { useState } from 'react';
import useAuthStore from '../stores/useAuthStore.js';
import { PageHeader, Tabs } from '../components/ui/index.js';
import CompanyProfileSection from '../features/settings/CompanyProfileSection.jsx';
import BranchListSection from '../features/settings/BranchListSection.jsx';
import GroupListSection from '../features/settings/GroupListSection.jsx';
import WhatsAppSettingsSection from '../features/settings/WhatsAppSettingsSection.jsx';
import AiConfigSection from '../features/settings/AiConfigSection.jsx';
import AiRulesSection from '../features/settings/AiRulesSection.jsx';
import KnowledgeBaseSection from '../features/settings/KnowledgeBaseSection.jsx';
import AssignmentRulesSection from '../features/settings/AssignmentRulesSection.jsx';
import SlaConfigSection from '../features/settings/SlaConfigSection.jsx';
import CannedResponsesSection from '../features/settings/CannedResponsesSection.jsx';
import EmailConfigSection from '../features/settings/EmailConfigSection.jsx';

const tabs = [
  { id: 'company', label: 'Empresa', roles: ['ADMIN', 'COORDINATOR'] },
  { id: 'branches', label: 'Sucursales', roles: ['ADMIN', 'COORDINATOR'] },
  { id: 'groups', label: 'Grupos', roles: ['ADMIN', 'COORDINATOR'] },
  { id: 'whatsapp', label: 'WhatsApp', roles: ['ADMIN'] },
  { id: 'ai', label: 'Asistente IA', roles: ['ADMIN'] },
  { id: 'kb', label: 'Base de conocimiento', roles: ['ADMIN'] },
  { id: 'canned', label: 'Respuestas rápidas', roles: ['ADMIN'] },
  { id: 'assignment', label: 'Asignación', roles: ['ADMIN'] },
  { id: 'sla', label: 'SLA y tiempos', roles: ['ADMIN', 'COORDINATOR'] },
  { id: 'email', label: 'Correo saliente', roles: ['ADMIN'] },
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
      case 'ai': return (
        <div className="space-y-6">
          <AiConfigSection />
          <AiRulesSection />
        </div>
      );
      case 'kb': return <KnowledgeBaseSection />;
      case 'canned': return <CannedResponsesSection />;
      case 'assignment': return <AssignmentRulesSection />;
      case 'sla': return <SlaConfigSection />;
      case 'email': return <EmailConfigSection />;
      default: return null;
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Configuración" description="Ajustes de la empresa, canales y automatizaciones." />

      <Tabs
        items={visibleTabs.map(({ id, label }) => ({ id, label }))}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {renderTab()}
    </div>
  );
}
