import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  Euro, 
  Calendar,
  TrendingUp,
  MessageSquare,
  Edit,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function DossierSummary({ dossier, entreprise, contacts, actions, onOpenActionModal }) {
  const contactPrincipal = contacts.find(c => c.est_contact_principal) || contacts[0];
  
  const getActionIcon = (type) => {
    switch (type) {
      case "Appel sortant":
      case "Appel entrant":
        return <Phone className="w-4 h-4" />;
      case "Email manuel":
        return <Mail className="w-4 h-4" />;
      case "SMS":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Edit className="w-4 h-4" />;
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Section Entreprise */}
      <div className="space-y-6">
        <Card className="bg-white border border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informations Entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {entreprise.adresse_complete && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-sm text-slate-600">Adresse</p>
                  <p className="text-sm">{entreprise.adresse_complete}</p>
                </div>
              </div>
            )}
            
            {entreprise.telephone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Téléphone</p>
                  <p className="text-sm font-medium">{entreprise.telephone}</p>
                </div>
              </div>
            )}
            
            {entreprise.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Email</p>
                  <p className="text-sm font-medium">{entreprise.email}</p>
                </div>
              </div>
            )}

            {contactPrincipal && (
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Contact principal</p>
                  <p className="text-sm font-medium">
                    {contactPrincipal.prenom} {contactPrincipal.nom}
                  </p>
                  {contactPrincipal.fonction && (
                    <p className="text-xs text-slate-500">{contactPrincipal.fonction}</p>
                  )}
                </div>
              </div>
            )}

            {entreprise.notes_generales && (
              <div className="pt-3 border-t border-slate-200">
                <p className="text-sm text-slate-600 mb-2">Notes</p>
                <p className="text-sm">{entreprise.notes_generales}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <Card className="bg-white border border-slate-200">
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => onOpenActionModal("Appel sortant")}
              >
                <Phone className="w-4 h-4" />
                Appel
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => onOpenActionModal("Email manuel")}
              >
                <Mail className="w-4 h-4" />
                Email
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => onOpenActionModal("SMS")}
              >
                <MessageSquare className="w-4 h-4" />
                SMS
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => onOpenActionModal("Note interne")}
              >
                <Edit className="w-4 h-4" />
                Note
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Financière */}
      <div className="space-y-6">
        <Card className="bg-white border border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Situation Financière
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">
                  {new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR',
                    maximumFractionDigits: 0
                  }).format(dossier.montant_initial || 0)}
                </p>
                <p className="text-sm text-slate-600">Montant initial</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">
                  {new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR',
                    maximumFractionDigits: 0
                  }).format(dossier.montant_total_paye || 0)}
                </p>
                <p className="text-sm text-slate-600">Payé</p>
              </div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
              <p className="text-3xl font-bold text-red-700">
                {new Intl.NumberFormat('fr-FR', { 
                  style: 'currency', 
                  currency: 'EUR',
                  maximumFractionDigits: 0
                }).format(dossier.montant_restant_du || 0)}
              </p>
              <p className="text-sm text-slate-600 font-medium">Montant dû</p>
            </div>

            {dossier.date_premier_impaye && (
              <div className="flex items-center gap-3 pt-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Premier impayé</p>
                  <p className="text-sm font-medium">
                    {format(new Date(dossier.date_premier_impaye), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section Actions récentes */}
      <div className="space-y-6">
        <Card className="bg-white border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Actions récentes
            </CardTitle>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Voir tout
            </Button>
          </CardHeader>
          <CardContent>
            {actions.length > 0 ? (
              <div className="space-y-4">
                {actions.map((action) => (
                  <div key={action.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      {getActionIcon(action.type_action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-900">
                          {action.type_action}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(action.date_action), 'dd/MM HH:mm', { locale: fr })}
                        </p>
                      </div>
                      {action.resultat && (
                        <Badge className={getResultatColor(action.resultat) + " border text-xs mb-2"}>
                          {action.resultat}
                        </Badge>
                      )}
                      {action.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {action.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                Aucune action enregistrée
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}