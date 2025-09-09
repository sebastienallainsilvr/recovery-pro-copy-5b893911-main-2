import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileDown, Mail, Users } from "lucide-react";
import { startOfMonth, endOfMonth, subDays, parseISO } from "date-fns";

const AGENTS = ["Maya", "Andrea", "Dylon", "Sébastien"];

export default function PerformanceAgentsReport({ dossiers, actions, transactions, onExportCSV, onSendEmail }) {
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");

  const getPeriodDates = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case "current_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "last_30_days":
        return { start: subDays(now, 30), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  const generateAgentStats = () => {
    return AGENTS.map(agent => {
      // Dossiers assignés à l'agent
      const dossiersAgent = dossiers.filter(d => d.entreprise?.agent_assigne === agent);
      
      // Montant total géré
      const montantGere = dossiersAgent.reduce((sum, d) => sum + (d.montant_restant_du || 0), 0);
      
      // Transactions récupérées sur la période
      const transactionsRecuperees = transactions.filter(t => {
        const transactionDate = parseISO(t.date_transaction);
        const dossierAgent = dossiersAgent.some(d => d.id === t.dossier_id);
        
        return dossierAgent &&
               ["Paiement", "Virement reçu"].includes(t.type_transaction) &&
               t.pris_en_compte_calcul === true &&
               t.statut !== "Annulé" &&
               transactionDate >= periodStart &&
               transactionDate <= periodEnd;
      });
      
      const montantRecupere = transactionsRecuperees.reduce((sum, t) => sum + (t.montant || 0), 0);
      
      // Actions sur la période
      const actionsAgent = actions.filter(a => {
        const actionDate = parseISO(a.date_action);
        const dossiersAgentIds = dossiersAgent.map(d => d.entreprise_id);
        
        return dossiersAgentIds.includes(a.entreprise_id) &&
               actionDate >= periodStart &&
               actionDate <= periodEnd;
      });
      
      // Taux de succès (actions avec résultat positif)
      const actionsPositives = actionsAgent.filter(a => 
        ["Contact établi", "Promesse de paiement"].includes(a.resultat)
      );
      const tauxSucces = actionsAgent.length > 0 ? 
        (actionsPositives.length / actionsAgent.length) * 100 : 0;

      return {
        agent,
        nbDossiers: dossiersAgent.length,
        montantGere,
        montantRecupere,
        tauxSucces: Math.round(tauxSucces),
        nbActions: actionsAgent.length
      };
    });
  };

  const agentStats = generateAgentStats();

  const generateCSV = () => {
    const headers = [
      "Agent",
      "Nb dossiers actifs",
      "Montant géré (€)",
      "Récupéré période (€)",
      "Taux succès (%)",
      "Nb actions"
    ];
    
    const rows = agentStats.map(stat => [
      stat.agent,
      stat.nbDossiers,
      stat.montantGere,
      stat.montantRecupere,
      stat.tauxSucces,
      stat.nbActions
    ]);

    // Ajouter totaux
    const totaux = [
      "TOTAL",
      agentStats.reduce((sum, s) => sum + s.nbDossiers, 0),
      agentStats.reduce((sum, s) => sum + s.montantGere, 0),
      agentStats.reduce((sum, s) => sum + s.montantRecupere, 0),
      Math.round(agentStats.reduce((sum, s) => sum + s.tauxSucces, 0) / agentStats.length),
      agentStats.reduce((sum, s) => sum + s.nbActions, 0)
    ];

    const csvContent = [headers, ...rows, totaux]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n');

    return csvContent;
  };

  const handleExport = () => {
    const csvContent = generateCSV();
    onExportCSV(csvContent, "performance_agents");
  };

  const handleEmail = () => {
    const csvContent = generateCSV();
    onSendEmail(csvContent, "performance_agents");
  };

  // Calculs totaux
  const totaux = {
    nbDossiers: agentStats.reduce((sum, s) => sum + s.nbDossiers, 0),
    montantGere: agentStats.reduce((sum, s) => sum + s.montantGere, 0),
    montantRecupere: agentStats.reduce((sum, s) => sum + s.montantRecupere, 0),
    tauxSucces: Math.round(agentStats.reduce((sum, s) => sum + s.tauxSucces, 0) / agentStats.length),
    nbActions: agentStats.reduce((sum, s) => sum + s.nbActions, 0)
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Performance des Agents
          </CardTitle>
          
          <div className="flex items-center gap-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Ce mois</SelectItem>
                <SelectItem value="last_month">Mois dernier</SelectItem>
                <SelectItem value="last_30_days">30 derniers jours</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Envoyer
              </Button>
              <Button onClick={handleExport}>
                <FileDown className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Agent</TableHead>
                <TableHead className="font-semibold">Nb dossiers actifs</TableHead>
                <TableHead className="font-semibold">Montant géré</TableHead>
                <TableHead className="font-semibold">Récupéré période</TableHead>
                <TableHead className="font-semibold">Taux succès</TableHead>
                <TableHead className="font-semibold">Nb actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentStats.map((stat) => (
                <TableRow key={stat.agent} className="hover:bg-slate-50">
                  <TableCell className="font-medium">
                    <Badge variant="outline" className="bg-blue-50">
                      {stat.agent}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {stat.nbDossiers}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stat.montantGere)}
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stat.montantRecupere)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      stat.tauxSucces >= 70 ? "text-green-600" :
                      stat.tauxSucces >= 50 ? "text-orange-600" : "text-red-600"
                    }>
                      {stat.tauxSucces}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {stat.nbActions}
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Ligne totaux */}
              <TableRow className="bg-slate-100 font-semibold border-t-2">
                <TableCell>
                  <Badge>TOTAL</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {totaux.nbDossiers}
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totaux.montantGere)}
                </TableCell>
                <TableCell className="text-green-600">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totaux.montantRecupere)}
                </TableCell>
                <TableCell>
                  {totaux.tauxSucces}%
                </TableCell>
                <TableCell className="text-center">
                  {totaux.nbActions}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}