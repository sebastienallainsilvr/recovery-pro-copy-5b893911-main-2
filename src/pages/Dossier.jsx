
import React, { useState, useEffect, useCallback } from "react";
import { DossierRecouvrement, EntrepriseDebiteur, Transaction, Action, Contact } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Euro, Calendar, User, Phone, Mail, Clock, Users, Plus, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import ActionModal from "../components/kanban/ActionModal";

export default function Dossier() {
  // Utiliser les paramètres d'URL au lieu de useParams
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  const [dossier, setDossier] = useState(null);
  const [entreprise, setEntreprise] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [actions, setActions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // State pour le modal d'action
  const [showActionModal, setShowActionModal] = useState(false);

  const loadDossierDetail = useCallback(async () => {
    setLoading(true);
    
    try {
      // Charger toutes les données
      const [dossiersData, entreprisesData, transactionsData, actionsData, contactsData] = await Promise.all([
        DossierRecouvrement.list(),
        EntrepriseDebiteur.list(),
        Transaction.list(),
        Action.list(),
        Contact.list()
      ]);

      const currentDossier = dossiersData.find(d => d.id === id);
      const entrepriseData = currentDossier ? entreprisesData.find(e => e.id === currentDossier.entreprise_id) : null;
      const dossierTransactions = transactionsData.filter(t => t.dossier_id === id);
      const dossierActions = actionsData.filter(a => a.dossier_id === id);
      const dossierContacts = entrepriseData ? contactsData.filter(c => c.entreprise_id === entrepriseData.id) : [];

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

  const handleSaveAction = async (actionData) => {
    if (!dossier) return;
    try {
      await Action.create({
        entreprise_id: dossier.entreprise_id,
        dossier_id: dossier.id,
        ...actionData,
      });
      await DossierRecouvrement.update(dossier.id, {
        date_derniere_activite: new Date().toISOString(),
      });
      loadDossierDetail(); // Recharger les données pour voir la nouvelle action
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de l'action:", error);
    } finally {
      setShowActionModal(false);
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
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link to={createPageUrl("Kanban")}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au Kanban
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{entreprise.nom_entreprise}</h1>
              <p className="text-slate-600">Détail du dossier de recouvrement</p>
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

              {/* Actions récentes */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Actions Récentes
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowActionModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </CardHeader>
                <CardContent>
                  {actions.length > 0 ? (
                    <div className="space-y-3">
                      {actions.slice(0, 5).map((action) => (
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
          </div>
        </div>
      </div>
      {showActionModal && (
        <ActionModal
          isOpen={showActionModal}
          onClose={() => setShowActionModal(false)}
          dossier={dossier}
          onConfirm={handleSaveAction}
        />
      )}
    </>
  );
}
