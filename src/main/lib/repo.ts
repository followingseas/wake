import { readdir, readFile, realpath, stat } from 'fs/promises'
import { homedir } from 'os'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'path'
import type { RepoInfo, RepoSub } from '../../shared/types'

// 도구가 만든 워크트리는 <repo>/.<도구>/worktrees/… 아래에 놓인다.
// 도구명을 하드코딩하지 않고 패턴으로 잡아 새 도구도 그대로 지원한다.
// 구분자로 '\'도 받는 것은 Windows 에서 기록된 cwd 때문이다.
const PATH_MARKER = /[\\/]\.[^\\/]+[\\/]worktrees[\\/]/
// 프로젝트 디렉터리명은 경로의 영숫자 아닌 글자가 전부 '-'로 바뀐 것이라 '/.orca/worktrees/'가
// '--orca-worktrees-'로 나타난다. 도구명에도 하이픈이 들어갈 수 있어(.my-tool) 최소 매치로
// 잡는다 — 구분자와 도구명 속 하이픈이 같은 문자라 경계를 길이로는 가를 수 없다.
const DIR_MARKER = /--.+?-worktrees-/
// 워크트리의 .git 파일은 메인 저장소의 .git/worktrees/<이름> 을 가리킨다.
// bare 저장소면 <이름>.git/worktrees/<이름> 이라 '.git' 으로 끝나는 세그먼트를 다 받는다.
const WORKTREE_GITDIR = /^(.+\.git)[\\/]worktrees[\\/][^\\/]+[\\/]?$/

interface Located {
  rootPath: string
  sub: RepoSub | null
}

/** 링크를 푼 경로와, 그중 실제로 남아 있는 가장 깊은 상위 폴더·지워진 나머지 세그먼트 */
interface Anchored {
  path: string
  existing: string
  missing: string[]
}

type GitEntry = { kind: 'root' } | { kind: 'link'; gitdir: string }

function segments(path: string): string[] {
  return path.split(sep).filter(Boolean)
}

function isDotDir(segment: string): boolean {
  return segment.length > 1 && segment.startsWith('.') && segment !== '..'
}

// 지워진 워크트리·폴더는 흔하고 정상이라 ENOENT 는 조용히 넘긴다. 그 밖의 실패(권한 등)는
// 저장소 경계를 잘못 잡게 하므로 남긴다.
function ignoreMissing(what: string, path: string): (error: NodeJS.ErrnoException) => null {
  return (error) => {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
      console.error(`[repo] ${what} 실패`, path, error)
    }
    return null
  }
}

/**
 * 심볼릭 링크를 푼다. 지워진 경로는 남아 있는 상위 폴더까지만 풀고 나머지는 그대로 붙인다.
 * 같은 저장소를 링크 경로와 실제 경로로 따로 만나도 한 문자열이 되게 하려는 것이다.
 */
async function anchor(path: string): Promise<Anchored> {
  const missing: string[] = []
  let existing = path
  for (;;) {
    const resolved = await realpath(existing).catch(ignoreMissing('realpath', existing))
    if (resolved) {
      return {
        path: missing.length ? join(resolved, ...missing) : resolved,
        existing: resolved,
        missing
      }
    }
    const parent = dirname(existing)
    if (parent === existing) return { path, existing: path, missing: [] }
    missing.unshift(basename(existing))
    existing = parent
  }
}

/**
 * 루트 기준 상대 경로가 도구 워크트리 자리(.<도구>/worktrees/…)면 워크트리 이름을 돌려준다.
 * .claude 는 이름 한 단계(<이름>), .orca 는 repo명을 한 번 더 낀 두 단계(<repo명>/<이름>)를 쓴다.
 */
function toolWorktreeName(rootPath: string, rel: string[]): string | null {
  if (rel.length < 3 || !isDotDir(rel[0]) || rel[1] !== 'worktrees') return null
  const rest = rel.slice(2)
  // 첫 세그먼트가 부모 repo명이면 중복이라 벗긴다 (.orca 형태)
  if (rest.length > 1 && rest[0] === basename(rootPath)) rest.shift()
  return rest.join('/')
}

/** 루트 안의 상대 경로를 워크트리·하위 폴더·루트 자신 중 하나로 가른다 */
function classify(rootPath: string, inside: string[]): RepoSub | null {
  const worktree = toolWorktreeName(rootPath, inside)
  if (worktree) return { kind: 'worktree', name: worktree }
  if (inside.length === 0) return null
  return { kind: 'subdir', name: inside.join('/') }
}

async function hasGitDir(dir: string): Promise<boolean> {
  const path = join(dir, '.git')
  const info = await stat(path).catch(ignoreMissing('stat', path))
  return info?.isDirectory() ?? false
}

async function readGitEntry(dir: string): Promise<GitEntry | null> {
  const path = join(dir, '.git')
  const info = await stat(path).catch(ignoreMissing('stat', path))
  if (!info) return null
  if (info.isDirectory()) return { kind: 'root' }
  const text = await readFile(path, 'utf8').catch(ignoreMissing('read', path))
  const match = text === null ? null : /^gitdir:\s*(.+)$/m.exec(text)
  if (!match) {
    // .git 이 있는데 읽지 못하면 내용은 몰라도 경계는 여기다. 지나쳐 올라가면 엉뚱한 상위 저장소에 붙는다
    if (text !== null) console.error('[repo] .git 파일을 해석할 수 없다', path)
    return { kind: 'root' }
  }
  return { kind: 'link', gitdir: resolve(dir, match[1].trim()) }
}

/** 홈 디렉터리 자신이나 그 위(/, /Users …)에 있는 .git 은 저장소 경계로 보지 않는다 */
function isAtOrAboveHome(dir: string): boolean {
  const rel = relative(dir, homedir())
  return !rel.startsWith('..') && !isAbsolute(rel)
}

// 경로에서 위로 올라가며 가장 가까운 .git 을 찾는다. 지워진 경로는 stat 이 실패해 그냥 지나친다.
// 홈을 통째로 저장소로 둔(dotfiles) 사용자의 모든 폴더가 한 그룹으로 빨려 들어가면 안 되므로
// 홈과 그 위는 보지 않는다.
async function findGitEntry(path: string): Promise<{ dir: string; entry: GitEntry } | null> {
  let dir = path
  for (;;) {
    if (isAtOrAboveHome(dir)) return null
    const entry = await readGitEntry(dir)
    if (entry) return { dir, entry }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * 지워진 경로가 저장소 안의 폴더였는지, 저장소들을 모아 둔 워크스페이스 안의 별개 저장소였는지는
 * 파일시스템만으로 가를 수 없다. 남아 있는 상위 폴더 안에서 지워진 항목의 형제 중 하나라도
 * .git 디렉터리를 가진 저장소면 워크스페이스로 보고, 지워진 첫 세그먼트를 별개 저장소의 루트로
 * 삼는다. 서브모듈·워크트리의 .git 은 파일이라 근거로 치지 않는다. 살아 있는 경로는 null.
 */
async function presumedSiblingRepo({ existing, missing }: Anchored): Promise<string | null> {
  if (missing.length === 0) return null
  const siblings =
    (await readdir(existing, { withFileTypes: true }).catch(ignoreMissing('readdir', existing))) ??
    []
  for (const sibling of siblings) {
    if (!sibling.isDirectory() || sibling.name.startsWith('.')) continue
    if (await hasGitDir(join(existing, sibling.name))) return join(existing, missing[0])
  }
  return null
}

/**
 * 파일시스템의 .git 으로 실제 저장소 경계를 가른다. 워크트리의 .git 파일은 메인 저장소를
 * 가리키므로 도구가 어디에 워크트리를 만들었든 메인으로 묶이고, 저장소 안 하위 폴더에서
 * 시작한 세션도 같은 저장소로 묶인다. 저장소 안에 만든 워크트리는 지워져도 남아 있는
 * 상위 저장소에서 잡힌다.
 */
async function locateByGit(anchored: Anchored): Promise<Located | null> {
  const { path } = anchored
  const found = await findGitEntry(path)
  if (!found) return null
  const { dir, entry } = found
  const inside = segments(relative(dir, path))
  if (entry.kind === 'link') {
    const match = WORKTREE_GITDIR.exec(entry.gitdir)
    if (match) {
      const rootPath = (await anchor(match[1].replace(/[\\/]\.git$/, ''))).path
      const name = toolWorktreeName(rootPath, segments(relative(rootPath, dir))) ?? basename(dir)
      return { rootPath, sub: { kind: 'worktree', name: [name, ...inside].join('/') } }
    }
    // worktrees 를 가리키지 않는 .git 파일(서브모듈 등)은 그 자체가 저장소다
  }
  const sub = classify(dir, inside)
  // 도구 워크트리 자리는 이름만으로 확실하다. 그 밖의 지워진 경로만 워크스페이스인지 따져 본다
  if (sub?.kind === 'subdir') {
    const sibling = await presumedSiblingRepo(anchored)
    if (sibling)
      return { rootPath: sibling, sub: classify(sibling, segments(relative(sibling, path))) }
  }
  return { rootPath: dir, sub }
}

/** 저장소가 통째로 지워져 .git 이 없으면 경로 문자열의 워크트리 패턴만으로 가른다 */
function locateByPattern(path: string): Located | null {
  const match = PATH_MARKER.exec(path)
  if (!match) return null
  const rootPath = path.slice(0, match.index)
  const name = toolWorktreeName(rootPath, segments(path.slice(match.index)))
  return name ? { rootPath, sub: { kind: 'worktree', name } } : null
}

/**
 * 프로젝트가 속한 git 저장소를 찾는다.
 *
 * realPath(cwd)가 있으면 파일시스템을 보고, 없을 때만 디렉터리명으로 폴백한다. 디렉터리명은
 * '/'와 '-'가 뭉개져 있어 repo명 경계를 알 수 없으므로, 폴백에서는 추측해서 벗기지 않고
 * 마커 뒤 전체를 이름으로 쓴다.
 */
export async function detectRepo(dirName: string, realPath: string | null): Promise<RepoInfo> {
  const dirMatch = DIR_MARKER.exec(dirName)
  const markedRootDirName = dirMatch ? dirName.slice(0, dirMatch.index) || null : null

  if (realPath) {
    const anchored = await anchor(realPath)
    const located = (await locateByGit(anchored)) ?? locateByPattern(anchored.path)
    if (!located) return { rootPath: anchored.path, sub: null }
    if (!located.sub) return { rootPath: located.rootPath, sub: null }
    return { rootPath: located.rootPath, rootDirName: markedRootDirName, sub: located.sub }
  }

  const name = dirMatch ? dirName.slice(dirMatch.index + dirMatch[0].length) : ''
  if (name)
    return { rootPath: null, rootDirName: markedRootDirName, sub: { kind: 'worktree', name } }
  return { rootPath: null, sub: null }
}
