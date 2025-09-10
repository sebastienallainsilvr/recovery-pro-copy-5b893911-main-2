import { differenceInDays, parseISO, startOfMonth, endOfMonth, subDays } from 'date-fns';

// Calculer le montant total payé pour un dossier
export const calculateMontantTotalPaye = (dossier, transactions) => {
  const transactionsValides = transactions.filter(t => 
    t.dossier_id === dossier.id &&
    ["Paiement", "Virement reçu"].includes(t.type_transaction) &&
    t.pris_en_compte_calcul === true &&
    t.statut !== "Annulé"
  );
  return transactionsValides.reduce((sum, t) => sum + (t.montant || 0), 0);
};

// Calculer le montant restant dû
export const calculateMontantRestant = (dossier, montantTotalPaye) => {
  return (dossier.montant_initial || 0) - montantTotalPaye;
};

// Calculer les jours de retard
export const calculateJoursRetard = (dossier) => {
  return dossier.date_premier_impaye ? 
    differenceInDays(new Date(), parseISO(dossier.date_premier_impaye)) : 0;
};

// Enrichir un dossier avec tous les calculs
export const enrichDossier = (dossier, entreprises, transactions, actions) => {
  const entreprise = entreprises.find(e => e.id === dossier.entreprise_id);
  const montantTotalPaye = calculateMontantTotalPaye(dossier, transactions);
  const montantRestant = calculateMontantRestant(dossier, montantTotalPaye);
  const joursRetard = calculateJoursRetard(dossier);
  
  // Calculer dernière action
  const actionsEntreprise = actions.filter(a => a.entreprise_id === dossier.entreprise_id);
  const derniereAction = actionsEntreprise.length > 0 ? 
    actionsEntreprise.reduce((latest, action) => 
      parseISO(action.date_action) > parseISO(latest.date_action) ? action : latest
    ) : null;
  
  const joursDepuisDerniereAction = derniereAction ? 
    differenceInDays(new Date(), parseISO(derniereAction.date_action)) : null;

  return {
    ...dossier,
    entreprise,
    montant_total_paye: montantTotalPaye,
    montant_restant_du: montantRestant,
    jours_retard: joursRetard,
    jours_depuis_derniere_action: joursDepuisDerniereAction,
    derniere_action: derniereAction
  };
};

// Utilitaire pour calculer les dates de période
export const getPeriodDates = (selectedPeriod) => {
  const now = new Date();
  switch (selectedPeriod) {
    case "current_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last_month":
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case "last_7_days":
      return { start: subDays(now, 7), end: now };
    case "last_30_days":
      return { start: subDays(now, 30), end: now };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
};

// Calculer les statistiques du dashboard
export const calculateDashboardStats = (dossiers, transactions, selectedPeriod) => {
  const { start: periodStart, end: periodEnd } = getPeriodDates(selectedPeriod);
  
  const dossiersActifs = dossiers.length;
  const montantTotal = dossiers.reduce((sum, d) => sum + (d.montant_restant_du || 0), 0);
  
  const montantRecouvre = transactions
    .filter(t => 
      ["Paiement", "Virement reçu"].includes(t.type_transaction) &&
      t.pris_en_compte_calcul === true &&
      t.statut !== "Annulé" &&
      parseISO(t.date_transaction) >= periodStart &&
      parseISO(t.date_transaction) <= periodEnd &&
      // Filtrer les transactions selon les dossiers filtrés
      dossiers.some(d => d.id === t.dossier_id)
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
};

// Calculer les données pour les graphiques
export const calculateChartData = (dossiers, transactions, selectedPeriod, agents) => {
  const { start: periodStart, end: periodEnd } = getPeriodDates(selectedPeriod);
  
  // 1. Répartition par statut
  const statutsData = dossiers.reduce((acc, dossier) => {
    const statut = dossier.statut_recouvrement;
    acc[statut] = (acc[statut] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statutsData).map(([statut, count]) => ({
    name: statut.replace(/_/g, ' '),
    value: count,
    montant: dossiers
      .filter(d => d.statut_recouvrement === statut)
      .reduce((sum, d) => sum + (d.montant_restant_du || 0), 0)
  }));

  // 2. Performance par agent
  const agentPerformance = agents.map(agent => {
    const dossiersAgent = dossiers.filter(d => d.entreprise?.agent_assigne === agent);
    const montantRecouvreSurPeriode = transactions
      .filter(t => 
        ["Paiement", "Virement reçu"].includes(t.type_transaction) &&
        t.pris_en_compte_calcul === true &&
        t.statut !== "Annulé" &&
        parseISO(t.date_transaction) >= periodStart &&
        parseISO(t.date_transaction) <= periodEnd &&
        dossiersAgent.some(d => d.id === t.dossier_id)
      )
      .reduce((sum, t) => sum + (t.montant || 0), 0);

    return {
      agent,
      dossiers: dossiersAgent.length,
      montantRecouvre: montantRecouvreSurPeriode,
      montantTotal: dossiersAgent.reduce((sum, d) => sum + (d.montant_restant_du || 0), 0)
    };
  });

  // 3. Ancienneté des créances
  const ancienneteData = [
    { tranche: "0-30j", count: 0, montant: 0 },
    { tranche: "31-60j", count: 0, montant: 0 },
    { tranche: "61-90j", count: 0, montant: 0 },
    { tranche: "91-180j", count: 0, montant: 0 },
    { tranche: "+180j", count: 0, montant: 0 }
  ];

  dossiers.forEach(dossier => {
    const jours = dossier.jours_retard || 0;
    let index;
    if (jours <= 30) index = 0;
    else if (jours <= 60) index = 1;
    else if (jours <= 90) index = 2;
    else if (jours <= 180) index = 3;
    else index = 4;

    ancienneteData[index].count++;
    ancienneteData[index].montant += dossier.montant_restant_du || 0;
  });

  return {
    pieData,
    agentPerformance,
    ancienneteData
  };
};

// Calculer les listes prioritaires
export const calculatePriorityLists = (dossiers) => {
  // Actions du jour à faire (dossiers sans action depuis plus de 3 jours)
  const actionsAFaire = dossiers
    .filter(d => (d.jours_depuis_derniere_action || 0) > 3)
    .sort((a, b) => (b.jours_depuis_derniere_action || 0) - (a.jours_depuis_derniere_action || 0))
    .slice(0, 10);

  // Promesses de paiement à surveiller
  const promessesASurveiller = dossiers
    .filter(d => d.statut_recouvrement === "PROMISE TO PAY")
    .slice(0, 10);

  // Top 10 des plus gros dossiers
  const topDossiers = dossiers
    .sort((a, b) => (b.montant_restant_du || 0) - (a.montant_restant_du || 0))
    .slice(0, 10);

  return {
    actionsAFaire,
    promessesASurveiller,
    topDossiers
  };
};