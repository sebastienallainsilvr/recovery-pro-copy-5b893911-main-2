import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/components/utils/logger';

export const useDataLoader = (loaderFn, dependencies = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      logger.debug('useDataLoader: Début du chargement des données');
      const result = await loaderFn();
      setData(result);
      logger.debug('useDataLoader: Données chargées avec succès', { count: result?.length });
    } catch (err) {
      setError(err);
      logger.error('useDataLoader: Erreur lors du chargement des données', err);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [loaderFn, ...dependencies]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refetch = useCallback(() => {
    return loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refetch
  };
};