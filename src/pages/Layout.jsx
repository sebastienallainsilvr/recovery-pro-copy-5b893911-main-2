

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { Action } from "@/api/entities";
import {
  Building2,
  FolderOpen,
  BarChart3,
  Users,
  Phone,
  Mail,
  DollarSign,
  Kanban,
  Upload,
  UserCheck,
  Settings,
  ArrowRightLeft,
  Database,
  MessageSquare
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

const mainNavigationItems = [
  {
    title: "Tableau de bord",
    url: createPageUrl("Dashboard"),
    icon: BarChart3,
    description: "Vue d'overview"
  },
  {
    title: "Kanban",
    url: createPageUrl("Kanban"),
    icon: Kanban,
    description: "Tableau recouvrement"
  }
];

const bddNavigationItems = [
  {
    title: "Entreprises",
    url: createPageUrl("Entreprises"),
    icon: Building2,
    description: "Gestion des débiteurs"
  },
  {
    title: "Contacts",
    url: createPageUrl("Contacts"),
    icon: Users,
    description: "Gestion des contacts"
  },
  {
    title: "Dossiers",
    url: createPageUrl("Dossiers"),
    icon: FolderOpen,
    description: "Suivi recouvrement"
  },
  {
    title: "Transactions",
    url: createPageUrl("Transactions"),
    icon: ArrowRightLeft,
    description: "Flux financiers"
  },
  {
    title: "Actions",
    url: createPageUrl("Actions"),
    icon: Phone,
    description: "Historique des actions"
  }
];

const toolsNavigationItems = [
  {
    title: "Import",
    url: createPageUrl("Import"),
    icon: Upload,
    description: "Import de données"
  },
  {
    title: "Réassignation",
    url: createPageUrl("Reassignation"),
    icon: UserCheck,
    description: "Gestion des agents"
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionsStats, setActionsStats] = useState({
    appels: 0,
    emails: 0,
    sms: 0
  });

  useEffect(() => {
    const checkRole = async () => {
      try {
        const user = await User.me();
        setIsAdmin(user.role === 'admin');
      } catch (e) {
        setIsAdmin(false);
        console.error("Failed to fetch user role:", e);
      }
    };
    checkRole();
  }, []);

  useEffect(() => {
    const loadActionsStats = async () => {
      try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const allActions = await Action.list();
        
        // Filtrer les actions d'aujourd'hui
        const todayActions = allActions.filter(action => {
          const actionDate = new Date(action.date_action);
          return actionDate >= new Date(startOfDay) && actionDate <= new Date(endOfDay);
        });

        const stats = {
          appels: todayActions.filter(a => 
            a.type_action === "Appel sortant" || a.type_action === "Appel entrant"
          ).length,
          emails: todayActions.filter(a => a.type_action === "Email manuel").length,
          sms: todayActions.filter(a => a.type_action === "SMS").length
        };

        setActionsStats(stats);
      } catch (error) {
        console.error("Erreur lors du chargement des stats d'actions:", error);
      }
    };

    loadActionsStats();
    // Recharger les stats toutes les 5 minutes
    const interval = setInterval(loadActionsStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
        <Sidebar className="border-r border-slate-200 bg-white">
          {/* Sidebar Header */}
          <SidebarHeader className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">RecoveryPro</h2>
                <p className="text-xs text-slate-500">CRM Recouvrement</p>
              </div>
            </div>
          </SidebarHeader>
          
          {/* Sidebar Content */}
          <SidebarContent className="p-4">
            {/* Navigation principale */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainNavigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-3">
                          <item.icon className="w-5 h-5" />
                          <div className="flex-1">
                            <span className="font-medium text-sm">{item.title}</span>
                            <p className="text-xs opacity-70">{item.description}</p>
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Actions rapides
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2 space-y-3">
                  <Link 
                    to={createPageUrl("Actions") + "?filter=appels"}
                    className="flex items-center gap-2 text-sm hover:bg-slate-100 rounded p-1 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Appels aujourd'hui</span>
                    <span className="ml-auto font-semibold text-emerald-600">{actionsStats.appels}</span>
                  </Link>
                  <Link 
                    to={createPageUrl("Actions") + "?filter=emails"}
                    className="flex items-center gap-2 text-sm hover:bg-slate-100 rounded p-1 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Emails envoyés</span>
                    <span className="ml-auto font-semibold text-blue-600">{actionsStats.emails}</span>
                  </Link>
                  <Link 
                    to={createPageUrl("Actions") + "?filter=sms"}
                    className="flex items-center gap-2 text-sm hover:bg-slate-100 rounded p-1 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">SMS envoyés</span>
                    <span className="ml-auto font-semibold text-purple-600">{actionsStats.sms}</span>
                  </Link>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Base de données */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Base de données
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {bddNavigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-3">
                          <item.icon className="w-5 h-5" />
                          <div className="flex-1">
                            <span className="font-medium text-sm">{item.title}</span>
                            <p className="text-xs opacity-70">{item.description}</p>
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Outils - maintenant en bas */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Outils
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {toolsNavigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-3">
                          <item.icon className="w-5 h-5" />
                          <div className="flex-1">
                            <span className="font-medium text-sm">{item.title}</span>
                            <p className="text-xs opacity-70">{item.description}</p>
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {isAdmin && (
                     <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === createPageUrl("Administration") ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white' : ''
                        }`}
                      >
                        <Link to={createPageUrl("Administration")} className="flex items-center gap-3 px-3 py-3">
                          <Settings className="w-5 h-5" />
                          <div className="flex-1">
                            <span className="font-medium text-sm">Administration</span>
                            <p className="text-xs opacity-70">Configuration</p>
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          {/* Sidebar Footer */}
          <SidebarFooter className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                <span className="text-slate-700 font-medium text-sm">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">Agent</p>
                <p className="text-xs text-slate-500 truncate">Recouvrement</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-slate-200 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-semibold text-slate-900">RecoveryPro</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Ajout du Toaster pour les notifications */}
      <Toaster />
    </SidebarProvider>
  );
}

