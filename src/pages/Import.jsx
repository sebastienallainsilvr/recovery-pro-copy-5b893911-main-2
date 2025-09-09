
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Download,
  Calendar,
  Users,
  Building2,
  CreditCard,
  FolderOpen
} from "lucide-react";

// Import des entités Base44
import { EntrepriseDebiteur, Contact, Transaction, DossierRecouvrement } from "@/api/entities";

import FileDropzone from "../components/import/FileDropzone";
import DataPreview from "../components/import/DataPreview";
import ImportConfiguration from "../components/import/ImportConfiguration";
import ImportResults from "../components/import/ImportResults";
import ConflictResolution from "../components/import/ConflictResolution";

const IMPORT_TYPES = {
  ENTREPRISES: {
    name: "Entreprises",
    icon: Building2,
    requiredColumns: ["record id", "company name"],
    optionalColumns: ["siren", "country/region", "recovery owner"]
  },
  CONTACTS: {
    name: "Contacts", 
    icon: Users,
    requiredColumns: ["company id", "email"],
    optionalColumns: ["phone", "first name", "last name", "job title"]
  },
  PRELEVEMENTS: {
    name: "Prélèvements Échoués",
    icon: CreditCard,
    requiredColumns: ["hubspot id", "log_date", "amount"],
    optionalColumns: ["failure code"]
  },
  VIREMENTS: {
    name: "Virements Reçus",
    icon: CreditCard,
    requiredColumns: ["hubspot id", "date", "amount", "category"],
    optionalColumns: ["description"]
  },
  CREANCES: {
    name: "Créances/Deals",
    icon: FolderOpen,
    requiredColumns: ["company id", "amount"],
    optionalColumns: ["deal stage", "provider_v2"]
  }
};

export default function Import() {
  const [step, setStep] = useState(1);
  const [fileData, setFileData] = useState(null);
  const [importType, setImportType] = useState(null);
  const [config, setConfig] = useState({}); // Initialize with useState({})
  const [conflicts, setConflicts] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (data) => {
    setFileData(data);
    const detectedType = detectImportType(data.headers);
    setImportType(detectedType);
    setStep(2);
  };

  const detectImportType = (headers) => {
    const lowercaseHeaders = headers.map(h => h.toLowerCase().trim());
    
    // Détection par colonnes caractéristiques
    if (lowercaseHeaders.includes("record id") && lowercaseHeaders.includes("company name")) {
      return "ENTREPRISES";
    }
    if (lowercaseHeaders.includes("company id") && lowercaseHeaders.includes("email")) {
      return "CONTACTS";
    }
    if (lowercaseHeaders.includes("log_date") && lowercaseHeaders.includes("failure code")) {
      return "PRELEVEMENTS";
    }
    if (lowercaseHeaders.includes("category") && lowercaseHeaders.some(h => h.includes("hubspot"))) {
      return "VIREMENTS";
    }
    if (lowercaseHeaders.includes("deal stage") || lowercaseHeaders.includes("provider_v2")) {
      return "CREANCES";
    }
    
    return null;
  };

  const handleConfigSubmit = async (configuration) => {
    setConfig(configuration);
    setLoading(true);
    
    try {
      const importResults = await processImport(fileData, importType, configuration);
      
      if (importResults.conflicts && importResults.conflicts.length > 0) {
        setConflicts(importResults.conflicts);
        setStep(3); // Étape résolution conflits
      } else {
        setResults(importResults);
        setStep(4); // Étape résultats
      }
    } catch (error) {
      console.error("Erreur d'import:", error);
      setResults({ success: 0, errors: [{ error: error.message, row: null }] }); // Display a general error
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const handleConflictResolution = async (resolutions) => {
    setLoading(true);
    try {
      const finalResults = await applyConflictResolutions(conflicts, resolutions);
      setResults(finalResults);
      setStep(4);
    } catch (error) {
      console.error("Erreur lors de la résolution des conflits:", error);
      setResults({ success: 0, errors: [{ error: error.message, row: null }] }); // Display a general error
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const processImport = async (data, type, config) => {
    const processor = getImportProcessor(type);
    return await processor.process(data, config);
  };

  const getImportProcessor = (type) => {
    switch (type) {
      case "ENTREPRISES":
        return new EntreprisesImportProcessor();
      case "CONTACTS":
        return new ContactsImportProcessor();
      case "PRELEVEMENTS":
        return new PrelevementsImportProcessor();
      case "VIREMENTS":
        return new VirementsImportProcessor();
      case "CREANCES":
        return new CreancesImportProcessor();
      default:
        throw new Error("Type d'import non supporté");
    }
  };

  const resetImport = () => {
    setStep(1);
    setFileData(null);
    setImportType(null);
    setConfig({});
    setConflicts([]);
    setResults(null);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Import de Données</h1>
          <p className="text-slate-600">Import universel compatible avec les exports HubSpot</p>
        </div>

        {/* Stepper */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              {[
                { step: 1, label: "Upload", icon: Upload },
                { step: 2, label: "Configuration", icon: FileText },
                { step: 3, label: "Conflits", icon: AlertTriangle },
                { step: 4, label: "Résultats", icon: CheckCircle }
              ].map((item) => (
                <div key={item.step} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step >= item.step 
                      ? 'bg-slate-900 text-white' 
                      : step + 1 === item.step && conflicts.length > 0
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }
                  `}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="ml-2 text-sm font-medium">{item.label}</span>
                  {item.step < 4 && <div className="w-8 h-px bg-slate-200 ml-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contenu selon l'étape */}
        {step === 1 && (
          <FileDropzone onFileUpload={handleFileUpload} />
        )}

        {step === 2 && fileData && (
          <div className="space-y-6">
            <DataPreview 
              data={fileData} 
              importType={importType}
              typeInfo={IMPORT_TYPES[importType]}
            />
            <ImportConfiguration
              importType={importType}
              typeInfo={IMPORT_TYPES[importType]}
              onSubmit={handleConfigSubmit}
              loading={loading}
            />
          </div>
        )}

        {step === 3 && conflicts.length > 0 && (
          <ConflictResolution
            conflicts={conflicts}
            onResolve={handleConflictResolution}
            loading={loading}
          />
        )}

        {step === 4 && results && (
          <ImportResults
            results={results}
            importType={importType}
            onReset={resetImport}
          />
        )}
      </div>
    </div>
  );
}

// Classes de traitement des imports
class BaseImportProcessor {
  async process(data, config) {
    throw new Error("Method must be implemented");
  }

  parseAmount(amountStr) {
    if (!amountStr || amountStr === "(No value)") return 0;
    return parseFloat(amountStr.toString().replace(/[€$,\s]/g, '').replace(',', '.')) || 0;
  }

  parseDate(dateStr) {
    if (!dateStr || dateStr === "(No value)") return null;
    try {
      const date = new Date(dateStr);
      // Check for valid date object if parsing was successful
      if (isNaN(date.getTime())) {
          return null;
      }
      return date;
    } catch (e) {
      return null;
    }
  }

  mapCountry(country) {
    if (!country || country === "(No value)") return 'France';
    const countryMap = {
      'fr': 'France',
      'france': 'France', 
      'de': 'Allemagne',
      'germany': 'Allemagne',
      'deutschland': 'Allemagne'
    };
    return countryMap[country?.toLowerCase()] || 'France';
  }

  validateAgent(agent) {
    if (!agent || agent === "(No value)") return null;
    
    // Table de mapping des recovery owners vers les agents
    const recoveryOwnerMapping = {
      // Maya
      'rado mahery andriamiarisoa': 'Maya',
      'mbolatiana rasoarojoharilala': 'Maya', 
      'yannick moustial': 'Maya',
      
      // Andrea
      'andrea homm': 'Andrea',
      
      // Dylon
      'tahiana dylon ranaivojaona': 'Dylon',
      
      // Sébastien
      'matthieu corréas': 'Sébastien', // Correction du caractère ici
      'sebastien allain': 'Sébastien',
      'wassim el barkani': 'Sébastien',
      'corentin counquet': 'Sébastien'
    };
    
    const validAgents = ["Maya", "Andrea", "Dylon", "Sébastien"];
    
    // Vérifier d'abord si c'est déjà un agent valide
    if (validAgents.includes(agent)) {
      return agent;
    }
    
    // Sinon, chercher dans la table de mapping
    const normalizedAgent = agent.toLowerCase().trim();
    const mappedAgent = recoveryOwnerMapping[normalizedAgent];
    
    return mappedAgent || null;
  }

  // Nouvelle méthode pour trouver une colonne de manière flexible et insensible à la casse
  findColumnValue(row, possibleNames) {
    const rowKeys = Object.keys(row);
    for (const possibleName of possibleNames) {
        const normalizedPossibleName = possibleName.toLowerCase().trim();

        for (const key of rowKeys) {
            const normalizedKey = key.toLowerCase().trim();

            if (normalizedKey === normalizedPossibleName) {
                const value = row[key];
                if (value && value !== "(No value)" && String(value).trim() !== "") {
                    return String(value).trim();
                }
            }
        }
    }
    return null;
  }
}

class EntreprisesImportProcessor extends BaseImportProcessor {
  async process(data, config) {
    const results = {
      total: data.rows.length,
      success: 0,
      errors: [],
      toReassign: [],
      conflicts: []
    };
    const entreprisesToCreate = [];

    for (const row of data.rows) {
      try {
        const nomEntreprise = this.findColumnValue(row, [
          'company name', 'Company Name', 'Company name', 
          'nom_entreprise', 'Nom entreprise', 'Entreprise'
        ]);

        if (!nomEntreprise) {
          results.errors.push({
            row: row,
            error: "Nom d'entreprise manquant ou vide (colonne 'company name' requise)"
          });
          continue;
        }

        const hubspotId = this.findColumnValue(row, ['record id', 'Record ID', 'Record Id', 'company_id', 'Company ID', 'HubSpot ID']);
        if (!hubspotId) {
          results.errors.push({
            row: row,
            error: "ID HubSpot ('record id') manquant ou vide (colonne 'record id' requise)"
          });
          continue;
        }

        const siren = this.findColumnValue(row, ['siren', 'SIREN', 'Siren']);
        const pays = this.findColumnValue(row, ['country/region', 'Country/Region', 'Country', 'country', 'Pays', 'pays']);
        const agent = this.findColumnValue(row, ['recovery owner', 'Recovery Owner', 'Recovery owner', 'agent_assigne', 'Agent', 'agent']);

        const entrepriseData = {
          company_id_hubspot: hubspotId ? parseInt(hubspotId) || null : null,
          nom_entreprise: nomEntreprise,
          siren: siren || null,
          pays: this.mapCountry(pays),
          agent_assigne: this.validateAgent(agent)
        };

        if (!entrepriseData.agent_assigne && agent) {
          results.toReassign.push({
            nom_entreprise: entrepriseData.nom_entreprise,
            agent_original: agent
          });
        }

        entreprisesToCreate.push(entrepriseData);
      } catch (error) {
        console.error("Erreur lors de la préparation de l'entreprise:", error, "Row:", row);
        results.errors.push({
          row: row,
          error: error.message
        });
      }
    }

    if (entreprisesToCreate.length > 0) {
      try {
        await EntrepriseDebiteur.bulkCreate(entreprisesToCreate);
        results.success = entreprisesToCreate.length;
      } catch (error) {
        console.error("Erreur bulk create entreprises:", error);
        results.errors.push({ row: null, error: `Erreur d'import en masse (rate limit?): ${error.message}` });
      }
    }

    return results;
  }
}

class ContactsImportProcessor extends BaseImportProcessor {
  async process(data, config) {
    const results = {
      total: data.rows.length,
      success: 0,
      errors: [],
      conflicts: []
    };

    const entreprisesExistantes = await EntrepriseDebiteur.list();
    const contactsToCreate = [];

    for (const row of data.rows) {
      try {
        const companyIdStr = this.findColumnValue(row, ['company id', 'Company ID', 'Company Id', 'hubspot_id', 'HubSpot ID']);
        const companyIdHubspot = companyIdStr ? parseInt(companyIdStr) || null : null;
        const entrepriseLiee = entreprisesExistantes.find(e => e.company_id_hubspot === companyIdHubspot);

        if (!entrepriseLiee) {
          results.errors.push({ 
            row: row, 
            error: `Entreprise liée non trouvée ou Company ID manquant (ID: ${companyIdHubspot}) (colonne 'company id' requise)` 
          });
          continue;
        }

        const email = this.findColumnValue(row, ['email', 'Email', 'EMAIL', 'E-mail']);
        if (!email) {
          results.errors.push({ 
            row: row, 
            error: "Email manquant ou vide (colonne 'email' requise)" 
          });
          continue;
        }

        // Correction du mapping des téléphones
        const telephoneFixe = this.findColumnValue(row, [
          'phone number', 'Phone Number', 'Phone number', 
          'phone', 'Phone', 'telephone', 'Téléphone'
        ]) || null;
        
        const telephoneMobile = this.findColumnValue(row, [
          'mobile phone number', 'Mobile Phone Number', 'Mobile phone number',
          'mobile', 'Mobile', 'telephone_mobile', 'Téléphone mobile'
        ]) || null;

        const contactData = {
          entreprise_id: entrepriseLiee.id,
          company_id_hubspot: companyIdHubspot,
          nom: this.findColumnValue(row, ['last name', 'Last Name', 'nom', 'Nom']) || "",
          prenom: this.findColumnValue(row, ['first name', 'First Name', 'prenom', 'Prénom']) || "",
          email: email,
          telephone_fixe: telephoneFixe,
          telephone_mobile: telephoneMobile
        };

        contactsToCreate.push(contactData);
      } catch (error) {
        console.error("Erreur lors de la préparation du contact:", error, "Row:", row);
        results.errors.push({
          row: row,
          error: error.message
        });
      }
    }
    
    if (contactsToCreate.length > 0) {
      try {
        await Contact.bulkCreate(contactsToCreate);
        results.success = contactsToCreate.length;
      } catch (error) {
        console.error("Erreur bulk create contacts:", error);
        results.errors.push({ row: null, error: `Erreur d'import en masse des contacts: ${error.message}` });
      }
    }

    return results;
  }
}

class PrelevementsImportProcessor extends BaseImportProcessor {
  async process(data, config) {
    const datePriseCompte = new Date(config.datePriseCompte);
    const results = {
      total: data.rows.length,
      success: 0,
      historical: 0,
      active: 0,
      errors: []
    };

    const entreprisesExistantes = await EntrepriseDebiteur.list();
    const dossiersExistants = await DossierRecouvrement.list(); // Charger tous les dossiers
    const transactionsToCreate = [];
    const dossiersToUpdate = {};

    for (const row of data.rows) {
      try {
        const hubspotIdStr = this.findColumnValue(row, ['hubspot id', 'HubSpot ID', 'Hubspot Id', 'company_id', 'Company ID']);
        const companyIdHubspot = hubspotIdStr ? parseInt(hubspotIdStr) || null : null;
        const entrepriseLiee = entreprisesExistantes.find(e => e.company_id_hubspot === companyIdHubspot);

        if (!entrepriseLiee) {
          results.errors.push({ 
            row: row, 
            error: `Entreprise liée non trouvée ou HubSpot ID manquant (ID: ${companyIdHubspot}) (colonne 'hubspot id' requise)` 
          });
          continue;
        }

        // Trouver le dossier le plus récent pour cette entreprise
        const dossiersEntreprise = dossiersExistants.filter(d => d.entreprise_id === entrepriseLiee.id);
        if (dossiersEntreprise.length === 0) {
          results.errors.push({ 
            row: row, 
            error: `Aucun dossier de recouvrement trouvé pour l'entreprise ${entrepriseLiee.nom_entreprise}` 
          });
          continue;
        }
        const dossierCourant = dossiersEntreprise.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

        const dateStr = this.findColumnValue(row, ['log_date', 'Log Date', 'date', 'Date']);
        const dateTransaction = this.parseDate(dateStr);
        if (!dateTransaction) {
          results.errors.push({ 
            row: row, 
            error: "Date de transaction manquante ou invalide (colonne 'log_date' requise)" 
          });
          continue;
        }

        const montantStr = this.findColumnValue(row, ['amount', 'Amount', 'montant', 'Montant']);
        const montant = this.parseAmount(montantStr);
        if (montant === 0 || isNaN(montant)) {
          results.errors.push({ 
            row: row, 
            error: "Montant manquant ou invalide (colonne 'amount' requise, ne peut pas être 0)" 
          });
          continue;
        }
        
        // Mettre à jour le montant initial du dossier si le montant est négatif
        if (montant < 0) {
          if (!dossiersToUpdate[dossierCourant.id]) {
            dossiersToUpdate[dossierCourant.id] = { ...dossierCourant, montant_initial: dossierCourant.montant_initial || 0 };
          }
          dossiersToUpdate[dossierCourant.id].montant_initial += Math.abs(montant);
        }

        const isHistorical = dateTransaction < datePriseCompte;
        isHistorical ? results.historical++ : results.active++;

        transactionsToCreate.push({
          dossier_id: dossierCourant.id,
          entreprise_id: entrepriseLiee.id,
          company_id_hubspot: companyIdHubspot, // Ajouter l'ID HubSpot pour traçabilité
          type_transaction: "Prélèvement échoué",
          montant: Math.abs(montant),
          date_transaction: dateTransaction.toISOString().split('T')[0],
          failure_code: this.findColumnValue(row, ['failure code', 'Failure Code', 'code_erreur']) || null,
          pris_en_compte_calcul: !isHistorical,
          import_batch_id: config.batchId,
          description: "Chargeback/Refus de prélèvement"
        });
      } catch (error) {
        console.error("Erreur lors de la préparation du prélèvement:", error, "Row:", row);
        results.errors.push({
          row: row,
          error: error.message
        });
      }
    }

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    // Fonction pour retry avec backoff exponentiel
    const updateWithRetry = async (dossier, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await DossierRecouvrement.update(dossier.id, { montant_initial: dossier.montant_initial });
          return true;
        } catch (error) {
          if (error.response?.status === 429 && attempt < maxRetries) {
            // Attendre plus longtemps à chaque tentative
            await delay(1000 * attempt);
            continue;
          }
          throw error;
        }
      }
      return false;
    };

    try {
      // Mettre à jour tous les dossiers avec un délai plus long et retry
      if (Object.keys(dossiersToUpdate).length > 0) {
        for (const dossier of Object.values(dossiersToUpdate)) {
          await updateWithRetry(dossier);
          await delay(500); // Délai de 500ms entre chaque mise à jour
        }
      }

      // Créer toutes les transactions en une seule fois
      if (transactionsToCreate.length > 0) {
        await Transaction.bulkCreate(transactionsToCreate);
        results.success = transactionsToCreate.length;
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des dossiers ou de la création des transactions:", error);
      results.errors.push({ row: null, error: `Erreur d'import en masse (rate limit?): ${error.message}` });
    }

    return results;
  }
}

class VirementsImportProcessor extends BaseImportProcessor {
  async process(data, config) {
    const datePriseCompte = new Date(config.datePriseCompte);
    const transactionsToCreate = [];
    
    const filteredRows = data.rows.filter(row => {
      const category = this.findColumnValue(row, ['category', 'Category', 'catégorie', 'Catégorie']);
      return category?.toUpperCase() === 'RECOVERY REPAYMENTS';
    });

    const results = {
      total: filteredRows.length,
      success: 0,
      historical: 0,
      active: 0,
      errors: []
    };

    const [entreprisesExistantes, dossiersExistants] = await Promise.all([
      EntrepriseDebiteur.list(),
      DossierRecouvrement.list()
    ]);

    for (const row of filteredRows) {
      try {
        const hubspotIdStr = this.findColumnValue(row, ['hubspot id', 'HubSpot ID', 'Hubspot Id', 'company_id', 'Company ID']);
        const companyIdHubspot = hubspotIdStr ? parseInt(hubspotIdStr) || null : null;
        const entrepriseLiee = entreprisesExistantes.find(e => e.company_id_hubspot === companyIdHubspot);

        if (!entrepriseLiee) {
          results.errors.push({ 
            row: row, 
            error: `Entreprise liée non trouvée ou HubSpot ID manquant (ID: ${companyIdHubspot}) (colonne 'hubspot id' requise)` 
          });
          continue;
        }

        // Trouver le dossier le plus récent pour cette entreprise
        const dossiersEntreprise = dossiersExistants.filter(d => d.entreprise_id === entrepriseLiee.id);
        if (dossiersEntreprise.length === 0) {
          results.errors.push({ 
            row: row, 
            error: `Aucun dossier de recouvrement trouvé pour l'entreprise ${entrepriseLiee.nom_entreprise}` 
          });
          continue;
        }
        const dossierCourant = dossiersEntreprise.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

        const dateStr = this.findColumnValue(row, ['date', 'Date', 'date_transaction']);
        const dateTransaction = this.parseDate(dateStr);
        if (!dateTransaction) {
          results.errors.push({ 
            row: row, 
            error: "Date de transaction manquante ou invalide (colonne 'date' requise)" 
          });
          continue;
        }

        const montantStr = this.findColumnValue(row, ['amount', 'Amount', 'montant', 'Montant']);
        const montant = this.parseAmount(montantStr);
        if (montant === 0 || isNaN(montant)) { 
          results.errors.push({ 
            row: row, 
            error: "Montant manquant ou invalide (colonne 'amount' requise, ne peut pas être 0)" 
          });
          continue;
        }

        const isHistorical = dateTransaction < datePriseCompte;
        isHistorical ? results.historical++ : results.active++;

        transactionsToCreate.push({
          dossier_id: dossierCourant.id, // AJOUT: lier au dossier trouvé
          entreprise_id: entrepriseLiee.id,
          company_id_hubspot: companyIdHubspot,
          type_transaction: "Virement reçu",
          montant: Math.abs(montant),
          date_transaction: dateTransaction.toISOString().split('T')[0],
          description: this.findColumnValue(row, ['description', 'Description', 'libelle', 'Libellé']) || null,
          pris_en_compte_calcul: !isHistorical,
          import_batch_id: config.batchId,
          statut: "Actif" // AJOUT: définir un statut par défaut
        });
      } catch (error) {
        console.error("Erreur lors de la préparation du virement:", error, "Row:", row);
        results.errors.push({
          row: row,
          error: error.message
        });
      }
    }

    if (transactionsToCreate.length > 0) {
      try {
        await Transaction.bulkCreate(transactionsToCreate);
        results.success = transactionsToCreate.length;
      } catch (error) {
        console.error("Erreur bulk create virements:", error);
        results.errors.push({ row: null, error: `Erreur d'import en masse des virements: ${error.message}` });
      }
    }
    
    return results;
  }
}

class CreancesImportProcessor extends BaseImportProcessor {
  async process(data, config) {
    const results = {
      total: data.rows.length,
      success: 0,
      errors: [],
      conflicts: []
    };
    const entrepriseGroups = {};
    
    // Grouper par Company ID (champ obligatoire)
    for (const row of data.rows) { 
      const companyIdStr = this.findColumnValue(row, [
        'company id', 'Company ID', 'Company Id'
      ]);
      
      if (!companyIdStr) {
        results.errors.push({
          row: row,
          error: "Company ID manquant ou vide pour cette créance (colonne 'company id' requise)"
        });
        continue;
      }
      
      const companyId = companyIdStr;
      if (!entrepriseGroups[companyId]) {
        entrepriseGroups[companyId] = [];
      }
      entrepriseGroups[companyId].push(row);
    }

    const directImports = [];
    const conflictImports = [];
    const entreprisesExistantes = await EntrepriseDebiteur.list();

    // PHASE 1 : Analyser TOUTES les entreprises
    for (const [companyId, deals] of Object.entries(entrepriseGroups)) {
      const companyIdHubspot = parseInt(companyId) || null;
      const entrepriseLiee = entreprisesExistantes.find(e => e.company_id_hubspot === companyIdHubspot);
      
      const processedDeals = [];
      let totalAmount = 0;
      let hasValidAmount = false;

      for (const d of deals) {
        // CORRECTION: Utiliser "Sum to recover" en priorité absolue, ignorer "Amount"
        const amount = this.findColumnValue(d, [
          'sum to recover', 
          'Sum to recover',
          'Sum To Recover',
          'SUM TO RECOVER',
          'remaining payment amount (incl. canceled)', 
          'Remaining payment amount (incl. canceled)',
          'Remaining Payment Amount (incl. canceled)'
        ]);
        const parsedAmount = this.parseAmount(amount);

        const dealStage = this.findColumnValue(d, ['deal stage', 'Deal Stage', 'statut']);
        const provider = this.findColumnValue(d, ['provider_v2', 'Provider', 'fournisseur', 'adjusted_provider']);

        console.log(`Deal pour Company ${companyId}: Stage="${dealStage}", Montant=${parsedAmount} (depuis Sum to recover), Provider="${provider}"`); // Debug

        processedDeals.push({
          montant: parsedAmount,
          statut: dealStage,
          statusMapped: this.mapDealStage(dealStage),
          provider: provider,
          raw: d
        });

        if (parsedAmount > 0) {
          totalAmount += parsedAmount;
          hasValidAmount = true;
        } else {
          results.errors.push({
            row: d,
            error: `Montant invalide ou nul pour la créance (colonne 'sum to recover' requise, doit être > 0) pour Company ID: ${companyId}`
          });
        }
      }

      if (!hasValidAmount) {
        results.errors.push({
          companyId: companyId,
          error: `Aucun montant valide trouvé pour les créances de la Company ID: ${companyId}`
        });
        continue;
      }
      
      const statuts = [...new Set(processedDeals.map(d => d.statut).filter(Boolean))];
      const statutsMapped = [...new Set(processedDeals.map(d => d.statusMapped).filter(Boolean))];
      
      console.log(`Company ${companyId}: Statuts originaux=[${statuts.join(',')}], Statuts mappés=[${statutsMapped.join(',')}]`); // Debug
      
      if (deals.length > 1 && statuts.length > 1) {
        conflictImports.push({
          companyId,
          nom_entreprise: entrepriseLiee?.nom_entreprise || 'Entreprise inconnue',
          deals: processedDeals,
          possibleStatuts: statutsMapped,
          totalAmount
        });
      } else {
        const finalStatus = processedDeals[0]?.statusMapped || 'PENDING ASSIGNATION';
        console.log(`Import direct Company ${companyId}: Statut="${finalStatus}"`); // Debug
        
        directImports.push({
          companyId,
          deals: processedDeals,
          statut: finalStatus,
          totalAmount,
          provider: processedDeals[0]?.provider || 'SILVR_REPURCHASED'
        });
      }
    }

    // PHASE 2 : Créer tous les dossiers sans conflit
    const dossiersToCreate = [];

    for (const importData of directImports) {
      const companyIdHubspot = parseInt(importData.companyId) || null;
      const entrepriseLiee = entreprisesExistantes.find(e => e.company_id_hubspot === companyIdHubspot);

      if (!entrepriseLiee) {
        results.errors.push({ 
          companyId: importData.companyId, 
          error: `Entreprise liée non trouvée dans l'application (Company ID: ${companyIdHubspot})` 
        });
        continue;
      }
      if (importData.totalAmount <= 0) {
        results.errors.push({ 
          companyId: importData.companyId, 
          error: "Montant total invalide ou nul pour les créances de cette entreprise (doit être > 0)" 
        });
        continue;
      }

      console.log(`Création dossier Company ${importData.companyId}: Statut="${importData.statut}"`); // Debug

      dossiersToCreate.push({
        entreprise_id: entrepriseLiee.id,
        company_id_hubspot: companyIdHubspot, // ADDED: HubSpot ID for traceability
        montant_initial: importData.totalAmount,
        fournisseur_pret: importData.provider,
        statut_recouvrement: importData.statut, // Le statut est maintenant correctement mappé
        date_entree_statut: new Date().toISOString()
      });
    }

    if (dossiersToCreate.length > 0) {
      try {
        console.log(`Création de ${dossiersToCreate.length} dossiers:`, dossiersToCreate); // Debug
        await DossierRecouvrement.bulkCreate(dossiersToCreate);
        results.success = dossiersToCreate.length;
      } catch (error) {
        console.error("Erreur bulk create dossiers:", error);
        results.errors.push({ row: null, error: `Erreur d'import en masse des dossiers: ${error.message}` });
      }
    }

    if (conflictImports.length > 0) {
      results.conflicts = conflictImports;
    }
    
    return results;
  }

  mapDealStage(stage) {
    if (!stage) {
      console.log("Stage vide, retour à PENDING ASSIGNATION"); // Debug
      return 'PENDING ASSIGNATION';
    }
    
    const normalizedStage = stage.toLowerCase().trim();

    // Map de mots-clés priorisés (du plus spécifique au plus général)
    const stageKeywordMap = {
      'repayment plan ongoing': 'REPAYMENT PLAN ONGOING',
      'repayment plan to schedule': 'REPAYMENT PLAN TO SCHEDULE',
      'conciliation - ongoing meetings': 'CONCILIATION - ONGOING MEETINGS',
      'conciliation - pending assignation': 'CONCILIATION - PENDING ASSIGNATION',
      'lawyer / conciliation': 'LAWYER / CONCILIATION',
      'secured - pending execution': 'LAWYER / CONCILIATION',
      'collective procedure': 'COLLECTIVE PROCEDURE',
      'outsourced to agency': 'OUTSOURCED TO AGENCY',
      'pending to be outsourced': 'PENDING TO BE OUTSOURCED',
      'dispute / litigation': 'DISPUTE / LITIGATION',
      'promise to pay': 'PROMISE TO PAY',
      'under negotiation': 'UNDER NEGOTIATION',
      'secured - done': 'FULLY RECOVERED', // Pour "Secured - Done Refunding..."
      'fully recovered': 'FULLY RECOVERED',
      'written off': 'WRITTEN OFF / CANCELLED',
      'cancelled': 'WRITTEN OFF / CANCELLED',
      'r5': 'R5',
      'r4': 'R4',
      'r3': 'R3',
      'r2': 'R2',
      'r1': 'R1',
      'pending assignation': 'PENDING ASSIGNATION',
    };
    
    // Chercher le premier mot-clé correspondant dans la chaîne de statut
    for (const keyword in stageKeywordMap) {
      if (normalizedStage.includes(keyword)) {
        const mappedStage = stageKeywordMap[keyword];
        console.log(`Mapping: "${stage}" -> keyword "${keyword}" -> "${mappedStage}"`); // Log de succès
        return mappedStage;
      }
    }
    
    // Si aucun mot-clé n'est trouvé, utiliser la valeur par défaut
    const defaultStage = 'PENDING ASSIGNATION';
    console.log(`Mapping: "${stage}" -> Aucun mot-clé trouvé, défaut -> "${defaultStage}"`); // Log d'échec
    return defaultStage;
  }
}

const applyConflictResolutions = async (conflicts, resolutions) => {
  const results = {
    total: conflicts.length,
    success: 0,
    errors: []
  };

  const entreprisesExistantes = await EntrepriseDebiteur.list();
  const dossiersToCreate = [];

  for (const conflict of conflicts) {
    try {
      const resolution = resolutions[conflict.companyId];
      if (resolution) {
        const companyIdHubspot = parseInt(conflict.companyId) || null;
        const entrepriseLiee = entreprisesExistantes.find(e => e.company_id_hubspot === companyIdHubspot);

        if (!entrepriseLiee) {
          results.errors.push({ 
            companyId: conflict.companyId, 
            error: `Entreprise liée non trouvée lors de la résolution (Company ID: ${companyIdHubspot})` 
          });
          continue;
        }

        if (resolution.montantTotal <= 0) {
          results.errors.push({ 
            companyId: conflict.companyId, 
            error: `Montant total résolu invalide ou nul pour le dossier de Company ID: ${conflict.companyId} (doit être > 0)` 
          });
          continue;
        }

        console.log(`Résolution conflit Company ${conflict.companyId}: Statut="${resolution.statutFinal}"`); // Debug

        dossiersToCreate.push({
          entreprise_id: entrepriseLiee.id,
          company_id_hubspot: companyIdHubspot, // ADDED: HubSpot ID for traceability
          montant_initial: resolution.montantTotal,
          fournisseur_pret: resolution.creancesFusionnees[0]?.fournisseur || 'SILVR_REPURCHASED',
          statut_recouvrement: resolution.statutFinal, // S'assurer que le statut final est utilisé
          date_entree_statut: new Date().toISOString(),
          notes: resolution.noteAutoGenerated
        });
      }
    } catch (error) {
      console.error("Erreur lors de la préparation du dossier de conflit résolu:", error, "Conflict:", conflict);
      results.errors.push({
        companyId: conflict.companyId,
        error: error.message
      });
    }
  }

  if (dossiersToCreate.length > 0) {
    try {
      console.log(`Création de ${dossiersToCreate.length} dossiers résolus:`, dossiersToCreate); // Debug
      await DossierRecouvrement.bulkCreate(dossiersToCreate);
      results.success = dossiersToCreate.length;
    } catch(error) {
      console.error("Erreur bulk create conflits:", error);
      results.errors.push({ row: null, error: `Erreur d'import en masse des dossiers résolus: ${error.message}` });
    }
  }

  return results;
};
