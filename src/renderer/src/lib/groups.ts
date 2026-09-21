import type { ProjectInfo, RepoSub, SidebarSort } from '../../../shared/types'

export interface SubGroup {
  /** 펼침 상태 키. 그룹 id 뒤에 종류·이름을 붙여 다른 그룹의 같은 이름과 겹치지 않는다 */
  id: string
  kind: RepoSub['kind']
  name: string
  /** 같은 자리를 가리키는 프로젝트. 보통 하나지만 세션 cwd 가 같은 워크트리를 가리키는 디렉터리가 여럿이면 다 모인다 */
  projects: ProjectInfo[]
  totalSessions: number
  lastActiveAt: number
}

export interface ProjectGroup {
  /**
   * 펼침 상태 키. 루트 프로젝트가 있으면 'repo:<경로>'(경로를 알 때)나 루트 프로젝트 id,
   * 루트가 없으면 'synthetic:' + (경로 ?? 루트 디렉터리명). 프로젝트 id 는 영숫자와 '-'뿐이라
   * 접두사가 붙은 키와 겹치지 않는다.
   */
  id: string
  name: string
  rootPath: string | null
  /** 저장소 루트에서 시작한 프로젝트. 보통 하나지만 세션 cwd 가 같은 곳을 가리키는 디렉터리가 여럿이면 다 모인다 */
  roots: ProjectInfo[]
  /** 워크트리·하위 폴더 항목 */
  subs: SubGroup[]
  /** 지금 토글 기준으로 보여줄 세션 수 */
  totalSessions: number
  lastActiveAt: number
}

// 루트 프로젝트가 없어 워크트리·하위 폴더만으로 만든 그룹의 id 접두사
const SYNTHETIC_PREFIX = 'synthetic:'

function syntheticName(rootPath: string | null, rootDirName: string | null): string {
  if (rootPath) return rootPath.split(/[\\/]/).filter(Boolean).pop() ?? rootPath
  const dirName = rootDirName ?? ''
  return dirName.split('-').filter(Boolean).pop() ?? dirName
}

interface Tally {
  totalSessions: number
  lastActiveAt: number
}

const byActivity = (a: { lastActiveAt: number }, b: { lastActiveAt: number }): number =>
  b.lastActiveAt - a.lastActiveAt

// 대소문자를 가리지 않고, 이름 속 숫자는 크기대로 비교한다(repo2 < repo10).
// 로케일은 시스템을 따른다. 그래서 한글과 라틴 문자 중 어느 쪽이 앞서는지는 환경마다 다르다
const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

type Order = (
  a: { name: string; lastActiveAt: number },
  b: { name: string; lastActiveAt: number }
) => number

// 경로가 달라도 이름은 같을 수 있다. 그때 순서가 입력 순서에 휘둘리지 않게 최근 순으로 가른다
const byName: Order = (a, b) => nameCollator.compare(a.name, b.name) || byActivity(a, b)

// 기준을 늘리면 여기서 컴파일 에러가 난다 — 새 기준이 조용히 다른 순서로 동작하지 않게 한다
const ORDERS: Record<SidebarSort, Order> = { recent: byActivity, name: byName }

export function buildGroups(
  projects: ProjectInfo[],
  showAgentSessions: boolean,
  sort: SidebarSort = 'recent'
): ProjectGroup[] {
  // 화면에 항목으로 보이는 그룹과 하위 항목만 기준을 따른다
  const byOrder = ORDERS[sort]

  // 표시할 세션 수는 토글에 따라 달라진다. 카운트 배지와 "빈 그룹 숨김" 판정이 같은 값을 써야
  // 숫자와 실제 목록이 어긋나지 않는다.
  const visibleCount = (project: ProjectInfo): number =>
    showAgentSessions ? project.sessionCount : project.userSessionCount

  const groups = new Map<string, ProjectGroup>()
  const byDirName = new Map<string, ProjectGroup>()
  const subsById = new Map<string, SubGroup>()

  const create = (id: string, name: string, rootPath: string | null): ProjectGroup => {
    const group: ProjectGroup = {
      id,
      name,
      rootPath,
      roots: [],
      subs: [],
      totalSessions: 0,
      lastActiveAt: 0
    }
    groups.set(id, group)
    return group
  }
  // 보여줄 세션이 없는 프로젝트는 활동 시각에도 끼지 않는다. 최근 활동이 전부 숨긴 세션인
  // 그룹이 보여줄 것도 없이 맨 위로 올라오면 안 된다.
  const tally = (target: Tally, project: ProjectInfo): void => {
    const count = visibleCount(project)
    if (count === 0) return
    target.totalSessions += count
    target.lastActiveAt = Math.max(target.lastActiveAt, project.lastActiveAt)
  }

  // 루트를 먼저 다 등록해야 워크트리·하위 폴더가 어느 순서로 오든 제자리를 찾는다
  for (const project of projects) {
    if (project.repo.sub) continue
    const rootPath = project.repo.rootPath
    const key = rootPath ? `repo:${rootPath}` : project.id
    const group = groups.get(key) ?? create(key, project.name, rootPath)
    group.roots.push(project)
    tally(group, project)
    byDirName.set(project.dirName, group)
  }

  for (const project of projects) {
    const repo = project.repo
    if (!repo.sub) continue
    if (visibleCount(project) === 0) continue
    const { rootPath, rootDirName, sub } = repo
    let group =
      (rootPath ? groups.get(`repo:${rootPath}`) : undefined) ??
      (rootDirName ? byDirName.get(rootDirName) : undefined)
    if (!group) {
      const key = SYNTHETIC_PREFIX + (rootPath ?? rootDirName ?? project.id)
      group = groups.get(key) ?? create(key, syntheticName(rootPath, rootDirName), rootPath)
    }
    const subId = `${group.id}|${sub.kind}:${sub.name}`
    let slot = subsById.get(subId)
    if (!slot) {
      slot = {
        id: subId,
        kind: sub.kind,
        name: sub.name,
        projects: [],
        totalSessions: 0,
        lastActiveAt: 0
      }
      subsById.set(subId, slot)
      group.subs.push(slot)
    }
    slot.projects.push(project)
    tally(slot, project)
    tally(group, project)
  }

  // 보여줄 세션이 하나도 없는 그룹은 내보내지 않는다. 상태에서 지우지 않고 여기서 거르므로
  // 토글을 다시 켜면 그대로 돌아온다.
  const list = [...groups.values()].filter((group) => group.totalSessions > 0)
  // roots 와 slot.projects 는 세션을 합치는 재료일 뿐 항목으로 보이지 않으므로 늘 최근 순이다
  for (const group of list) {
    group.roots.sort(byActivity)
    group.subs.sort(byOrder)
    for (const slot of group.subs) slot.projects.sort(byActivity)
  }
  return list.sort(byOrder)
}
