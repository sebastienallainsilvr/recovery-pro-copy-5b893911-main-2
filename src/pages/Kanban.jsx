
import React, { useState, useEffect, useRef } from "react";
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
  ChevronDown // Added ChevronDown icon import
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { fr } from "date-fns/locale";

import KanbanCard from "../components/kanban/KanbanCard";
import StatusChangeModal from "../components/kanban/StatusChangeModal";
import UploadDocumentModal from "../components/kanban/UploadDocumentModal";
import ActionModal from "../components/kanban/ActionModal";

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
  const [dossiers, setDossiers] = useState([]);
  const [entreprises, setEntreprises] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [isFiltersOpen, setIsFiltersOpen] = useState(false); // New state for filters
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterPays, setFilterPays] = useState("all");
  const [filterMontantEleve, setFilterMontantEleve] = useState(false);
  const [filterActionsRetard, setFilterActionsRetard] = useState(false);
  const [showStatutsFinaux, setShowStatutsFinaux] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // Nouveau state pour la recherche

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [targetStatut, setTargetStatut] = useState("");
  const [preselectedActionType, setPreselectedActionType] = useState(null);

  // Refs pour la nouvelle barre de défilement
  const kanbanContainerRef = useRef(null);
  const customScrollThumbRef = useRef(null);

  const agents = ["Maya", "Andrea", "Dylon", "Sébastien"];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dossiersData, entreprisesData, transactionsData, actionsData] = await Promise.all([
        DossierRecouvrement.list(),
        EntrepriseDebiteur.list(),
        Transaction.list(),
        Action.list()
      ]);

      // Enrichir les dossiers avec les calculs
      const enrichedDossiers = dossiersData.map(dossier => {
        const entreprise = entreprisesData.find(e => e.id === dossier.entreprise_id);

        // Calculer montant_total_paye (SANS exclure les annulés pour le remaining amount)
        const transactionsValides = transactionsData.filter(t =>
          t.dossier_id === dossier.id &&
          ["Paiement", "Virement reçu"].includes(t.type_transaction) &&
          t.pris_en_compte_calcul === true
          // Retirer la condition && t.statut !== "Annulé" pour inclure les annulés
        );
        const montantTotalPaye = transactionsValides.reduce((sum, t) => sum + (t.montant || 0), 0);

        // Calculer montant_restant_du (incluant les annulés)
        const montantRestant = (dossier.montant_initial || 0) - montantTotalPaye;

        // Calculer jours depuis dernière action
        const actionsEntreprise = actionsData.filter(a => a.entreprise_id === dossier.entreprise_id);
        const derniereAction = actionsEntreprise.length > 0 ?
          actionsEntreprise.reduce((latest, action) =>
            new Date(action.date_action) > new Date(latest.date_action) ? action : latest
          ) : null;

        const joursDepuisDerniereAction = derniereAction ?
          differenceInDays(new Date(), new Date(derniereAction.date_action)) : null;

        // Calculer date limite action
        let dateLimiteAction = null;
        if (dossier.date_entree_statut && ["R1", "R2", "R3", "R4"].includes(dossier.statut_recouvrement)) {
          const jours = dossier.statut_recouvrement === "R4" ? 3 : 5;
          dateLimiteAction = addDays(new Date(dossier.date_entree_statut), jours);
        }

        const enRetard = dateLimiteAction ? new Date() > dateLimiteAction : false;

        return {
          ...dossier,
          entreprise,
          montant_total_paye: montantTotalPaye,
          montant_restant_du: montantRestant,
          jours_depuis_derniere_action: joursDepuisDerniereAction,
          date_limite_action: dateLimiteAction,
          en_retard: enRetard
        };
      });

      setDossiers(enrichedDossiers);
      setEntreprises(entreprisesData);
      setTransactions(transactionsData);
      setActions(actionsData);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKanbanScroll = () => {
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
  };

  useEffect(() => {
    // Appeler handleKanbanScroll au chargement pour définir la taille initiale
    const container = kanbanContainerRef.current;
    if (container) {
      // Un petit délai pour s'assurer que le rendu est terminé
      setTimeout(handleKanbanScroll, 100);
    }
    // Ajouter un écouteur pour le redimensionnement de la fenêtre
    window.addEventListener('resize', handleKanbanScroll);
    return () => window.removeEventListener('resize', handleKanbanScroll);
  }, [dossiers]); // Ré-exécuter si les dossiers changent


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

  const filteredDossiers = dossiers.filter(dossier => {
    if (!dossier.entreprise) return false;

    if (filterAgent !== "all" && dossier.entreprise.agent_assigne !== filterAgent) return false;
    if (filterPays !== "all" && dossier.entreprise.pays !== filterPays) return false;
    if (filterMontantEleve && (dossier.montant_restant_du || 0) <= 10000) return false;
    if (filterActionsRetard && !dossier.en_retard) return false;

    // Nouveau filtre de recherche
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

  // Calculate the count of dossiers that will actually be displayed after all filters
  const finalDisplayableDossiers = filteredDossiers.filter(dossier =>
    statutsAffiches.includes(dossier.statut_recouvrement)
  );

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const dossierId = result.draggableId;
    const newStatut = result.destination.droppableId;
    const dossier = dossiers.find(d => d.id === dossierId);

    if (!dossier || dossier.statut_recouvrement === newStatut) return;

    // Règles spéciales
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

    // Changement de statut standard
    await updateDossierStatut(dossier, newStatut);
  };

  const updateDossierStatut = async (dossier, newStatut, additionalData = {}) => {
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

      loadData(); // Recharger les données
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  const handleStatusChange = async (data) => {
    await updateDossierStatut(selectedDossier, targetStatut, data);
    setShowStatusModal(false);
    setSelectedDossier(null);
    setTargetStatut("");
  };

  const handleDocumentUpload = async (documentData) => {
    try {
      // Créer le document
      await DocumentCreance.create(documentData);

      // Mettre à jour le statut
      await updateDossierStatut(selectedDossier, targetStatut);

      setShowUploadModal(false);
      setSelectedDossier(null);
      setTargetStatut("");
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
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
      // 1. Create Action
      await Action.create({
        entreprise_id: selectedDossier.entreprise_id,
        dossier_id: selectedDossier.id,
        type_action: actionData.type_action,
        date_action: new Date().toISOString(),
        agent_responsable: "Agent", // TODO: Remplacer par l'agent connecté
        description: actionData.description,
        resultat: actionData.resultat,
        montant_promis: actionData.montant_promis,
        date_promise: actionData.date_promise,
      });

      // 2. Update Dossier's last activity date
      await DossierRecouvrement.update(selectedDossier.id, {
        date_derniere_activite: new Date().toISOString(),
      });

      // 3. Handle status change for "Promise to Pay"
      if (actionData.resultat === 'Promesse de paiement') {
        // This will reload data internally
        await updateDossierStatut(selectedDossier, 'PROMISE TO PAY', {
          montant_promis: actionData.montant_promis,
          date_promesse: actionData.date_promise,
          commentaire_promesse: actionData.description,
        });
      } else {
        // 4. Reload data for other cases
        loadData();
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de l'action:", error);
    } finally {
      // 5. Close modal
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
            {/* Track de la scrollbar */}
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

          {/* Le Kanban avec une classe spéciale */}
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
                      // Tri par date_derniere_activite croissante (plus ancienne en haut)
                      if (!a.date_derniere_activite && !b.date_derniere_activite) return 0;
                      if (!a.date_derniere_activite) return -1; // place dossiers without a date_derniere_activite at the start
                      if (!b.date_derniere_activite) return 1; // place dossiers with a date_derniere_activite after those without one
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
