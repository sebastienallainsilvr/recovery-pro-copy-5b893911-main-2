
import React, { useState, useEffect } from "react";
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
import MultiSelect from "@/components/ui/multi-select"; // Importer le nouveau composant

const STATUTS_FINAUX = ["FULLY RECOVERED", "WRITTEN OFF / CANCELLED", "COLLECTIVE PROCEDURE"];
const AGENTS_VALIDES = ["Maya", "Andrea", "Dylon", "Sébastien"];
const FOURNISSEURS = ["SILVR", "SILVR_REPURCHASED", "SILVR_SLAM_FFS", "SLAM", "DELPHI_F1"];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

export default function Dashboard() {
  const [entreprises, setEntreprises] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [excludeFinal, setExcludeFinal] = useState(true);
  const [selectedAgents, setSelectedAgents] = useState([]); // Changé en tableau
  const [selectedPays, setSelectedPays] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");
  const [selectedFournisseurs, setSelectedFournisseurs] = useState([]); // Changé en tableau

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entreprisesData, dossiersData, transactionsData, actionsData] = await Promise.all([
        EntrepriseDebiteur.list(),
        DossierRecouvrement.list(),
        Transaction.list(),
        Action.list()
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
          differenceInDays(new Date(), parseISO(dossier.date_premier_impaye)) : 0;
        
        // Calculer jours depuis dernière action
        const actionsEntreprise = actionsData.filter(a => a.entreprise_id === dossier.entreprise_id);
        const derniereAction = actionsEntreprise.length > 0 ? 
          actionsEntreprise.reduce((latest, action) => 
            parseISO(action.date_action) > parseISO(latest.date_action) ? action : latest
          ) : null;
        
        const joursDepuisDerniereAction = derniereAction ? 
          differenceInDays(new Date(), parseISO(derniereAction.date_action)) : null;

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

      setEntreprises(entreprisesData);
      setDossiers(enrichedDossiers);
      setTransactions(transactionsData);
      setActions(actionsData);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les dossiers selon les critères
  const getFilteredDossiers = () => {
    return dossiers.filter(dossier => {
      // Filtre statuts finaux
      if (excludeFinal && STATUTS_FINAUX.includes(dossier.statut_recouvrement)) {
        return false;
      }
      
      // Filtre agent (multi-sélection)
      if (selectedAgents.length > 0 && !selectedAgents.includes(dossier.entreprise?.agent_assigne)) {
        return false;
      }
      
      // Filtre pays
      if (selectedPays !== "all" && dossier.entreprise?.pays !== selectedPays) {
        return false;
      }
      
      // Nouveau filtre fournisseur (multi-sélection)
      if (selectedFournisseurs.length > 0 && !selectedFournisseurs.includes(dossier.fournisseur_pret)) {
        return false;
      }
      
      return true;
    });
  };

  const filteredDossiers = getFilteredDossiers();

  // Calculer la période sélectionnée
  const getPeriodDates = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case "current_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "last_7_days":
        return { start: subDays(now, 7), end: now };
      case "last_30_days":
        return { start: subDays(now, 30), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  // KPIs
  const stats = {
    dossiersActifs: filteredDossiers.length,
    montantTotal: filteredDossiers.reduce((sum, d) => sum + (d.montant_restant_du || 0), 0),
    montantRecouvre: transactions
      .filter(t => 
        ["Paiement", "Virement reçu"].includes(t.type_transaction) &&
        t.pris_en_compte_calcul === true &&
        t.statut !== "Annulé" &&
        parseISO(t.date_transaction) >= periodStart &&
        parseISO(t.date_transaction) <= periodEnd &&
        // Filtrer les transactions selon les dossiers filtrés
        filteredDossiers.some(d => d.id === t.dossier_id)
      )
      .reduce((sum, t) => sum + (t.montant || 0), 0),
    entreprisesAReassigner: entreprises.filter(e => 
      !e.agent_assigne || !AGENTS_VALIDES.includes(e.agent_assigne)
    ).length
  };

  // Calcul du taux de récupération
  const montantInitialPeriode = filteredDossiers.reduce((sum, d) => sum + (d.montant_initial || 0), 0);
  const tauxRecuperation = montantInitialPeriode > 0 ? (stats.montantRecouvre / montantInitialPeriode) * 100 : 0;

  // Données pour les graphiques
  
  // 1. Répartition par statut
  const statutsData = filteredDossiers.reduce((acc, dossier) => {
    const statut = dossier.statut_recouvrement;
    acc[statut] = (acc[statut] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statutsData).map(([statut, count]) => ({
    name: statut.replace(/_/g, ' '),
    value: count,
    montant: filteredDossiers
      .filter(d => d.statut_recouvrement === statut)
      .reduce((sum, d) => sum + (d.montant_restant_du || 0), 0)
  }));

  // 2. Performance par agent
  const agentPerformance = AGENTS_VALIDES.map(agent => {
    // La logique ici reste valide même avec multi-sélection, elle calcule la perf pour chaque agent individuellement
    const dossiersAgent = filteredDossiers.filter(d => d.entreprise?.agent_assigne === agent);
    const montantRecouvreSurPeriode = transactions
      .filter(t => 
        ["Paiement", "Virement reçu"].includes(t.type_transaction) &&
        t.pris_en_compte_calcul === true &&
        t.statut !== "Annulé" &&
        parseISO(t.date_transaction) >= periodStart &&
        parseISO(t.date_transaction) <= periodEnd &&
        dossiersAgent.some(d => d.id === t.dossier_id)
      )
      .reduce((sum, t) => sum + (t.montant || 0), 0);

    return {
      agent,
      dossiers: dossiersAgent.length,
      montantRecouvre: montantRecouvreSurPeriode,
      montantTotal: dossiersAgent.reduce((sum, d) => sum + (d.montant_restant_du || 0), 0)
    };
  });

  // 3. Ancienneté des créances
  const ancienneteData = [
    { tranche: "0-30j", count: 0, montant: 0 },
    { tranche: "31-60j", count: 0, montant: 0 },
    { tranche: "61-90j", count: 0, montant: 0 },
    { tranche: "91-180j", count: 0, montant: 0 },
    { tranche: "+180j", count: 0, montant: 0 }
  ];

  filteredDossiers.forEach(dossier => {
    const jours = dossier.jours_retard || 0;
    let index;
    if (jours <= 30) index = 0;
    else if (jours <= 60) index = 1;
    else if (jours <= 90) index = 2;
    else if (jours <= 180) index = 3;
    else index = 4;

    ancienneteData[index].count++;
    ancienneteData[index].montant += dossier.montant_restant_du || 0;
  });

  // 4. Actions du jour à faire (dossiers sans action depuis plus de X jours)
  const actionsAFaire = filteredDossiers
    .filter(d => (d.jours_depuis_derniere_action || 0) > 3)
    .sort((a, b) => (b.jours_depuis_derniere_action || 0) - (a.jours_depuis_derniere_action || 0))
    .slice(0, 10);

  // 5. Promesses de paiement à surveiller
  const promessesASurveiller = filteredDossiers
    .filter(d => d.statut_recouvrement === "PROMISE TO PAY")
    .slice(0, 10);

  // 6. Top 10 des plus gros dossiers
  const topDossiers = filteredDossiers
    .sort((a, b) => (b.montant_restant_du || 0) - (a.montant_restant_du || 0))
    .slice(0, 10);

  const agentOptions = AGENTS_VALIDES.map(agent => ({ value: agent, label: agent }));
  const fournisseurOptions = FOURNISSEURS.map(f => ({ value: f, label: f }));

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
                      checked={excludeFinal}
                      onCheckedChange={setExcludeFinal}
                    />
                    <span className="text-sm">Exclure statuts finaux</span>
                  </div>
                  
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
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
                    selected={selectedFournisseurs}
                    onChange={setSelectedFournisseurs}
                    placeholder="Fournisseurs"
                    className="w-full"
                  />
                  
                  {/* Nouveau filtre agent multi-select */}
                  <MultiSelect
                    options={agentOptions}
                    selected={selectedAgents}
                    onChange={setSelectedAgents}
                    placeholder="Agents"
                    className="w-full"
                  />

                  <div className="flex gap-2">
                    <Button
                      variant={selectedPays === "France" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPays(selectedPays === "France" ? "all" : "France")}
                    >
                      France
                    </Button>
                    <Button
                      variant={selectedPays === "Allemagne" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPays(selectedPays === "Allemagne" ? "all" : "Allemagne")}
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
              <div className="text-3xl font-bold text-slate-900">{stats.dossiersActifs}</div>
              <p className="text-xs text-slate-500 mt-1">
                {excludeFinal ? 'Statuts finaux exclus' : 'Tous statuts'}
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
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.montantTotal)}
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
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.montantRecouvre)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {selectedPeriod === 'current_month' ? 'Ce mois' : 'Période sélectionnée'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Taux Récupération</CardTitle>
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{tauxRecuperation.toFixed(1)}%</div>
              <Progress value={tauxRecuperation} className="mt-2 h-2" />
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
                {pieData.map((entry, index) => (
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
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
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
              <BarChart data={agentPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              <BarChart data={ancienneteData}>
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
                {actionsAFaire.map((dossier) => (
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
                {actionsAFaire.length === 0 && (
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
                {topDossiers.slice(0, 5).map((dossier) => (
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
        {stats.entreprisesAReassigner > 0 && (
          <Card className="mt-8 border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-900">
                      {stats.entreprisesAReassigner} entreprise{stats.entreprisesAReassigner > 1 ? 's' : ''} à réassigner
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
