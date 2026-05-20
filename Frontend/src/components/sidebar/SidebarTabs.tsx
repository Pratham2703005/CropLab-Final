import React, { useEffect, useRef, useState } from 'react';
import {
  TrendingUp,
  Cloud,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { FarmOverviewPanel, NDVITrendsPanel, ExportMapsPanel, NewsPanel, MandiRatesPanel } from '@/components/sidebar';
import { FarmWeatherCalendar } from '../FarmWeatherCalendar';
import {
  FarmOverviewSkeleton,
  NDVITrendsSkeleton,
  NewsSkeleton,
  MandiRatesSkeleton,
} from './PanelSkeletons';
import { DEFAULT_SIDEBAR, TAB_LIST, TABS, SIDEBAR_PANEL_WIDTH_KEY } from '@/constants';
import type { SidebarTabsProps, TabId } from '@/types';

export const SidebarTabs: React.FC<SidebarTabsProps> = ({
  farm,
  heatmapData,
  heatmapLoading = false,
  weatherCalendarData,
  canEdit,
  onDelete,
  onRefreshWeather,
  onExportData,
  onGenerateReport,
  onDownloadMap,
  weatherLoading = false,
  exportLoading = false,
  onViewFarmOnMap,
  onViewStressMap,
}) => {
  const [activeTab, setActiveTab] = useState<TabId | null>(TABS.FARM.id);

  const clampWidth = (value: number) =>
    Math.min(DEFAULT_SIDEBAR.MAX_WIDTH, Math.max(DEFAULT_SIDEBAR.MIN_WIDTH, value));

  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR.DEFAULT_WIDTH;
    const saved = window.localStorage.getItem(SIDEBAR_PANEL_WIDTH_KEY);
    const parsed = saved ? Number.parseInt(saved, 10) : NaN;
    return Number.isFinite(parsed) ? clampWidth(parsed) : DEFAULT_SIDEBAR.DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const next = clampWidth(rect.right - event.clientX);
      setPanelWidth(next);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_PANEL_WIDTH_KEY, String(panelWidth));
  }, [panelWidth]);

  const handleOpenTrends = () => {
    setActiveTab('trends');
  };

  const handleViewOnMap = () => {
    onViewFarmOnMap?.();
    setActiveTab(null);
  };

  const handleViewStressMap = () => {
    onViewStressMap?.();
    setActiveTab(null);
  };

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(activeTab === tabId ? null : tabId);
  };

  const isOpen = activeTab !== null;
  const activeTabData = TAB_LIST.find(t => t.id === activeTab);
  const ActiveTabIcon = activeTabData?.Icon;

  return (
    <div className='flex h-full' ref={containerRef}>
      {/* Vertical Icon Strip */}
      <div className='flex flex-col items-center bg-white py-3 px-1.5 space-y-1 z-10'>
        {TAB_LIST.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              title={tab.label}
              className={`
                relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group
                ${
                  isActive
                    ? `${tab.activeBg} ${tab.activeColor} shadow-sm`
                    : 'border text-neutral-800 hover:text-neutral-700 hover:bg-gray-100'
                }
              `}
            >
              <tab.Icon className='h-5 w-5' />
              {/* Active indicator dot */}
              {isActive && (
                <span className='absolute right-0.5 top-0.5 w-1.5 h-1.5 rounded-full bg-current' />
              )}
              {/* Tooltip */}
              <span className='absolute right-full mr-2 px-2 py-1 text-xs font-medium text-white bg-neutral-800 rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg'>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Spacer */}
        <div className='flex-1' />

        {/* Collapse/Expand toggle */}
        <button
          onClick={() => setActiveTab(isOpen ? null : 'farm')}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className='w-10 h-10 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white hover:bg-neutral-700/60 transition-all duration-200'
        >
          {isOpen ? (
            <ChevronRight className='h-4 w-4' />
          ) : (
            <ChevronLeft className='h-4 w-4' />
          )}
        </button>
      </div>

      {/* Resize Handle */}
      {isOpen && (
        <div
          role='separator'
          aria-orientation='vertical'
          aria-label='Resize sidebar'
          onMouseDown={event => {
            event.preventDefault();
            setIsResizing(true);
          }}
          onDoubleClick={() => setPanelWidth(DEFAULT_SIDEBAR.DEFAULT_WIDTH)}
          title='Drag to resize. Double-click to reset.'
          className={`
            relative w-1 cursor-col-resize bg-neutral-200 hover:bg-primary-400
            transition-colors duration-150
            ${isResizing ? 'bg-primary-500' : ''}
          `}
        >
          <span
            className={`
              pointer-events-none absolute inset-y-0 -left-1 -right-1
            `}
          />
        </div>
      )}

      {/* Sliding Panel */}
      <div
        style={isOpen ? { width: panelWidth } : { width: 0 }}
        className={`
          bg-white overflow-hidden ease-in-out
          ${isResizing ? '' : 'transition-[width,opacity] duration-300'}
          ${isOpen ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <div
          style={{ width: panelWidth }}
          className='h-full flex flex-col overflow-hidden'
        >
          {/* Panel Header */}
          {activeTab && (
            <div className='px-4 py-3 border-b border-neutral-200 bg-neutral-50 flex-shrink-0'>
              <div className='flex items-center space-x-2'>
                {ActiveTabIcon && <ActiveTabIcon className='h-5 w-5' />}
                <h3 className='text-sm font-bold text-neutral-900'>
                  {activeTabData?.label}
                </h3>
              </div>
            </div>
          )}

          {/* Panel Content */}
          <div className='flex-1 overflow-y-auto p-3'>
            {activeTab === 'farm' &&
              (heatmapLoading && !heatmapData ? (
                <FarmOverviewSkeleton />
              ) : (
                <FarmOverviewPanel
                  farm={farm}
                  heatmapData={heatmapData ?? null}
                  canEdit={canEdit}
                  onDelete={onDelete}
                  onOpenTrends={handleOpenTrends}
                  onViewOnMap={handleViewOnMap}
                />
              ))}

            {activeTab === 'trends' &&
              (heatmapData ? (
                <NDVITrendsPanel
                  heatmapData={heatmapData}
                  onViewStressMap={handleViewStressMap}
                />
              ) : heatmapLoading ? (
                <NDVITrendsSkeleton />
              ) : (
                <div className='flex flex-col items-center justify-center py-8 text-center'>
                  <TrendingUp className='h-12 w-12 text-neutral-300 mb-3' />
                  <p className='text-sm text-neutral-600'>
                    No trend data available
                  </p>
                </div>
              ))}

            {activeTab === 'weather' && weatherCalendarData && (
              <FarmWeatherCalendar
                calendarData={weatherCalendarData}
                onRefresh={onRefreshWeather}
                loading={weatherLoading}
              />
            )}

            {activeTab === 'weather' && !weatherCalendarData && (
              <div className='flex flex-col items-center justify-center py-8 text-center'>
                <Cloud className='h-12 w-12 text-neutral-300 mb-3' />
                <p className='text-sm text-neutral-600'>
                  {weatherLoading
                    ? 'Loading weather data...'
                    : 'No weather data available'}
                </p>
              </div>
            )}

            {activeTab === 'news' &&
              (heatmapData ? (
                <NewsPanel
                  news={heatmapData?.news ?? []}
                  {...(heatmapData?.news_ai_analysis !== undefined && {
                    aiAnalysis: heatmapData.news_ai_analysis,
                  })}
                />
              ) : heatmapLoading ? (
                <NewsSkeleton />
              ) : (
                <NewsPanel news={[]} />
              ))}

            {activeTab === 'mandi' &&
              (heatmapData ? (
                <MandiRatesPanel
                  {...(heatmapData?.rate?.agmarknet !== undefined && {
                    agmarknet: heatmapData.rate.agmarknet,
                  })}
                  {...(heatmapData?.location?.district && {
                    detectedDistrict: heatmapData.location.district,
                  })}
                  {...(heatmapData?.mandi_ai_analysis !== undefined && {
                    aiAnalysis: heatmapData.mandi_ai_analysis,
                  })}
                />
              ) : heatmapLoading ? (
                <MandiRatesSkeleton />
              ) : (
                <MandiRatesPanel />
              ))}

            {activeTab === 'export' && (
              <ExportMapsPanel
                farmName={farm.name}
                onExportData={onExportData}
                onGenerateReport={onGenerateReport}
                onDownloadMap={onDownloadMap}
                isLoading={exportLoading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
