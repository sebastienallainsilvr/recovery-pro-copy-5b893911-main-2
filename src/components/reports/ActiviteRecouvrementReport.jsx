import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileDown, Mail, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const ACTION_TYPES = ["all", "Appel sortant", "Appel entrant", "Email manuel", "SMS", "Courrier", "Visite", "Note interne"];
const AGENTS = ["all", "Maya", "Andrea", "Dylon", "Sébastien"];

export default function ActiviteRecouvrementReport({ actions, entreprises, dossiers, onExportCSV, onSendEmail }) {
  const [filters, setFilters] = useState({
    dateDebut: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    dateFin: format(new Date(), 'yyyy-MM-dd'),
    agent: "all",
    typeAction: "all"
  });

  const filteredActions = actions.filter(action => {
    const actionDate = parseISO(action.date_action);
    const filterDateDebut = new Date(filters.dateDebut);
    const filterDateFin = new Date(filters.dateFin + "T23:59:59");

    // Filtre période
    if (actionDate < filterDateDebut || actionDate > filterDateFin) {
      return false;
    }

    // Filtre agent
    if (filters.agent !== "all" && action.agent_responsable !== filters.agent) {
      return false;
    }

    // Filtre type d'action
    if (filters.typeAction !== "all" && action.type_action !== filters.typeAction) {
      return false;
    }

    return true;
  });

  const generateCSV = () => {
    const headers = [
      "Date",
      "Entreprise",
      "Agent",
      "Type action",
      "Résultat",
      "Notes"
    ];
    
    const rows = filteredActions.map(action => {
      const entreprise = entreprises.find(e => e.id === action.entreprise_id);
      
      return [
        format(parseISO(action.date_action), 'dd/MM/yyyy HH:mm', { locale: fr }),
        entreprise?.nom_entreprise || "Entreprise inconnue",
        action.agent_responsable || "",
        action.type_action || "",
        action.resultat || "",
        action.description || ""
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n');

    return csvContent;
  };

  const handleExport = () => {
    const csvContent = generateCSV();
    onExportCSV(csvContent, "activite_recouvrement");
  };

  const handleEmail = () => {
    const csvContent = generateCSV();
    onSendEmail(csvContent, "activite_recouvrement");
  };

  const getResultatColor = (resultat) => {
    const colors = {
      "Contact établi": "bg-green-100 text-green-800",
      "Promesse de paiement": "bg-emerald-100 text-emerald-800",
      "Refus de payer": "bg-red-100 text-red-800",
      "Pas de réponse": "bg-yellow-100 text-yellow-800",
      "Contestation": "bg-orange-100 text-orange-800"
    };
    return colors[resultat] || "bg-slate-100 text-slate-800";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Activité de Recouvrement ({filteredActions.length})
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
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
            <label className="text-sm font-medium mb-2 block">Agent</label>
            <Select value={filters.agent} onValueChange={(value) => setFilters(prev => ({...prev, agent: value}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les agents</SelectItem>
                {AGENTS.slice(1).map(agent => (
                  <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Type d'action</label>
            <Select value={filters.typeAction} onValueChange={(value) => setFilters(prev => ({...prev, typeAction: value}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {ACTION_TYPES.slice(1).map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
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
                <TableHead>Agent</TableHead>
                <TableHead>Type action</TableHead>
                <TableHead>Résultat</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActions.map((action) => {
                const entreprise = entreprises.find(e => e.id === action.entreprise_id);
                
                return (
                  <TableRow key={action.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm">
                      {format(parseISO(action.date_action), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entreprise?.nom_entreprise || "Entreprise inconnue"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{action.agent_responsable}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50">
                        {action.type_action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {action.resultat ? (
                        <Badge className={getResultatColor(action.resultat)}>
                          {action.resultat}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={action.description}>
                        {action.description || "-"}
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