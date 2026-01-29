import Layout from "./Layout.jsx";

import Leads from "./Leads";

import Dashboard from "./Dashboard";

import Clients from "./Clients";

import Automations from "./Automations";

import Calendar from "./Calendar";

import Settings from "./Settings";

import LeadDetail from "./LeadDetail";

import ClientDetail from "./ClientDetail";

import MetaLeads from "./MetaLeads";

import WhatsAppMarketing from "./WhatsAppMarketing";

import WhatsAppMessages from "./WhatsAppMessages";

import WhatsAppConversations from "./WhatsAppConversations";

import WhatsAppCampaigns from "./WhatsAppCampaigns";

import WhatsAppTemplates from "./WhatsAppTemplates";

import UserManagement from "./UserManagement";

import CompanyManagement from "./CompanyManagement";

import ApiKeys from "./ApiKeys";

import Quotes from "./Quotes";

import NewLeadForm from "./NewLeadForm";

import WhatsAppSuccess from "./WhatsAppSuccess";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Leads: Leads,
    
    Dashboard: Dashboard,
    
    Clients: Clients,
    
    Automations: Automations,
    
    Calendar: Calendar,
    
    Settings: Settings,
    
    LeadDetail: LeadDetail,
    
    ClientDetail: ClientDetail,
    
    MetaLeads: MetaLeads,
    
    WhatsAppMarketing: WhatsAppMarketing,
    
    WhatsAppMessages: WhatsAppMessages,
    
    WhatsAppConversations: WhatsAppConversations,
    
    WhatsAppCampaigns: WhatsAppCampaigns,
    
    WhatsAppTemplates: WhatsAppTemplates,
    
    UserManagement: UserManagement,
    
    CompanyManagement: CompanyManagement,
    
    ApiKeys: ApiKeys,
    
    Quotes: Quotes,
    
    NewLeadForm: NewLeadForm,
    
    WhatsAppSuccess: WhatsAppSuccess,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Leads />} />
                
                
                <Route path="/Leads" element={<Leads />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Clients" element={<Clients />} />
                
                <Route path="/Automations" element={<Automations />} />
                
                <Route path="/Calendar" element={<Calendar />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/LeadDetail" element={<LeadDetail />} />
                
                <Route path="/ClientDetail" element={<ClientDetail />} />
                
                <Route path="/MetaLeads" element={<MetaLeads />} />
                
                <Route path="/WhatsAppMarketing" element={<WhatsAppMarketing />} />
                
                <Route path="/WhatsAppMessages" element={<WhatsAppMessages />} />
                
                <Route path="/WhatsAppConversations" element={<WhatsAppConversations />} />
                
                <Route path="/WhatsAppCampaigns" element={<WhatsAppCampaigns />} />
                
                <Route path="/WhatsAppTemplates" element={<WhatsAppTemplates />} />
                
                <Route path="/UserManagement" element={<UserManagement />} />
                
                <Route path="/CompanyManagement" element={<CompanyManagement />} />
                
                <Route path="/ApiKeys" element={<ApiKeys />} />
                
                <Route path="/Quotes" element={<Quotes />} />
                
                <Route path="/NewLeadForm" element={<NewLeadForm />} />
                
                <Route path="/WhatsAppSuccess" element={<WhatsAppSuccess />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}