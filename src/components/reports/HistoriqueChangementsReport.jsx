import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileDown, Mail, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const AGENTS = ["all", "Maya", "Andrea", "Dylon", "Sébastien", "Système"];

export default function HistoriqueChangementsReport({ historique, entreprises, dossiers, onExportCSV, onSendEmail }) {
  const [filters, setFilters] = useState({
    dateDebut: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    dateFin: format(new Date(), 'yyyy-MM-dd'),
    agent: "all"
  });

  const filteredHistorique = historique.filter(item => {
    const changeDate = parseISO(item.date_changement);
    const filterDateDebut = new Date(filters.dateDebut);
    const filterDateFin = new Date(filters.dateFin + "T23:59:59");

    // Filtre période
    if (changeDate < filterDateDebut || changeDate > filterDateFin) {
      return false;
    }

    // Filtre agent
    if (filters.agent !== "all" && item.change_par !== filters.agent) {
      return false;
    }

    return true;
  });

  const generateCSV = () => {
    const headers = [
      "Date",
      "Entreprise",
      "Ancien statut",
      "Nouveau statut",
      "Agent",
      "Motif"
    ];
    
    const rows = filteredHistorique.map(item => {
      const dossier = dossiers.find(d => d.id === item.dossier_id);
      const entreprise = dossier ? entreprises.find(e => e.id === dossier.entreprise_id) : null;
      
      return [
        format(parseISO(item.date_changement), 'dd/MM/yyyy HH:mm', { locale: fr }),
        entreprise?.nom_entreprise || "Entreprise inconnue",
        item.ancien_statut || "",
        item.nouveau_statut || "",
        item.change_par || "",
        item.motif || ""
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n');

    return csvContent;
  };

  const handleExport = () => {
    const csvContent = generateCSV();
    onExportCSV(csvContent, "historique_changements");
  };

  const handleEmail = () => {
    const csvContent = generateCSV();
    onSendEmail(csvContent, "historique_changements");
  };

  const getStatutColor = (statut) => {
    const colors = {
      "PENDING ASSIGNATION": "bg-yellow-100 text-yellow-800",
      "R1": "bg-blue-100 text-blue-800",
      "R2": "bg-blue-100 text-blue-800",
      "R3": "bg-blue-100 text-blue-800",
      "R4": "bg-orange-100 text-orange-800",
      "R5": "bg-red-100 text-red-800",
      "PROMISE TO PAY": "bg-green-100 text-green-800",
      "FULLY RECOVERED": "bg-emerald-100 text-emerald-800",
      "WRITTEN OFF / CANCELLED": "bg-slate-100 text-slate-800"
    };
    return colors[statut] || "bg-slate-100 text-slate-800";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Historique des Changements ({filteredHistorique.length})
          </CardTitle>
          
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
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
          <div>
            <label className="text-sm font-medium mb-2 block">Date début</label>
            <Input
              type="date"
              value={filters.dateDebut}
              onChange={(e) => setFilters(prev => ({...prev, dateDebut: e.target.value}))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date fin</label>
            <Input
              type="date"
              value={filters.dateFin}
              onChange={(e) => setFilters(prev => ({...prev, dateFin: e.target.value}))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Modifié par</label>
            <Select value={filters.agent} onValueChange={(value) => setFilters(prev => ({...prev, agent: value}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {AGENTS.slice(1).map(agent => (
                  <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Date</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Ancien statut</TableHead>
                <TableHead>Nouveau statut</TableHead>
                <TableHead>Modifié par</TableHead>
                <TableHead>Motif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistorique.map((item) => {
                const dossier = dossiers.find(d => d.id === item.dossier_id);
                const entreprise = dossier ? entreprises.find(e => e.id === dossier.entreprise_id) : null;
                
                return (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm">
                      {format(parseISO(item.date_changement), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entreprise?.nom_entreprise || "Entreprise inconnue"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatutColor(item.ancien_statut)}>
                        {item.ancien_statut?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatutColor(item.nouveau_statut)}>
                        {item.nouveau_statut?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.change_par}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={item.motif}>
                        {item.motif || "-"}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}