import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function DossierStatuts({ historique }) {
  const getStatutColor = (statut) => {
    const colors = {
      "PENDING ASSIGNATION": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "R1": "bg-blue-100 text-blue-800 border-blue-200",
      "R2": "bg-blue-100 text-blue-800 border-blue-200",
      "R3": "bg-orange-100 text-orange-800 border-orange-200",
      "R4": "bg-red-100 text-red-800 border-red-200",
      "R5": "bg-red-100 text-red-800 border-red-200",
      "PROMISE TO PAY": "bg-green-100 text-green-800 border-green-200",
      "UNDER NEGOTIATION": "bg-purple-100 text-purple-800 border-purple-200",
      "FULLY RECOVERED": "bg-emerald-100 text-emerald-800 border-emerald-200",
      "WRITTEN OFF / CANCELLED": "bg-slate-100 text-slate-800 border-slate-200",
      "COLLECTIVE PROCEDURE": "bg-orange-100 text-orange-800 border-orange-200"
    };
    return colors[statut] || "bg-slate-100 text-slate-800 border-slate-200";
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Historique des changements de statut ({historique.length})
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          {historique.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Changement</TableHead>
                    <TableHead className="font-semibold">Par qui</TableHead>
                    <TableHead className="font-semibold">Motif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historique
                    .sort((a, b) => new Date(b.date_changement) - new Date(a.date_changement))
                    .map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="font-medium">
                                {format(new Date(entry.date_changement), 'dd MMMM yyyy', { locale: fr })}
                              </p>
                              <p className="text-sm text-slate-500">
                                {format(new Date(entry.date_changement), 'HH:mm', { locale: fr })}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Badge className={getStatutColor(entry.ancien_statut) + " border text-xs"}>
                              {entry.ancien_statut?.replace(/_/g, ' ')}
                            </Badge>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <Badge className={getStatutColor(entry.nouveau_statut) + " border text-xs"}>
                              {entry.nouveau_statut?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-900">
                              {entry.change_par || 'Inconnu'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-600">
                            {entry.motif || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucun changement de statut enregistré</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}