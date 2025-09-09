import React, { useState, useEffect } from "react";
import { EntrepriseDebiteur, DossierRecouvrement, Action } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3,
  UserCheck,
  Building2,
  ArrowRight
} from "lucide-react";

import AgentStatsCard from "../components/reassignation/AgentStatsCard";

const AGENTS_VALIDES = ["Maya", "Andrea", "Dylon", "Sébastien"];

export default function Reassignation() {
  const [entreprisesAReassigner, setEntreprisesAReassigner] = useState([]);
  const [entreprisesValides, setEntreprisesValides] = useState([]);
  const [reassignations, setReassignations] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);
  const [massAgent, setMassAgent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [entreprisesData, dossiersData] = await Promise.all([
        EntrepriseDebiteur.list(),
        DossierRecouvrement.list()
      ]);

      // Séparer les entreprises valides des non valides
      const entreprisesValides = [];
      const entreprisesAReassigner = [];

      entreprisesData.forEach(entreprise => {
        if (!entreprise.agent_assigne || !AGENTS_VALIDES.includes(entreprise.agent_assigne)) {
          // Ajouter info sur le dossier associé
          const dossier = dossiersData.find(d => d.entreprise_id === entreprise.id);
          entreprisesAReassigner.push({
            ...entreprise,
            dossier: dossier
          });
        } else {
          entreprisesValides.push(entreprise);
        }
      });

      setEntreprisesAReassigner(entreprisesAReassigner);
      setEntreprisesValides(entreprisesValides);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentChange = (entrepriseId, nouvelAgent) => {
    setReassignations(prev => ({
      ...prev,
      [entrepriseId]: nouvelAgent
    }));
  };

  const handleSelectItem = (entrepriseId, checked) => {
    setSelectedItems(prev => 
      checked 
        ? [...prev, entrepriseId]
        : prev.filter(id => id !== entrepriseId)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedItems(checked ? entreprisesAReassigner.map(e => e.id) : []);
  };

  const handleMassAssignment = () => {
    if (!massAgent) return;
    
    const newReassignations = { ...reassignations };
    selectedItems.forEach(entrepriseId => {
      newReassignations[entrepriseId] = massAgent;
    });
    setReassignations(newReassignations);
    setMassAgent("");
  };

  const handleSave = async () => {
    const toUpdate = Object.entries(reassignations).filter(([_, agent]) => agent);
    if (toUpdate.length === 0) return;

    setSaving(true);
    try {
      // Mettre à jour les entreprises
      for (const [entrepriseId, nouvelAgent] of toUpdate) {
        const entreprise = entreprisesAReassigner.find(e => e.id === entrepriseId);
        
        // Mettre à jour l'entreprise
        await EntrepriseDebiteur.update(entrepriseId, {
          agent_assigne: nouvelAgent
        });

        // Logger l'action
        await Action.create({
          entreprise_id: entrepriseId,
          dossier_id: entreprise.dossier?.id || null,
          type_action: "Changement de statut",
          date_action: new Date().toISOString(),
          agent_responsable: "Système",
          description: `Agent réassigné de "${entreprise.agent_assigne || 'Non assigné'}" vers "${nouvelAgent}"`,
          resultat: "Autre"
        });
      }

      // Recharger les données
      await loadData();
      setReassignations({});
      setSelectedItems([]);
      
      // Message de succès (pourrait être un toast)
      alert(`${toUpdate.length} entreprise(s) réassignée(s) avec succès`);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert("Erreur lors de la réassignation");
    } finally {
      setSaving(false);
    }
  };

  const getAgentStats = () => {
    const stats = {};
    AGENTS_VALIDES.forEach(agent => {
      stats[agent] = entreprisesValides.filter(e => e.agent_assigne === agent).length;
    });
    return stats;
  };

  const getSuggestedDistribution = () => {
    const currentStats = getAgentStats();
    const totalToReassign = entreprisesAReassigner.length;
    const totalCurrent = Object.values(currentStats).reduce((sum, count) => sum + count, 0);
    const totalAfter = totalCurrent + totalToReassign;
    const targetPerAgent = Math.ceil(totalAfter / AGENTS_VALIDES.length);
    
    const suggestions = {};
    AGENTS_VALIDES.forEach(agent => {
      const needed = Math.max(0, targetPerAgent - currentStats[agent]);
      suggestions[agent] = Math.min(needed, totalToReassign);
    });
    
    return suggestions;
  };

  const agentStats = getAgentStats();
  const suggestions = getSuggestedDistribution();
  const totalReassignations = Object.keys(reassignations).filter(k => reassignations[k]).length;
  const allSelected = selectedItems.length === entreprisesAReassigner.length && entreprisesAReassigner.length > 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 rounded"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Réassignation des Agents</h1>
          <p className="text-slate-600">Gestion des entreprises sans agent assigné ou avec agent invalide</p>
        </div>

        {/* Statistiques actuelles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {AGENTS_VALIDES.map(agent => (
            <AgentStatsCard
              key={agent}
              agent={agent}
              current={agentStats[agent]}
              suggested={suggestions[agent]}
            />
          ))}
        </div>

        {/* Message de suggestion */}
        {entreprisesAReassigner.length > 0 && (
          <Alert className="mb-6">
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              <strong>Suggestion de répartition équilibrée :</strong> {' '}
              {Object.entries(suggestions).map(([agent, count]) => 
                count > 0 ? `${agent}: +${count}` : null
              ).filter(Boolean).join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {entreprisesAReassigner.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Toutes les entreprises sont correctement assignées
              </h3>
              <p className="text-slate-600">
                Aucune réassignation n'est nécessaire pour le moment
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="border-b border-slate-200">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Entreprises à réassigner ({entreprisesAReassigner.length})
                </CardTitle>
                
                {/* Actions en masse */}
                <div className="flex items-center gap-3">
                  <Select value={massAgent} onValueChange={setMassAgent}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Assigner en masse à..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENTS_VALIDES.map(agent => (
                        <SelectItem key={agent} value={agent}>
                          {agent} (actuellement {agentStats[agent]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline"
                    onClick={handleMassAssignment}
                    disabled={!massAgent || selectedItems.length === 0}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Appliquer ({selectedItems.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Entreprise</TableHead>
                    <TableHead className="font-semibold">SIREN</TableHead>
                    <TableHead className="font-semibold">Agent actuel</TableHead>
                    <TableHead className="font-semibold">Montant dû</TableHead>
                    <TableHead className="font-semibold">Nouvel agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entreprisesAReassigner.map((entreprise) => (
                    <TableRow key={entreprise.id} className="hover:bg-slate-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(entreprise.id)}
                          onCheckedChange={(checked) => handleSelectItem(entreprise.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold">{entreprise.nom_entreprise}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {entreprise.siren || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {entreprise.agent_assigne ? (
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            {entreprise.agent_assigne}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500">
                            Non assigné
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {entreprise.dossier ? (
                          <span className="font-semibold">
                            {new Intl.NumberFormat('fr-FR', { 
                              style: 'currency', 
                              currency: 'EUR' 
                            }).format(entreprise.dossier.montant_restant_du || 0)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={reassignations[entreprise.id] || ""}
                          onValueChange={(value) => handleAgentChange(entreprise.id, value)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue placeholder="Choisir..." />
                          </SelectTrigger>
                          <SelectContent>
                            {AGENTS_VALIDES.map(agent => (
                              <SelectItem key={agent} value={agent}>
                                {agent}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Actions de sauvegarde */}
        {totalReassignations > 0 && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">
                      {totalReassignations} réassignation{totalReassignations > 1 ? 's' : ''} en attente
                    </p>
                    <p className="text-sm text-green-700">
                      Les changements seront appliqués et loggés dans l'historique des actions
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Enregistrer les réassignations
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}