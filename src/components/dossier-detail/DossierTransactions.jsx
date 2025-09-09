import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CreditCard, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function DossierTransactions({ transactions, dossier, onReload }) {
  const [filterStatut, setFilterStatut] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const filteredTransactions = transactions.filter(transaction => {
    const matchesStatut = filterStatut === "all" || transaction.statut === filterStatut;
    const matchesType = filterType === "all" || transaction.type_transaction === filterType;
    return matchesStatut && matchesType;
  });

  const getStatutColor = (statut) => {
    switch (statut) {
      case "Actif":
        return "bg-green-100 text-green-800 border-green-200";
      case "Historique":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Non réconcilié":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Annulé":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "Paiement":
      case "Virement reçu":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "Prélèvement échoué":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <CreditCard className="w-4 h-4 text-slate-400" />;
    }
  };

  // Calculer le total des transactions actives
  const totalActif = filteredTransactions
    .filter(t => t.statut === "Actif" && t.pris_en_compte_calcul)
    .reduce((sum, t) => {
      if (["Paiement", "Virement reçu"].includes(t.type_transaction)) {
        return sum + (t.montant || 0);
      }
      return sum;
    }, 0);

  return (
    <div className="space-y-6">
      <Card className="bg-white border border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Transactions ({filteredTransactions.length})
            </CardTitle>
            <div className="flex gap-4 items-center">
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="Actif">Actif</SelectItem>
                  <SelectItem value="Historique">Historique</SelectItem>
                  <SelectItem value="Non réconcilié">Non réconcilié</SelectItem>
                  <SelectItem value="Annulé">Annulé</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="Paiement">Paiement</SelectItem>
                  <SelectItem value="Virement reçu">Virement reçu</SelectItem>
                  <SelectItem value="Prélèvement échoué">Prélèvement échoué</SelectItem>
                </SelectContent>
              </Select>
              
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter paiement
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Montant</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold">Référence</TableHead>
                  <TableHead className="font-semibold">Code erreur</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions
                    .sort((a, b) => new Date(b.date_transaction) - new Date(a.date_transaction))
                    .map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(new Date(transaction.date_transaction), 'dd/MM/yyyy', { locale: fr })}
                            </span>
                            {transaction.date_valeur && transaction.date_valeur !== transaction.date_transaction && (
                              <span className="text-xs text-slate-500">
                                Valeur: {format(new Date(transaction.date_valeur), 'dd/MM/yyyy', { locale: fr })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(transaction.type_transaction)}
                            <span className="text-sm">{transaction.type_transaction}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${
                            ["Paiement", "Virement reçu"].includes(transaction.type_transaction)
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {new Intl.NumberFormat('fr-FR', { 
                              style: 'currency', 
                              currency: 'EUR' 
                            }).format(transaction.montant || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatutColor(transaction.statut) + " border text-xs"}>
                            {transaction.statut}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">
                            {transaction.reference_bancaire || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {transaction.failure_code && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                              {transaction.failure_code}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600 line-clamp-1">
                            {transaction.description || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Aucune transaction trouvée
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Total */}
          {totalActif > 0 && (
            <div className="border-t border-slate-200 p-4 bg-slate-50">
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-slate-600">Total paiements actifs</p>
                  <p className="text-xl font-bold text-green-600">
                    {new Intl.NumberFormat('fr-FR', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    }).format(totalActif)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}