import { TemplatesCommunication } from "@/api/entities";

// Variables de remplacement disponibles
export const replaceTemplateVariables = (template, dossier) => {
  if (!template || !dossier) return template;

  const entreprise = dossier.entreprise || {};
  
  const variables = {
    '{nom_entreprise}': entreprise.nom_entreprise || 'Entreprise',
    '{contact_principal}': entreprise.contact_principal || 'Madame, Monsieur',
    '{montant_restant_du}': new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(dossier.montant_restant_du || 0).replace('€', ''),
    '{jours_retard}': dossier.jours_retard || 0,
    '{agent_assigne}': entreprise.agent_assigne || 'L\'équipe de recouvrement',
    '{siren}': entreprise.siren || '',
    '{telephone}': entreprise.telephone || '',
    '{email}': entreprise.email || '',
    '{reference_contrat}': dossier.reference_contrat || dossier.id
  };

  let result = template;
  Object.entries(variables).forEach(([variable, value]) => {
    result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
  });

  return result;
};

// Cache pour les templates
let templatesCache = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fonction pour charger les templates depuis la base
const loadTemplates = async () => {
  const now = Date.now();
  if (templatesCache && (now - cacheTime) < CACHE_DURATION) {
    return templatesCache;
  }

  try {
    const templates = await TemplatesCommunication.list();
    templatesCache = templates.filter(t => t.actif);
    cacheTime = now;
    return templatesCache;
  } catch (error) {
    console.error("Erreur lors du chargement des templates:", error);
    return [];
  }
};

// Fonction principale pour récupérer un template
export const getTemplate = async (statut, type, dossier) => {
  const templates = await loadTemplates();
  
  // Chercher le template correspondant
  const template = templates.find(t => 
    t.statut === statut && 
    t.type_template === type
  );

  if (!template) {
    return getFallbackTemplate(statut, type, dossier);
  }

  // Remplacer les variables
  const contenu = replaceTemplateVariables(template.contenu, dossier);
  const objet = template.objet ? replaceTemplateVariables(template.objet, dossier) : '';

  return { objet, contenu, template };
};

// Templates de fallback si pas trouvé en base
const getFallbackTemplate = (statut, type, dossier) => {
  const nomContact = dossier.entreprise?.contact_principal || 'Madame, Monsieur';
  const nomEntreprise = dossier.entreprise?.nom_entreprise || 'votre entreprise';
  const montantDu = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.montant_restant_du || 0);

  if (type === 'Email') {
    switch (statut) {
      case 'R1':
        return {
          objet: `Relance amiable - Facture impayée`,
          contenu: `Bonjour ${nomContact},\n\nSauf erreur de notre part, nous n'avons pas reçu le règlement de ${montantDu} concernant le dossier de ${nomEntreprise}.\nNous vous remercions de bien vouloir procéder au paiement dans les plus brefs délais.\n\nCordialement,\nL'équipe de recouvrement`
        };
      case 'R2':
        return {
          objet: `Deuxième relance - Facture impayée`,
          contenu: `Bonjour ${nomContact},\n\nNous constatons que notre précédente relance est restée sans réponse. Le montant de ${montantDu} pour ${nomEntreprise} est toujours en attente de paiement.\nVeuillez régulariser votre situation sous 48h, sans quoi nous serons contraints de passer à l'étape suivante.\n\nCordialement,\nL'équipe de recouvrement`
        };
      case 'R3':
        return {
          objet: `Troisième relance - Avant mise en demeure`,
          contenu: `Bonjour ${nomContact},\n\nMalgré nos multiples relances, le solde de ${montantDu} reste impayé. Ceci est notre dernier avertissement amiable.\nSans règlement de votre part sous 24h, nous transmettrons votre dossier à notre service contentieux pour une mise en demeure formelle.\n\nCordialement,\nL'équipe de recouvrement`
        };
      default:
        return {
          objet: `Concernant votre dossier n°${dossier.reference_contrat || dossier.id}`,
          contenu: `Bonjour ${nomContact},\n\nNous vous contactons au sujet de votre dossier en cours chez nous.\nLe montant restant dû est de ${montantDu}.\nMerci de nous recontacter pour discuter de votre situation.\n\nCordialement,\nL'équipe de recouvrement`
        };
    }
  } else if (type === 'SMS') {
    const montantDu = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.montant_restant_du || 0);
    switch (statut) {
      case 'R1':
      case 'R2':
      case 'R3':
        return {
          objet: '',
          contenu: `Bonjour, nous vous contactons concernant un impayé de ${montantDu} pour le dossier ${dossier.entreprise?.nom_entreprise}. Merci de nous rappeler urgemment au [Numéro de téléphone].`
        };
      default:
        return {
          objet: '',
          contenu: `Bonjour, merci de nous contacter au sujet de votre dossier de recouvrement. Montant dû: ${montantDu}. [Numéro de téléphone]`
        };
    }
  }

  return { objet: '', contenu: '' };
};

// Fonctions legacy pour compatibilité
export const getEmailTemplate = async (statut, dossier) => {
  const template = await getTemplate(statut, 'Email', dossier);
  return `Objet : ${template.objet}\n\n${template.contenu}`;
};

export const getSmsTemplate = async (statut, dossier) => {
  const template = await getTemplate(statut, 'SMS', dossier);
  return template.contenu;
};