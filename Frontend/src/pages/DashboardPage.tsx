import { Link } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { useFarms } from '../hooks/useFarms';
import {
  Plus,
  MapPin,
  Sprout,
  TrendingUp,
  Activity,
  BarChart3,
} from 'lucide-react';
import { AddFarmCard, Card } from '@/components/card';
import { formatHectares } from '@/utils';
import type { Farm } from '@/types/farm';
import { toast } from 'robot-toast';

export default function DashboardPage() {
  const { farms, loading, error, fetchFarms, clearError } = useFarms();
  const memoFetchFarms = useCallback(() => fetchFarms(), [fetchFarms]);
  const memoClearError = useCallback(() => clearError(), [clearError]);

  useEffect(() => {
    if (error) {
      toast.error({
        message: error,
        robotVariant: '/wheat-error.png',
        autoClose: 3000,
      });
    }
  }, [error]);

  useEffect(() => {
    memoFetchFarms();
  }, [memoFetchFarms]);

  useEffect(() => {
    return () => {
      memoClearError();
    };
  }, [memoClearError]);

  const totalArea = farms.reduce((sum: number, farm: Farm) => {
    const area = farm.area || 0;
    return sum + area;
  }, 0);
  const activeCrops = new Set(farms.map((farm: Farm) => farm.crop)).size;

  return (
    <div className='min-h-screen gradient-mesh'>
      {/* Enhanced Header */}
      <header className='glass border-b border-white/10 sticky top-0 z-40'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-4'>
            <div className='flex items-center space-x-4 animate-in'>
              <div className='bg-gradient-to-br from-primary-500 to-primary-700 p-2.5 rounded-xl shadow-glow'>
                <Sprout className='h-6 w-6 text-white' />
              </div>
              <div>
                <h1 className='text-2xl font-bold text-neutral-900'>
                  Dashboard
                </h1>
                <p className='text-sm text-neutral-600'>
                  Your data is saved locally in this browser
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          {/* Loading State */}
          {loading && (
            <div className='card-elevated p-8 mb-6 animate-in'>
              <div className='flex flex-col items-center space-y-6'>
                <div className='relative'>
                  <div className='animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600'></div>
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <Activity className='h-5 w-5 text-primary-600 animate-pulse' />
                  </div>
                </div>
                <div className='text-center'>
                  <p className='text-lg font-medium text-neutral-900 mb-2'>
                    Loading Your Dashboard
                  </p>
                  <p className='text-sm text-neutral-600'>
                    Gathering your farm data...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8'>
            <div className='card-elevated group  transition-all duration-300 p-6 animate-in'>
              <div className='flex items-center justify-between'>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-neutral-600 mb-1'>
                    Total Farms
                  </p>
                  <p className='text-3xl font-bold text-neutral-900'>
                    {farms.length}
                  </p>
                  <div className='flex items-center mt-2'>
                    <TrendingUp className='h-3 w-3 text-primary-600 mr-1' />
                    <span className='text-xs text-primary-600 font-medium'>
                      Your portfolio
                    </span>
                  </div>
                </div>
                <div className='flex-shrink-0'>
                  <div className='h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center group-hover:shadow-glow transition-all'>
                    <MapPin className='h-6 w-6 text-white' />
                  </div>
                </div>
              </div>
            </div>

            <div className='card-elevated group  transition-all duration-300 p-6 animate-in stagger-1'>
              <div className='flex items-center justify-between'>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-neutral-600 mb-1'>
                    Total Area
                  </p>
                  <p className='text-3xl font-bold text-neutral-900'>
                    {formatHectares(totalArea)}
                    <span className='text-lg text-neutral-600 ml-1'>ha</span>
                  </p>
                  <div className='flex items-center mt-2'>
                    <Activity className='h-3 w-3 text-secondary-600 mr-1' />
                    <span className='text-xs text-secondary-600 font-medium'>
                      Hectares managed
                    </span>
                  </div>
                </div>
                <div className='flex-shrink-0'>
                  <div className='h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-700 flex items-center justify-center group-hover:shadow-glow transition-all'>
                    <BarChart3 className='h-6 w-6 text-white' />
                  </div>
                </div>
              </div>
            </div>

            <div className='card-elevated group  transition-all duration-300 p-6 animate-in stagger-2'>
              <div className='flex items-center justify-between'>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-neutral-600 mb-1'>
                    Crop Varieties
                  </p>
                  <p className='text-3xl font-bold text-neutral-900'>
                    {activeCrops}
                  </p>
                  <div className='flex items-center mt-2'>
                    <Sprout className='h-3 w-3 text-accent-600 mr-1' />
                    <span className='text-xs text-accent-600 font-medium'>
                      Active crops
                    </span>
                  </div>
                </div>
                <div className='flex-shrink-0'>
                  <div className='h-12 w-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center group-hover:shadow-glow-accent transition-all'>
                    <Sprout className='h-6 w-6 text-white' />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Farms List */}
          {!loading && farms.length > 0 ? (
            <div className='animate-in stagger-1'>
              <div className='card-elevated'>
                <div className='p-6'>
                  <div className='flex justify-between items-center mb-6'>
                    <div>
                      <h3 className='text-xl font-semibold text-neutral-900 mb-1'>
                        Your Farms
                      </h3>
                      <p className='text-sm text-neutral-600'>
                        {farms.length}{' '}
                        {farms.length === 1 ? 'farm' : 'farms'} in your
                        portfolio
                      </p>
                    </div>
                    <Link to='/create-farm' className='btn-primary group'>
                      <Plus className='h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-200' />
                      Add Farm
                    </Link>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {farms.map((farm: Farm, index: number) => (
                      <Card key={farm.id} farm={farm} index={index} />
                    ))}
                    <AddFarmCard />
                  </div>
                </div>
              </div>
            </div>
          ) : !loading ? (
            <div className='card-elevated animate-in'>
              <div className='text-center py-16'>
                <div className='inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-neutral-200 mb-6'>
                  <MapPin className='h-8 w-8 text-neutral-400' />
                </div>
                <h3 className='text-xl font-semibold text-neutral-900 mb-2'>
                  No farms yet
                </h3>
                <p className='text-neutral-600 mb-8 max-w-sm mx-auto'>
                  Start your agricultural journey by creating your first farm.
                </p>
                <Link to='/create-farm' className='btn-primary group'>
                  <Plus className='h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-200' />
                  Create Your First Farm
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
