import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatService = {
  // Formatage de devise
  currency: (amount, options = {}) => {
    const defaultOptions = {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
      ...options
    };
    
    return new Intl.NumberFormat('fr-FR', defaultOptions).format(amount || 0);
  },

  // Formatage de devise avec fractions si nécessaire
  currencyPrecise: (amount) => {
    return formatService.currency(amount, { maximumFractionDigits: 2 });
  },

  // Formatage de nombre
  number: (value) => {
    return new Intl.NumberFormat('fr-FR').format(value || 0);
  },

  // Formatage de pourcentage
  percentage: (value, decimals = 1) => {
    return `${(value || 0).toFixed(decimals)}%`;
  },

  // Formatage de date courte
  date: (date) => {
    if (!date) return "-";
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: fr });
    } catch (error) {
      return "-";
    }
  },

  // Formatage de date avec heure
  dateTime: (date) => {
    if (!date) return "-";
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch (error) {
      return "-";
    }
  },

  // Formatage de date relative (il y a X jours)
  dateRelative: (date) => {
    if (!date) return "-";
    try {
      const now = new Date();
      const targetDate = new Date(date);
      const diffInDays = Math.floor((now - targetDate) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return "Aujourd'hui";
      if (diffInDays === 1) return "Hier";
      if (diffInDays > 1) return `Il y a ${diffInDays} jours`;
      if (diffInDays === -1) return "Demain";
      if (diffInDays < -1) return `Dans ${Math.abs(diffInDays)} jours`;
    } catch (error) {
      return "-";
    }
  },

  // Formatage de durée en jours
  days: (count) => {
    if (!count || count === 0) return "-";
    return `${count} jour${count > 1 ? 's' : ''}`;
  },

  // Formatage de texte tronqué
  truncate: (text, maxLength = 50) => {
    if (!text) return "-";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  },

  // Formatage de nom complet
  fullName: (prenom, nom) => {
    if (!prenom && !nom) return "-";
    return [prenom, nom].filter(Boolean).join(' ');
  },

  // Formatage de statut avec remplacement des underscores
  status: (status) => {
    if (!status) return "-";
    return status.replace(/_/g, ' ');
  },

  // Formatage de téléphone
  phone: (phone) => {
    if (!phone) return "-";
    // Format français: 01 23 45 67 89
    if (phone.length === 10 && phone.startsWith('0')) {
      return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
  }
};