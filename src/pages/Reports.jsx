import React, { useState, useEffect } from "react";
import { 
  EntrepriseDebiteur, 
  DossierRecouvrement, 
  Transaction, 
  Action, 
  HistoriqueStatut 
} from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  FileDown, 
  Mail, 
  Filter,
  Calendar,
  Users,
  TrendingUp,
  Building2,
  DollarSign
} from "lucide-react";

import EtatDossiersReport from "../components/reports/EtatDossiersReport";
import ActiviteRecouvrementReport from "../components/reports/ActiviteRecouvrementReport";
import PerformanceAgentsReport from "../components/reports/PerformanceAgentsReport";
import FluxFinanciersReport from "../components/reports/FluxFinanciersReport";
import HistoriqueChangementsReport from "../components/reports/HistoriqueChangementsReport";

const STATUTS_FINAUX = ["FULLY RECOVERED", "WRITTEN OFF / CANCELLED", "COLLECTIVE PROCEDURE"];

export default function Reports() {
  const [data, setData] = useState({
    entreprises: [],
    dossiers: [],
    transactions: [],
    actions: [],
    historique: []
  });
  const [loading, setLoading] = useState(true);
  const [excludeFinal, setExcludeFinal] = useState(true);
  const [activeTab, setActiveTab] = useState("etat-dossiers");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        entreprisesData,
        dossiersData,
        transactionsData,
        actionsData,
        historiqueData
      ] = await Promise.all([
        EntrepriseDebiteur.list(),
        DossierRecouvrement.list(),
        Transaction.list(),
        Action.list(),
        HistoriqueStatut.list()
      ]);

      // Enrichir les dossiers avec les calculs
      const enrichedDossiers = dossiersData.map(dossier => {
        const entreprise = entreprisesData.find(e => e.id === dossier.entreprise_id);
        
        // Calculer montant_total_paye
        const transactionsValides = transactionsData.filter(t => 
          t.dossier_id === dossier.id &&
          ["Paiement", "Virement reçu"].includes(t.type_transaction) &&
          t.pris_en_compte_calcul === true &&
          t.statut !== "Annulé"
        );
        const montantTotalPaye = transactionsValides.reduce((sum, t) => sum + (t.montant || 0), 0);
        
        // Calculer montant_restant_du
        const montantRestant = (dossier.montant_initial || 0) - montantTotalPaye;
        
        // Calculer jours de retard
        const joursRetard = dossier.date_premier_impaye ? 
          Math.floor((new Date() - new Date(dossier.date_premier_impaye)) / (1000 * 60 * 60 * 24)) : 0;

        // Calculer jours depuis dernière action
        const actionsEntreprise = actionsData.filter(a => a.entreprise_id === dossier.entreprise_id);
        const derniereAction = actionsEntreprise.length > 0 ? 
          actionsEntreprise.reduce((latest, action) => 
            new Date(action.date_action) > new Date(latest.date_action) ? action : latest
          ) : null;
        
        const joursDepuisDerniereAction = derniereAction ? 
          Math.floor((new Date() - new Date(derniereAction.date_action)) / (1000 * 60 * 60 * 24)) : null;

        return {
          ...dossier,
          entreprise,
          montant_total_paye: montantTotalPaye,
          montant_restant_du: montantRestant,
          jours_retard: joursRetard,
          jours_depuis_derniere_action: joursDepuisDerniereAction,
          derniere_action: derniereAction
        };
      });

      setData({
        entreprises: entreprisesData,
        dossiers: enrichedDossiers,
        transactions: transactionsData,
        actions: actionsData,
        historique: historiqueData
      });
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredDossiers = () => {
    return data.dossiers.filter(dossier => {
      if (excludeFinal && STATUTS_FINAUX.includes(dossier.statut_recouvrement)) {
        return false;
      }
      return true;
    });
  };

  const exportCSV = (csvContent, filename) => {
    const BOM = '\uFEFF'; // UTF-8 BOM pour Excel
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendByEmail = async (csvContent, filename) => {
    // Ici, vous pourriez utiliser l'intégration SendEmail de base44
    // Pour le moment, nous allons juste télécharger le fichier
    alert("Fonctionnalité d'envoi par email à implémenter avec l'intégration base44");
    exportCSV(csvContent, filename);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 rounded"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const filteredDossiers = getFilteredDossiers();

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Rapports et Analytics</h1>
              <p className="text-slate-600">Génération et export des rapports de recouvrement</p>
            </div>

            {/* Filtre global */}
            <Card className="w-full lg:w-auto">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={excludeFinal}
                    onCheckedChange={setExcludeFinal}
                  />
                  <span className="text-sm font-medium">Exclure statuts finaux</span>
                  <Badge variant="outline">
                    {filteredDossiers.length} dossiers
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Onglets des rapports */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 lg:grid-cols-5 h-auto">
            <TabsTrigger value="etat-dossiers" className="flex items-center gap-2 p-3">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">État Dossiers</span>
            </TabsTrigger>
            <TabsTrigger value="activite" className="flex items-center gap-2 p-3">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Activité</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2 p-3">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="flux" className="flex items-center gap-2 p-3">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Flux</span>
            </TabsTrigger>
            <TabsTrigger value="historique" className="flex items-center gap-2 p-3">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="etat-dossiers" className="mt-6">
            <EtatDossiersReport
              dossiers={filteredDossiers}
              onExportCSV={exportCSV}
              onSendEmail={sendByEmail}
            />
          </TabsContent>

          <TabsContent value="activite" className="mt-6">
            <ActiviteRecouvrementReport
              actions={data.actions}
              entreprises={data.entreprises}
              dossiers={filteredDossiers}
              onExportCSV={exportCSV}
              onSendEmail={sendByEmail}
            />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <PerformanceAgentsReport
              dossiers={filteredDossiers}
              actions={data.actions}
              transactions={data.transactions}
              onExportCSV={exportCSV}
              onSendEmail={sendByEmail}
            />
          </TabsContent>

          <TabsContent value="flux" className="mt-6">
            <FluxFinanciersReport
              transactions={data.transactions}
              entreprises={data.entreprises}
              dossiers={filteredDossiers}
              onExportCSV={exportCSV}
              onSendEmail={sendByEmail}
            />
          </TabsContent>

          <TabsContent value="historique" className="mt-6">
            <HistoriqueChangementsReport
              historique={data.historique}
              entreprises={data.entreprises}
              dossiers={filteredDossiers}
              onExportCSV={exportCSV}
              onSendEmail={sendByEmail}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}