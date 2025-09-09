import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileDown, Mail, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUTS_OPTIONS = [
  "all", "PENDING ASSIGNATION", "R1", "R2", "R3", "R4", "R5", "PROMISE TO PAY", 
  "UNDER NEGOTIATION", "FULLY RECOVERED", "WRITTEN OFF / CANCELLED"
];

const AGENTS = ["all", "Maya", "Andrea", "Dylon", "Sébastien"];

export default function EtatDossiersReport({ dossiers, onExportCSV, onSendEmail }) {
  const [filters, setFilters] = useState({
    statut: "all",
    agent: "all",
    montantMin: "",
    montantMax: ""
  });

  const filteredDossiers = dossiers.filter(dossier => {
    // Filtre statut
    if (filters.statut !== "all" && dossier.statut_recouvrement !== filters.statut) {
      return false;
    }
    
    // Filtre agent
    if (filters.agent !== "all" && dossier.entreprise?.agent_assigne !== filters.agent) {
      return false;
    }
    
    // Filtre montant min
    if (filters.montantMin && (dossier.montant_restant_du || 0) < Number(filters.montantMin)) {
      return false;
    }
    
    // Filtre montant max
    if (filters.montantMax && (dossier.montant_restant_du || 0) > Number(filters.montantMax)) {
      return false;
    }
    
    return true;
  });

  const generateCSV = () => {
    const headers = [
      "Entreprise",
      "SIREN", 
      "Agent assigné",
      "Statut",
      "Montant initial",
      "Restant dû",
      "Jours retard",
      "Dernière action",
      "Date dernière action"
    ];
    
    const rows = filteredDossiers.map(dossier => [
      dossier.entreprise?.nom_entreprise || "",
      dossier.entreprise?.siren || "",
      dossier.entreprise?.agent_assigne || "",
      dossier.statut_recouvrement || "",
      dossier.montant_initial || 0,
      dossier.montant_restant_du || 0,
      dossier.jours_retard || 0,
      dossier.derniere_action?.type_action || "",
      dossier.derniere_action?.date_action ? 
        format(new Date(dossier.derniere_action.date_action), 'dd/MM/yyyy HH:mm', { locale: fr }) : ""
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n');

    return csvContent;
  };

  const handleExport = () => {
    const csvContent = generateCSV();
    onExportCSV(csvContent, "etat_dossiers");
  };

  const handleEmail = () => {
    const csvContent = generateCSV();
    onSendEmail(csvContent, "etat_dossiers");
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
            <Filter className="w-5 h-5" />
            État des Dossiers ({filteredDossiers.length})
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
            <label className="text-sm font-medium mb-2 block">Statut</label>
            <Select value={filters.statut} onValueChange={(value) => setFilters(prev => ({...prev, statut: value}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {STATUTS_OPTIONS.slice(1).map(statut => (
                  <SelectItem key={statut} value={statut}>
                    {statut.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <label className="text-sm font-medium mb-2 block">Montant min (€)</label>
            <Input
              type="number"
              placeholder="0"
              value={filters.montantMin}
              onChange={(e) => setFilters(prev => ({...prev, montantMin: e.target.value}))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Montant max (€)</label>
            <Input
              type="number"
              placeholder="Illimité"
              value={filters.montantMax}
              onChange={(e) => setFilters(prev => ({...prev, montantMax: e.target.value}))}
            />
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Entreprise</TableHead>
                <TableHead>SIREN</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Montant initial</TableHead>
                <TableHead>Restant dû</TableHead>
                <TableHead>Jours retard</TableHead>
                <TableHead>Dernière action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDossiers.map((dossier) => (
                <TableRow key={dossier.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">
                    {dossier.entreprise?.nom_entreprise || "N/A"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {dossier.entreprise?.siren || "-"}
                  </TableCell>
                  <TableCell>
                    {dossier.entreprise?.agent_assigne ? (
                      <Badge variant="outline">{dossier.entreprise.agent_assigne}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600">Non assigné</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatutColor(dossier.statut_recouvrement)}>
                      {dossier.statut_recouvrement?.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.montant_initial || 0)}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.montant_restant_du || 0)}
                  </TableCell>
                  <TableCell>
                    {dossier.jours_retard > 0 ? (
                      <Badge variant="outline" className={
                        dossier.jours_retard > 90 ? "text-red-600" :
                        dossier.jours_retard > 30 ? "text-orange-600" : "text-yellow-600"
                      }>
                        {dossier.jours_retard} j
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {dossier.derniere_action ? (
                      <div>
                        <div>{dossier.derniere_action.type_action}</div>
                        <div className="text-slate-500">
                          {format(new Date(dossier.derniere_action.date_action), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">Aucune</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}