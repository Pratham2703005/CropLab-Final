import React, { useMemo, useState } from 'react';
import {
  Search,
  ExternalLink,
  Newspaper,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { NewsItem } from '@/types/farm';
import { NEWS_PAGE_SIZE, NEWS_PANEL_COPY } from '@/constants/sidebar';
import { filterNews, formatNewsDate, paginate } from '@/utils/sidebar';

interface NewsPanelProps {
  news: NewsItem[];
  aiAnalysis?: string;
}

const AiAnalysisBanner: React.FC<{ text: string }> = ({ text }) => (
  <div className='rounded-lg border border-orange-200 bg-orange-50 p-3'>
    <p className='text-[11px] font-semibold uppercase tracking-wide text-orange-700'>
      {NEWS_PANEL_COPY.aiAnalysisLabel}
    </p>
    <p className='mt-1 text-xs leading-relaxed text-orange-900'>{text}</p>
  </div>
);

const NoNewsState: React.FC = () => (
  <div className='flex flex-col items-center justify-center py-8 text-center'>
    <Newspaper className='h-12 w-12 text-neutral-300 mb-3' />
    <p className='text-sm text-neutral-600'>
      {NEWS_PANEL_COPY.noNewsAvailable}
    </p>
  </div>
);

interface NewsSearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  resultCount: number;
}

const NewsSearchBar: React.FC<NewsSearchBarProps> = ({
  query,
  onQueryChange,
  resultCount,
}) => (
  <>
    <div className='relative'>
      <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400' />
      <input
        type='text'
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        placeholder={NEWS_PANEL_COPY.searchPlaceholder}
        className='w-full pl-8 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400'
      />
    </div>
    <div className='text-xs text-neutral-500'>
      {NEWS_PANEL_COPY.resultCount(resultCount)}
      {query && (
        <span className='ml-1'>{NEWS_PANEL_COPY.resultsForQuery(query)}</span>
      )}
    </div>
  </>
);

const NewsItemCard: React.FC<{ item: NewsItem }> = ({ item }) => (
  <li className='border border-neutral-200 rounded-lg p-3 hover:border-orange-300 hover:bg-orange-50/30 transition-colors'>
    <a
      href={item.url}
      target='_blank'
      rel='noopener noreferrer'
      className='block group'
    >
      <div className='flex items-start gap-2'>
        {item.urlToImage && (
          <img
            src={item.urlToImage}
            alt=''
            loading='lazy'
            onError={e => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
            className='w-14 h-14 rounded object-cover flex-shrink-0 bg-neutral-100'
          />
        )}
        <div className='flex-1 min-w-0'>
          <h4 className='text-xs font-semibold text-neutral-900 leading-snug line-clamp-2 group-hover:text-orange-700'>
            {item.title}
          </h4>
          <div className='flex items-center gap-1.5 mt-1 text-[10px] text-neutral-500'>
            <span className='font-medium text-neutral-700 truncate'>
              {item.source}
            </span>
            <span>•</span>
            <span className='flex-shrink-0'>
              {formatNewsDate(item.publishedAt)}
            </span>
            <ExternalLink className='h-2.5 w-2.5 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100' />
          </div>
        </div>
      </div>
      {item.description && (
        <p className='text-[11px] text-neutral-600 mt-2 line-clamp-2 leading-snug'>
          {item.description}
        </p>
      )}
    </a>
  </li>
);

interface NewsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

const NewsPagination: React.FC<NewsPaginationProps> = ({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}) => (
  <div className='flex items-center justify-between pt-2 border-t border-neutral-100'>
    <button
      onClick={onPrev}
      disabled={currentPage === 1}
      className='flex items-center gap-1 px-2 py-1 text-xs text-neutral-700 rounded hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent'
    >
      <ChevronLeft className='h-3.5 w-3.5' />
      {NEWS_PANEL_COPY.prevButton}
    </button>
    <span className='text-xs text-neutral-600'>
      {NEWS_PANEL_COPY.pageLabel}{' '}
      <span className='font-semibold text-neutral-900'>{currentPage}</span>{' '}
      {NEWS_PANEL_COPY.pageOf(totalPages)}
    </span>
    <button
      onClick={onNext}
      disabled={currentPage === totalPages}
      className='flex items-center gap-1 px-2 py-1 text-xs text-neutral-700 rounded hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent'
    >
      {NEWS_PANEL_COPY.nextButton}
      <ChevronRight className='h-3.5 w-3.5' />
    </button>
  </div>
);

export const NewsPanel: React.FC<NewsPanelProps> = ({ news, aiAnalysis }) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const hasNews = Array.isArray(news) && news.length > 0;
  const normalizedAiAnalysis = aiAnalysis?.trim();

  const filtered = useMemo(() => filterNews(news, query), [news, query]);
  const {
    items: pageItems,
    currentPage,
    totalPages,
    start,
  } = paginate(filtered, page, NEWS_PAGE_SIZE);

  const handleSearch = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  if (!hasNews && !normalizedAiAnalysis) {
    return <NoNewsState />;
  }

  return (
    <div className='space-y-3'>
      {normalizedAiAnalysis && (
        <AiAnalysisBanner text={normalizedAiAnalysis} />
      )}

      {!hasNews ? (
        <NoNewsState />
      ) : (
        <>
          <NewsSearchBar
            query={query}
            onQueryChange={handleSearch}
            resultCount={filtered.length}
          />

          {pageItems.length === 0 ? (
            <div className='py-8 text-center text-sm text-neutral-500'>
              {NEWS_PANEL_COPY.noMatches}
            </div>
          ) : (
            <ul className='space-y-2'>
              {pageItems.map((item, idx) => (
                <NewsItemCard
                  key={`${item.url}-${start + idx}`}
                  item={item}
                />
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <NewsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrev={() => setPage(p => Math.max(1, p - 1))}
              onNext={() => setPage(p => Math.min(totalPages, p + 1))}
            />
          )}
        </>
      )}
    </div>
  );
};
