import React, { useState, useEffect, useMemo, useCallback } from "react";
import { EntrepriseDebiteur, DossierRecouvrement, Transaction, Action } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, DollarSign, Clock, AlertTriangle, TrendingUp, Users, Phone, Calendar, Target, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, differenceInDays, startOfMonth, endOfMonth, subDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MultiSelect from "@/components/ui/multi-select";

// Import des nouvelles utilitaires
import { logger } from "@/components/utils/logger";
import { 
  enrichDossier, 
  calculateDashboardStats, 
  calculateChartData,
  calculatePriorityLists 
} from "@/components/utils/dashboardCalculations";

const STATUTS_FINAUX = ["FULLY RECOVERED", "WRITTEN OFF / CANCELLED", "COLLECTIVE PROCEDURE"];
const AGENTS_VALIDES = ["Maya", "Andrea", "Dylon", "Sébastien"];
const FOURNISSEURS = ["SILVR", "SILVR_REPURCHASED", "SILVR_SLAM_FFS", "SLAM", "DELPHI_F1"];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

export default function Dashboard() {
  // États pour les données brutes
  const [rawData, setRawData] = useState({
    entreprises: [],
    dossiers: [],
    transactions: [],
    actions: []
  });
  const [loading, setLoading] = useState(true);

  // États pour les filtres regroupés
  const [filters, setFilters] = useState({
    excludeFinal: true,
    selectedAgents: [],
    selectedPays: "all",
    selectedPeriod: "current_month",
    selectedFournisseurs: []
  });

  const navigate = useNavigate();

  // Chargement des données optimisé
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      logger.debug("Début du chargement des données du dashboard");
      
      const [entreprisesData, dossiersData, transactionsData, actionsData] = await Promise.all([
        EntrepriseDebiteur.list(),
        DossierRecouvrement.list(),
        Transaction.list(),
        Action.list()
      ]);

      setRawData({
        entreprises: entreprisesData,
        dossiers: dossiersData,
        transactions: transactionsData,
        actions: actionsData
      });
      
      logger.debug("Données du dashboard chargées avec succès", {
        entreprises: entreprisesData.length,
        dossiers: dossiersData.length,
        transactions: transactionsData.length,
        actions: actionsData.length
      });
    } catch (error) {
      logger.error("Erreur lors du chargement des données du dashboard", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Enrichissement des dossiers avec memoization
  const enrichedDossiers = useMemo(() => {
    if (!rawData.dossiers.length) return [];
    
    logger.debug("Enrichissement des dossiers en cours", { count: rawData.dossiers.length });
    
    return rawData.dossiers.map(dossier => 
      enrichDossier(dossier, rawData.entreprises, rawData.transactions, rawData.actions)
    );
  }, [rawData]);

  // Données filtrées avec memoization
  const filteredDossiers = useMemo(() => {
    let filtered = enrichedDossiers;

    // Filtre statuts finaux
    if (filters.excludeFinal) {
      filtered = filtered.filter(dossier => !STATUTS_FINAUX.includes(dossier.statut_recouvrement));
    }
    
    // Filtre agent (multi-sélection)
    if (filters.selectedAgents.length > 0) {
      filtered = filtered.filter(dossier => 
        dossier.entreprise && filters.selectedAgents.includes(dossier.entreprise.agent_assigne)
      );
    }
    
    // Filtre pays
    if (filters.selectedPays !== "all") {
      filtered = filtered.filter(dossier => 
        dossier.entreprise && dossier.entreprise.pays === filters.selectedPays
      );
    }
    
    // Filtre fournisseur (multi-sélection)
    if (filters.selectedFournisseurs.length > 0) {
      filtered = filtered.filter(dossier => 
        filters.selectedFournisseurs.includes(dossier.fournisseur_pret)
      );
    }

    logger.debug("Filtrage des dossiers terminé", { 
      initial: enrichedDossiers.length, 
      filtered: filtered.length 
    });

    return filtered;
  }, [enrichedDossiers, filters]);

  // Statistiques du dashboard avec memoization
  const dashboardStats = useMemo(() => {
    const stats = calculateDashboardStats(filteredDossiers, rawData.transactions, filters.selectedPeriod);
    
    // Ajouter le calcul des entreprises à réassigner
    const entreprisesAReassigner = rawData.entreprises.filter(e => 
      !e.agent_assigne || !AGENTS_VALIDES.includes(e.agent_assigne)
    ).length;

    return { ...stats, entreprisesAReassigner };
  }, [filteredDossiers, rawData.transactions, rawData.entreprises, filters.selectedPeriod]);

  // Données pour les graphiques avec memoization
  const chartData = useMemo(() => {
    return calculateChartData(filteredDossiers, rawData.transactions, filters.selectedPeriod, AGENTS_VALIDES);
  }, [filteredDossiers, rawData.transactions, filters.selectedPeriod]);

  // Listes prioritaires avec memoization
  const priorityLists = useMemo(() => {
    return calculatePriorityLists(filteredDossiers);
  }, [filteredDossiers]);

  // Gestionnaires de changement de filtre optimisés avec useCallback
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    logger.debug("Filtre mis à jour", { key, value });
  }, []);

  const handleExcludeFinalChange = useCallback((checked) => {
    handleFilterChange('excludeFinal', checked);
  }, [handleFilterChange]);

  const handleAgentsChange = useCallback((agents) => {
    handleFilterChange('selectedAgents', agents);
  }, [handleFilterChange]);

  const handlePaysChange = useCallback((pays) => {
    handleFilterChange('selectedPays', pays);
  }, [handleFilterChange]);

  const handlePeriodChange = useCallback((period) => {
    handleFilterChange('selectedPeriod', period);
  }, [handleFilterChange]);

  const handleFournisseursChange = useCallback((fournisseurs) => {
    handleFilterChange('selectedFournisseurs', fournisseurs);
  }, [handleFilterChange]);

  // Options pour les selects avec memoization
  const agentOptions = useMemo(() => 
    AGENTS_VALIDES.map(agent => ({ value: agent, label: agent })), []
  );
  
  const fournisseurOptions = useMemo(() => 
    FOURNISSEURS.map(f => ({ value: f, label: f })), []
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array(8).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* En-tête avec filtres */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Tableau de bord</h1>
              <p className="text-slate-600">Vue d'overview des activités de recouvrement</p>
            </div>

            {/* Filtres */}
            <Card className="w-full lg:w-auto">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2 col-span-2 md:col-span-1">
                    <Switch 
                      checked={filters.excludeFinal}
                      onCheckedChange={handleExcludeFinalChange}
                    />
                    <span className="text-sm">Exclure statuts finaux</span>
                  </div>
                  
                  <Select value={filters.selectedPeriod} onValueChange={handlePeriodChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current_month">Ce mois</SelectItem>
                      <SelectItem value="last_month">Mois dernier</SelectItem>
                      <SelectItem value="last_7_days">7 derniers jours</SelectItem>
                      <SelectItem value="last_30_days">30 derniers jours</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Nouveau filtre fournisseur multi-select */}
                  <MultiSelect
                    options={fournisseurOptions}
                    selected={filters.selectedFournisseurs}
                    onChange={handleFournisseursChange}
                    placeholder="Fournisseurs"
                    className="w-full"
                  />
                  
                  {/* Nouveau filtre agent multi-select */}
                  <MultiSelect
                    options={agentOptions}
                    selected={filters.selectedAgents}
                    onChange={handleAgentsChange}
                    placeholder="Agents"
                    className="w-full"
                  />

                  <div className="flex gap-2">
                    <Button
                      variant={filters.selectedPays === "France" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePaysChange(filters.selectedPays === "France" ? "all" : "France")}
                    >
                      France
                    </Button>
                    <Button
                      variant={filters.selectedPays === "Allemagne" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePaysChange(filters.selectedPays === "Allemagne" ? "all" : "Allemagne")}
                    >
                      Allemagne
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Dossiers Actifs</CardTitle>
              <FolderOpen className="w-5 h-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{dashboardStats.dossiersActifs}</div>
              <p className="text-xs text-slate-500 mt-1">
                {filters.excludeFinal ? 'Statuts finaux exclus' : 'Tous statuts'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Montant à Recouvrer</CardTitle>
              <Target className="w-5 h-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(dashboardStats.montantTotal)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Total des créances actives</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Récupéré sur période</CardTitle>
              <DollarSign className="w-5 h-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(dashboardStats.montantRecouvre)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {filters.selectedPeriod === 'current_month' ? 'Ce mois' : 'Période sélectionnée'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Taux Récupération</CardTitle>
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{dashboardStats.tauxRecuperation.toFixed(1)}%</div>
              <Progress value={dashboardStats.tauxRecuperation} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Graphique Répartition par statut - sur toute la largeur */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Répartition par Statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              {/* Légende à gauche */}
              <div className="flex-shrink-0 space-y-2">
                {chartData.pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="text-sm">
                      <div className="font-medium text-slate-900">{entry.name}</div>
                      <div className="text-xs text-slate-500">
                        {entry.value} dossier{entry.value > 1 ? 's' : ''} • {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(entry.montant)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Graphique */}
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={chartData.pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [
                        `${value} dossiers`,
                        `Montant: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(props.payload.montant)}`
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance par agent - sur toute la largeur */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Performance par Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData.agentPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agent" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value),
                    name === 'montantRecouvre' ? 'Récupéré' : 'Total dû'
                  ]}
                />
                <Bar dataKey="montantRecouvre" fill="#10b981" name="Récupéré" />
                <Bar dataKey="montantTotal" fill="#6b7280" name="Total dû" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ancienneté des créances */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Ancienneté des Créances</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.ancienneteData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tranche" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'count' ? `${value} dossiers` : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value),
                    name === 'count' ? 'Nombre' : 'Montant'
                  ]}
                />
                <Bar dataKey="count" fill="#3b82f6" name="Nombre" />
                <Bar dataKey="montant" fill="#ef4444" name="Montant" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tableaux */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Actions du jour */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Actions Prioritaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {priorityLists.actionsAFaire.map((dossier) => (
                  <div key={dossier.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{dossier.entreprise?.nom_entreprise}</p>
                      <p className="text-sm text-slate-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', }).format(dossier.montant_restant_du || 0)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-orange-600">
                      {dossier.jours_depuis_derniere_action}j
                    </Badge>
                  </div>
                ))}
                {priorityLists.actionsAFaire.length === 0 && (
                  <p className="text-center text-slate-500 py-4">Aucune action prioritaire</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top dossiers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-500" />
                Plus Gros Dossiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {priorityLists.topDossiers.slice(0, 5).map((dossier) => (
                  <div key={dossier.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{dossier.entreprise?.nom_entreprise}</p>
                      <p className="text-sm text-slate-600">{dossier.statut_recouvrement}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', }).format(dossier.montant_restant_du || 0)}
                      </p>
                      <Badge className="text-xs" variant="outline">
                        {dossier.entreprise?.agent_assigne}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert entreprises à réassigner */}
        {dashboardStats.entreprisesAReassigner > 0 && (
          <Card className="mt-8 border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-900">
                      {dashboardStats.entreprisesAReassigner} entreprise{dashboardStats.entreprisesAReassigner > 1 ? 's' : ''} à réassigner
                    </p>
                    <p className="text-sm text-orange-700">
                      Ces entreprises ont des agents non valides et nécessitent une réassignation
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={() => navigate(createPageUrl("Reassignation"))}
                >
                  Gérer les réassignations
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}