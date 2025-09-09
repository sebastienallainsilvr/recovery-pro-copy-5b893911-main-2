import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Entreprises from "./Entreprises";

import Dossiers from "./Dossiers";

import Kanban from "./Kanban";

import Templates from "./Templates";

import Import from "./Import";

import Reassignation from "./Reassignation";

import Reports from "./Reports";

import Administration from "./Administration";

import Dossier from "./Dossier";

import Contacts from "./Contacts";

import Transactions from "./Transactions";

import Actions from "./Actions";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Entreprises: Entreprises,
    
    Dossiers: Dossiers,
    
    Kanban: Kanban,
    
    Templates: Templates,
    
    Import: Import,
    
    Reassignation: Reassignation,
    
    Reports: Reports,
    
    Administration: Administration,
    
    Dossier: Dossier,
    
    Contacts: Contacts,
    
    Transactions: Transactions,
    
    Actions: Actions,
    
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
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Entreprises" element={<Entreprises />} />
                
                <Route path="/Dossiers" element={<Dossiers />} />
                
                <Route path="/Kanban" element={<Kanban />} />
                
                <Route path="/Templates" element={<Templates />} />
                
                <Route path="/Import" element={<Import />} />
                
                <Route path="/Reassignation" element={<Reassignation />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/Administration" element={<Administration />} />
                
                <Route path="/Dossier" element={<Dossier />} />
                
                <Route path="/Contacts" element={<Contacts />} />
                
                <Route path="/Transactions" element={<Transactions />} />
                
                <Route path="/Actions" element={<Actions />} />
                
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