import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'robot-toast';
import { ArrowLeft, Sprout, MapPin, Calendar, Save, X } from 'lucide-react';
import { LeafletMap } from '@/components/map/LeafletMap';
import { formatHectares, formatDateForDisplay } from '@/utils';
import { calculateCropDates, validateFarmForm } from '@/utils/farm';
import { useFarms } from '@/hooks/farm/useFarms';
import { useCropLabNavigation } from '@/hooks/useCropLabNavigation';
import { DEFAULT_FARM_DETAIL_KEYS } from '@/constants/farm';
import { CROP_OPTIONS } from '@/constants/farm';
import type { FarmFormData } from '@/types/farm';

export default function EditFarm() {
  const { id } = useParams<{ id: string }>();
  const { navigateToFarmDetails } = useCropLabNavigation();
  const { getFarmById, updateFarmAndInvalidateHeatmap, loading, error } =
    useFarms();
  const [coordinates, setCoordinates] = useState<number[][]>([]);
  const [area, setArea] = useState<number>(0);
  const [displayPlantingDate, setDisplayPlantingDate] = useState<string>('');
  const [displayHarvestDate, setDisplayHarvestDate] = useState<string>('');

  const farm = id ? getFarmById(id) : null;

  // Showcase farms are permanent and read-only — bounce edit attempts.
  useEffect(() => {
    if (farm?.isShowcase) {
      navigateToFarmDetails(farm.id);
    }
  }, [farm, navigateToFarmDetails]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FarmFormData>();

  const plantingDate = watch(DEFAULT_FARM_DETAIL_KEYS.PLANTING_DATE);
  const harvestDate = watch(DEFAULT_FARM_DETAIL_KEYS.HARVEST_DATE);
  const selectedCrop = watch(DEFAULT_FARM_DETAIL_KEYS.SELECTED_CROP);

  useEffect(() => {
    if (farm) {
      // Populate form with existing farm data
      setValue(DEFAULT_FARM_DETAIL_KEYS.FARM_NAME, farm.name);
      setValue(DEFAULT_FARM_DETAIL_KEYS.SELECTED_CROP, farm.crop);
      setValue(DEFAULT_FARM_DETAIL_KEYS.PLANTING_DATE, farm.plantingDate || '');
      setValue(DEFAULT_FARM_DETAIL_KEYS.HARVEST_DATE, farm.harvestDate || '');

      // Set display dates
      setDisplayPlantingDate(formatDateForDisplay(farm.plantingDate));
      setDisplayHarvestDate(formatDateForDisplay(farm.harvestDate));

      // Set coordinates and area
      setCoordinates(farm?.coordinates);
      setArea(farm?.area);
    }
  }, [farm, setValue]);

  // Auto-fill planting and harvest dates when crop is changed
  useEffect(() => {
    if (selectedCrop && farm && selectedCrop !== farm.crop) {
      // Only auto-fill if crop changed manually, not on initial load
      const { plantingDate: autoPlantingDate, harvestDate: autoHarvestDate } =
        calculateCropDates(selectedCrop);
      setValue(
        DEFAULT_FARM_DETAIL_KEYS.PLANTING_DATE,
        autoPlantingDate
      );
      setValue(
        DEFAULT_FARM_DETAIL_KEYS.HARVEST_DATE,
        autoHarvestDate
      );
      setDisplayPlantingDate(formatDateForDisplay(autoPlantingDate));
      setDisplayHarvestDate(formatDateForDisplay(autoHarvestDate));
    }
  }, [selectedCrop, farm, setValue]);

  // Show error toast when error state changes
  useEffect(() => {
    if (error) {
      toast.error({
        message: error,
        robotVariant: '/wheat-error.png',
        autoClose: 3000,
      });
    }
  }, [error]);

  if (loading) {
    return (
      <div className='min-h-screen gradient-mesh flex items-center justify-center'>
        <div className='card p-8 flex flex-col items-center space-y-6 animate-in'>
          <div className='relative'>
            <div className='animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600'></div>
            <div className='absolute inset-0 flex items-center justify-center'>
              <Sprout className='h-5 w-5 text-primary-600 animate-pulse' />
            </div>
          </div>
          <div className='text-center'>
            <p className='text-lg font-medium text-neutral-900 mb-2'>
              Loading Farm Details
            </p>
            <p className='text-sm text-neutral-600'>
              Preparing edit interface...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Only show Farm Not Found after loading is complete
  if (!farm && !loading) {
    return (
      <div className='min-h-screen gradient-mesh flex items-center justify-center'>
        <div className='card-elevated p-8 text-center max-w-md animate-in'>
          <div className='mb-6'>
            <div className='h-16 w-16 bg-gradient-to-br from-neutral-400 to-neutral-600 rounded-2xl flex items-center justify-center mx-auto'>
              <Sprout className='h-8 w-8 text-white' />
            </div>
          </div>
          <h2 className='text-2xl font-bold text-neutral-900 mb-3'>
            Farm Not Found
          </h2>
          <p className='text-neutral-600 mb-6 leading-relaxed'>
            The farm you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to='/dashboard'
            className='btn-primary inline-flex items-center'
          >
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: FarmFormData) => {
    const validationError = validateFarmForm({
      plantingDate: data.plantingDate,
      harvestDate: data.harvestDate,
      coordinates,
    });
    if (validationError) {
      toast.error({
        message: validationError,
        robotVariant: '/wheat-error.png',
        autoClose: 3000,
      });
      return;
    }

    try {
      if (!farm) {
        throw new Error('Farm not found');
      }
      // Clearing the stale heatmap cache is part of the update workflow —
      // see useFarms.updateFarmAndInvalidateHeatmap.
      await updateFarmAndInvalidateHeatmap(farm.id, {
        ...data,
        coordinates,
        area,
      });
      toast.success({
        message: 'Farm updated successfully!',
        robotVariant: '/wheat-base.png',
        autoClose: 3000,
      });
      // Only navigate after the update is complete
      setTimeout(() => navigateToFarmDetails(farm.id), 500);
    } catch (error) {
      console.error('Error updating farm:', error);
      // Error is already handled by the store
    }
  };

  const handlePolygonComplete = (
    coords: number[][],
    calculatedArea: number
  ) => {
    setCoordinates(coords);
    setArea(calculatedArea);
  };

  return (
    <div className='min-h-screen gradient-mesh'>
      {/* Enhanced Header */}
      <header className='glass border-b border-white/10 sticky top-0 z-40'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-6'>
            <div className='flex items-center animate-in'>
              <Link
                to={`/farm/${id}`}
                className='mr-4 p-2.5 rounded-xl text-neutral-400 hover:text-neutral-600 hover:bg-white/50 transition-all'
              >
                <ArrowLeft className='h-5 w-5' />
              </Link>
              <div className='flex items-start space-x-4'>
                <div className='h-12 w-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-glow'>
                  <Sprout className='h-6 w-6 text-white' />
                </div>
                <div>
                  <h1 className='text-3xl font-bold text-neutral-900'>
                    Edit Farm
                  </h1>
                  <div className='flex items-center space-x-3 mt-1'>
                    <span className='badge-primary'>{farm?.name}</span>
                    <span className='text-sm text-neutral-600'>
                      Update details & boundary
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className='max-w-4xl mx-auto py-8 px-4'>
        <div className='card-elevated animate-in overflow-hidden'>
          <form onSubmit={handleSubmit(onSubmit)} className='p-6 space-y-8'>
            {/* Enhanced Farm Details Section */}
            <div>
              <div className='flex items-center space-x-3 mb-6'>
                <div className='h-10 w-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center'>
                  <Sprout className='h-5 w-5 text-white' />
                </div>
                <div>
                  <h3 className='text-xl font-semibold text-neutral-900'>
                    Farm Information
                  </h3>
                  <p className='text-sm text-neutral-600'>
                    Update basic farm details
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* Farm Name */}
                <div>
                  <label className='block text-sm font-medium text-neutral-700 mb-2'>
                    Farm Name *
                  </label>
                  <input
                    type='text'
                    {...register('name', {
                      required: 'Farm name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters',
                      },
                    })}
                    className='input'
                    placeholder='Enter farm name'
                  />
                  {errors.name && (
                    <p className='text-red-500 text-sm mt-1'>
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Crop Type */}
                <div>
                  <label className='block text-sm font-medium text-neutral-700 mb-2'>
                    Crop Type *
                  </label>
                  <select
                    {...register('crop', {
                      required: 'Please select a crop type',
                    })}
                    className='input'
                  >
                    <option value=''>Select crop type</option>
                    {CROP_OPTIONS.map(crop => (
                      <option key={crop} value={crop}>
                        {crop}
                      </option>
                    ))}
                  </select>
                  {errors.crop && (
                    <p className='text-red-500 text-sm mt-1'>
                      {errors.crop.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Dates Section */}
            <div>
              <div className='flex items-center space-x-3 mb-6'>
                <div className='h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center'>
                  <Calendar className='h-5 w-5 text-white' />
                </div>
                <div>
                  <h3 className='text-xl font-semibold text-neutral-900'>
                    Cultivation Timeline
                  </h3>
                  <p className='text-sm text-neutral-600'>
                    Set planting and harvest dates
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* Planting Date */}
                <div>
                  <label className='block text-sm font-medium text-neutral-700 mb-2'>
                    Planting Date *
                  </label>
                  <div className='space-y-1'>
                    <input
                      type='date'
                      value={plantingDate}
                      onChange={e => {
                        setValue('plantingDate', e.target.value);
                        setDisplayPlantingDate(
                          formatDateForDisplay(e.target.value)
                        );
                      }}
                      className='input'
                    />
                    {displayPlantingDate && (
                      <p className='text-xs text-neutral-600'>
                        {displayPlantingDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Harvest Date */}
                <div>
                  <label className='block text-sm font-medium text-neutral-700 mb-2'>
                    Harvest Date *
                  </label>
                  <div className='space-y-1'>
                    <input
                      type='date'
                      value={harvestDate}
                      onChange={e => {
                        setValue('harvestDate', e.target.value);
                        setDisplayHarvestDate(
                          formatDateForDisplay(e.target.value)
                        );
                      }}
                      min={plantingDate}
                      className='input'
                    />
                    {displayHarvestDate && (
                      <p className='text-xs text-neutral-600'>
                        {displayHarvestDate}
                      </p>
                    )}
                  </div>
                  {harvestDate &&
                    plantingDate &&
                    harvestDate <= plantingDate && (
                      <p className='text-red-500 text-sm mt-1'>
                        Harvest date must be after planting date
                      </p>
                    )}
                </div>
              </div>
            </div>

            {/* Enhanced Description Section */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 mb-2'>
                Description (Optional)
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className='input resize-none'
                placeholder='Enter any additional details about your farm'
              />
            </div>

            {/* Enhanced Map Section */}
            <div className='border-t border-neutral-200 pt-8'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-3'>
                  <div className='h-10 w-10 bg-gradient-to-br from-accent-500 to-accent-700 rounded-xl flex items-center justify-center'>
                    <MapPin className='h-5 w-5 text-white' />
                  </div>
                  <div>
                    <h3 className='text-xl font-semibold text-neutral-900'>
                      Farm Boundary
                    </h3>
                    <p className='text-sm text-neutral-600'>
                      Update your farm boundary on the map to recalculate the
                      area
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                <LeafletMap
                  onPolygonComplete={handlePolygonComplete}
                  height='500px'
                  className='border rounded-lg'
                  {...(coordinates.length > 0 && {
                    initialPolygon: coordinates,
                  })}
                />

                {coordinates.length > 0 && (
                  <div className='bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4'>
                    <div className='flex items-center space-x-6'>
                      <div className='flex items-center space-x-2'>
                        <div className='h-2 w-2 bg-green-500 rounded-full'></div>
                        <span className='text-green-800 font-semibold'>
                          Area: {formatHectares(area)} hectares
                        </span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div className='h-2 w-2 bg-blue-500 rounded-full'></div>
                        <span className='text-blue-800 font-semibold'>
                          Points: {coordinates.length}
                        </span>
                      </div>
                      <div className='text-green-600 text-sm font-medium flex items-center'>
                        ✓ Boundary updated successfully
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {coordinates.length === 0 && (
                <div className='bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4'>
                  <p className='text-orange-800 text-sm font-medium flex items-center'>
                    <span className='text-orange-600 mr-2'>⚠️</span>
                    Please mark your farm boundary on the map before saving
                  </p>
                </div>
              )}
            </div>

            {/* Enhanced Error Display removed - now using toast notifications */}

            {/* Enhanced Action Buttons */}
            <div className='flex justify-between items-center pt-8 border-t border-neutral-200'>
              <Link
                to={`/farm/${id}`}
                className='btn-secondary inline-flex items-center'
              >
                <X className='h-4 w-4 mr-2' />
                Cancel
              </Link>

              <button
                type='submit'
                disabled={loading || coordinates.length === 0}
                className='btn-primary inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <Save className='h-4 w-4 mr-2' />
                {loading ? 'Updating Farm...' : 'Update Farm'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
