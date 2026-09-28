"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useSession } from "next-auth/react"
import { MotionConfig } from "motion/react"
import { useAssignments } from "@/hooks/useAssignments"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { upsertCache } from "@/lib/cache"
import {
  getNotificationHistory,
  getNotificationSettings,
  markAllAsRead,
  markAsRead,
  saveNotificationSettings,
  type NotificationRecord,
  type NotificationSettings,
} from "@/lib/notification-store"
import { getWebclassUrl, setWebclassUrl as saveWebclassUrl } from "@/lib/webclass-url"
import {
  colorForCourseName,
  toViewAssignments,
  toViewCourses,
  type ViewAssignment,
  type ViewCourse,
} from "@/lib/assignment-view"
import type { Assignment, SubmissionState } from "@/lib/types"

const THEME_KEY = "unionfetch:theme"

export type ThemeMode = "system" | "light" | "dark"

export interface ToastState {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}

export interface AppContextValue {
  /** 1分ごとに進む「いま」。残り時間の表示に使う */
  now: Date
  /** クライアントでマウント済みか。時刻や localStorage に依存する描画のゲートに使う */
  mounted: boolean
  loggedIn: boolean

  /** 非表示のコースを除いた課題。画面に出すのは基本こちら */
  assignments: ViewAssignment[]
  /** 非表示も含めた全部。設定＞コースで使う */
  allAssignments: ViewAssignment[]
  courses: ViewCourse[]
  courseById: (id: string) => ViewCourse | undefined
  loading: boolean
  dataError: string | null

  syncedAt: { classroom: Date | null; webclass: Date | null }
  syncError: string | null
  syncing: boolean
  refresh: () => void

  notifications: NotificationRecord[]
  settings: NotificationSettings
  updateSettings: (patch: Partial<Omit<NotificationSettings, "id">>) => Promise<void>
  markRead: (id: string) => void
  markAllRead: () => void

  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  resolvedMode: "light" | "dark"

  setStatus: (id: string, state: SubmissionState) => void
  toggleSubmitted: (id: string) => void
  updateAssignment: (
    id: string,
    patch: { title?: string; dueDate?: Date | null; submissionState?: SubmissionState },
  ) => Promise<void>
  deleteAssignment: (id: string) => void
  toggleAssignmentMute: (id: string) => void
  addAssignment: (input: {
    title: string
    courseName: string
    dueDate: Date | null
    submissionState: SubmissionState
  }) => Promise<void>

  setCourse: (id: string, patch: { hidden?: boolean; muted?: boolean }) => void

  webclassUrl: string
  setWebclassUrl: (url: string) => void

  addOpen: boolean
  setAddOpen: (open: boolean) => void
  syncOpen: boolean
  setSyncOpen: (open: boolean) => void
  setupDismissed: boolean
  dismissSetup: () => void

  toast: ToastState | null
  showToast: (message: string, action?: { label: string; onClick: () => void }) => void
  hideToast: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp は <AppProvider> の中でだけ使えます")
  return ctx
}

const noopSubscribe = () => () => {}

/** SSR では false、クライアントでは true。描き分けのゲート用 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

function readMode(): ThemeMode {
  if (typeof window === "undefined") return "light"
  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    return raw === "system" || raw === "light" || raw === "dark" ? raw : "light"
  } catch {
    return "light"
  }
}

const EMPTY_SETTINGS: NotificationSettings = {
  id: "global",
  enabled: true,
  preset: "standard",
  mutedCourses: [],
  mutedAssignments: [],
  hiddenCourses: [],
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const mounted = useMounted()
  const { status: sessionStatus } = useSession()
  const loggedIn = sessionStatus === "authenticated"
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)")

  const {
    assignments: raw,
    loading,
    error,
    refresh: refreshAssignments,
    removeAssignment,
    applyEdit,
    syncedAt,
    syncError,
  } = useAssignments()

  const [now, setNow] = useState(() => new Date())
  const [settings, setSettings] = useState<NotificationSettings>(EMPTY_SETTINGS)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [webclassUrl, setWebclassUrlState] = useState("")
  const [mode, setModeState] = useState<ThemeMode>("light")
  const [syncing, setSyncing] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [setupDismissed, setSetupDismissed] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ───────── 「いま」を進める ───────── */
  useEffect(() => {
    // サーバで作った「いま」をクライアントの時刻に置き直す（既存のダッシュボードと同じ）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    const onFocus = () => setNow(new Date())
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  /* ───────── 端末に保存しているものを読む ───────── */
  useEffect(() => {
    // localStorage と IndexedDB はマウント後にしか読めない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModeState(readMode())
    setWebclassUrlState(getWebclassUrl() ?? "")
    getNotificationSettings().then(setSettings).catch(() => {})
    getNotificationHistory().then(setNotifications).catch(() => {})
  }, [])

  const resolvedMode: "light" | "dark" = mode === "system" ? (prefersDark ? "dark" : "light") : mode

  useEffect(() => {
    if (!mounted) return
    const html = document.documentElement
    html.classList.toggle("dark", resolvedMode === "dark")
    html.style.colorScheme = resolvedMode
  }, [mounted, resolvedMode])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    try {
      window.localStorage.setItem(THEME_KEY, next)
    } catch {
      // 保存できなくても表示は切り替える
    }
  }, [])

  /* ───────── トースト ───────── */
  const hideToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(null)
  }, [])

  const showToast = useCallback((message: string, action?: { label: string; onClick: () => void }) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message, actionLabel: action?.label, onAction: action?.onClick })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  /* ───────── 表示用の形に直す ───────── */
  const allAssignments = useMemo(() => toViewAssignments(raw, settings), [raw, settings])
  const courses = useMemo(() => toViewCourses(raw, settings), [raw, settings])
  const assignments = useMemo(() => {
    const hidden = new Set(settings.hiddenCourses)
    return allAssignments.filter((a) => !hidden.has(a.courseId))
  }, [allAssignments, settings.hiddenCourses])
  const courseById = useCallback((id: string) => courses.find((c) => c.id === id), [courses])

  /* ───────── 設定の保存（端末に保存し、ログイン中はサーバにも送る） ───────── */
  const updateSettings = useCallback(
    async (patch: Partial<Omit<NotificationSettings, "id">>) => {
      await saveNotificationSettings(patch)
      setSettings(await getNotificationSettings())
      if (loggedIn) {
        fetch("/api/notifications/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => {})
      }
    },
    [loggedIn],
  )

  const markRead = useCallback((id: string) => {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)))
    markAsRead(id).catch(() => {})
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })))
    markAllAsRead().catch(() => {})
  }, [])

  /* ───────── 課題の操作 ───────── */
  const byId = useCallback((id: string) => raw.find((a) => a.id === id), [raw])

  /** サーバに保存する。失敗したら投げるので、呼び元が元に戻せる */
  const save = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const res = await fetch(`/api/assignments/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("save_failed")
      const { assignment } = await res.json()
      await applyEdit({
        ...assignment,
        dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null,
      })
    },
    [applyEdit],
  )

  /** 先に画面へ反映し、失敗したら元に戻す（既存のダッシュボードと同じ挙動） */
  const setStatus = useCallback(
    (id: string, state: SubmissionState) => {
      const current = byId(id)
      if (!current || current.submissionState === state) return
      applyEdit({ ...current, submissionState: state })
      save(id, { submissionState: state }).catch(() => {
        applyEdit(current)
        showToast("変更に失敗しました")
      })
    },
    [byId, applyEdit, save, showToast],
  )

  const toggleSubmitted = useCallback(
    (id: string) => {
      const current = byId(id)
      if (!current) return
      const next: SubmissionState = current.submissionState === "submitted" ? "not_submitted" : "submitted"
      setStatus(id, next)
      showToast(next === "submitted" ? "提出済みにしました" : "未提出に戻しました", {
        label: "元に戻す",
        onClick: () => setStatus(id, current.submissionState),
      })
    },
    [byId, setStatus, showToast],
  )

  const updateAssignment = useCallback(
    async (id: string, patch: { title?: string; dueDate?: Date | null; submissionState?: SubmissionState }) => {
      const data: Record<string, unknown> = {}
      if (patch.title !== undefined) data.title = patch.title
      if (patch.dueDate !== undefined) data.dueDate = patch.dueDate ? patch.dueDate.toISOString() : null
      if (patch.submissionState !== undefined) data.submissionState = patch.submissionState
      await save(id, data)
    },
    [save],
  )

  const deleteAssignment = useCallback(
    (id: string) => {
      removeAssignment(id)
      fetch(`/api/assignments/${encodeURIComponent(id)}`, { method: "DELETE" })
        .then((res) => {
          if (!res.ok && res.status !== 404) throw new Error("delete_failed")
          showToast("課題を削除しました")
        })
        .catch(() => {
          showToast("削除に失敗しました")
          refreshAssignments()
        })
    },
    [removeAssignment, refreshAssignments, showToast],
  )

  const toggleAssignmentMute = useCallback(
    (id: string) => {
      const muted = settings.mutedAssignments.includes(id)
      const next = muted
        ? settings.mutedAssignments.filter((x) => x !== id)
        : [...settings.mutedAssignments, id]
      updateSettings({ mutedAssignments: next })
      showToast(muted ? "この課題の通知をオンにしました" : "この課題の通知をオフにしました")
    },
    [settings.mutedAssignments, updateSettings, showToast],
  )

  const addAssignment = useCallback(
    async (input: {
      title: string
      courseName: string
      dueDate: Date | null
      submissionState: SubmissionState
    }) => {
      const courseName = input.courseName.trim()
      const title = input.title.trim()
      // 色は名前から決める（決定 F）。同じ教科名なら必ず同じ色になる
      const courseColor = courses.find((c) => c.name === courseName)?.color ?? colorForCourseName(courseName)

      if (loggedIn) {
        const res = await fetch("/api/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseName,
            courseColor,
            title,
            dueDate: input.dueDate?.toISOString() ?? null,
            submissionState: input.submissionState,
          }),
        })
        if (!res.ok) throw new Error("create_failed")
        const { assignment } = await res.json()
        await upsertCache({
          ...assignment,
          dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null,
        })
      } else {
        // 未ログインのときは端末の中だけに保存する
        const created: Assignment = {
          id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          courseId: `manual-course-${courseName.toLowerCase().replace(/\s+/g, "-")}`,
          courseName,
          courseColor,
          title,
          dueDate: input.dueDate,
          link: "",
          submissionState: input.submissionState,
          isLate: input.dueDate ? input.dueDate < new Date() && input.submissionState === "not_submitted" : false,
          source: "manual",
        }
        await upsertCache(created)
      }
      refreshAssignments()
      showToast("課題を追加しました")
    },
    [loggedIn, courses, refreshAssignments, showToast],
  )

  const setCourse = useCallback(
    (id: string, patch: { hidden?: boolean; muted?: boolean }) => {
      const patchSettings: Partial<Omit<NotificationSettings, "id">> = {}
      if (patch.hidden !== undefined) {
        patchSettings.hiddenCourses = patch.hidden
          ? [...new Set([...settings.hiddenCourses, id])]
          : settings.hiddenCourses.filter((x) => x !== id)
        // 非表示にしたコースは通知も止める
        if (patch.hidden) patchSettings.mutedCourses = [...new Set([...settings.mutedCourses, id])]
      }
      if (patch.muted !== undefined) {
        patchSettings.mutedCourses = patch.muted
          ? [...new Set([...(patchSettings.mutedCourses ?? settings.mutedCourses), id])]
          : (patchSettings.mutedCourses ?? settings.mutedCourses).filter((x) => x !== id)
      }
      updateSettings(patchSettings)
    },
    [settings.hiddenCourses, settings.mutedCourses, updateSettings],
  )

  const setWebclassUrl = useCallback(
    (url: string) => {
      const trimmed = url.trim()
      if (trimmed && !saveWebclassUrl(trimmed)) {
        showToast("この URL は保存できません")
        return
      }
      if (!trimmed) saveWebclassUrl("")
      setWebclassUrlState(getWebclassUrl() ?? "")
      showToast(trimmed ? "WebClass の URL を保存しました" : "WebClass の URL を消去しました")
    },
    [showToast],
  )

  const refresh = useCallback(() => {
    if (syncing) return
    setSyncing(true)
    Promise.resolve(refreshAssignments())
      .catch(() => {})
      .finally(() => {
        setSyncing(false)
        setNow(new Date())
      })
  }, [syncing, refreshAssignments])

  const dismissSetup = useCallback(() => setSetupDismissed(true), [])

  const value: AppContextValue = {
    now,
    mounted,
    loggedIn,
    assignments,
    allAssignments,
    courses,
    courseById,
    loading,
    dataError: error,
    syncedAt,
    syncError,
    syncing,
    refresh,
    notifications,
    settings,
    updateSettings,
    markRead,
    markAllRead,
    mode,
    setMode,
    resolvedMode,
    setStatus,
    toggleSubmitted,
    updateAssignment,
    deleteAssignment,
    toggleAssignmentMute,
    addAssignment,
    setCourse,
    webclassUrl,
    setWebclassUrl,
    addOpen,
    setAddOpen,
    syncOpen,
    setSyncOpen,
    setupDismissed,
    dismissSetup,
    toast,
    showToast,
    hideToast,
  }

  return (
    <AppContext.Provider value={value}>
      {/* 端末の「視差効果を減らす」設定を尊重する */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </AppContext.Provider>
  )
}
