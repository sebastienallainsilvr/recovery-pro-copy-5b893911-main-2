import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  RefreshCw,
  Users,
  FileText,
  TrendingUp,
  Archive
} from "lucide-react";

export default function ImportResults({ results, importType, onReset }) {
  const hasErrors = results.errors && results.errors.length > 0;
  const hasReassignments = results.toReassign && results.toReassign.length > 0;
  const successRate = (results.success / results.total) * 100;

  const getImportTypeLabel = (type) => {
    const labels = {
      "ENTREPRISES": "Entreprises",
      "CONTACTS": "Contacts", 
      "PRELEVEMENTS": "Prélèvements Échoués",
      "VIREMENTS": "Virements Reçus",
      "CREANCES": "Créances/Deals"
    };
    return labels[type] || "Données";
  };

  const downloadErrorReport = () => {
    if (!hasErrors) return;
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Ligne,Erreur\n" +
      results.errors.map(error => 
        `"${JSON.stringify(error.row).replace(/"/g, '""')}","${error.error.replace(/"/g, '""')}"`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `erreurs_import_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Résumé principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Import terminé - {getImportTypeLabel(importType)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">{results.total}</div>
              <p className="text-sm text-slate-600">Lignes traitées</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{results.success}</div>
              <p className="text-sm text-slate-600">Succès</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{hasErrors ? results.errors.length : 0}</div>
              <p className="text-sm text-slate-600">Erreurs</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">{successRate.toFixed(1)}%</div>
              <p className="text-sm text-slate-600">Taux de réussite</p>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="mt-6">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${successRate}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Détails spécifiques aux transactions */}
      {(importType === "PRELEVEMENTS" || importType === "VIREMENTS") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Répartition des transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Archive className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {results.active || 0}
                  </div>
                  <p className="text-sm text-slate-600">Transactions actives</p>
                  <p className="text-xs text-slate-500">Impactent les calculs</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Archive className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-600">
                    {results.historical || 0}
                  </div>
                  <p className="text-sm text-slate-600">Transactions historiques</p>
                  <p className="text-xs text-slate-500">Antérieures à la date de prise en compte</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erreurs */}
      {hasErrors && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Erreurs d'import ({results.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {results.errors.length} ligne{results.errors.length > 1 ? 's' : ''} n'ont pas pu être traitée{results.errors.length > 1 ? 's' : ''}.
                Consultez le rapport d'erreurs pour plus de détails.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {results.errors.slice(0, 5).map((error, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                  <p className="font-medium text-red-800">Erreur ligne {index + 1} :</p>
                  <p className="text-red-700">{error.error}</p>
                </div>
              ))}
              {results.errors.length > 5 && (
                <p className="text-sm text-slate-600 text-center py-2">
                  ... et {results.errors.length - 5} autres erreurs
                </p>
              )}
            </div>

            <Button variant="outline" onClick={downloadErrorReport} className="mt-4">
              <Download className="w-4 h-4 mr-2" />
              Télécharger le rapport d'erreurs
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Entreprises à réassigner */}
      {hasReassignments && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Users className="w-5 h-5" />
              Entreprises à réassigner ({results.toReassign.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Ces entreprises ont des agents assignés non reconnus. Elles nécessitent une réassignation manuelle.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {results.toReassign.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded">
                  <div>
                    <p className="font-medium text-orange-900">{item.nom_entreprise}</p>
                    <p className="text-sm text-orange-700">Agent original: {item.agent_original}</p>
                  </div>
                  <Badge variant="outline">À réassigner</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-slate-900">Import terminé avec succès</h4>
              <p className="text-sm text-slate-600">
                {results.success} enregistrement{results.success > 1 ? 's' : ''} créé{results.success > 1 ? 's' : ''} 
                {hasReassignments && ` • ${results.toReassign.length} à réassigner`}
              </p>
            </div>
            
            <div className="flex gap-3">
              {hasReassignments && (
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Gérer les réassignations
                </Button>
              )}
              <Button onClick={onReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Nouvel import
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}