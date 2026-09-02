import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectRepo } from './repo'

let base: string
let main: string

function dir(...parts: string[]): string {
  const path = join(base, ...parts)
  mkdirSync(path, { recursive: true })
  return path
}

/** 메인 저장소의 워크트리를 만든다. .git 파일이 메인의 .git/worktrees/<이름> 을 가리킨다 */
function worktree(name: string, ...parts: string[]): string {
  const path = dir(...parts)
  mkdirSync(join(main, '.git', 'worktrees', name), { recursive: true })
  writeFileSync(join(path, '.git'), `gitdir: ${join(main, '.git', 'worktrees', name)}\n`)
  return path
}

const savedHome = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE }

beforeEach(() => {
  // macOS 의 tmpdir 은 심볼릭 링크라, 판정 결과(링크를 푼 경로)와 비교하려면 여기서도 풀어 둔다
  base = realpathSync(mkdtempSync(join(tmpdir(), 'wake-repo-')))
  main = dir('main')
  mkdirSync(join(main, '.git'))
  // 개발 머신의 홈 디렉터리(예: dotfiles 저장소)가 판정에 끼어들지 않게 홈을 임시 폴더로 옮긴다
  process.env.HOME = dir('home')
  process.env.USERPROFILE = process.env.HOME
})

afterEach(() => {
  // undefined 를 대입하면 문자열 'undefined' 가 들어가므로, 없던 키는 지워서 되돌린다
  for (const [key, value] of Object.entries(savedHome)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  rmSync(base, { recursive: true, force: true })
})

describe('detectRepo', () => {
  it('저장소 루트는 자기 경로를 rootPath 로 갖고 sub 가 없다', async () => {
    expect(await detectRepo('-main', main)).toEqual({ rootPath: main, sub: null })
  })

  it('.orca 워크트리는 .git 파일이 가리키는 메인 저장소로 묶인다', async () => {
    const wt = worktree('sander', 'main', '.orca', 'worktrees', 'main', 'sander')

    expect(await detectRepo('-main--orca-worktrees-main-sander', wt)).toEqual({
      rootPath: main,
      rootDirName: '-main',
      sub: { kind: 'worktree', name: 'sander' }
    })
  })

  it('저장소 하위 폴더는 subdir 로 묶인다', async () => {
    const docs = dir('main', 'docs')

    expect(await detectRepo('-main-docs', docs)).toEqual({
      rootPath: main,
      rootDirName: null,
      sub: { kind: 'subdir', name: 'docs' }
    })
  })

  it('.claude 워크트리는 이름 한 단계를 그대로 쓴다', async () => {
    const wt = worktree('mossy-flask', 'main', '.claude', 'worktrees', 'mossy-flask')

    expect((await detectRepo('-main--claude-worktrees-mossy-flask', wt)).sub).toEqual({
      kind: 'worktree',
      name: 'mossy-flask'
    })
  })

  it('저장소 밖에 만든 워크트리는 폴더명을 이름으로 쓴다', async () => {
    const wt = worktree('feature-x', 'elsewhere', 'feature-x')

    expect(await detectRepo('-elsewhere-feature-x', wt)).toEqual({
      rootPath: main,
      rootDirName: null,
      sub: { kind: 'worktree', name: 'feature-x' }
    })
  })

  it('워크트리 안의 하위 폴더는 워크트리명 뒤에 상대 경로를 붙인다', async () => {
    worktree('sander', 'main', '.orca', 'worktrees', 'main', 'sander')
    const src = dir('main', '.orca', 'worktrees', 'main', 'sander', 'src')

    expect((await detectRepo('-main--orca-worktrees-main-sander-src', src)).sub).toEqual({
      kind: 'worktree',
      name: 'sander/src'
    })
  })

  it('.git 파일의 gitdir 가 상대 경로여도 메인 저장소를 찾는다', async () => {
    const wt = dir('main', '.claude', 'worktrees', 'rel')
    mkdirSync(join(main, '.git', 'worktrees', 'rel'), { recursive: true })
    writeFileSync(join(wt, '.git'), 'gitdir: ../../../.git/worktrees/rel\n')

    expect(await detectRepo('-main--claude-worktrees-rel', wt)).toEqual({
      rootPath: main,
      rootDirName: '-main',
      sub: { kind: 'worktree', name: 'rel' }
    })
  })

  it('서브모듈처럼 worktrees 를 가리키지 않는 .git 파일은 독립 저장소로 본다', async () => {
    const sub = dir('main', 'vendor', 'lib')
    writeFileSync(join(sub, '.git'), 'gitdir: ../../.git/modules/vendor/lib\n')

    expect(await detectRepo('-main-vendor-lib', sub)).toEqual({ rootPath: sub, sub: null })
  })

  it('지워진 워크트리는 남은 상위 저장소와 경로 패턴으로 묶는다', async () => {
    const gone = join(main, '.orca', 'worktrees', 'main', 'gone')

    expect(await detectRepo('-main--orca-worktrees-main-gone', gone)).toEqual({
      rootPath: main,
      rootDirName: '-main',
      sub: { kind: 'worktree', name: 'gone' }
    })
  })

  it('지워진 하위 폴더도 남은 상위 저장소의 subdir 로 묶는다', async () => {
    const gone = join(main, 'packages', 'gone')

    expect((await detectRepo('-main-packages-gone', gone)).sub).toEqual({
      kind: 'subdir',
      name: 'packages/gone'
    })
  })

  it('지워진 도구 워크트리는 형제 워크트리가 살아 있어도 같은 저장소의 워크트리다', async () => {
    worktree('alive', 'main', '.orca', 'worktrees', 'main', 'alive')
    const gone = join(main, '.orca', 'worktrees', 'main', 'gone')

    expect((await detectRepo('-main--orca-worktrees-main-gone', gone)).sub).toEqual({
      kind: 'worktree',
      name: 'gone'
    })
  })

  it('지워진 경로의 형제가 git 저장소면 워크스페이스로 보고 별개 저장소로 둔다', async () => {
    // main 이 저장소들을 모아 둔 워크스페이스: repositories/alive 는 살아 있는 별개 저장소
    mkdirSync(join(dir('main', 'repositories', 'alive'), '.git'))
    const gone = join(main, 'repositories', 'gone')

    expect(await detectRepo('-main-repositories-gone', gone)).toEqual({ rootPath: gone, sub: null })
  })

  it('지워진 형제 저장소의 하위 폴더는 그 저장소의 subdir 로 본다', async () => {
    mkdirSync(join(dir('main', 'repositories', 'alive'), '.git'))
    const goneSrc = join(main, 'repositories', 'gone', 'src')

    expect(await detectRepo('-main-repositories-gone-src', goneSrc)).toEqual({
      rootPath: join(main, 'repositories', 'gone'),
      rootDirName: null,
      sub: { kind: 'subdir', name: 'src' }
    })
  })

  it('서브모듈이 있는 저장소의 지워진 하위 폴더는 여전히 subdir 다', async () => {
    // 서브모듈의 .git 은 파일이라 워크스페이스의 근거가 되지 않는다
    writeFileSync(
      join(dir('main', 'vendor', 'lib'), '.git'),
      'gitdir: ../../.git/modules/vendor/lib\n'
    )
    const gone = join(main, 'vendor', 'gone')

    expect((await detectRepo('-main-vendor-gone', gone)).sub).toEqual({
      kind: 'subdir',
      name: 'vendor/gone'
    })
  })

  it('홈 디렉터리나 그 위의 .git 은 저장소 경계로 보지 않는다', async () => {
    // 홈을 통째로 저장소로 둔(dotfiles) 사용자의 모든 폴더가 한 그룹으로 빨려 들어가면 안 된다
    const home = process.env.HOME as string
    mkdirSync(join(home, '.git'))
    const notes = dir('home', 'Documents', 'notes')

    expect(await detectRepo('-home-Documents-notes', notes)).toEqual({ rootPath: notes, sub: null })
  })

  it('홈 아래의 저장소는 그대로 저장소다', async () => {
    const home = process.env.HOME as string
    mkdirSync(join(home, '.git'))
    const repo = dir('home', 'Dev', 'repo')
    mkdirSync(join(repo, '.git'))
    const src = dir('home', 'Dev', 'repo', 'src')

    expect(await detectRepo('-home-Dev-repo-src', src)).toEqual({
      rootPath: repo,
      rootDirName: null,
      sub: { kind: 'subdir', name: 'src' }
    })
  })

  it('읽을 수 없는 .git 파일도 저장소 경계라 상위로 올라가지 않는다', async () => {
    const broken = dir('main', 'broken')
    writeFileSync(join(broken, '.git'), 'garbage\n')

    expect(await detectRepo('-main-broken', broken)).toEqual({ rootPath: broken, sub: null })
  })

  it('bare 저장소의 워크트리도 메인으로 묶인다', async () => {
    const bare = dir('bare.git')
    mkdirSync(join(bare, 'worktrees', 'feature'), { recursive: true })
    const wt = dir('checkouts', 'feature')
    writeFileSync(join(wt, '.git'), `gitdir: ${join(bare, 'worktrees', 'feature')}\n`)

    expect(await detectRepo('-checkouts-feature', wt)).toEqual({
      rootPath: bare,
      rootDirName: null,
      sub: { kind: 'worktree', name: 'feature' }
    })
  })

  it('심볼릭 링크로 들어온 경로도 링크를 푼 저장소 경로로 묶인다', async () => {
    // 루트 세션은 링크 경로, 워크트리의 .git 파일은 git 이 쓴 실제 경로를 가져 문자열이 갈린다
    symlinkSync(main, join(base, 'linked'))
    const viaLink = join(base, 'linked')
    const wt = worktree('sander', 'main', '.orca', 'worktrees', 'main', 'sander')

    expect(await detectRepo('-linked', viaLink)).toEqual({ rootPath: main, sub: null })
    expect(
      (
        await detectRepo(
          '-linked--orca-worktrees-main-sander',
          join(viaLink, '.orca', 'worktrees', 'main', 'sander')
        )
      ).rootPath
    ).toBe(main)
    expect((await detectRepo('-main--orca-worktrees-main-sander', wt)).rootPath).toBe(main)
  })

  it('점 디렉터리 밑이 아닌 worktrees 는 워크트리가 아니라 하위 폴더다', async () => {
    const plain = dir('main', 'worktrees', 'a')

    expect((await detectRepo('-main-worktrees-a', plain)).sub).toEqual({
      kind: 'subdir',
      name: 'worktrees/a'
    })
  })

  it('중간 세그먼트가 저장소명과 다르면 벗기지 않는다', async () => {
    const gone = join(main, '.orca', 'worktrees', 'other', 'thing')

    expect((await detectRepo('-main--orca-worktrees-other-thing', gone)).sub).toEqual({
      kind: 'worktree',
      name: 'other/thing'
    })
  })

  it('저장소가 통째로 지워졌으면 경로 패턴만으로 워크트리를 가른다', async () => {
    const gone = join(base, 'removed', '.orca', 'worktrees', 'removed', 'wt')

    expect(await detectRepo('-removed--orca-worktrees-removed-wt', gone)).toEqual({
      rootPath: join(base, 'removed'),
      rootDirName: '-removed',
      sub: { kind: 'worktree', name: 'wt' }
    })
  })

  it('git 저장소도 워크트리 패턴도 없으면 독립 프로젝트다', async () => {
    const plain = dir('notes')

    expect(await detectRepo('-notes', plain)).toEqual({ rootPath: plain, sub: null })
  })

  it('realPath 가 없으면 디렉터리명 마커로 워크트리를 가른다', async () => {
    expect(await detectRepo('-Users-me-Dev-wake--claude-worktrees-mossy-flask', null)).toEqual({
      rootPath: null,
      rootDirName: '-Users-me-Dev-wake',
      sub: { kind: 'worktree', name: 'mossy-flask' }
    })
  })

  it('도구명에 하이픈이 있어도 디렉터리명 폴백에서 감지한다', async () => {
    // 구분자와 도구명 속 하이픈이 같은 문자라, 마커를 최소 매치로 잡아야 경계가 맞는다
    expect((await detectRepo('-Users-me-Dev-wake--my-tool-worktrees-branch-a', null)).sub).toEqual({
      kind: 'worktree',
      name: 'branch-a'
    })
  })

  it('디렉터리명 폴백에서는 repo명을 추측해 벗기지 않는다', async () => {
    // 하이픈 인코딩이라 경계를 알 수 없다. 잘못 벗기면 이름이 깨진다.
    const found = await detectRepo('-Users-me-Dev-wake--orca-worktrees-wake-sargassum', null)

    expect(found.sub?.name).toBe('wake-sargassum')
  })

  it('realPath 도 마커도 없으면 경로를 모르는 독립 프로젝트다', async () => {
    expect(await detectRepo('-Users-me-Dev-wake', null)).toEqual({ rootPath: null, sub: null })
  })
})
