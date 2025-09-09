import React, { useState, useCallback } from "react";
import { EntrepriseDebiteur } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Phone, Mail, ExternalLink, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { toast } from 'sonner';

// Nouveaux hooks et services
import { useDataLoader } from "@/components/hooks/useDataLoader";
import { useDataFiltering } from "@/components/hooks/useDataFiltering";
import { usePagination } from "@/components/hooks/usePagination";
import { dataService } from "@/components/services/dataService";
import { formatService } from "@/components/services/formatService";

// Nouveaux composants génériques
import DataTable from "@/components/common/DataTable";
import FilterBar from "@/components/common/FilterBar";
import EntrepriseForm from "@/components/entreprises/EntrepriseForm";

const AGENTS_VALIDES = ["Maya", "Andrea", "Dylon", "Sébastien"];

export default function Entreprises() {
  const [showForm, setShowForm] = useState(false);
  const [editingEntreprise, setEditingEntreprise] = useState(null);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Chargement des données avec le nouveau hook
  const { data: allEntreprises, loading, refetch } = useDataLoader(
    useCallback(async () => {
      const data = await EntrepriseDebiteur.list("-created_date");
      return dataService.enrichEntreprises(data);
    }, [])
  );

  // Filtrage avec le nouveau hook
  const {
    filteredData,
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    resetFilters,
    hasActiveFilters
  } = useDataFiltering(allEntreprises, {
    agent_assigne: "all",
    pays: "all",
    statut_entreprise: "all"
  });

  // Pagination avec le nouveau hook
  const pagination = usePagination(filteredData, 50);

  // Configuration des filtres pour FilterBar
  const filterConfig = [
    {
      type: 'select',
      key: 'agent_assigne',
      label: 'Agent',
      placeholder: 'Tous les agents',
      value: filters.agent_assigne,
      options: AGENTS_VALIDES.map(agent => ({ value: agent, label: agent })),
      className: "w-40"
    },
    {
      type: 'buttons',
      key: 'pays',
      label: 'Pays',
      value: filters.pays,
      options: [
        { value: 'France', label: 'France' },
        { value: 'Allemagne', label: 'Allemagne' }
      ]
    },
    {
      type: 'select',
      key: 'statut_entreprise',
      label: 'Statut',
      placeholder: 'Tous les statuts',
      value: filters.statut_entreprise,
      options: [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' },
        { value: 'En procédure collective', label: 'En procédure collective' }
      ],
      className: "w-48"
    }
  ];

  // Configuration des colonnes pour DataTable
  const columns = [
    {
      header: "Entreprise",
      accessor: "nom_entreprise",
      render: (entreprise) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{entreprise.nom_entreprise}</span>
          <span className="text-sm text-slate-500">{entreprise.pays}</span>
        </div>
      )
    },
    {
      header: "ID HubSpot",
      accessor: "company_id_hubspot",
      render: (entreprise) => (
        <span className="font-mono text-sm text-slate-600">
          {entreprise.company_id_hubspot || "-"}
        </span>
      )
    },
    {
      header: "SIREN/SIRET",
      accessor: "siren",
      render: (entreprise) => (
        <div className="flex flex-col text-sm">
          <span className="font-mono">{entreprise.siren}</span>
          {entreprise.siret && (
            <span className="font-mono text-slate-500">{entreprise.siret}</span>
          )}
          {entreprise.pays === 'France' && !entreprise.siren && (
            <Badge variant="destructive" className="mt-1 w-fit text-xs">SIREN Manquant</Badge>
          )}
        </div>
      )
    },
    {
      header: "Agent Assigné",
      accessor: "agent_assigne",
      render: (entreprise) => (
        entreprise.agent_assigne && (
          <Badge className={`${getAgentColor(entreprise.agent_assigne)} border text-xs`}>
            {entreprise.agent_assigne}
          </Badge>
        )
      )
    },
    {
      header: "Statut",
      accessor: "statut_entreprise",
      render: (entreprise) => (
        <Badge className={`${getStatutColor(entreprise.statut_entreprise)} border text-xs`}>
          {entreprise.statut_entreprise}
        </Badge>
      )
    },
    {
      header: "Contact",
      accessor: "contact",
      render: (entreprise) => (
        <div className="flex flex-col gap-1">
          {entreprise.telephone && (
            <div className="flex items-center gap-1 text-sm">
              <Phone className="w-3 h-3 text-slate-400" />
              <span className="text-slate-600">{formatService.phone(entreprise.telephone)}</span>
            </div>
          )}
          {entreprise.email && (
            <div className="flex items-center gap-1 text-sm">
              <Mail className="w-3 h-3 text-slate-400" />
              <span className="text-slate-600">{entreprise.email}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: "Pappers",
      accessor: "url_pappers",
      className: "w-[120px]",
      render: (entreprise) => (
        entreprise.url_pappers && (
          <a
            href={entreprise.url_pappers}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm underline"
            title="Consulter les informations légales et financières sur Pappers.fr"
          >
            <ExternalLink className="w-4 h-4" />
            Voir fiche Pappers
          </a>
        )
      )
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (entreprise) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(entreprise);
          }}
        >
          Modifier
        </Button>
      )
    }
  ];

  // Gestionnaires d'événements
  const handleSubmit = async (formData) => {
    try {
      const dataToSubmit = {
        ...formData,
        url_pappers: (formData.siren && formData.pays === 'France') ? 
          `https://www.pappers.fr/recherche?q=${formData.siren}` : ""
      };

      if (editingEntreprise) {
        await EntrepriseDebiteur.update(editingEntreprise.id, dataToSubmit);
        toast.success('Entreprise modifiée avec succès');
      } else {
        await EntrepriseDebiteur.create(dataToSubmit);
        toast.success('Entreprise créée avec succès');
      }
      
      setShowForm(false);
      setEditingEntreprise(null);
      refetch();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error('Erreur:', error);
    }
  };

  const handleEdit = (entreprise) => {
    setEditingEntreprise(entreprise);
    setShowForm(true);
  };

  const handleDeleteAll = async () => {
    setDeleteAllLoading(true);
    setDeletedCount(0);
    
    try {
      let hasMore = true;
      let deleted = 0;

      while (hasMore) {
        const batch = await EntrepriseDebiteur.list("-created_date", 50);
        if (batch.length === 0) {
          hasMore = false;
        } else {
          for (const entreprise of batch) {
            try {
              await EntrepriseDebiteur.delete(entreprise.id);
            } catch (error) {
              if (error.message && (
                error.message.includes('Object not found') || 
                error.message.includes('Network Error') || 
                error.message.includes('500')
              )) {
                console.log(`Erreur non-critique ignorée pour ${entreprise.id}:`, error.message);
              } else {
                throw error;
              }
            }
            deleted++;
            setDeletedCount(deleted);
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      toast.success(`${deleted} entreprises supprimées avec succès !`);
      refetch();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error(`Erreur après la suppression de ${deletedCount} entrées: ${error.message}.`);
    } finally {
      setDeleteAllLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Fonctions utilitaires pour les couleurs
  const getStatutColor = (statut) => {
    switch (statut) {
      case "Active": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Inactive": return "bg-slate-100 text-slate-800 border-slate-200";
      case "En procédure collective": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getAgentColor = (agent) => {
    const colors = {
      "Maya": "bg-purple-100 text-purple-800 border-purple-200",
      "Andrea": "bg-blue-100 text-blue-800 border-blue-200",
      "Dylon": "bg-green-100 text-green-800 border-green-200",
      "Sébastien": "bg-orange-100 text-orange-800 border-orange-200"
    };
    return colors[agent] || "bg-slate-100 text-slate-800 border-slate-200";
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Entreprises Débitrices
              {allEntreprises.length > 0 && (
                <span className="text-xl font-normal text-slate-500 ml-2">
                  ({formatService.number(allEntreprises.length)})
                </span>
              )}
            </h1>
            <p className="text-slate-600">Gestion des débiteurs et de leurs informations</p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleteAllLoading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteAllLoading ? "Suppression..." : "Supprimer Toutes"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer la suppression</DialogTitle>
                  <DialogDescription>
                    {deleteAllLoading
                      ? `Suppression en cours... ${deletedCount} entrées supprimées.`
                      : `Êtes-vous sûr de vouloir supprimer TOUTES les entreprises ? Cette action est irréversible.`}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteAllLoading}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleDeleteAll}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleteAllLoading}
                  >
                    {deleteAllLoading ? "Suppression en cours..." : "Supprimer Tout"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              onClick={() => setShowForm(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Entreprise
            </Button>
          </div>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="mb-8">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingEntreprise ? "Modifier l'entreprise" : "Nouvelle entreprise"}
              </h3>
              <EntrepriseForm
                entreprise={editingEntreprise}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingEntreprise(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Barre de filtres */}
        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filterConfig}
          onFilterChange={setFilter}
          onResetFilters={resetFilters}
          hasActiveFilters={hasActiveFilters}
          className="mb-6"
        />

        {/* Tableau */}
        <DataTable
          title="Entreprises"
          icon={Building2}
          data={pagination.paginatedData}
          columns={columns}
          loading={loading}
          pagination={pagination}
          emptyMessage="Aucune entreprise trouvée."
        />
      </div>
    </div>
  );
}