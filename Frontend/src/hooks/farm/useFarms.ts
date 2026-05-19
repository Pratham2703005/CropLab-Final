import { useEffect, useCallback, useMemo } from 'react';
import { useGuestFarmStore } from '../../stores/guestFarmStore';
import { SHOWCASE_FARMS, isShowcaseFarmId } from '../../utils/showcaseFarms';
import { heatmapService } from '../../services/fileDatabase';
import type { Farm, FarmFormData } from '../../types/farm';

/**
 * Unified hook for farm CRUD against localStorage.
 *
 * The farm list is the build-baked SHOWCASE_FARMS (always present, read-only)
 * followed by the user's own guest farms from localStorage. Guest farms that
 * share an id with a showcase farm are dropped so nothing renders twice.
 */
export const useFarms = () => {
  const {
    farms: guestFarms,
    currentFarm,
    loading,
    error,
    fetchGuestFarms,
    addGuestFarm,
    updateGuestFarm,
    deleteGuestFarm,
    getFarmById: storeGetFarmById,
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

  // Showcase farms first, then the user's own farms (deduped by id).
  const farms = useMemo<Farm[]>(
    () => [
      ...SHOWCASE_FARMS,
      ...guestFarms.filter(f => !isShowcaseFarmId(f.id)),
    ],
    [guestFarms]
  );

  const getFarmById = useCallback(
    (id: string): Farm | undefined => {
      const showcase = SHOWCASE_FARMS.find(f => f.id === id);
      if (showcase) return showcase;
      return storeGetFarmById(id);
    },
    [storeGetFarmById]
  );

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

  // Update a farm and drop its cached heatmap. Editing the boundary, dates,
  // or crop invalidates the previously generated analysis — clearing the
  // cache forces the detail page to refetch fresh imagery instead of showing
  // stale results. A cache-clear failure is logged but never blocks the save.
  const updateFarmAndInvalidateHeatmap = useCallback(
    async (id: string, farmData: Partial<Farm>) => {
      await updateFarm(id, farmData);
      try {
        await heatmapService.clearByFarmId(id);
      } catch (cacheErr) {
        console.error('Error clearing local heatmap cache:', cacheErr);
      }
    },
    [updateFarm]
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
    updateFarmAndInvalidateHeatmap,
    deleteFarm,
    getFarmById,
    setCurrentFarm,
    clearError,
    clearAllData: clearGuestData,
  };
};
