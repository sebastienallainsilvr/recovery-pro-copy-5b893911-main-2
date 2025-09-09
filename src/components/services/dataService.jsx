
import { differenceInDays, parseISO, addDays } from 'date-fns';
import { rulesService } from './rulesService';

export const dataService = {
  // Enrichissement des dossiers avec les calculs
  enrichDossiers: async (dossiers, entreprises, transactions, actions) => {
    // Charger les règles métier une seule fois
    const rules = await rulesService.loadRules();
    
    return dossiers.map(dossier => {
      const entreprise = entreprises.find(e => e.id === dossier.entreprise_id);
      
      // Calculer montant_total_paye
      const transactionsValides = transactions.filter(t => 
        t.dossier_id === dossier.id &&
        ["Paiement", "Virement reçu"].includes(t.type_transaction) &&
        t.pris_en_compte_calcul === true &&
        t.statut !== "Annulé"
      );
      const montantTotalPaye = transactionsValides.reduce((sum, t) => sum + (t.montant || 0), 0);
      
      // Calculer montant_restant_du
      const montantRestant = (dossier.montant_initial || 0) - montantTotalPaye;
      
      // Calculer jours de retard
      const joursRetard = dossier.date_premier_impaye ? 
        differenceInDays(new Date(), parseISO(dossier.date_premier_impaye)) : 0;
      
      // Calculer jours depuis dernière action
      const actionsEntreprise = actions.filter(a => a.entreprise_id === dossier.entreprise_id);
      const derniereAction = actionsEntreprise.length > 0 ? 
        actionsEntreprise.reduce((latest, action) => 
          parseISO(action.date_action) > parseISO(latest.date_action) ? action : latest
        ) : null;
      
      const joursDepuisDerniereAction = derniereAction ? 
        differenceInDays(new Date(), parseISO(derniereAction.date_action)) : null;

      // Calculer date limite action selon les règles métier configurables
      let dateLimiteAction = null;
      let enRetard = false;
      
      if (dossier.date_entree_statut && dossier.statut_recouvrement) {
        const delaiRule = rules[`DELAI_${dossier.statut_recouvrement}`];
        if (delaiRule) {
          const jours = delaiRule.numericValue;
          dateLimiteAction = addDays(new Date(dossier.date_entree_statut), jours);
          enRetard = new Date() > dateLimiteAction;
        }
      }

      return {
        ...dossier,
        entreprise,
        montant_total_paye: montantTotalPaye,
        montant_restant_du: montantRestant,
        jours_retard: joursRetard,
        jours_depuis_derniere_action: joursDepuisDerniereAction,
        derniere_action: derniereAction,
        date_limite_action: dateLimiteAction,
        en_retard: enRetard
      };
    });
  },

  // Enrichissement des entreprises avec l'URL Pappers
  enrichEntreprises: (entreprises) => {
    return entreprises.map(entreprise => ({
      ...entreprise,
      url_pappers: (entreprise.siren && entreprise.pays === 'France') ? 
        `https://www.pappers.fr/recherche?q=${entreprise.siren}` : ""
    }));
  },

  // Enrichissement des contacts avec les données entreprise
  enrichContacts: (contacts, entreprises) => {
    return contacts.map(contact => ({
      ...contact,
      entreprise: entreprises.find(e => e.id === contact.entreprise_id)
    }));
  },

  // Enrichissement des transactions avec les données entreprise et dossier
  enrichTransactions: (transactions, entreprises, dossiers) => {
    return transactions.map(transaction => ({
      ...transaction,
      entreprise: entreprises.find(e => e.id === transaction.entreprise_id),
      dossier: dossiers.find(d => d.id === transaction.dossier_id)
    }));
  },

  // Enrichissement des actions avec les données entreprise et dossier
  enrichActions: (actions, entreprises, dossiers) => {
    return actions.map(action => ({
      ...action,
      entreprise: entreprises.find(e => e.id === action.entreprise_id),
      dossier: dossiers.find(d => d.id === action.dossier_id)
    }));
  },

  // Calculer les statistiques du dashboard
  calculateDashboardStats: (dossiers, transactions, selectedPeriod) => {
    const { start: periodStart, end: periodEnd } = dataService.getPeriodDates(selectedPeriod);
    
    const dossiersActifs = dossiers.length;
    const montantTotal = dossiers.reduce((sum, d) => sum + (d.montant_restant_du || 0), 0);
    
    const montantRecouvre = transactions
      .filter(t => 
        ["Paiement", "Virement reçu"].includes(t.type_transaction) &&
        t.pris_en_compte_calcul === true &&
        t.statut !== "Annulé" &&
        parseISO(t.date_transaction) >= periodStart &&
        parseISO(t.date_transaction) <= periodEnd
      )
      .reduce((sum, t) => sum + (t.montant || 0), 0);

    const montantInitialPeriode = dossiers.reduce((sum, d) => sum + (d.montant_initial || 0), 0);
    const tauxRecuperation = montantInitialPeriode > 0 ? (montantRecouvre / montantInitialPeriode) * 100 : 0;

    return {
      dossiersActifs,
      montantTotal,
      montantRecouvre,
      tauxRecuperation
    };
  },

  // Utilitaire pour calculer les dates de période
  getPeriodDates: (selectedPeriod) => {
    const now = new Date();
    switch (selectedPeriod) {
      case "current_month":
        return { 
          start: new Date(now.getFullYear(), now.getMonth(), 1), 
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0) 
        };
      case "last_month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { 
          start: lastMonth, 
          end: new Date(now.getFullYear(), now.getMonth(), 0) 
        };
      case "last_7_days":
        return { 
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), 
          end: now 
        };
      case "last_30_days":
        return { 
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), 
          end: now 
        };
      default:
        return { 
          start: new Date(now.getFullYear(), now.getMonth(), 1), 
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0) 
        };
    }
  }
};
