import React, { useState, useMemo, useCallback } from "react";
import { Contact, EntrepriseDebiteur } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Plus, Users, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

import ContactForm from "../components/contacts/ContactForm";
import DataTable from "../components/common/DataTable";
import FilterBar from "../components/common/FilterBar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { useDataLoader } from "../components/hooks/useDataLoader";
import { useDataFiltering } from "../components/hooks/useDataFiltering";
import { usePagination } from "../components/hooks/usePagination";
import { formatService } from "../components/services/formatService";

export default function Contacts() {
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [entreprises, setEntreprises] = useState([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);

  const loadAllData = useCallback(async () => {
    const [contactsData, entreprisesData] = await Promise.all([
      Contact.list("-created_date"),
      EntrepriseDebiteur.list()
    ]);
    const enrichedContacts = contactsData.map(contact => ({
      ...contact,
      entreprise: entreprisesData.find(e => e.id === contact.entreprise_id)
    }));
    setEntreprises(entreprisesData);
    return enrichedContacts;
  }, []);

  const { data: allContacts, loading, refetch } = useDataLoader(loadAllData);
  const { filteredData, searchTerm, setSearchTerm, filters, setFilter, hasActiveFilters, resetFilters } = useDataFiltering(allContacts);
  const pagination = usePagination(filteredData, 50);

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingContact) {
        await Contact.update(editingContact.id, formData);
        toast.success("Contact mis à jour avec succès !");
      } else {
        await Contact.create(formData);
        toast.success("Contact créé avec succès !");
      }
      setShowForm(false);
      setEditingContact(null);
      refetch();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Échec de la sauvegarde du contact.");
    }
  };

  const handleDeleteAll = async () => {
    setDeleteAllLoading(true);
    setDeletedCount(0);
    const toastId = toast.loading("Suppression en cours...");
    try {
      let hasMore = true, deleted = 0;
      while (hasMore) {
        const batch = await Contact.list("-created_date", 50);
        if (batch.length === 0) {
          hasMore = false;
        } else {
          for (const contact of batch) {
            try { await Contact.delete(contact.id); } catch (e) { console.warn(`Ignored error for ${contact.id}: ${e.message}`); }
            deleted++;
            setDeletedCount(deleted);
            toast.loading(`Suppression... ${deleted} contact(s) supprimé(s).`, { id: toastId });
          }
        }
      }
      toast.success(`${deleted} contacts supprimés avec succès !`, { id: toastId });
      refetch();
    } catch (error) {
      toast.error(`Erreur après suppression de ${deletedCount} contacts.`, { id: toastId });
    } finally {
      setDeleteAllLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const columns = useMemo(() => [
    {
      header: "Contact",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{formatService.fullName(item.prenom, item.nom)}</span>
          <span className="text-sm text-slate-500">{item.fonction || "-"}</span>
        </div>
      )
    },
    {
      header: "Entreprise",
      accessor: "entreprise.nom_entreprise",
      render: (item) => item.entreprise?.nom_entreprise || "N/A"
    },
    {
      header: "Coordonnées",
      render: (item) => (
        <div className="flex flex-col gap-1 text-sm">
          {item.email && <a href={`mailto:${item.email}`} className="text-blue-600 hover:underline">{item.email}</a>}
          {item.telephone_mobile && <span>{item.telephone_mobile} (M)</span>}
          {item.telephone_fixe && <span>{item.telephone_fixe} (F)</span>}
        </div>
      )
    },
    {
      header: "Principal",
      render: (item) => item.est_contact_principal ? "Oui" : "Non",
      className: "text-center"
    },
    {
      header: "Actions",
      render: (item) => (
        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
          <Edit className="w-4 h-4 mr-2" /> Modifier
        </Button>
      ),
      className: "text-right"
    }
  ], []);

  const filterOptions = useMemo(() => [], []);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Contacts</h1>
            <p className="text-slate-600">Gestion des contacts des entreprises débitrices.</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" disabled={deleteAllLoading}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteAllLoading ? `Suppression... (${deletedCount})` : "Supprimer Tous"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer la suppression</DialogTitle>
                  <DialogDescription>
                    {deleteAllLoading ? `Suppression en cours... ${deletedCount} contacts supprimés.` : "Êtes-vous sûr de vouloir supprimer TOUS les contacts ? Cette action est irréversible."}
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
            <Button onClick={() => { setEditingContact(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nouveau Contact
            </Button>
          </div>
        </div>

        {showForm && (
          <ContactForm 
            contact={editingContact} 
            entreprises={entreprises} 
            onSubmit={handleSubmit} 
            onCancel={() => { setShowForm(false); setEditingContact(null); }} 
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
            title="Contacts"
            icon={Users}
            data={filteredData}
            columns={columns}
            loading={loading}
            pagination={pagination}
            emptyMessage="Aucun contact ne correspond à vos critères."
          />
        </div>
      </div>
    </div>
  );
}