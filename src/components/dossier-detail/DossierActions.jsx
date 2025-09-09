import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Phone, 
  Mail, 
  MessageSquare,
  Edit,
  FileText,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function DossierActions({ actions, onOpenActionModal }) {
  const [filterType, setFilterType] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all");

  const filteredActions = actions.filter(action => {
    const matchesType = filterType === "all" || action.type_action === filterType;
    const matchesAgent = filterAgent === "all" || action.agent_responsable === filterAgent;
    return matchesType && matchesAgent;
  });

  const getActionIcon = (type) => {
    switch (type) {
      case "Appel sortant":
      case "Appel entrant":
        return <Phone className="w-5 h-5" />;
      case "Email manuel":
        return <Mail className="w-5 h-5" />;
      case "SMS":
        return <MessageSquare className="w-5 h-5" />;
      case "Courrier":
        return <FileText className="w-5 h-5" />;
      case "Note interne":
        return <Edit className="w-5 h-5" />;
      case "Changement de statut":
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Edit className="w-5 h-5" />;
    }
  };

  const getResultatColor = (resultat) => {
    switch (resultat) {
      case "Contact établi":
        return "bg-green-100 text-green-800 border-green-200";
      case "Promesse de paiement":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Refus de payer":
        return "bg-red-100 text-red-800 border-red-200";
      case "Contestation":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Pas de réponse":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getAgentColor = (agent) => {
    const colors = {
      "Maya": "bg-purple-100 text-purple-800 border-purple-200",
      "Andrea": "bg-blue-100 text-blue-800 border-blue-200",
      "Dylon": "bg-green-100 text-green-800 border-green-200",
      "Sébastien": "bg-orange-100 text-orange-800 border-orange-200",
      "Système": "bg-slate-100 text-slate-800 border-slate-200"
    };
    return colors[agent] || "bg-slate-100 text-slate-800 border-slate-200";
  };

  const agents = [...new Set(actions.map(a => a.agent_responsable))].filter(Boolean);
  const types = [...new Set(actions.map(a => a.type_action))].filter(Boolean);

  return (
    <div className="space-y-6">
      <Card className="bg-white border border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Historique des Actions ({filteredActions.length})
            </CardTitle>
            <div className="flex gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {types.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterAgent} onValueChange={setFilterAgent}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrer par agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les agents</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {filteredActions.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {filteredActions
                .sort((a, b) => new Date(b.date_action) - new Date(a.date_action))
                .map((action, index) => (
                  <div key={action.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex gap-4">
                      {/* Timeline */}
                      <div className="flex flex-col items-center">
                        <div className="p-2 bg-white border-2 border-slate-200 rounded-full shadow-sm">
                          {getActionIcon(action.type_action)}
                        </div>
                        {index < filteredActions.length - 1 && (
                          <div className="w-px h-16 bg-slate-200 mt-2"></div>
                        )}
                      </div>
                      
                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {action.type_action}
                            </h3>
                            <Badge className={getAgentColor(action.agent_responsable) + " border text-xs"}>
                              {action.agent_responsable}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(action.date_action), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          </div>
                        </div>
                        
                        {action.resultat && (
                          <div className="mb-3">
                            <Badge className={getResultatColor(action.resultat) + " border"}>
                              {action.resultat}
                            </Badge>
                          </div>
                        )}
                        
                        {action.description && (
                          <p className="text-slate-700 mb-3 leading-relaxed">
                            {action.description}
                          </p>
                        )}
                        
                        {/* Promesse de paiement */}
                        {action.montant_promis && action.date_promise && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-medium text-emerald-800">
                                Promesse de paiement
                              </span>
                            </div>
                            <div className="text-sm text-emerald-700">
                              <p>
                                <strong>Montant promis:</strong> {' '}
                                {new Intl.NumberFormat('fr-FR', { 
                                  style: 'currency', 
                                  currency: 'EUR' 
                                }).format(action.montant_promis)}
                              </p>
                              <p>
                                <strong>Date promise:</strong> {' '}
                                {format(new Date(action.date_promise), 'dd MMMM yyyy', { locale: fr })}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Prochaine action */}
                        {action.prochaine_action_prevue && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">
                                Prochaine action prévue
                              </span>
                            </div>
                            <p className="text-sm text-blue-700">
                              {action.prochaine_action_prevue}
                            </p>
                            {action.date_prochaine_action && (
                              <p className="text-sm text-blue-600 mt-1">
                                Le {format(new Date(action.date_prochaine_action), 'dd MMMM yyyy', { locale: fr })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucune action trouvée avec ces filtres</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}