
// Service pour gérer les règles métier configurables
export const rulesService = {
  // Cache des règles pour éviter les appels répétés
  _cache: null,
  _cacheTime: null,
  
  // Durée de cache en millisecondes (5 minutes)
  CACHE_DURATION: 5 * 60 * 1000,

  // Charger les règles depuis la base
  async loadRules() {
    const now = Date.now();
    
    // Retourner le cache s'il est encore valide
    if (this._cache && this._cacheTime && (now - this._cacheTime) < this.CACHE_DURATION) {
      return this._cache;
    }

    try {
      // Dynamiquement importer l'entité pour éviter les dépendances circulaires
      const { AppSettings } = await import('@/api/entities');
      const settings = await AppSettings.list();
      
      // Convertir en objet clé-valeur pour un accès facile
      const rules = settings.reduce((acc, setting) => {
        acc[setting.key] = {
          value: setting.value,
          numericValue: parseFloat(setting.value) || 0,
          description: setting.description,
          category: setting.category
        };
        return acc;
      }, {});
      
      // Mettre en cache
      this._cache = rules;
      this._cacheTime = now;
      
      return rules;
    } catch (error) {
      console.error('Erreur lors du chargement des règles métier:', error);
      return this.getDefaultRules();
    }
  },

  // Vider le cache (à appeler après sauvegarde des règles)
  clearCache() {
    this._cache = null;
    this._cacheTime = null;
  },

  // Règles par défaut en cas d'erreur
  getDefaultRules() {
    return {
      'DELAI_R1': { numericValue: 5, value: '5' },
      'DELAI_R2': { numericValue: 5, value: '5' },
      'DELAI_R3': { numericValue: 5, value: '5' },
      'DELAI_R4': { numericValue: 3, value: '3' },
      'DELAI_R5': { numericValue: 7, value: '7' },
      'DELAI_PROMISE_TO_PAY': { numericValue: 1, value: '1' },
      'DELAI_UNDER_NEGOTIATION': { numericValue: 7, value: '7' },
      'SEUIL_DOSSIER_PRIORITAIRE': { numericValue: 3, value: '3' },
      'SEUIL_MONTANT_ELEVE': { numericValue: 10000, value: '10000' },
      'SEUIL_ANCIENNE_ACTIVITE': { numericValue: 7, value: '7' },
      'DEVISE_DEFAUT': { numericValue: 0, value: 'EUR' }
    };
  },

  // Obtenir une règle spécifique
  async getRule(key) {
    const rules = await this.loadRules();
    return rules[key] || { numericValue: 0, value: '0' };
  },

  // Obtenir le délai pour un statut donné
  async getDelaiForStatus(status) {
    const rule = await this.getRule(`DELAI_${status}`);
    return rule.numericValue;
  },

  // Vérifier si un montant est considéré comme élevé
  async isHighAmount(amount) {
    const rule = await this.getRule('SEUIL_MONTANT_ELEVE');
    return amount > rule.numericValue;
  },

  // Vérifier si un dossier est prioritaire (jours sans action)
  async isPriorityCase(daysSinceLastAction) {
    const rule = await this.getRule('SEUIL_DOSSIER_PRIORITAIRE');
    return daysSinceLastAction > rule.numericValue;
  },

  // Vérifier si l'activité d'un dossier est ancienne
  async isOldActivity(daysSinceLastActivity) {
    const rule = await this.getRule('SEUIL_ANCIENNE_ACTIVITE');
    return daysSinceLastActivity > rule.numericValue;
  }
};
