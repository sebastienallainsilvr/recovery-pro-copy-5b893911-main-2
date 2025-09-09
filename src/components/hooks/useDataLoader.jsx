import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export const useDataLoader = (loaderFn, dependencies = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await loaderFn();
      setData(result);
    } catch (err) {
      setError(err);
      console.error('Erreur lors du chargement des données:', err);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, dependencies);

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