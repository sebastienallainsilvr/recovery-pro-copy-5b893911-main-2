import React, { useState, useCallback, useMemo } from "react";
import { DossierRecouvrement, EntrepriseDebiteur, Transaction } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, ArrowRight, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import DossierForm from "../components/dossiers/DossierForm";
import DataTable from "../components/common/DataTable";
import FilterBar from "../components/common/FilterBar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { useDataLoader } from "../components/hooks/useDataLoader";
import { useDataFiltering } from "../components/hooks/useDataFiltering";
import { usePagination } from "../components/hooks/usePagination";
import { dataService } from "../components/services/dataService";
import { formatService } from "../components/services/formatService";

const AGENTS_VALIDES = ["Maya", "Andrea", "Dylon", "Sébastien"];
const STATUTS_RECOUVREMENT = [
  "PENDING ASSIGNATION", "R1", "R2", "R3", "R4", "R5", "PROMISE TO PAY",
  "UNDER NEGOTIATION", "CONCILIATION - PENDING ASSIGNATION", "CONCILIATION - ONGOING MEETINGS",
  "LAWYER / CONCILIATION", "REPAYMENT PLAN TO SCHEDULE", "REPAYMENT PLAN ONGOING",
  "DISPUTE / LITIGATION", "PENDING TO BE OUTSOURCED", "OUTSOURCED TO AGENCY",
  "COLLECTIVE PROCEDURE", "FULLY RECOVERED", "WRITTEN OFF / CANCELLED"
];

export default function Dossiers() {
  const [showForm, setShowForm] = useState(false);
  const [editingDossier, setEditingDossier] = useState(null);
  const [entreprises, setEntreprises] = useState([]);
  const navigate = useNavigate();

  // State pour le modal de suppression
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadAllData = useCallback(async () => {
    const [dossiersData, entreprisesData, transactionsData, actionsData] = await Promise.all([
      DossierRecouvrement.list("-date_derniere_activite"),
      EntrepriseDebiteur.list(),
      Transaction.list(),
      [] // Placeholder for actions if needed later
    ]);
    setEntreprises(entreprisesData);
    return dataService.enrichDossiers(dossiersData, entreprisesData, transactionsData, actionsData);
  }, []);

  const { data: allDossiers, loading, refetch } = useDataLoader(loadAllData);

  const initialFilters = { 'statut_recouvrement': 'all', 'entreprise.agent_assigne': 'all' };
  const { filteredData, searchTerm, setSearchTerm, filters, setFilter, hasActiveFilters, resetFilters } = useDataFiltering(allDossiers, initialFilters);
  const pagination = usePagination(filteredData, 50);

  const handleEdit = (dossier) => {
    setEditingDossier(dossier);
    setShowForm(true);
  };

  const handleSubmit = async (formData) => {
    try {
      const dataToSubmit = {
        ...formData,
        date_derniere_activite: new Date().toISOString()
      };
      
      if (editingDossier) {
        await DossierRecouvrement.update(editingDossier.id, dataToSubmit);
        toast.success("Dossier mis à jour avec succès !");
      } else {
        await DossierRecouvrement.create(dataToSubmit);
        toast.success("Dossier créé avec succès !");
      }
      setShowForm(false);
      setEditingDossier(null);
      refetch();
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
      toast.error("Échec de la sauvegarde du dossier.");
    }
  };

  const handleDeleteAll = async () => {
    setDeleteAllLoading(true);
    setDeletedCount(0);
    const toastId = toast.loading(`Suppression en cours... 0 dossier supprimé.`);
    
    try {
      let hasMore = true;
      let deleted = 0;
      
      while (hasMore) {
        const batch = await DossierRecouvrement.list("-created_date", 50);
        if (batch.length === 0) {
          hasMore = false;
        } else {
          for (const dossier of batch) {
            try { await DossierRecouvrement.delete(dossier.id); } 
            catch (error) { 
              if (error.message && (error.message.includes('Object not found') || error.message.includes('Network Error') || error.message.includes('500'))) {
                console.warn(`Ignored error for ${dossier.id}: ${error.message}`);
              } else { throw error; }
            }
            deleted++;
            setDeletedCount(deleted);
            toast.loading(`Suppression en cours... ${deleted} dossier${deleted > 1 ? 's' : ''} supprimé${deleted > 1 ? 's' : ''}.`, { id: toastId });
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      toast.success(`${deleted} dossier${deleted > 1 ? 's' : ''} supprimé${deleted > 1 ? 's' : ''} avec succès !`, { id: toastId });
      refetch();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error(`Erreur après la suppression de ${deletedCount} entrées: ${error.message}`, { id: toastId });
    } finally {
      setDeleteAllLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const columns = useMemo(() => [
    { 
      header: "Entreprise", 
      accessor: "entreprise.nom_entreprise", 
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{item.entreprise?.nom_entreprise || "Inconnu"}</span>
          {item.reference_contrat && <span className="text-sm text-slate-500">Réf: {item.reference_contrat}</span>}
        </div>
      )
    },
    { 
      header: "Montants",
      render: (item) => (
        <div className="flex flex-col text-sm">
          <div className="flex justify-between"><span>Initial:</span> <span className="font-semibold">{formatService.currency(item.montant_initial)}</span></div>
          <div className="flex justify-between text-green-600"><span>Payé:</span> <span className="font-semibold">{formatService.currency(item.montant_total_paye)}</span></div>
          <div className="flex justify-between text-red-600"><span>Dû:</span> <span className="font-semibold">{formatService.currency(item.montant_restant_du)}</span></div>
        </div>
      ),
      className: "w-48"
    },
    { 
      header: "Statut", 
      accessor: "statut_recouvrement",
      render: (item) => formatService.status(item.statut_recouvrement),
      className: "w-40"
    },
    { 
      header: "Agent", 
      accessor: "entreprise.agent_assigne",
      render: (item) => item.entreprise?.agent_assigne || '-',
      className: "w-24"
    },
    { 
      header: "Jours Retard", 
      accessor: "jours_retard", 
      render: (item) => formatService.days(item.jours_retard),
      className: "w-24 text-center"
    },
    { 
      header: "Date Limite", 
      accessor: "date_limite_action", 
      render: (item) => formatService.date(item.date_limite_action),
      className: "w-32"
    },
    {
      header: "Actions",
      render: (item) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>Modifier</Button>
        </div>
      ),
      className: "text-right w-32"
    }
  ], []);

  const filterOptions = useMemo(() => [
    {
      key: 'statut_recouvrement',
      label: 'Statut',
      type: 'select',
      value: filters.statut_recouvrement,
      options: STATUTS_RECOUVREMENT.map(s => ({ value: s, label: formatService.status(s) })),
      className: "w-full sm:w-48"
    },
    {
      key: 'entreprise.agent_assigne',
      label: 'Agent',
      type: 'select',
      value: filters['entreprise.agent_assigne'],
      options: AGENTS_VALIDES.map(agent => ({ value: agent, label: agent })),
      className: "w-full sm:w-40"
    }
  ], [filters]);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Dossiers de Recouvrement</h1>
            <p className="text-slate-600">Suivi et gestion des procédures de recouvrement</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" disabled={deleteAllLoading}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteAllLoading ? "Suppression..." : "Supprimer Tous"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer la suppression</DialogTitle>
                  <DialogDescription>
                    {deleteAllLoading ? `Suppression en cours... ${deletedCount} dossiers supprimés.` : `Êtes-vous sûr de vouloir supprimer TOUS les dossiers ? Cette action est irréversible.`}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteAllLoading}>Annuler</Button>
                  <Button onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700" disabled={deleteAllLoading}>
                    {deleteAllLoading ? "Suppression en cours..." : "Supprimer Tout"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={() => { setEditingDossier(null); setShowForm(true); }} className="bg-slate-900 hover:bg-slate-800 text-white">
              <Plus className="w-4 h-4 mr-2" />Nouveau Dossier
            </Button>
          </div>
        </div>

        {showForm && (
          <DossierForm 
            dossier={editingDossier} 
            entreprises={entreprises} 
            onSubmit={handleSubmit} 
            onCancel={() => { setShowForm(false); setEditingDossier(null); }} 
          />
        )}
        
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
            title="Dossiers"
            icon={FolderOpen}
            data={filteredData}
            columns={columns}
            loading={loading}
            pagination={pagination}
            emptyMessage="Aucun dossier ne correspond à vos critères de recherche."
            onRowClick={(item) => navigate(createPageUrl(`Dossier?id=${item.id}`))}
          />
        </div>
      </div>
    </div>
  );
}