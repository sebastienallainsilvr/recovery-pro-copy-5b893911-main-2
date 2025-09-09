import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock } from "lucide-react";

import TemplatesAdmin from "../components/admin/TemplatesAdmin";
import RulesAdmin from "../components/admin/RulesAdmin";
// Importer les autres composants d'administration quand ils seront créés
// import AgentManagement from "../components/admin/AgentManagement";
// import ImportHistory from "../components/admin/ImportHistory";
// import ReferenceDataAdmin from "../components/admin/ReferenceDataAdmin";

export default function Administration() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const currentUser = await User.me();
        setIsAdmin(currentUser && currentUser.role === 'admin');
      } catch (error) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdminRole();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-12 bg-slate-200 rounded w-1/3"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 flex justify-center items-center h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <Lock className="w-6 h-6" />
              Accès non autorisé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Vous devez avoir le rôle d'administrateur pour accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Administration</h1>
          <p className="text-slate-600">Configuration et gestion de l'application</p>
        </div>

        <Tabs defaultValue="templates">
          <TabsList className="grid grid-cols-2 lg:grid-cols-5 h-auto">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="rules">Règles métier</TabsTrigger>
            <TabsTrigger value="agents" disabled>Gestion Agents</TabsTrigger>
            <TabsTrigger value="imports" disabled>Imports</TabsTrigger>
            <TabsTrigger value="reference" disabled>Données</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-6">
            <TemplatesAdmin />
          </TabsContent>
          
          <TabsContent value="rules" className="mt-6">
            <RulesAdmin />
          </TabsContent>
          
          {/* Les autres onglets seront activés quand les composants seront prêts */}
        </Tabs>
      </div>
    </div>
  );
}