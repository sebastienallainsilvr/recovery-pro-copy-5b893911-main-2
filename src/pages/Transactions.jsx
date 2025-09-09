import React, { useState, useMemo, useCallback } from "react";
import { Transaction, EntrepriseDebiteur, DossierRecouvrement } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRightLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

import DataTable from "../components/common/DataTable";
import FilterBar from "../components/common/FilterBar";

import { useDataLoader } from "../components/hooks/useDataLoader";
import { useDataFiltering } from "../components/hooks/useDataFiltering";
import { usePagination } from "../components/hooks/usePagination";
import { formatService } from "../components/services/formatService";

const TRANSACTION_TYPES = ["Virement reçu", "Paiement", "Prélèvement échoué", "Autre"];
const TRANSACTION_STATUSES = ["Complet", "Partiel", "Échoué", "En attente", "Actif", "Historique", "Non réconcilié", "Annulé"];

export default function Transactions() {
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadAllData = useCallback(async () => {
    const [transactionsData, entreprisesData, dossiersData] = await Promise.all([
      Transaction.list("-date_transaction"),
      EntrepriseDebiteur.list(),
      DossierRecouvrement.list()
    ]);
    const enrichedTransactions = transactionsData.map(transaction => ({
      ...transaction,
      entreprise: entreprisesData.find(e => e.id === transaction.entreprise_id),
      dossier: dossiersData.find(d => d.id === transaction.dossier_id)
    }));
    return enrichedTransactions;
  }, []);

  const { data: allTransactions, loading, refetch } = useDataLoader(loadAllData);

  const initialFilters = { type_transaction: 'all', statut: 'all' };
  const { filteredData, searchTerm, setSearchTerm, filters, setFilter, hasActiveFilters, resetFilters } = useDataFiltering(allTransactions, initialFilters);
  
  const pagination = usePagination(filteredData, 50);

  const handleDeleteAll = async () => {
    setDeleteAllLoading(true);
    setDeletedCount(0);
    const toastId = toast.loading("Suppression en cours...");
    try {
      let hasMore = true, deleted = 0;
      while (hasMore) {
        const batch = await Transaction.list("-created_date", 50);
        if (batch.length === 0) {
          hasMore = false;
        } else {
          for (const transaction of batch) {
            try { await Transaction.delete(transaction.id); } catch (e) { console.warn(`Ignored error for ${transaction.id}: ${e.message}`); }
            deleted++;
            setDeletedCount(deleted);
            toast.loading(`Suppression... ${deleted} transaction(s) supprimée(s).`, { id: toastId });
          }
        }
      }
      toast.success(`${deleted} transactions supprimées avec succès !`, { id: toastId });
      refetch();
    } catch (error) {
      toast.error(`Erreur après suppression de ${deletedCount} transactions.`, { id: toastId });
    } finally {
      setDeleteAllLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const getTransactionTypeColor = (type) => {
    switch (type) {
      case "Virement reçu": case "Paiement": return "bg-green-100 text-green-800 border-green-200";
      case "Prélèvement échoué": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const columns = useMemo(() => [
    {
      header: "Entreprise",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{item.entreprise?.nom_entreprise || "Inconnu"}</span>
          <span className="font-mono text-xs text-slate-500">ID: {item.company_id_hubspot || "-"}</span>
        </div>
      )
    },
    {
      header: "Type",
      render: (item) => (
        <Badge className={getTransactionTypeColor(item.type_transaction) + " border"}>{item.type_transaction}</Badge>
      )
    },
    {
      header: "Montant",
      render: (item) => (
        <span className={`font-semibold ${["Paiement", "Virement reçu"].includes(item.type_transaction) ? 'text-green-600' : 'text-red-600'}`}>
          {formatService.currency(item.montant)}
        </span>
      )
    },
    {
      header: "Date",
      render: (item) => formatService.date(item.date_transaction)
    },
    {
      header: "Statut",
      render: (item) => <Badge variant="outline">{item.statut}</Badge>
    },
    {
      header: "Description",
      render: (item) => <p className="text-sm text-slate-600 truncate max-w-xs">{item.description || "-"}</p>
    }
  ], []);

  const filterOptions = useMemo(() => [
    {
      key: 'type_transaction',
      label: 'Type',
      type: 'select',
      value: filters.type_transaction,
      options: TRANSACTION_TYPES.map(t => ({ value: t, label: t })),
      className: 'w-full sm:w-[180px]'
    },
    {
      key: 'statut',
      label: 'Statut',
      type: 'select',
      value: filters.statut,
      options: TRANSACTION_STATUSES.map(s => ({ value: s, label: s })),
      className: 'w-full sm:w-[180px]'
    }
  ], [filters]);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Transactions</h1>
            <p className="text-slate-600">Historique de toutes les transactions financières.</p>
          </div>
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={deleteAllLoading}>
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteAllLoading ? `Suppression... (${deletedCount})` : "Supprimer Toutes"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <DialogDescription>
                  {deleteAllLoading ? `Suppression en cours... ${deletedCount} transactions supprimées.` : "Êtes-vous sûr de vouloir supprimer TOUTES les transactions ? Cette action est irréversible."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteAllLoading}>Annuler</Button>
                <Button onClick={handleDeleteAll} variant="destructive" disabled={deleteAllLoading}>
                  {deleteAllLoading ? "Suppression en cours..." : "Supprimer Tout"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filters={filterOptions}
            onFilterChange={setFilter}
            onResetFilters={resetFilters}
            hasActiveFilters={hasActiveFilters}
          />
          <DataTable
            title="Transactions"
            icon={ArrowRightLeft}
            data={filteredData}
            columns={columns}
            loading={loading}
            pagination={pagination}
            emptyMessage="Aucune transaction ne correspond à vos critères."
          />
        </div>
      </div>
    </div>
  );
}