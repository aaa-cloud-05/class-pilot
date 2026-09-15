"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import {
  buildAssignments,
  buildNotifications,
  SEED_COURSES,
  type MockAssignment,
  type MockCourse,
  type MockNotification,
  type Source,
  type Status,
} from "../_lib/data"

export type Accent = "blue" | "mono"
export type Mode = "system" | "light" | "dark"
export type JpFont = "system" | "noto" | "line" | "plex"
export type LatinFont = "jakarta" | "jp"
export type NavStyle = "floating" | "bar"
export type DataState = "normal" | "empty" | "loading" | "error" | "reauth"
export type Preset = "relaxed" | "standard" | "urgent"

export interface Controls {
  accent: Accent
  mode: Mode
  jp: JpFont
  latin: LatinFont
  nav: NavStyle
  data: DataState
  loggedIn: boolean
  setupDone: boolean
}

const DEFAULT_CONTROLS: Controls = {
  accent: "blue",
  mode: "system",
  jp: "noto",
  latin: "jakarta",
  nav: "floating",
  data: "normal",
  loggedIn: true,
  setupDone: false,
}

const STORAGE_KEY = "uf-mock-controls"

export interface NotifSettings {
  enabled: boolean
  email: boolean
  push: boolean
  preset: Preset
  permission: "granted" | "default" | "denied"
}

export interface ToastState {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface MockContextValue {
  now: Date
  controls: Controls
  setControl: <K extends keyof Controls>(key: K, value: Controls[K]) => void
  resolvedMode: "light" | "dark"

  courses: MockCourse[]
  assignments: MockAssignment[]
  notifications: MockNotification[]
  notif: NotifSettings
  webclassUrl: string
  tokenIssued: boolean
  syncedAt: { classroom: Date | null; webclass: Date | null }
  syncing: boolean
  setupDismissed: boolean

  courseById: (id: string) => MockCourse | undefined
  setStatus: (id: string, status: Status) => void
  toggleSubmitted: (id: string) => void
  updateAssignment: (id: string, patch: Partial<Pick<MockAssignment, "title" | "due" | "status">>) => void
  deleteAssignment: (id: string) => void
  toggleAssignmentMute: (id: string) => void
  addAssignment: (input: { title: string; courseName: string; due: Date | null; status: Status }) => void
  setCourse: (id: string, patch: Partial<Pick<MockCourse, "hidden" | "muted">>) => void
  updateNotif: (patch: Partial<NotifSettings>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  setWebclassUrl: (url: string) => void
  issueToken: () => string
  refresh: () => void
  dismissSetup: () => void

  addOpen: boolean
  setAddOpen: (open: boolean) => void
  syncOpen: boolean
  setSyncOpen: (open: boolean) => void

  toast: ToastState | null
  showToast: (message: string, action?: { label: string; onClick: () => void }) => void
  hideToast: () => void
}

const MockContext = createContext<MockContextValue | null>(null)

export function useMock(): MockContextValue {
  const ctx = useContext(MockContext)
  if (!ctx) throw new Error("useMock must be used inside <MockProvider>")
  return ctx
}

const noopSubscribe = () => () => {}

/** クライアントでマウント済みか（SSR では false）。日時やlocalStorageに依存する描画のゲートに使う */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const DESKTOP_QUERY = "(min-width: 1024px)"

function readControls(): Controls {
  if (typeof window === "undefined") return DEFAULT_CONTROLS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_CONTROLS, ...(JSON.parse(raw) as Partial<Controls>) } : DEFAULT_CONTROLS
  } catch {
    return DEFAULT_CONTROLS
  }
}

export function MockProvider({ fontClassName, children }: { fontClassName: string; children: React.ReactNode }) {
  const mounted = useMounted()
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)")
  const rootRef = useRef<HTMLDivElement>(null)

  const [now, setNow] = useState(() => new Date())
  const [controls, setControls] = useState<Controls>(readControls)
  const [courses, setCourses] = useState<MockCourse[]>(SEED_COURSES)
  const [assignments, setAssignments] = useState<MockAssignment[]>(() => buildAssignments(new Date(), SEED_COURSES))
  const [notifications, setNotifications] = useState<MockNotification[]>(() => buildNotifications(new Date()))
  const [notif, setNotif] = useState<NotifSettings>({
    enabled: true,
    email: true,
    push: false,
    preset: "standard",
    permission: "granted",
  })
  const [webclassUrl, setWebclassUrlState] = useState("https://webclass.example.ac.jp/webclass/")
  const [tokenIssued, setTokenIssued] = useState(false)
  const [syncedAt, setSyncedAt] = useState<{ classroom: Date | null; webclass: Date | null }>(() => ({
    classroom: new Date(Date.now() - 3 * 60_000),
    webclass: new Date(Date.now() - 26 * 3600_000),
  }))
  const [syncing, setSyncing] = useState(false)
  const [setupDismissed, setSetupDismissed] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 「いま」を1分ごとに進める（残り時間の表示を実際の時間に合わせる）
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const resolvedMode: "light" | "dark" = controls.mode === "system" ? (prefersDark ? "dark" : "light") : controls.mode

  // ページ外側（オーバースクロール時に見える部分）の色をモックの地色に合わせる
  useEffect(() => {
    if (!mounted || !rootRef.current) return
    const html = document.documentElement
    const prev = { bg: html.style.backgroundColor, scheme: html.style.colorScheme, bodyBg: document.body.style.backgroundColor }
    const bg = getComputedStyle(rootRef.current).backgroundColor
    html.style.backgroundColor = bg
    html.style.colorScheme = resolvedMode
    document.body.style.backgroundColor = bg
    return () => {
      html.style.backgroundColor = prev.bg
      html.style.colorScheme = prev.scheme
      document.body.style.backgroundColor = prev.bodyBg
    }
  }, [mounted, resolvedMode, controls.accent])

  const setControl = useCallback(<K extends keyof Controls>(key: K, value: Controls[K]) => {
    setControls((prev) => {
      const next = { ...prev, [key]: value }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // 保存できなくても表示は切り替える
      }
      return next
    })
  }, [])

  const hideToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(null)
  }, [])

  const showToast = useCallback((message: string, action?: { label: string; onClick: () => void }) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message, actionLabel: action?.label, onAction: action?.onClick })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const courseById = useCallback((id: string) => courses.find((c) => c.id === id), [courses])

  const patchAssignment = useCallback((id: string, patch: Partial<MockAssignment>) => {
    setAssignments((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }, [])

  const setStatus = useCallback((id: string, status: Status) => patchAssignment(id, { status }), [patchAssignment])

  const toggleSubmitted = useCallback(
    (id: string) => {
      const current = assignments.find((a) => a.id === id)
      if (!current) return
      const next: Status = current.status === "submitted" ? "not_submitted" : "submitted"
      patchAssignment(id, { status: next })
      showToast(next === "submitted" ? "提出済みにしました" : "未提出に戻しました", {
        label: "元に戻す",
        onClick: () => patchAssignment(id, { status: current.status }),
      })
    },
    [assignments, patchAssignment, showToast],
  )

  const updateAssignment = useCallback(
    (id: string, patch: Partial<Pick<MockAssignment, "title" | "due" | "status">>) => patchAssignment(id, patch),
    [patchAssignment],
  )

  const deleteAssignment = useCallback(
    (id: string) => {
      const removed = assignments.find((a) => a.id === id)
      setAssignments((list) => list.filter((a) => a.id !== id))
      if (removed) {
        showToast("課題を削除しました", {
          label: "元に戻す",
          onClick: () => setAssignments((list) => [...list, removed]),
        })
      }
    },
    [assignments, showToast],
  )

  const toggleAssignmentMute = useCallback(
    (id: string) => {
      const current = assignments.find((a) => a.id === id)
      if (!current) return
      patchAssignment(id, { muted: !current.muted })
      showToast(current.muted ? "この課題の通知をオンにしました" : "この課題の通知をオフにしました")
    },
    [assignments, patchAssignment, showToast],
  )

  const addAssignment = useCallback(
    (input: { title: string; courseName: string; due: Date | null; status: Status }) => {
      let course = courses.find((c) => c.name === input.courseName)
      if (!course) {
        course = {
          id: `c-${Date.now()}`,
          name: input.courseName,
          color: "#636a77",
          source: "manual" as Source,
          hidden: false,
          muted: false,
        }
        const created = course
        setCourses((list) => [...list, created])
      }
      const courseId = course.id
      setAssignments((list) => [
        ...list,
        {
          id: `new-${Date.now()}`,
          courseId,
          title: input.title,
          due: input.due,
          status: input.status,
          source: "manual",
          muted: false,
          link: null,
        },
      ])
      showToast("課題を追加しました")
    },
    [courses, showToast],
  )

  const setCourse = useCallback((id: string, patch: Partial<Pick<MockCourse, "hidden" | "muted">>) => {
    setCourses((list) =>
      list.map((c) => {
        if (c.id !== id) return c
        const next = { ...c, ...patch }
        // 非表示にしたコースは通知も止める（本番と同じ挙動）
        if (patch.hidden) next.muted = true
        return next
      }),
    )
  }, [])

  const updateNotif = useCallback((patch: Partial<NotifSettings>) => setNotif((s) => ({ ...s, ...patch })), [])

  const markRead = useCallback(
    (id: string) => setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n))),
    [],
  )
  const markAllRead = useCallback(() => setNotifications((list) => list.map((n) => ({ ...n, read: true }))), [])

  const setWebclassUrl = useCallback(
    (url: string) => {
      setWebclassUrlState(url)
      showToast(url ? "WebClass の URL を保存しました" : "WebClass の URL を消去しました")
    },
    [showToast],
  )

  const issueToken = useCallback(() => {
    setTokenIssued(true)
    return `uf_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`
  }, [])

  const refresh = useCallback(() => {
    if (syncing) return
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setSyncedAt((s) => ({ ...s, classroom: new Date() }))
      setNow(new Date())
      showToast("Classroom を更新しました")
    }, 1400)
  }, [syncing, showToast])

  const dismissSetup = useCallback(() => setSetupDismissed(true), [])

  // データ状態の切替（空・読み込み中など）を画面側に反映した値
  const shownAssignments = useMemo(() => {
    if (controls.data === "empty" || controls.data === "loading") return []
    return assignments.filter((a) => !courses.find((c) => c.id === a.courseId)?.hidden)
  }, [assignments, courses, controls.data])

  const value: MockContextValue = {
    now,
    controls,
    setControl,
    resolvedMode,
    courses,
    assignments: shownAssignments,
    notifications,
    notif,
    webclassUrl,
    tokenIssued,
    syncedAt: controls.loggedIn ? syncedAt : { classroom: null, webclass: syncedAt.webclass },
    syncing,
    setupDismissed,
    courseById,
    setStatus,
    toggleSubmitted,
    updateAssignment,
    deleteAssignment,
    toggleAssignmentMute,
    addAssignment,
    setCourse,
    updateNotif,
    markRead,
    markAllRead,
    setWebclassUrl,
    issueToken,
    refresh,
    dismissSetup,
    addOpen,
    setAddOpen,
    syncOpen,
    setSyncOpen,
    toast,
    showToast,
    hideToast,
  }

  return (
    <MockContext.Provider value={value}>
      <div
        ref={rootRef}
        data-ui=""
        // 保存済みの設定は localStorage にしかないので、属性はマウント後に付ける（SSR との不一致を防ぐ）
        data-mode={mounted ? resolvedMode : undefined}
        data-accent={mounted ? controls.accent : undefined}
        data-jp={mounted ? controls.jp : undefined}
        data-latin={mounted ? controls.latin : undefined}
        className={`${fontClassName} min-h-dvh antialiased`}
      >
        {mounted ? children : null}
      </div>
    </MockContext.Provider>
  )
}
