import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileDown, Mail, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const TRANSACTION_TYPES = ["all", "Paiement", "Virement reçu", "Prélèvement échoué"];

export default function FluxFinanciersReport({ transactions, entreprises, dossiers, onExportCSV, onSendEmail }) {
  const [filters, setFilters] = useState({
    dateDebut: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    dateFin: format(new Date(), 'yyyy-MM-dd'),
    typeTransaction: "all",
    uniquementActifs: true
  });

  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = parseISO(transaction.date_transaction);
    const filterDateDebut = new Date(filters.dateDebut);
    const filterDateFin = new Date(filters.dateFin + "T23:59:59");

    // Filtre période
    if (transactionDate < filterDateDebut || transactionDate > filterDateFin) {
      return false;
    }

    // Filtre type de transaction
    if (filters.typeTransaction !== "all" && transaction.type_transaction !== filters.typeTransaction) {
      return false;
    }

    // Filtre uniquement actifs
    if (filters.uniquementActifs && !transaction.pris_en_compte_calcul) {
      return false;
    }

    return true;
  });

  const generateCSV = () => {
    const headers = [
      "Date",
      "Entreprise",
      "Type",
      "Montant",
      "Actif/Historique",
      "Référence",
      "Failure Code"
    ];
    
    const rows = filteredTransactions.map(transaction => {
      const entreprise = entreprises.find(e => e.id === transaction.entreprise_id);
      
      return [
        format(parseISO(transaction.date_transaction), 'dd/MM/yyyy', { locale: fr }),
        entreprise?.nom_entreprise || "Entreprise inconnue",
        transaction.type_transaction || "",
        transaction.montant || 0,
        transaction.pris_en_compte_calcul ? "Actif" : "Historique",
        transaction.reference_bancaire || "",
        transaction.failure_code || ""
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n');

    return csvContent;
  };

  const handleExport = () => {
    const csvContent = generateCSV();
    onExportCSV(csvContent, "flux_financiers");
  };

  const handleEmail = () => {
    const csvContent = generateCSV();
    onSendEmail(csvContent, "flux_financiers");
  };

  const getTransactionColor = (type) => {
    const colors = {
      "Paiement": "bg-green-100 text-green-800",
      "Virement reçu": "bg-emerald-100 text-emerald-800",
      "Prélèvement échoué": "bg-red-100 text-red-800"
    };
    return colors[type] || "bg-slate-100 text-slate-800";
  };

  // Calculer les totaux
  const totaux = {
    nombreTransactions: filteredTransactions.length,
    montantTotal: filteredTransactions.reduce((sum, t) => sum + (t.montant || 0), 0),
    montantPositif: filteredTransactions
      .filter(t => ["Paiement", "Virement reçu"].includes(t.type_transaction))
      .reduce((sum, t) => sum + (t.montant || 0), 0),
    nombreEchecs: filteredTransactions.filter(t => t.type_transaction === "Prélèvement échoué").length
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Flux Financiers ({filteredTransactions.length})
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
        {/* Résumé */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{totaux.nombreTransactions}</div>
            <div className="text-sm text-slate-600">Transactions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totaux.montantPositif)}
            </div>
            <div className="text-sm text-slate-600">Encaissé</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.abs(totaux.montantTotal - totaux.montantPositif))}
            </div>
            <div className="text-sm text-slate-600">Échecs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{totaux.nombreEchecs}</div>
            <div className="text-sm text-slate-600">Prélèvements échoués</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
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
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select value={filters.typeTransaction} onValueChange={(value) => setFilters(prev => ({...prev, typeTransaction: value}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {TRANSACTION_TYPES.slice(1).map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Uniquement actifs</label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={filters.uniquementActifs}
                onCheckedChange={(checked) => setFilters(prev => ({...prev, uniquementActifs: checked}))}
              />
              <span className="text-sm">Actifs seulement</span>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Date</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Failure Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => {
                const entreprise = entreprises.find(e => e.id === transaction.entreprise_id);
                
                return (
                  <TableRow key={transaction.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm">
                      {format(parseISO(transaction.date_transaction), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entreprise?.nom_entreprise || "Entreprise inconnue"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTransactionColor(transaction.type_transaction)}>
                        {transaction.type_transaction}
                      </Badge>
                    </TableCell>
                    <TableCell className={`font-semibold ${
                      ["Paiement", "Virement reçu"].includes(transaction.type_transaction) ? "text-green-600" : "text-red-600"
                    }`}>
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(transaction.montant || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.pris_en_compte_calcul ? "default" : "secondary"}>
                        {transaction.pris_en_compte_calcul ? "Actif" : "Historique"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {transaction.reference_bancaire || "-"}
                    </TableCell>
                    <TableCell>
                      {transaction.failure_code ? (
                        <Badge variant="outline" className="text-red-600">
                          {transaction.failure_code}
                        </Badge>
                      ) : (
                        "-"
                      )}
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