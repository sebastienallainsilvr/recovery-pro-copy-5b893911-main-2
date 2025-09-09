import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Euro,
  User,
  Clock,
  AlertTriangle,
  Eye,
  Plus
} from "lucide-react";
import { differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from '@/utils';

export default function KanbanCard({ dossier, onOpenActionModal }) {
  const { entreprise, montant_restant_du, en_retard } = dossier;

  if (!entreprise) return null;

  const montantElevé = (montant_restant_du || 0) > 10000;

  // Calculer les jours depuis dernière activité
  const joursDepuisActivite = dossier.date_derniere_activite ? 
    differenceInDays(new Date(), new Date(dossier.date_derniere_activite)) : null;
  
  // Déterminer si la carte doit avoir un fond rouge (plus de 7 jours sans activité)
  const ancienneActivite = joursDepuisActivite !== null && joursDepuisActivite > 7;

  return (
    <Card
      className={`cursor-move transition-all duration-200 hover:shadow-md ${
        ancienneActivite ? 'bg-red-50 border-red-200' : 
        en_retard ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'
      }`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Titre - Nom entreprise */}
        <div className="flex items-start justify-between">
          <Link
            to={createPageUrl("Dossier") + `?id=${dossier.id}`}
            className="font-semibold text-slate-900 text-sm leading-tight flex-1 pr-2 hover:text-blue-600 transition-colors"
          >
            {entreprise.nom_entreprise}
          </Link>
          {en_retard && (
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          )}
        </div>

        {/* SIREN si disponible */}
        {entreprise.siren && (
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Building2 className="w-3 h-3" />
            <span className="font-mono">{entreprise.siren}</span>
          </div>
        )}

        {/* Badge montant restant dû */}
        <div className="flex items-center gap-1">
          <Euro className="w-4 h-4 text-slate-400" />
          <Badge
            className={`text-xs font-semibold border ${
              montantElevé
                ? 'bg-red-100 text-red-800 border-red-200'
                : 'bg-slate-100 text-slate-800 border-slate-200'
            }`}
          >
            {new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(montant_restant_du || 0)}
          </Badge>
        </div>

        {/* Badge agent assigné */}
        {entreprise.agent_assigne && (
          <div className="flex items-center gap-1">
            <User className="w-4 h-4 text-slate-400" />
            <Badge variant="outline" className="text-xs">
              {entreprise.agent_assigne}
            </Badge>
          </div>
        )}

        {/* Informations d'activité et boutons */}
        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3 text-slate-400" />
            <span
              className={`font-medium ${
                ancienneActivite ? 'text-red-700' :
                joursDepuisActivite !== null && joursDepuisActivite > 3 ? 'text-orange-700' : 'text-slate-600'
              }`}
            >
              {joursDepuisActivite === null ? "Aucune action" :
               joursDepuisActivite === 0 ? "Aujourd'hui" :
               `Il y a ${joursDepuisActivite} j.`}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onOpenActionModal(dossier)}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Link to={createPageUrl("Dossier") + `?id=${dossier.id}`}>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                  <Eye className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}