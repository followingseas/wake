import type { ReactElement, RefObject } from 'react'
import type { SearchHit, SearchProgress, SearchResults } from '../../../shared/types'
import { formatRelativeTime } from '../lib/format'
import { usePrefs } from '../prefs'
import { SidebarExpand } from './SidebarExpand'

interface Props {
  query: string
  results: SearchResults | null
  progress: SearchProgress | null
  inputRef: RefObject<HTMLInputElement | null>
  /** projectId를 사이드바에 보이는 이름으로 옮긴다 */
  projectLabel: (projectId: string) => string
  onQueryChange: (query: string) => void
  onOpenHit: (hit: SearchHit, ref: string) => void
  onClose: () => void
  onExpandSidebar: (() => void) | null
}

export function SearchView({
  query,
  results,
  progress,
  inputRef,
  projectLabel,
  onQueryChange,
  onOpenHit,
  onClose,
  onExpandSidebar
}: Props): ReactElement {
  const { t } = usePrefs()
  const trimmed = query.trim()
  const indexing = progress ? !progress.ready : false

  let status = ''
  if (indexing) {
    status =
      progress && progress.total > 0
        ? t('search.indexing', { done: progress.done, total: progress.total })
        : t('search.indexingPrep')
  } else if (!trimmed) {
    status = t('search.hint')
  } else if (results && results.hits.length === 0) {
    status = t('search.empty', { query: trimmed })
  } else if (results) {
    const matches = results.hits.reduce((sum, hit) => sum + hit.matchCount, 0)
    status = t('search.summary', { sessions: results.hits.length, matches })
  }

  return (
    <main className="conversation search-view">
      <header className="search-view__header">
        {onExpandSidebar && <SidebarExpand onClick={onExpandSidebar} />}
        <input
          ref={inputRef}
          type="search"
          className="search-view__input"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          spellCheck={false}
          autoFocus
        />
        <button className="btn" onClick={onClose}>
          {t('search.close')}
        </button>
      </header>
      <p className="search-view__status">{status}</p>
      <div className="search-view__results">
        {results?.hits.map((hit) => (
          <section key={hit.filePath} className="search-hit">
            <button
              className="search-hit__head"
              onClick={() => onOpenHit(hit, hit.snippets[0]?.ref ?? '')}
            >
              <span className="search-hit__title">{hit.title}</span>
              <span className="search-hit__meta">
                {projectLabel(hit.projectId)} · {formatRelativeTime(hit.updatedAt, t)} ·{' '}
                {t('search.matches', { n: hit.matchCount })}
              </span>
            </button>
            <ul className="search-hit__snippets">
              {hit.snippets.map((snippet, index) => (
                <li key={`${snippet.ref}-${index}`}>
                  <button className="snippet" onClick={() => onOpenHit(hit, snippet.ref)}>
                    <span className="snippet__role">
                      {snippet.role === 'user' ? t('search.role.user') : t('search.role.assistant')}
                    </span>
                    <span className="snippet__text">
                      {snippet.before}
                      <mark>{snippet.match}</mark>
                      {snippet.after}
                    </span>
                  </button>
                </li>
              ))}
              {hit.matchCount > hit.snippets.length && (
                <li className="search-hit__more">
                  {t('search.more', { n: hit.matchCount - hit.snippets.length })}
                </li>
              )}
            </ul>
          </section>
        ))}
        {results?.truncated && (
          <p className="search-view__truncated">
            {t('search.truncated', { n: results.hits.length })}
          </p>
        )}
      </div>
    </main>
  )
}
