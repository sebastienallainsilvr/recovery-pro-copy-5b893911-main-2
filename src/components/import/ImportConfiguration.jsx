
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Info, Settings, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function ImportConfiguration({ importType, typeInfo, onSubmit, loading }) {
  const [config, setConfig] = useState({
    datePriseCompte: format(new Date(), 'yyyy-MM-dd'),
    batchId: `IMPORT_${format(new Date(), 'yyyyMMdd_HHmmss')}`
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(config);
  };

  const handleCancel = () => {
    // Retourner à l'étape 1 (upload de fichier)
    window.location.reload();
  };

  const needsDateConfiguration = ["PRELEVEMENTS", "VIREMENTS"].includes(importType);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuration de l'import
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type d'import détecté */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <p className="font-medium">Type détecté : {typeInfo?.name}</p>
            </div>
            <p className="text-green-700 mt-1 text-sm">
              Le fichier sera traité comme un import de {typeInfo?.name.toLowerCase()}
              {importType === "CREANCES" && (
                <><br /><strong>Note importante :</strong> Les montants seront pris depuis la colonne &quot;Sum to recover&quot; (colonne 3), la colonne &quot;Amount&quot; (colonne 4) sera ignorée.</>
              )}
            </p>
          </div>

          {/* Configuration spécifique aux transactions */}
          {needsDateConfiguration && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Pour les imports de transactions, seules les transactions postérieures à la date de prise en compte 
                  impacteront les calculs de montants dus. Les transactions antérieures seront marquées comme historiques.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="datePriseCompte" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date de prise en compte *
                </Label>
                <Input
                  id="datePriseCompte"
                  type="date"
                  value={config.datePriseCompte}
                  onChange={(e) => setConfig({...config, datePriseCompte: e.target.value})}
                  required
                  className="max-w-xs"
                />
                <p className="text-sm text-slate-600">
                  Transactions après cette date = Actives | Transactions avant = Historiques
                </p>
              </div>
            </div>
          )}

          {/* ID du batch */}
          <div className="space-y-2">
            <Label htmlFor="batchId">Identifiant du lot</Label>
            <Input
              id="batchId"
              value={config.batchId}
              onChange={(e) => setConfig({...config, batchId: e.target.value})}
              placeholder="ID unique pour tracer cet import"
              className="max-w-md"
              readOnly
            />
            <p className="text-sm text-slate-500">
              Cet identifiant permettra de tracer toutes les données importées lors de cette session
            </p>
          </div>

          {/* Informations sur le traitement */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-3">Traitement qui sera effectué :</h4>
            <div className="space-y-2 text-sm text-slate-600">
              {getProcessingSteps(importType).map((step, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-xs font-medium text-slate-600 mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Lancer l'import
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const getProcessingSteps = (importType) => {
  switch (importType) {
    case "ENTREPRISES":
      return [
        "Validation des données d'entreprise",
        "Création des fiches EntrepriseDebiteur",
        "Génération des URLs Pappers",
        "Vérification des agents assignés",
        "Marquage des entreprises à réassigner si nécessaire"
      ];
    case "CONTACTS":
      return [
        "Liaison avec les entreprises via Company ID",
        "Validation des emails et téléphones", 
        "Création des contacts",
        "Définition des contacts principaux"
      ];
    case "PRELEVEMENTS":
      return [
        "Liaison avec les entreprises via HubSpot ID",
        "Classification actif/historique selon date de prise en compte",
        "Création des transactions de type 'Prélèvement échoué'",
        "Enregistrement des codes d'erreur"
      ];
    case "VIREMENTS":
      return [
        "Filtrage des 'RECOVERY REPAYMENTS' uniquement",
        "Classification actif/historique selon date de prise en compte", 
        "Création des transactions de type 'Virement reçu'",
        "Impact automatique sur les montants dus"
      ];
    case "CREANCES":
      return [
        "Groupement par entreprise (Company ID)",
        "Détection des conflits de statuts multiples",
        "Sommation des montants par entreprise",
        "Création des DossierRecouvrement",
        "Résolution interactive des conflits si nécessaire"
      ];
    default:
      return ["Traitement générique des données"];
  }
};
