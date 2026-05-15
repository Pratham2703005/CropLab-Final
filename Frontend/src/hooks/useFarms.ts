import { useEffect, useCallback } from 'react';
import { useGuestFarmStore } from '../stores/guestFarmStore';
import type { Farm, FarmFormData } from '../types/farm';

/**
 * Unified hook for farm CRUD against localStorage.
 * Handles data fetching and cleanup.
 */
export const useFarms = () => {
  const {
    farms,
    currentFarm,
    loading,
    error,
    fetchGuestFarms,
    addGuestFarm,
    updateGuestFarm,
    deleteGuestFarm,
    getFarmById,
    setCurrentFarm,
    clearError,
    clearGuestData,
  } = useGuestFarmStore();

  // Fetch farms on mount
  useEffect(() => {
    fetchGuestFarms();
  }, [fetchGuestFarms]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const fetchFarms = useCallback(async () => {
    fetchGuestFarms();
  }, [fetchGuestFarms]);

  const addFarm = useCallback(
    async (farmData: FarmFormData, coordinates: number[][], area: number) => {
      addGuestFarm(farmData, coordinates, area);
    },
    [addGuestFarm]
  );

  const updateFarm = useCallback(
    async (id: string, farmData: Partial<Farm>) => {
      updateGuestFarm(id, farmData);
    },
    [updateGuestFarm]
  );

  const deleteFarm = useCallback(
    async (id: string) => {
      deleteGuestFarm(id);
    },
    [deleteGuestFarm]
  );

  return {
    farms,
    currentFarm,
    loading,
    error,
    fetchFarms,
    addFarm,
    updateFarm,
    deleteFarm,
    getFarmById,
    setCurrentFarm,
    clearError,
    clearAllData: clearGuestData,
  };
};
