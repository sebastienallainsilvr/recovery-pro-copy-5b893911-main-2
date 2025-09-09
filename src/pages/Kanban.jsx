import React, { useState, useEffect, useRef, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import {
  DossierRecouvrement,
  EntrepriseDebiteur,
  Transaction,
  Action,
  HistoriqueStatut,
  DocumentCreance
} from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Calendar,
  AlertTriangle,
  Euro,
  User,
  Clock,
  Upload,
  CheckCircle,
  XCircle,
  Search,
  ChevronDown
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

import KanbanCard from "../components/kanban/KanbanCard";
import StatusChangeModal from "../components/kanban/StatusChangeModal";
import UploadDocumentModal from "../components/kanban/UploadDocumentModal";
import ActionModal from "../components/kanban/ActionModal";
import { useDataLoader } from "../components/hooks/useDataLoader";
import { dataService } from "../components/services/dataService";

const ALL_STATUTS = [
  "PENDING ASSIGNATION",
  "R1", "R2", "R3", "R4", "R5",
  "PROMISE TO PAY",
  "UNDER NEGOTIATION",
  "CONCILIATION - PENDING ASSIGNATION",
  "CONCILIATION - ONGOING MEETINGS",
  "LAWYER / CONCILIATION",
  "REPAYMENT PLAN TO SCHEDULE",
  "REPAYMENT PLAN ONGOING",
  "DISPUTE / LITIGATION",
  "PENDING TO BE OUTSOURCED",
  "OUTSOURCED TO AGENCY",
  "COLLECTIVE PROCEDURE",
  "FULLY RECOVERED",
  "WRITTEN OFF / CANCELLED"
];

const STATUTS_FINAUX = ["FULLY RECOVERED", "WRITTEN OFF / CANCELLED", "COLLECTIVE PROCEDURE"];

export default function Kanban() {
  // État local des dossiers (au lieu de multiples états séparés)
  const [dossiers, setDossiers] = useState([]);

  // Filtres
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterPays, setFilterPays] = useState("all");
  const [filterMontantEleve, setFilterMontantEleve] = useState(false);
  const [filterActionsRetard, setFilterActionsRetard] = useState(false);
  const [showStatutsFinaux, setShowStatutsFinaux] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [targetStatut, setTargetStatut] = useState("");
  const [preselectedActionType, setPreselectedActionType] = useState(null);

  // Refs pour la barre de défilement
  const kanbanContainerRef = useRef(null);
  const customScrollThumbRef = useRef(null);

  const agents = ["Maya", "Andrea", "Dylon", "Sébastien"];

  // Chargement des données avec le hook useDataLoader
  const loadAllData = useCallback(async () => {
    const [dossiersData, entreprisesData, transactionsData, actionsData] = await Promise.all([
      DossierRecouvrement.list(),
      EntrepriseDebiteur.list(),
      Transaction.list(),
      Action.list()
    ]);

    return dataService.enrichDossiers(dossiersData, entreprisesData, transactionsData, actionsData);
  }, []);

  const { data: allDossiers, loading, refetch } = useDataLoader(loadAllData);

  useEffect(() => {
    setDossiers(allDossiers);
  }, [allDossiers]);

  // Gestionnaire de défilement
  const handleKanbanScroll = useCallback(() => {
    const container = kanbanContainerRef.current;
    const thumb = customScrollThumbRef.current;
    if (!container || !thumb) return;

    const scrollableWidth = container.scrollWidth - container.clientWidth;
    if (scrollableWidth <= 0) {
      thumb.style.display = 'none';
      return;
    }

    thumb.style.display = 'block';

    const thumbWidthPercentage = (container.clientWidth / container.scrollWidth) * 100;
    const scrollPercentage = container.scrollLeft / scrollableWidth;
    const thumbLeftPosition = scrollPercentage * (100 - thumbWidthPercentage);

    thumb.style.width = `${thumbWidthPercentage}%`;
    thumb.style.left = `${thumbLeftPosition}%`;
  }, []);

  useEffect(() => {
    const container = kanbanContainerRef.current;
    if (container) {
      setTimeout(handleKanbanScroll, 100);
    }
    window.addEventListener('resize', handleKanbanScroll);
    return () => window.removeEventListener('resize', handleKanbanScroll);
  }, [dossiers, handleKanbanScroll]);

  const handleTrackClick = (e) => {
    const container = kanbanContainerRef.current;
    const track = e.currentTarget;
    if (!container || !track) return;

    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const trackWidth = rect.width;
    const scrollPercentage = clickX / trackWidth;

    container.scrollLeft = scrollPercentage * (container.scrollWidth - container.clientWidth);
  };

  // Logique de filtrage
  const filteredDossiers = dossiers.filter(dossier => {
    if (!dossier.entreprise) return false;

    if (filterAgent !== "all" && dossier.entreprise.agent_assigne !== filterAgent) return false;
    if (filterPays !== "all" && dossier.entreprise.pays !== filterPays) return false;
    if (filterMontantEleve && (dossier.montant_restant_du || 0) <= 10000) return false;
    if (filterActionsRetard && !dossier.en_retard) return false;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchNom = dossier.entreprise.nom_entreprise?.toLowerCase().includes(searchLower);
      const matchId = dossier.id?.toLowerCase().includes(searchLower);
      const matchHubspotId = dossier.entreprise.company_id_hubspot?.toString().includes(searchTerm);
      const matchSiren = dossier.entreprise.siren?.includes(searchTerm);

      if (!matchNom && !matchId && !matchHubspotId && !matchSiren) return false;
    }

    return true;
  });

  const statutsAffiches = showStatutsFinaux ?
    ALL_STATUTS :
    ALL_STATUTS.filter(s => !STATUTS_FINAUX.includes(s));

  const finalDisplayableDossiers = filteredDossiers.filter(dossier =>
    statutsAffiches.includes(dossier.statut_recouvrement)
  );

  // Mise à jour optimiste du dossier
  const updateDossierOptimistic = useCallback((dossierId, updates) => {
    setDossiers(prevDossiers => {
      return prevDossiers.map(dossier => {
        if (dossier.id === dossierId) {
          const updatedDossier = { ...dossier, ...updates };
          
          // Recalculer les propriétés dérivées si nécessaire
          if (updates.statut_recouvrement && ["R1", "R2", "R3", "R4"].includes(updates.statut_recouvrement)) {
            const jours = updates.statut_recouvrement === "R4" ? 3 : 5;
            updatedDossier.date_limite_action = addDays(new Date(updates.date_entree_statut), jours);
            updatedDossier.en_retard = new Date() > updatedDossier.date_limite_action;
          } else if (updates.statut_recouvrement) {
            updatedDossier.date_limite_action = null;
            updatedDossier.en_retard = false;
          }
          
          return updatedDossier;
        }
        return dossier;
      });
    });
  }, []);

  // Rollback optimiste en cas d'erreur
  const rollbackDossierOptimistic = useCallback((dossierId, originalDossier) => {
    setDossiers(prevDossiers => {
      return prevDossiers.map(dossier => {
        if (dossier.id === dossierId) {
          return originalDossier;
        }
        return dossier;
      });
    });
  }, []);

  // Gestionnaire de drag & drop optimisé
  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const dossierId = result.draggableId;
    const newStatut = result.destination.droppableId;
    const dossier = dossiers.find(d => d.id === dossierId);

    if (!dossier || dossier.statut_recouvrement === newStatut) return;

    // Sauvegarder l'état original pour le rollback
    const originalDossier = { ...dossier };

    // Règles spéciales qui nécessitent un modal
    if (newStatut === "COLLECTIVE PROCEDURE") {
      setSelectedDossier(dossier);
      setTargetStatut(newStatut);
      setShowUploadModal(true);
      return;
    }

    if (newStatut === "PROMISE TO PAY") {
      setSelectedDossier(dossier);
      setTargetStatut(newStatut);
      setShowStatusModal(true);
      return;
    }

    // Mise à jour optimiste immédiate
    const optimisticUpdates = {
      statut_recouvrement: newStatut,
      date_entree_statut: new Date().toISOString(),
      date_derniere_activite: new Date().toISOString()
    };

    updateDossierOptimistic(dossierId, optimisticUpdates);
    
    // Toast de feedback immédiat
    toast.loading("Mise à jour en cours...", { id: `update-${dossierId}` });

    try {
      // Mise à jour en base de données en arrière-plan
      await updateDossierStatut(dossier, newStatut, {}, false); // false = pas de rechargement
      
      // Confirmer le succès
      toast.success("Statut mis à jour avec succès", { id: `update-${dossierId}` });
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      
      // Rollback en cas d'erreur
      rollbackDossierOptimistic(dossierId, originalDossier);
      toast.error("Erreur lors de la mise à jour", { id: `update-${dossierId}` });
    }
  };

  // Fonction de mise à jour du statut modifiée pour supporter l'optimisation
  const updateDossierStatut = async (dossier, newStatut, additionalData = {}, shouldRefetch = true) => {
    try {
      // Mettre à jour le dossier
      await DossierRecouvrement.update(dossier.id, {
        statut_recouvrement: newStatut,
        date_entree_statut: new Date().toISOString(),
        date_derniere_activite: new Date().toISOString(),
        ...additionalData
      });

      // Enregistrer dans l'historique
      await HistoriqueStatut.create({
        dossier_id: dossier.id,
        ancien_statut: dossier.statut_recouvrement,
        nouveau_statut: newStatut,
        date_changement: new Date().toISOString(),
        change_par: "Agent",
        motif: "Changement via Kanban"
      });

      // Créer une action
      await Action.create({
        entreprise_id: dossier.entreprise_id,
        dossier_id: dossier.id,
        type_action: "Changement de statut",
        date_action: new Date().toISOString(),
        agent_responsable: "Système",
        description: `Statut changé de "${dossier.statut_recouvrement}" vers "${newStatut}"`,
        resultat: "Autre"
      });

      // Recharger seulement si explicitement demandé (pour les modals)
      if (shouldRefetch) {
        refetch();
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      throw error; // Re-throw pour permettre le rollback
    }
  };

  const handleStatusChange = async (data) => {
    try {
      await updateDossierStatut(selectedDossier, targetStatut, data, true); // true = refetch pour les modals
      setShowStatusModal(false);
      setSelectedDossier(null);
      setTargetStatut("");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleDocumentUpload = async (documentData) => {
    try {
      await DocumentCreance.create(documentData);
      await updateDossierStatut(selectedDossier, targetStatut, {}, true); // true = refetch pour les modals

      setShowUploadModal(false);
      setSelectedDossier(null);
      setTargetStatut("");
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      toast.error("Erreur lors de l'upload du document");
    }
  };

  const openActionModal = (dossier, preselectedType = null) => {
    setSelectedDossier(dossier);
    setPreselectedActionType(preselectedType);
    setShowActionModal(true);
  };

  const handleSaveAction = async (actionData) => {
    if (!selectedDossier) return;

    try {
      await Action.create({
        entreprise_id: selectedDossier.entreprise_id,
        dossier_id: selectedDossier.id,
        type_action: actionData.type_action,
        date_action: new Date().toISOString(),
        agent_responsable: "Agent",
        description: actionData.description,
        resultat: actionData.resultat,
        montant_promis: actionData.montant_promis,
        date_promise: actionData.date_promise,
      });

      await DossierRecouvrement.update(selectedDossier.id, {
        date_derniere_activite: new Date().toISOString(),
      });

      if (actionData.resultat === 'Promesse de paiement') {
        await updateDossierStatut(selectedDossier, 'PROMISE TO PAY', {
          montant_promis: actionData.montant_promis,
          date_promesse: actionData.date_promise,
          commentaire_promesse: actionData.description,
        }, true); // true = refetch car changement de statut
      } else {
        // Pour les autres actions, juste refetch pour mettre à jour les données
        refetch();
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de l'action:", error);
      toast.error("Erreur lors de l'enregistrement de l'action");
    } finally {
      setShowActionModal(false);
      setSelectedDossier(null);
      setPreselectedActionType(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-96 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Tableau de Recouvrement</h1>
          <p className="text-slate-600">Vue Kanban des dossiers par statut</p>
        </div>

        {/* Filtres */}
        <Card className="mb-8 bg-white border border-slate-200 overflow-hidden">
          <CardHeader
            className="border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Filtres</h3>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          <AnimatePresence>
            {isFiltersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CardContent className="p-6">
                  {/* Barre de recherche */}
                  <div className="mb-6">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        placeholder="Rechercher par nom d'entreprise, ID, HubSpot ID ou SIREN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Agent</label>
                      <Select value={filterAgent} onValueChange={setFilterAgent}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous les agents" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les agents</SelectItem>
                          {agents.map(agent => (
                            <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Pays</label>
                      <div className="flex gap-2">
                        <Button
                          variant={filterPays === "France" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilterPays(filterPays === "France" ? "all" : "France")}
                        >
                          France
                        </Button>
                        <Button
                          variant={filterPays === "Allemagne" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilterPays(filterPays === "Allemagne" ? "all" : "Allemagne")}
                        >
                          Allemagne
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Montant élevé</label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={filterMontantEleve}
                          onCheckedChange={setFilterMontantEleve}
                        />
                        <span className="text-sm text-slate-600">&gt; 10k€</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Actions en retard</label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={filterActionsRetard}
                          onCheckedChange={setFilterActionsRetard}
                        />
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Statuts finaux</label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={showStatutsFinaux}
                          onCheckedChange={setShowStatutsFinaux}
                        />
                        <span className="text-sm text-slate-600">Afficher</span>
                      </div>
                    </div>

                    <div>
                      <Badge variant="outline" className="text-sm">
                        {finalDisplayableDossiers.length} dossier{finalDisplayableDossiers.length !== 1 ? 's' : ''} visible{finalDisplayableDossiers.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Kanban Board avec barre de scroll personnalisée */}
        <div className="space-y-4">
          {/* Barre de défilement personnalisée */}
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Navigation Kanban</span>
              <span className="text-xs text-slate-500">Cliquez pour naviguer ⟵ ⟶</span>
            </div>
            <div
              className="relative h-3 bg-slate-100 rounded-full cursor-pointer"
              onClick={handleTrackClick}
            >
              <div
                ref={customScrollThumbRef}
                className="absolute top-0 h-full bg-blue-500 rounded-full"
                style={{ width: '20%', left: '0%' }}
              ></div>
            </div>
          </div>

          {/* Le Kanban */}
          <div
            ref={kanbanContainerRef}
            className="kanban-container w-full overflow-x-auto"
            style={{
              scrollbarWidth: 'auto',
              scrollbarColor: '#94a3b8 #e2e8f0'
            }}
            onScroll={handleKanbanScroll}
          >
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 pb-4" style={{ minWidth: '2000px' }}>
                {statutsAffiches.map((statut) => {
                  const dossiersStatut = filteredDossiers
                    .filter(d => d.statut_recouvrement === statut)
                    .sort((a, b) => {
                      if (!a.date_derniere_activite && !b.date_derniere_activite) return 0;
                      if (!a.date_derniere_activite) return -1;
                      if (!b.date_derniere_activite) return 1;
                      return new Date(a.date_derniere_activite).getTime() - new Date(b.date_derniere_activite).getTime();
                    });
                  
                  const totalMontantStatut = dossiersStatut.reduce((sum, d) => sum + (d.montant_restant_du || 0), 0);

                  return (
                    <div key={statut} className="flex-shrink-0 w-80 h-[70vh]">
                      <Card className="bg-white border border-slate-200 flex flex-col h-full">
                        <CardHeader className="pb-3 border-b border-slate-200 flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900 text-sm">
                              {statut.replace(/_/g, ' ')}
                            </h3>
                            <Badge variant="outline">
                              {dossiersStatut.length}
                            </Badge>
                          </div>
                        </CardHeader>

                        <Droppable droppableId={statut}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-3 space-y-3 flex-1 overflow-y-auto ${
                                snapshot.isDraggingOver ? 'bg-blue-50' : ''
                              }`}
                            >
                              {dossiersStatut.map((dossier, index) => (
                                <Draggable
                                  key={dossier.id}
                                  draggableId={dossier.id}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={snapshot.isDragging ? 'rotate-2 shadow-lg' : ''}
                                    >
                                      <KanbanCard dossier={dossier} onOpenActionModal={openActionModal} />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                        
                        <div className="p-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-700 text-xs uppercase">Total</h3>
                            <Badge variant="secondary" className="font-semibold">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalMontantStatut)}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          </div>
        </div>

        {/* Modals */}
        {showStatusModal && (
          <StatusChangeModal
            isOpen={showStatusModal}
            onClose={() => {
              setShowStatusModal(false);
              setSelectedDossier(null);
              setTargetStatut("");
            }}
            dossier={selectedDossier}
            newStatut={targetStatut}
            onConfirm={handleStatusChange}
          />
        )}

        {showUploadModal && (
          <UploadDocumentModal
            isOpen={showUploadModal}
            onClose={() => {
              setShowUploadModal(false);
              setSelectedDossier(null);
              setTargetStatut("");
            }}
            dossier={selectedDossier}
            onConfirm={handleDocumentUpload}
          />
        )}

        {showActionModal && (
          <ActionModal
            isOpen={showActionModal}
            onClose={() => {
              setShowActionModal(false);
              setSelectedDossier(null);
              setPreselectedActionType(null);
            }}
            dossier={selectedDossier}
            onConfirm={handleSaveAction}
            preselectedType={preselectedActionType}
          />
        )}
      </div>
    </div>
  );
}