
import React, { useState, useEffect, useCallback } from "react";
import { DossierRecouvrement, EntrepriseDebiteur, Transaction, Action, Contact, HistoriqueStatut, DocumentCreance, User as UserEntity } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Euro, Calendar, User, Phone, Mail, Clock, Users, Plus, ExternalLink, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


import ActionModal from "../components/kanban/ActionModal";
import AttachmentUploadModal from "../components/dossier-detail/AttachmentUploadModal";

const ALL_STATUTS = [
  "PENDING ASSIGNATION", "R1", "R2", "R3", "R4", "R5", "PROMISE TO PAY",
  "UNDER NEGOTIATION", "CONCILIATION - PENDING ASSIGNATION", "CONCILIATION - ONGOING MEETINGS",
  "LAWYER / CONCILIATION", "REPAYMENT PLAN TO SCHEDULE", "REPAYMENT PLAN ONGOING",
  "DISPUTE / LITIGATION", "PENDING TO BE OUTSOURCED", "OUTSOURCED TO AGENCY",
  "COLLECTIVE PROCEDURE", "FULLY RECOVERED", "WRITTEN OFF / CANCELLED"
];

export default function Dossier() {
  // Utiliser les paramètres d'URL au lieu de useParams
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  const [dossier, setDossier] = useState(null);
  const [entreprise, setEntreprise] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [actions, setActions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [documents, setDocuments] = useState([]); // New state for documents
  const [loading, setLoading] = useState(true);

  // State pour le modal d'action
  const [showActionModal, setShowActionModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false); // New state for attachment modal

  // DEBUG: Suivre les changements de l'état showActionModal
  useEffect(() => {
    console.log(`DossierPage (DEBUG): useEffect a détecté un changement. Nouvelle valeur de showActionModal: ${showActionModal}`);
  }, [showActionModal]);

  const loadDossierDetail = useCallback(async () => {
    setLoading(true);
    
    try {
      // Charger toutes les données
      const [dossiersData, entreprisesData, transactionsData, actionsData, contactsData, documentsData] = await Promise.all([
        DossierRecouvrement.list(),
        EntrepriseDebiteur.list(),
        Transaction.list(),
        Action.list(),
        Contact.list(),
        DocumentCreance.list() // Fetch documents
      ]);

      const currentDossier = dossiersData.find(d => d.id === id);
      const entrepriseData = currentDossier ? entreprisesData.find(e => e.id === currentDossier.entreprise_id) : null;
      const dossierTransactions = transactionsData.filter(t => t.dossier_id === id);
      const dossierActions = actionsData.filter(a => a.dossier_id === id);
      const dossierContacts = entrepriseData ? contactsData.filter(c => c.entreprise_id === entrepriseData.id) : [];
      const dossierDocuments = documentsData.filter(doc => doc.dossier_id === id); // Filter documents for the current dossier

      if (currentDossier && entrepriseData) {
        // Calculer montants
        const transactionsValides = dossierTransactions.filter(t => 
          ["Paiement", "Virement reçu"].includes(t.type_transaction) &&
          t.pris_en_compte_calcul === true &&
          t.statut !== "Annulé"
        );
        const montantTotalPaye = transactionsValides.reduce((sum, t) => sum + (t.montant || 0), 0);
        const montantRestant = (currentDossier.montant_initial || 0) - montantTotalPaye;

        setDossier({
          ...currentDossier,
          montant_total_paye: montantTotalPaye,
          montant_restant_du: montantRestant
        });
        setEntreprise(entrepriseData);
        setTransactions(dossierTransactions.sort((a, b) => new Date(b.date_transaction) - new Date(a.date_transaction)));
        setActions(dossierActions.sort((a, b) => new Date(b.date_action) - new Date(a.date_action)));
        setContacts(dossierContacts);
        setDocuments(dossierDocuments.sort((a, b) => new Date(b.date_upload) - new Date(a.date_upload))); // Set documents state
      }
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadDossierDetail();
    }
  }, [id, loadDossierDetail]);

  const updateDossierStatut = useCallback(async (dossierId, oldStatut, newStatut, additionalDossierUpdates = {}) => {
    const toastId = toast.loading("Mise à jour du statut...");
    try {
      console.log("Dossier: Récupération de l'utilisateur pour le changement de statut...");
      const user = await UserEntity.me(); // Fetch current user
      console.log("Dossier: Utilisateur récupéré:", user);
      
      let responsibleAgent;
      if (user && user.full_name) {
        console.log("Dossier: Nom complet trouvé:", user.full_name);
        responsibleAgent = user.full_name;
      } else {
        console.log("Dossier: Pas de nom complet, utilisation de l'email:", user?.email);
        responsibleAgent = user?.email || "Agent Inconnu";
      }
      
      console.log("Dossier: Agent responsable final:", responsibleAgent);

      await DossierRecouvrement.update(dossierId, {
        statut_recouvrement: newStatut,
        date_entree_statut: new Date().toISOString(),
        date_derniere_activite: new Date().toISOString(),
        ...additionalDossierUpdates, // For promise details like montant_promis, date_promesse
      });

      await HistoriqueStatut.create({
        dossier_id: dossierId,
        ancien_statut: oldStatut,
        nouveau_statut: newStatut,
        date_changement: new Date().toISOString(),
        change_par: responsibleAgent, 
        motif: `Changement depuis la page dossier${additionalDossierUpdates.commentaire_promesse ? ` (Promesse: ${additionalDossierUpdates.commentaire_promesse})` : ''}`
      });
      
      // Create an action for the status change
      console.log("Dossier: Création d'une action avec agent_responsable:", responsibleAgent);
      await Action.create({
        entreprise_id: entreprise.id, // Assuming entreprise is available in scope
        dossier_id: dossierId,
        type_action: "Changement de statut",
        date_action: new Date().toISOString(),
        agent_responsable: responsibleAgent, // Use current user's name
        description: `Statut changé de "${oldStatut}" vers "${newStatut}"`,
        resultat: "Autre"
      });
      
      toast.success("Statut mis à jour avec succès !", { id: toastId });
      loadDossierDetail(); // Recharger les données pour refléter le changement
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Erreur lors de la mise à jour du statut.", { id: toastId });
      throw error; // Propagate error for try/catch in calling function if needed
    }
  }, [loadDossierDetail, entreprise]);

  const handleSaveAction = async (actionData) => {
    if (!dossier || !entreprise) return; // Ensure dossier and entreprise are loaded
    try {
      console.log("Dossier: Sauvegarde d'action avec agent_responsable:", actionData.agent_responsable);
      
      await Action.create({
        entreprise_id: dossier.entreprise_id,
        dossier_id: dossier.id,
        type_action: actionData.type_action,
        date_action: new Date().toISOString(), 
        agent_responsable: actionData.agent_responsable, // Use agent name from ActionModal
        description: actionData.description,
        resultat: actionData.resultat,
        montant_promis: actionData.montant_promis,
        date_promise: actionData.date_promise,
      });

      await DossierRecouvrement.update(dossier.id, {
        date_derniere_activite: new Date().toISOString(),
      });

      if (actionData.resultat === 'Promesse de paiement') {
        await updateDossierStatut(dossier.id, dossier.statut_recouvrement, 'PROMISE TO PAY', {
          montant_promis: actionData.montant_promis,
          date_promesse: actionData.date_promise,
          commentaire_promesse: actionData.description, // Use action description as promise comment
        });
      } else {
        // Pour les autres actions, juste refetch pour mettre à jour les données
        loadDossierDetail(); // Recharger les données pour voir la nouvelle action
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de l'action:", error);
      toast.error("Erreur lors de l'enregistrement de l'action.");
    } finally {
      setShowActionModal(false);
    }
  };

  const handleAttachmentUpload = async ({ file, link, fileName, type_document, notes, upload_par }) => {
    if (!dossier) return;
    const toastId = toast.loading("Upload du fichier en cours...");

    try {
      let fileUrl;
      let finalFileName;

      if (file) {
        const { file_url } = await UploadFile({ file: file });
        fileUrl = file_url;
        finalFileName = file.name;
      } else {
        fileUrl = link;
        finalFileName = fileName;
      }
      
      console.log("Dossier: Création de document avec upload_par:", upload_par);
      
      await DocumentCreance.create({
        dossier_id: dossier.id,
        type_document: type_document,
        nom_fichier: finalFileName,
        date_upload: new Date().toISOString(),
        upload_par: upload_par, // Use user name from AttachmentUploadModal
        fichier: fileUrl,
        notes: notes
      });

      console.log("Dossier: Création d'action d'ajout de document avec agent_responsable:", upload_par);
      
      await Action.create({
        entreprise_id: dossier.entreprise_id,
        dossier_id: dossier.id,
        type_action: "Document ajouté",
        date_action: new Date().toISOString(),
        agent_responsable: upload_par, // Use user name from AttachmentUploadModal
        description: `Document ajouté: ${finalFileName} (${type_document})`,
        resultat: "Autre"
      });

      toast.success("Pièce jointe ajoutée avec succès !", { id: toastId });
      setShowAttachmentModal(false);
      loadDossierDetail(); // Recharger les données pour voir le nouveau document
    } catch (error) {
      console.error("Erreur lors de l'ajout de la pièce jointe:", error);
      toast.error("Erreur lors de l'upload.", { id: toastId });
    }
  };

  const handleStatusChange = async (newStatut) => {
    if (!dossier || dossier.statut_recouvrement === newStatut) return;
    
    try {
      await updateDossierStatut(dossier.id, dossier.statut_recouvrement, newStatut);
    } catch (error) {
      // Error is already handled by updateDossierStatut's toast
    }
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600 mb-4">Aucun ID de dossier fourni</p>
            <Link to={createPageUrl("Kanban")}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au Kanban
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dossier || !entreprise) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600 mb-4">Dossier non trouvé (ID: {id})</p>
            <Link to={createPageUrl("Kanban")}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au Kanban
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculer l'URL Pappers pour l'entreprise
  const pappersUrl = (entreprise.siren && entreprise.pays === 'France') ? 
    `https://www.pappers.fr/recherche?q=${entreprise.siren}` : null;

  return (
    <>
      {/* DEBUG: Log de la valeur de l'état à chaque rendu */}
      {console.log(`DossierPage (DEBUG): Rendu en cours. Valeur de showActionModal: ${showActionModal}`)}

      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
               <Link to={createPageUrl("Kanban")}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{entreprise.nom_entreprise}</h1>
                <p className="text-slate-600">Détail du dossier de recouvrement</p>
              </div>
            </div>
            
            {/* Sélecteur de statut */}
            <div className="flex-shrink-0 w-64">
                <Select value={dossier.statut_recouvrement} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Changer le statut..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUTS.map(statut => (
                      <SelectItem key={statut} value={statut}>
                        {statut.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations principales */}
            <div className="lg:col-span-2 space-y-6">
              {/* Résumé du dossier */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="w-5 h-5" />
                    Résumé Financier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Montant initial</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.montant_initial || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Montant payé</p>
                      <p className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.montant_total_paye || 0)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Montant restant dû</p>
                    <p className="text-3xl font-bold text-red-600">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.montant_restant_du || 0)}
                    </p>
                  </div>
                  <div className="pt-4 border-t">
                    <Badge className="text-sm" variant="outline">
                      Statut: {dossier.statut_recouvrement}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions récentes */}
              <Card>
                <CardHeader>
                  <CardTitle>Transactions ({transactions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto space-y-3 pr-2">
                      {transactions.map((transaction) => (
                        <div key={transaction.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium">{transaction.type_transaction}</p>
                            <p className="text-sm text-slate-600">
                              {format(new Date(transaction.date_transaction), 'dd/MM/yyyy', { locale: fr })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              transaction.type_transaction === "Prélèvement échoué" ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {transaction.type_transaction === "Prélèvement échoué" ? '-' : '+'}
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(transaction.montant || 0)}
                            </p>
                            {transaction.pris_en_compte_calcul && (
                              <Badge variant="outline" className="text-xs">Actif</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-8">Aucune transaction</p>
                  )}
                </CardContent>
              </Card>

              {/* Actions récentes */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Actions Récentes
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => {
                    console.log("DossierPage (DEBUG): Bouton 'Ajouter Action' cliqué. Tentative de mise à jour de showActionModal à true.");
                    setShowActionModal(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </CardHeader>
                <CardContent>
                  {actions.length > 0 ? (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                      {actions.map((action) => (
                        <div key={action.id} className="p-3 bg-slate-50 rounded-lg">
                          <p className="font-medium text-sm">{action.type_action}</p>
                          <p className="text-xs text-slate-600">
                            {format(new Date(action.date_action), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </p>
                          {action.description && (
                            <p className="text-xs text-slate-500 mt-1">{action.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-4">Aucune action</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Infos entreprise */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-600">SIREN</p>
                    <p className="font-mono">{entreprise.siren || "Non renseigné"}</p>
                  </div>
                  
                  {/* Bouton Pappers */}
                  {pappersUrl && (
                    <div className="pt-2">
                      <a
                        href={pappersUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-colors"
                        title="Consulter les informations légales et financières sur Pappers.fr"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Voir fiche Pappers
                      </a>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-slate-600">Pays</p>
                    <p>{entreprise.pays || "Non renseigné"}</p>
                  </div>
                  {entreprise.agent_assigne && (
                    <div>
                      <p className="text-sm text-slate-600">Agent assigné</p>
                      <Badge variant="outline">{entreprise.agent_assigne}</Badge>
                    </div>
                  )}
                  {entreprise.telephone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{entreprise.telephone}</span>
                    </div>
                  )}
                  {entreprise.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{entreprise.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {contacts.length > 0 ? (
                    <div className="space-y-4">
                      {contacts.map((contact) => (
                        <div key={contact.id} className="p-3 bg-slate-50 rounded-lg">
                          <p className="font-semibold text-sm">{contact.prenom} {contact.nom}</p>
                          {contact.fonction && (
                            <p className="text-xs text-slate-500">{contact.fonction}</p>
                          )}
                          <div className="mt-2 space-y-1">
                            {contact.email && (
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{contact.email}</span>
                              </div>
                            )}
                            {contact.telephone_mobile && (
                               <div className="flex items-center gap-2 text-xs text-slate-600">
                                 <Phone className="w-3 h-3 text-slate-400" />
                                 <span>{contact.telephone_mobile}</span>
                               </div>
                             )}
                             {contact.telephone_fixe && (
                               <div className="flex items-center gap-2 text-xs text-slate-600">
                                 <Phone className="w-3 h-3 text-slate-400" />
                                 <span>{contact.telephone_fixe}</span>
                               </div>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-4">Aucun contact</p>
                  )}
                </CardContent>
              </Card>

              {/* Pièces jointes */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Pièces Jointes
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowAttachmentModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                      {documents.map((doc) => (
                        <a 
                          key={doc.id}
                          href={doc.fichier}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <p className="font-medium text-sm text-blue-600 truncate">{doc.nom_fichier}</p>
                          <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                            <span>{doc.type_document}</span>
                            <span>{format(new Date(doc.date_upload), 'dd/MM/yy')}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-4">Aucune pièce jointe</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modales */}
      {showActionModal && (
        <ActionModal
          isOpen={showActionModal}
          onClose={() => setShowActionModal(false)}
          dossier={dossier}
          onConfirm={handleSaveAction}
        />
      )}
      {showAttachmentModal && (
        <AttachmentUploadModal
          isOpen={showAttachmentModal}
          onClose={() => setShowAttachmentModal(false)}
          dossier={dossier}
          onConfirm={handleAttachmentUpload}
        />
      )}
    </>
  );
}
