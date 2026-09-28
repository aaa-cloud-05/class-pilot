/**
 * プロフィールのアイコン（猫のいるアバター8種）。画像は public/avatars/cat-{id}.webp。
 * 0 の灰色は未ログインのとき専用の見た目で、ログインするとほかの色からランダムに1つ決まる。
 * 選んだものはこの端末の localStorage にだけ保存する（端末をまたいでは揃わない）。
 */

export const AVATARS = [
  { id: 0, label: "灰色と黒猫" },
  { id: 1, label: "青と白猫" },
  { id: 2, label: "オレンジと三毛猫" },
  { id: 3, label: "緑と黒猫" },
  { id: 4, label: "赤と茶トラ" },
  { id: 5, label: "紫とシャム猫" },
  { id: 6, label: "黄色とサバ白" },
  { id: 7, label: "水色と白猫" },
] as const

/** 未ログインのときのアイコン（灰色） */
export const GUEST_AVATAR = 0

const KEY = "unionfetch:avatar"

export function avatarSrc(id: number): string {
  return `/avatars/cat-${id}.webp`
}

/** 保存済みのアイコン。まだ決まっていなければ null */
export function readAvatar(): number | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw == null) return null
    const id = Number(raw)
    return Number.isInteger(id) && id >= 0 && id < AVATARS.length ? id : null
  } catch {
    return null
  }
}

export function saveAvatar(id: number): void {
  try {
    window.localStorage.setItem(KEY, String(id))
  } catch {
    // 保存できなくても、この画面を開いている間は選んだものを出す
  }
}

/** 初回ログインのときに使う。灰色（未ログインの見た目）は選ばない */
export function randomAvatar(): number {
  return 1 + Math.floor(Math.random() * (AVATARS.length - 1))
}
