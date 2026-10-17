
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  BarChart2,
  BarChart3,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  CloudRain,
  Code2,
  Cpu,
  Database,
  Download,
  Droplets,
  FileDown,
  GitMerge,
  Globe,
  HardDrive,
  Info,
  Key,
  Layers,
  Leaf,
  LifeBuoy,
  Lock,
  LogOut,
  MapPin,
  MessageSquare,
  PauseCircle,
  Play,
  PlayCircle,
  Radio,
  RefreshCw,
  RotateCw,
  Send,
  Server,
  Shield,
  ShieldCheck,
  Sliders,
  Terminal,
  Thermometer,
  TrendingUp,
  Unlock,
  User,
  Volume2,
  Wifi,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

// ── constants ─────────────────────────────────────────────────────────────────
const fmt = (v, d = 1) => (v == null ? '—' : Number(v).toFixed(d))
const CITY_COLORS  = { Karachi: '#40d49b', Lahore: '#63a8ff', Islamabad: '#bd91ff' }
const CITY_LIST    = ['Karachi', 'Lahore', 'Islamabad']
const TOOLTIP_STYLE = {
  backgroundColor: '#0c1524',
  border:          '1px solid rgba(255,255,255,0.12)',
  borderRadius:    '8px',
  color:           '#e8effc',
  fontSize:        '12px',
}

// ── helper components ─────────────────────────────────────────────────────────
function StatCard({ title, value, unit, sub, icon: Icon, accent = '#40d49b' }) {
  return (
    <article className="stat-card" style={{ '--card-accent': accent }}>
      <div className="stat-head">
        <span>{title}</span>
        <span className="stat-icon" style={{ color: accent }}><Icon size={17} /></span>
      </div>
      <div className="stat-value">{value}<span> {unit}</span></div>
      <p>{sub}</p>
    </article>
  )
}

function NavItem({ icon: Icon, label, active, onClick, badge, count }) {
  return (
    <div className={`nav-item${active ? ' active' : ''}`} onClick={onClick} role="button" tabIndex={0}>
      <Icon size={16} /> {label}
      {count != null && count > 0 && <span className="nav-count-badge">{count}</span>}
      {badge && <span className="nav-badge-pill">{badge}</span>}
    </div>
  )
}

function SectionLabel({ children }) {
  return <p className="section-label">{children}</p>
}

function CorrBadge({ r }) {
  if (r == null) return <span className="corr-badge neutral">—</span>
  const a   = Math.abs(r)
  const cls = a >= 0.7 ? 'strong' : a >= 0.4 ? 'moderate' : a >= 0.2 ? 'weak' : 'neutral'
  return <span className={`corr-badge ${cls}`}>{r > 0 ? '+' : ''}{r.toFixed(3)}</span>
}

function MetricCard({ label, value, unit, sub, color = '#40d49b', icon: Icon }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        {Icon && <Icon size={15} color={color} />}
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value" style={{ color }}>{value}<span className="metric-unit"> {unit}</span></div>
      {sub && <p className="metric-sub">{sub}</p>}
    </div>
  )
}

// ── main app ──────────────────────────────────────────────────────────────────
export default function App() {
  // navigation
  const [page, setPage] = useState('overview')

  // shared filters
  const [location, setLocation] = useState('All')

  // Phase 5 — Auth & RBAC state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('earthscape_user')
    if (saved) {
      try { return JSON.parse(saved) } catch {}
    }
    return {
      email: 'admin@earthscape.org',
      name: 'Dr. Aisha Khan',
      title: 'Chief Climate Officer & System Admin',
      role: 'admin',
      permissions: ['read', 'write', 'execute_mapreduce', 'manage_users', 'export_data']
    }
  })
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('earthscape_token') || '')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [demoAccounts, setDemoAccounts] = useState([])
  const [rbacBanner, setRbacBanner] = useState('')

  // Phase 6 — Real-Time Streaming state
  const [streamStatus,   setStreamStatus]   = useState(null)
  const [streamFeed,     setStreamFeed]     = useState([])
  const [streamInterval, setStreamInterval] = useState(3.0)
  const [isStreaming,    setIsStreaming]    = useState(false)
  const [streamLoading,  setStreamLoading]  = useState(false)

  // Phase 7 — Notifications & Alerting state
  const [alerts,            setAlerts]            = useState([])
  const [alertSummary,      setAlertSummary]      = useState(null)
  const [alertRules,        setAlertRules]        = useState({})
  const [showBellDropdown,  setShowBellDropdown]  = useState(false)
  const [alertFilterStatus, setAlertFilterStatus] = useState('ALL')
  const [alertFilterSev,    setAlertFilterSev]    = useState('ALL')
  const [ruleEdits,         setRuleEdits]         = useState({})
  const [alertFeedback,     setAlertFeedback]     = useState('')

  // Aptech Requirement Compliance — Feedback & Support Desk state (Page 5)
  const [feedbackCategory, setFeedbackCategory] = useState('ANOMALY_REPORT')
  const [feedbackPriority, setFeedbackPriority] = useState('NORMAL')
  const [feedbackName,     setFeedbackName]     = useState('Dr. Aisha Khan')
  const [feedbackEmail,    setFeedbackEmail]    = useState('admin@earthscape.org')
  const [feedbackSubject,  setFeedbackSubject]  = useState('')
  const [feedbackMessage,  setFeedbackMessage]  = useState('')
  const [feedbackCity,     setFeedbackCity]     = useState('Islamabad')
  const [submittedTickets, setSubmittedTickets] = useState([
    {
      id: 'TKT-ES-9104',
      date: '2026-10-16 19:40',
      category: 'Climate Anomaly / Outlier Report',
      priority: 'HIGH',
      subject: 'Karachi coastal high humidity spike verification',
      author: 'Bilal Ahmed',
      status: 'UNDER REVIEW',
      city: 'Karachi'
    },
    {
      id: 'TKT-ES-8832',
      date: '2026-10-15 11:15',
      category: 'Data Ingestion Verification',
      priority: 'NORMAL',
      subject: 'Confirmation of 2023 NASA POWER 366-day sequence',
      author: 'Dr. Aisha Khan',
      status: 'RESOLVED',
      city: 'Islamabad'
    }
  ])
  const [feedbackSuccess,  setFeedbackSuccess]  = useState('')

  // climate data (Phase 1 + 2)
  const [records,      setRecords]      = useState([])
  const [summary,      setSummary]      = useState([])
  const [anomalies,    setAnomalies]    = useState([])
  const [correlations, setCorrelations] = useState([])
  const [monthly,      setMonthly]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  // Phase 3 — ML state
  const [mlCity,    setMlCity]    = useState('Karachi')
  const [mlDays,    setMlDays]    = useState(30)
  const [mlData,    setMlData]    = useState(null)
  const [mlIfData,  setMlIfData]  = useState(null)
  const [mlModels,  setMlModels]  = useState([])
  const [mlLoading, setMlLoading] = useState(false)
  const [mlError,   setMlError]   = useState('')

  // Phase 4 — Hadoop & MapReduce state
  const [hadoopStatus,       setHadoopStatus]       = useState(null)
  const [hadoopJobs,         setHadoopJobs]         = useState([])
  const [hadoopActiveJob,    setHadoopActiveJob]    = useState('monthly')
  const [hadoopResults,      setHadoopResults]      = useState([])
  const [hadoopLoading,      setHadoopLoading]      = useState(false)
  const [hadoopRunning,      setHadoopRunning]      = useState(false)
  const [hadoopLastJob,      setHadoopLastJob]      = useState(null)
  const [hadoopActiveScript, setHadoopActiveScript] = useState('mapper_monthly')
  const [hadoopCode,         setHadoopCode]         = useState('')
  const [hadoopCityFilter,   setHadoopCityFilter]   = useState('ALL')

  // Phase 8 — Export Center state
  const [exportDataset,  setExportDataset]  = useState('climate')
  const [exportCity,     setExportCity]     = useState('All')
  const [exportFormat,   setExportFormat]   = useState('json')
  const [exportLoading,  setExportLoading]  = useState(false)
  const [exportPreview,  setExportPreview]  = useState(null)
  const [exportError,    setExportError]    = useState('')

  // Phase 8 — System Health state
  const [healthData,    setHealthData]    = useState(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthError,   setHealthError]   = useState('')
  const [healthLastRefresh, setHealthLastRefresh] = useState(null)

  // ── auth helper functions ────────────────────────────────────────────────────
  const loginWithCredentials = async (email, password) => {
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Authentication failed')
      setCurrentUser(data.user)
      setAuthToken(data.token)
      localStorage.setItem('earthscape_user', JSON.stringify(data.user))
      localStorage.setItem('earthscape_token', data.token)
      setShowAuthModal(false)
      setRbacBanner('')
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setAuthToken('')
    localStorage.removeItem('earthscape_user')
    localStorage.removeItem('earthscape_token')
    setShowAuthModal(true)
  }

  const quickSwitchRole = async (targetRole) => {
    const creds = targetRole === 'admin'
      ? { email: 'admin@earthscape.org', password: 'admin123!' }
      : { email: 'analyst@earthscape.org', password: 'analyst123!' }
    await loginWithCredentials(creds.email, creds.password)
  }

  // Ensure valid token on initial mount
  useEffect(() => {
    if (!authToken && currentUser) {
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          password: currentUser.role === 'admin' ? 'admin123!' : 'analyst123!',
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.token) {
            setAuthToken(data.token)
            localStorage.setItem('earthscape_token', data.token)
          }
        })
        .catch(console.error)
    }

    fetch('/api/auth/demo-accounts')
      .then(res => res.json())
      .then(data => setDemoAccounts(data.accounts || []))
      .catch(console.error)
  }, [authToken, currentUser])

  // ── streaming helper functions ───────────────────────────────────────────────
  const fetchStreamData = useCallback(async () => {
    try {
      const res = await fetch('/api/stream/feed?limit=30')
      const data = await res.json()
      setStreamStatus(data.status)
      setStreamFeed(data.feed ?? [])
      setIsStreaming(Boolean(data.status?.is_running))
    } catch (e) {
      console.error('Failed to poll stream', e)
    }
  }, [])

  const toggleStreaming = async () => {
    setStreamLoading(true)
    try {
      if (isStreaming) {
        await fetch('/api/stream/stop', { method: 'POST' })
        setIsStreaming(false)
      } else {
        await fetch('/api/stream/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interval: streamInterval })
        })
        setIsStreaming(true)
      }
      await fetchStreamData()
    } catch (e) {
      console.error('Toggle stream failed', e)
    } finally {
      setStreamLoading(false)
    }
  }

  const emitSinglePacket = async () => {
    try {
      const res = await fetch('/api/stream/emit', { method: 'POST' })
      const data = await res.json()
      if (data.packet) {
        setStreamFeed(prev => [...prev.slice(-29), data.packet])
      }
      const st = await fetch('/api/stream/status')
      setStreamStatus(await st.json())
      // Also refresh alerts in case this packet triggered one
      loadAlerts()
    } catch (e) {
      console.error(e)
    }
  }

  // ── alert helper functions ───────────────────────────────────────────────────
  const loadAlerts = useCallback(async () => {
    try {
      const [alertsRes, sumRes, rulesRes] = await Promise.all([
        fetch('/api/alerts?limit=100'),
        fetch('/api/alerts/summary'),
        fetch('/api/alerts/rules'),
      ])
      const [al, sm, rl] = await Promise.all([
        alertsRes.json(), sumRes.json(), rulesRes.json(),
      ])
      setAlerts(al.alerts ?? [])
      setAlertSummary(sm)
      setAlertRules(rl.rules ?? {})
    } catch (e) {
      console.error('Failed to load alerts', e)
    }
  }, [])

  const acknowledgeAlert = async (alertId) => {
    try {
      await fetch(`/api/alerts/${alertId}/ack`, { method: 'POST' })
      setAlerts(prev => prev.map(a => a.alert_id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a))
      loadAlerts()
    } catch (e) {
      console.error(e)
    }
  }

  const resolveAlert = async (alertId) => {
    try {
      await fetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' })
      setAlerts(prev => prev.map(a => a.alert_id === alertId ? { ...a, status: 'RESOLVED' } : a))
      loadAlerts()
    } catch (e) {
      console.error(e)
    }
  }

  const triggerTestEmergency = async (type, city) => {
    setAlertFeedback('Simulating meteorological emergency…')
    try {
      const res = await fetch('/api/alerts/trigger-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, city }),
      })
      const data = await res.json()
      setAlertFeedback(`Emergency alert generated: ${data.alert?.title}`)
      await loadAlerts()
      setTimeout(() => setAlertFeedback(''), 4000)
    } catch (e) {
      console.error(e)
    }
  }

  const saveRuleConfigurations = async () => {
    try {
      const res = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleEdits)
      })
      const data = await res.json()
      setAlertRules(data.rules ?? {})
      setAlertFeedback('Threshold configurations updated successfully!')
      setTimeout(() => setAlertFeedback(''), 3000)
    } catch (e) {
      console.error(e)
    }
  }

  // Phase 8 — System Health loader
  const loadHealth = useCallback(async () => {
    setHealthLoading(true)
    setHealthError('')
    try {
      const res  = await fetch('/api/system/health')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Health check failed')
      setHealthData(data)
      setHealthLastRefresh(new Date().toLocaleTimeString())
    } catch (e) {
      setHealthError(e.message)
    } finally {
      setHealthLoading(false)
    }
  }, [])

  // Phase 8 — Export preview / download
  const fetchExportPreview = async () => {
    setExportLoading(true)
    setExportError('')
    setExportPreview(null)
    try {
      const url = `/api/export?format=json&dataset=${exportDataset}&city=${exportCity}`
      const res  = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Export failed')
      setExportPreview(data)
    } catch (e) {
      setExportError(e.message)
    } finally {
      setExportLoading(false)
    }
  }

  const triggerCsvDownload = () => {
    const url = `/api/export?format=csv&dataset=${exportDataset}&city=${exportCity}`
    const a = document.createElement('a')
    a.href = url
    a.download = `earthscape_${exportDataset}_${exportCity.toLowerCase()}.csv`
    a.click()
  }


  // Periodic polling for stream and alerts
  useEffect(() => {
    loadAlerts()
    fetchStreamData()
    const timer = setInterval(() => {
      loadAlerts()
      if (page === 'stream' || isStreaming) {
        fetchStreamData()
      }
    }, 2500)
    return () => clearInterval(timer)
  }, [page, isStreaming, fetchStreamData, loadAlerts])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAuthModal(false)
        setShowBellDropdown(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── general fetch functions ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [climateRes, summaryRes, anomalyRes, corrRes, monthlyRes] =
        await Promise.all([
          fetch('/api/climate?limit=1500'),
          fetch('/api/analytics/summary'),
          fetch('/api/analytics/anomalies?limit=200'),
          fetch('/api/analytics/correlation'),
          fetch('/api/analytics/monthly'),
        ])
      if (!climateRes.ok) throw new Error(`API ${climateRes.status}`)
      const [cd, sd, ad, rd, md] = await Promise.all([
        climateRes.json(), summaryRes.json(), anomalyRes.json(),
        corrRes.json(),    monthlyRes.json(),
      ])
      setRecords(cd.data ?? [])
      setSummary(sd.cities ?? [])
      setAnomalies(ad.anomalies ?? [])
      setCorrelations(rd.correlations ?? [])
      setMonthly(md.monthly ?? [])
    } catch {
      setError('Unable to load data. Make sure Flask is running on port 5000.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMl = useCallback(async (city, days) => {
    setMlLoading(true)
    setMlError('')
    try {
      const [predRes, ifRes, modelsRes] = await Promise.all([
        fetch(`/api/ml/predict?city=${city}&days=${days}`),
        fetch('/api/ml/anomalies?contamination=0.05'),
        fetch('/api/ml/models'),
      ])
      const [pred, ifResult, models] = await Promise.all([
        predRes.json(), ifRes.json(), modelsRes.json(),
      ])
      if (pred.error)      throw new Error(pred.error)
      if (ifResult.error)  throw new Error(ifResult.error)
      setMlData(pred)
      setMlIfData(ifResult)
      setMlModels(models.models ?? [])
    } catch (e) {
      setMlError(e.message || 'ML prediction failed.')
    } finally {
      setMlLoading(false)
    }
  }, [])

  const loadHadoop = useCallback(async (jobType = 'monthly') => {
    setHadoopLoading(true)
    try {
      const [statusRes, jobsRes, resRes] = await Promise.all([
        fetch('/api/hadoop/status'),
        fetch('/api/hadoop/jobs'),
        fetch(`/api/hadoop/results?job_type=${jobType}`),
      ])
      const [st, jb, rs] = await Promise.all([
        statusRes.json(), jobsRes.json(), resRes.json()
      ])
      setHadoopStatus(st)
      setHadoopJobs(jb.jobs ?? [])
      setHadoopResults(rs.results ?? [])
      if (jb.jobs && jb.jobs.length > 0) {
        setHadoopLastJob(prev => prev || jb.jobs[0])
      }
    } catch (e) {
      console.error('Failed to load Hadoop info', e)
    } finally {
      setHadoopLoading(false)
    }
  }, [])

  const loadHadoopCode = useCallback(async (scriptName) => {
    try {
      const res = await fetch(`/api/hadoop/code?file=${scriptName}`)
      const data = await res.json()
      setHadoopCode(data.code ?? '')
    } catch (e) {
      console.error('Failed to load script', e)
    }
  }, [])

  const runMapReduceJob = async () => {
    if (currentUser?.role !== 'admin') {
      setRbacBanner('RBAC Access Restricted: Analyst role is read-only. Executing cluster compute jobs requires Administrator privileges.')
      return
    }

    setHadoopRunning(true)
    setRbacBanner('')
    try {
      const res = await fetch('/api/hadoop/jobs/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ job_type: hadoopActiveJob, city: hadoopCityFilter }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRbacBanner(`RBAC Enforcement (${res.status}): ${data.error || 'Unauthorized'}`)
        return
      }
      if (data.job) {
        setHadoopLastJob(data.job)
        setHadoopJobs(prev => [data.job, ...prev.filter(j => j.job_id !== data.job.job_id)])
        setHadoopResults(data.results ?? [])
      }
    } catch (e) {
      console.error('MapReduce run failed', e)
    } finally {
      setHadoopRunning(false)
    }
  }

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (page === 'ml') loadMl(mlCity, mlDays)
  }, [page, mlCity, mlDays, loadMl])

  useEffect(() => {
    if (page === 'hadoop') {
      loadHadoop(hadoopActiveJob)
      loadHadoopCode(hadoopActiveScript)
    }
  }, [page, hadoopActiveJob, hadoopActiveScript, loadHadoop, loadHadoopCode])

  // ── derived values ────────────────────────────────────────────────────────────
  const filteredRecords = useMemo(
    () => records.filter(r => location === 'All' || r.location === location),
    [records, location]
  )
  const avgTemp = useMemo(() => {
    const vals = filteredRecords.map(r => r.avg_temp_c).filter(v => typeof v === 'number')
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  }, [filteredRecords])
  const totalRain = useMemo(
    () => filteredRecords.reduce((s, r) => s + (typeof r.rainfall_mm === 'number' ? r.rainfall_mm : 0), 0),
    [filteredRecords]
  )
  const avgHumidity = useMemo(() => {
    const vals = filteredRecords.map(r => r.humidity_pct).filter(v => typeof v === 'number')
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  }, [filteredRecords])

  const summaryRow   = useMemo(() => summary.find(s => s.city === location) ?? null, [summary, location])
  const anomalyCount = useMemo(
    () => location === 'All' ? anomalies.length : anomalies.filter(a => a.city === location).length,
    [anomalies, location]
  )

  // temperature line chart (multi or single city)
  const tempChartData = useMemo(() => {
    if (location !== 'All') {
      return [...filteredRecords]
        .filter(r => typeof r.avg_temp_c === 'number')
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(r => ({ date: r.date.slice(5), temperature: r.avg_temp_c }))
    }
    const byDate = {}
    records.filter(r => typeof r.avg_temp_c === 'number').forEach(r => {
      const d = r.date.slice(5)
      byDate[d] = { ...byDate[d], date: d, [r.location]: r.avg_temp_c }
    })
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [records, filteredRecords, location])

  // rainfall bar chart (monthly)
  const rainfallChartData = useMemo(() => {
    const src = location === 'All' ? monthly : monthly.filter(m => m.city === location)
    const byMonth = {}
    src.forEach(m => {
      byMonth[m.month] = { ...(byMonth[m.month] ?? {}), month: m.month.slice(5), [m.city]: m.total_rain_mm }
    })
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))
  }, [monthly, location])

  // ML prediction chart
  const mlChartData = useMemo(() => {
    if (!mlData) return []
    const hist = mlData.historical.map(h => ({ date: h.date.slice(5), hist: h.avg_temp_c }))
    const last  = mlData.historical[mlData.historical.length - 1]
    const connPoint = { date: last.date.slice(5), hist: last.avg_temp_c, pred: last.avg_temp_c }
    const preds = mlData.predictions.map(p => ({
      date:  p.date.slice(5),
      pred:  p.predicted_temp_c,
      upper: p.upper_bound,
      lower: p.lower_bound,
    }))
    return [...hist, connPoint, ...preds]
  }, [mlData])

  const ifCityFilter = useMemo(
    () => mlIfData?.anomalies?.filter(a => a.city === mlCity) ?? [],
    [mlIfData, mlCity]
  )

  // Real-time rolling chart data from stream feed
  const rollingStreamChart = useMemo(() => {
    return streamFeed.map(pkt => ({
      time: pkt.time_display,
      temperature: pkt.avg_temp_c,
      humidity: pkt.humidity_pct,
      rainfall: pkt.rainfall_mm,
      city: pkt.location
    }))
  }, [streamFeed])

  // Filtered alerts for the Alerts & Incidents workspace
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      const matchCity = location === 'All' || a.location === location
      const matchStatus = alertFilterStatus === 'ALL' || a.status === alertFilterStatus
      const matchSev = alertFilterSev === 'ALL' || a.severity === alertFilterSev
      return matchCity && matchStatus && matchSev
    })
  }, [alerts, location, alertFilterStatus, alertFilterSev])

  // Feedback Submission Handler
  const handleFeedbackSubmit = (e) => {
    e.preventDefault()
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) return
    const ticketId = `TKT-ES-${Math.floor(1000 + Math.random() * 9000)}`
    const now = new Date()
    const newTicket = {
      id: ticketId,
      date: now.toISOString().replace('T', ' ').slice(0, 16),
      category: feedbackCategory,
      priority: feedbackPriority,
      subject: feedbackSubject.trim(),
      author: feedbackName.trim() || 'Anonymous Analyst',
      status: 'RECEIVED',
      city: feedbackCity
    }
    setSubmittedTickets(prev => [newTicket, ...prev])
    setFeedbackSuccess(`Ticket #${ticketId} submitted successfully! The EarthScape Operations Team has logged your inquiry.`)
    setFeedbackSubject('')
    setFeedbackMessage('')
    setTimeout(() => setFeedbackSuccess(''), 6000)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Leaf size={21} /></div>
          <div><h2>EarthScape</h2><span>CLIMATE AGENCY</span></div>
        </div>

        <SectionLabel>WORKSPACE</SectionLabel>
        <NavItem icon={Activity}      label="Climate overview"   active={page === 'overview'}     onClick={() => setPage('overview')} />
        <NavItem icon={BarChart2}     label="Monthly trends"     active={page === 'trends'}       onClick={() => setPage('trends')} />
        <NavItem icon={AlertTriangle} label="Anomalies (3σ)"     active={page === 'anomalies'}    onClick={() => setPage('anomalies')} />
        <NavItem icon={GitMerge}      label="Correlations"       active={page === 'correlations'} onClick={() => setPage('correlations')} />
        <NavItem icon={Cpu}           label="ML Predictions"     active={page === 'ml'}           onClick={() => setPage('ml')} />
        <NavItem icon={Database}      label="Hadoop MapReduce"   active={page === 'hadoop'}       onClick={() => setPage('hadoop')} />
        <NavItem icon={Radio}         label="Live Streaming Feed" active={page === 'stream'}      onClick={() => setPage('stream')} badge={isStreaming ? 'LIVE' : null} />
        <NavItem icon={AlertOctagon}  label="Alerts & Incidents" active={page === 'alerts'}      onClick={() => setPage('alerts')} count={alertSummary?.unread} />

        <SectionLabel>PLATFORM</SectionLabel>
        <NavItem icon={Download}      label="Data Export Center" active={page === 'export'}      onClick={() => setPage('export')} />
        <NavItem icon={HardDrive}     label="System Health"      active={page === 'health'}      onClick={() => { setPage('health'); loadHealth() }} />
        <NavItem icon={Info}          label="About Platform"     active={page === 'about'}       onClick={() => setPage('about')} />
        <NavItem icon={LifeBuoy}      label="Help & Feedback"    active={page === 'feedback'}    onClick={() => setPage('feedback')} />

        {/* User Card in Sidebar */}
        <div className="sidebar-user-card" onClick={() => setShowAuthModal(true)} title="Click to view permissions or switch account">
          <div className="user-avatar-badge">
            {currentUser?.role === 'admin' ? <ShieldCheck size={16} color="#40d49b" /> : <Shield size={16} color="#63a8ff" />}
          </div>
          <div className="user-details">
            <strong>{currentUser?.name || 'Guest User'}</strong>
            <span className={`role-tag ${currentUser?.role || 'guest'}`}>
              {currentUser?.role === 'admin' ? 'SYSTEM ADMIN' : 'DATA ANALYST'}
            </span>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <div>
            <strong>Climate data system</strong>
            <span>NASA POWER · 1,098 records</span>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">CLIMATE INTELLIGENCE PLATFORM</span>
            <h1>
              {page === 'overview'     && 'Climate analytics overview'}
              {page === 'trends'       && 'Monthly trends & patterns'}
              {page === 'anomalies'    && 'Statistical anomalies (3-sigma)'}
              {page === 'correlations' && 'Climate factor correlations'}
              {page === 'ml'           && 'Machine Learning Predictions (scikit-learn)'}
              {page === 'hadoop'       && 'Hadoop MapReduce & HDFS Distributed Engine'}
              {page === 'stream'       && 'Real-Time Climate Sensor Ingestion Stream'}
              {page === 'alerts'       && 'Threshold Notifications & Emergency Incidents'}
              {page === 'export'       && 'Data & Incident Export Center'}
              {page === 'health'       && 'System Diagnostics & Health Monitor'}
              {page === 'about'        && 'About Platform & Technical Architecture'}
              {page === 'feedback'     && 'Help, Feedback & User Support Desk'}
            </h1>
          </div>

          <div className="topbar-actions">
            {/* Notification Bell with Dropdown Popover */}
            <div className="bell-container">
              <button
                className={`topbar-bell-btn ${alertSummary?.unread > 0 ? 'has-unread' : ''}`}
                onClick={() => setShowBellDropdown(prev => !prev)}
                title="Notifications & Active Warnings"
              >
                {alertSummary?.unread > 0 ? <BellRing size={16} /> : <Bell size={16} />}
                {alertSummary?.unread > 0 && (
                  <span className="bell-badge-count">{alertSummary.unread}</span>
                )}
              </button>

              {showBellDropdown && (
                <div className="bell-dropdown-popover">
                  <div className="popover-head">
                    <div className="popover-title">
                      <AlertOctagon size={15} color="#f87171" />
                      <strong>Climate Alert Notifications</strong>
                    </div>
                    <button className="popover-close-btn" onClick={() => setShowBellDropdown(false)}>✕</button>
                  </div>
                  <div className="popover-sub">
                    {alertSummary?.unread || 0} unread notifications ({alertSummary?.critical || 0} critical)
                  </div>
                  <div className="popover-list">
                    {alerts.slice(0, 5).map(a => (
                      <div key={a.alert_id} className={`popover-item ${a.status.toLowerCase()}`}>
                        <div className="popover-item-top">
                          <span className={`sev-dot ${a.severity.toLowerCase()}`} />
                          <strong>{a.title}</strong>
                          <span className="popover-time">{a.date}</span>
                        </div>
                        <p>{a.message}</p>
                        <div className="popover-item-actions">
                          {a.status === 'UNREAD' && (
                            <button className="ack-mini-btn" onClick={() => acknowledgeAlert(a.alert_id)}>
                              <Check size={11} /> Acknowledge
                            </button>
                          )}
                          <span className="popover-city-tag">{a.location}</span>
                        </div>
                      </div>
                    ))}
                    {alerts.length === 0 && (
                      <div className="popover-empty">No active notifications. System clear.</div>
                    )}
                  </div>
                  <button
                    className="popover-viewall-btn"
                    onClick={() => { setShowBellDropdown(false); setPage('alerts'); }}
                  >
                    Open Incident Response Center ➔
                  </button>
                </div>
              )}
            </div>

            {/* Live Streaming Global Ticker Pill */}
            <div
              className={`stream-global-pill ${isStreaming ? 'active' : ''}`}
              onClick={toggleStreaming}
              title={isStreaming ? 'Live Stream Active — Click to pause' : 'Live Stream Paused — Click to resume'}
            >
              <span className={`stream-ping ${isStreaming ? 'pulsing' : ''}`} />
              <Radio size={13} />
              <span>{isStreaming ? 'STREAMING ACTIVE' : 'STREAM IDLE'}</span>
            </div>

            {['overview', 'trends', 'anomalies', 'correlations', 'alerts', 'export'].includes(page) && (
              <div className="control-group">
                <MapPin size={15} />
                <label htmlFor="city-select">Location</label>
                <select id="city-select" value={location} onChange={e => setLocation(e.target.value)}>
                  <option value="All">All locations</option>
                  <option value="Karachi">Karachi</option>
                  <option value="Lahore">Lahore</option>
                  <option value="Islamabad">Islamabad</option>
                </select>
              </div>
            )}

            {/* Quick RBAC Role Switcher */}
            <div className="rbac-quick-switcher">
              <button
                className={`rbac-pill-btn ${currentUser?.role === 'admin' ? 'active-admin' : ''}`}
                onClick={() => quickSwitchRole('admin')}
                title="Switch session to Administrator role"
              >
                <ShieldCheck size={13} />
                Admin
              </button>
              <button
                className={`rbac-pill-btn ${currentUser?.role === 'analyst' ? 'active-analyst' : ''}`}
                onClick={() => quickSwitchRole('analyst')}
                title="Switch session to Analyst role (Read-Only)"
              >
                <Shield size={13} />
                Analyst
              </button>
              <button
                className="auth-account-btn"
                onClick={() => setShowAuthModal(true)}
                title="Open authentication modal"
              >
                <Key size={13} />
              </button>
            </div>

            <button
              className="refresh-button"
              onClick={() => {
                if (page === 'ml') loadMl(mlCity, mlDays)
                else if (page === 'hadoop') loadHadoop(hadoopActiveJob)
                else if (page === 'stream') fetchStreamData()
                else if (page === 'alerts') loadAlerts()
                else load()
              }}
              disabled={loading || mlLoading || hadoopLoading}
            >
              <RefreshCw size={15} className={(loading || mlLoading || hadoopLoading) ? 'spinning' : ''} />
              {(loading || mlLoading || hadoopLoading) ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        {error && <div className="banner error-banner"><AlertCircle size={16} /><span>{error}</span></div>}

        {/* ═══════ CLIMATE OVERVIEW ═══════ */}
        {page === 'overview' && (
          <>
            <div className="banner info-banner">
              <Leaf size={16} />
              <span>
                <strong>Verified dataset:</strong> 1,098 daily NASA POWER records across Karachi, Lahore, and Islamabad (2024 full year).
                {location !== 'All' ? ` Viewing: ${location}.` : ' Viewing: All locations.'}
              </span>
            </div>

            <section className="stats-grid">
              <StatCard title="Average temperature" value={fmt(avgTemp)} unit="°C" sub={location === 'All' ? 'Across all 3 cities' : `2024 annual mean · ${location}`} icon={Thermometer} accent="#40d49b" />
              <StatCard title="Total rainfall" value={fmt(totalRain, 0)} unit="mm" sub={summaryRow ? `${summaryRow.rainy_days} rainy days (≥0.1 mm)` : 'Full-year precipitation'} icon={CloudRain} accent="#60c5f7" />
              <StatCard title="Average humidity" value={fmt(avgHumidity)} unit="%" sub={summaryRow ? `Min ${summaryRow.min_temp_c}°C · Max ${summaryRow.max_temp_c}°C` : 'Atmospheric moisture level'} icon={Droplets} accent="#63a8ff" />
              <StatCard title="Statistical anomalies" value={anomalyCount} unit="records" sub="Values exceeding 3σ threshold" icon={AlertTriangle} accent="#f59e0b" />
            </section>

            <section className="chart-grid">
              <article className="panel chart-panel">
                <div className="panel-heading">
                  <div>
                    <h3>{location === 'All' ? 'Daily temperature comparison' : `${location} daily temperature`}</h3>
                    <p>NASA POWER verified records · 2024</p>
                  </div>
                  <Thermometer size={17} color="#40d49b" />
                </div>
                {tempChartData.length > 0 ? (
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={tempChartData}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                        <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis unit="°C" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        {location === 'All' ? (
                          CITY_LIST.map(city => (
                            <Line key={city} type="monotone" dataKey={city} stroke={CITY_COLORS[city]} dot={false} strokeWidth={1.8} />
                          ))
                        ) : (
                          <Line type="monotone" dataKey="temperature" name={location} stroke={CITY_COLORS[location] ?? '#40d49b'} dot={false} strokeWidth={2} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="empty-chart">{loading ? 'Loading…' : 'No data.'}</div>
                )}
              </article>

              <article className="panel insight-panel">
                <div className="panel-heading">
                  <div><h3>Data quality</h3><p>Field availability</p></div>
                  <Activity size={17} color="#40d49b" />
                </div>
                {[
                  { name: 'Avg temperature', key: 'avg_temp_c',   color: '#40d49b' },
                  { name: 'Min temperature', key: 'min_temp_c',   color: '#63a8ff' },
                  { name: 'Max temperature', key: 'max_temp_c',   color: '#f87171' },
                  { name: 'Rainfall',        key: 'rainfall_mm',  color: '#60c5f7' },
                  { name: 'Humidity',        key: 'humidity_pct', color: '#bd91ff' },
                ].map(m => {
                  const avail = filteredRecords.filter(r => typeof r[m.key] === 'number').length
                  const pct   = filteredRecords.length ? (avail / filteredRecords.length) * 100 : 0
                  return (
                    <div className="quality-row" key={m.key}>
                      <div className="quality-label"><span>{m.name}</span><span>{avail}/{filteredRecords.length}</span></div>
                      <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%`, background: m.color }} /></div>
                    </div>
                  )
                })}
                <div className="insight-note">
                  <Activity size={14} />
                  <p>Missing values excluded from averages. No invented data.</p>
                </div>
              </article>
            </section>

            <section className="panel table-panel">
              <div className="panel-heading">
                <div><h3>Recent climate records</h3><p>All five measured fields per record</p></div>
                <span className="record-count">{filteredRecords.length} records</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Location</th><th>Avg °C</th><th>Min °C</th><th>Max °C</th><th>Rain mm</th><th>Humidity %</th><th>Source</th></tr>
                  </thead>
                  <tbody>
                    {filteredRecords.slice(0, 200).map((r, i) => (
                      <tr key={`${r.date}-${r.location}-${i}`}>
                        <td>{r.date}</td>
                        <td><span className="city-cell"><MapPin size={11} /> {r.location}</span></td>
                        <td>{r.avg_temp_c != null ? `${r.avg_temp_c} °C` : '—'}</td>
                        <td className="col-min">{r.min_temp_c != null ? `${r.min_temp_c} °C` : '—'}</td>
                        <td className="col-max">{r.max_temp_c != null ? `${r.max_temp_c} °C` : '—'}</td>
                        <td>{r.rainfall_mm != null ? r.rainfall_mm : '—'}</td>
                        <td>{r.humidity_pct != null ? `${r.humidity_pct}%` : '—'}</td>
                        <td><span className="source-tag">{r.source === 'sample_test_dataset' ? 'Sample' : (r.source ?? '—')}</span></td>
                      </tr>
                    ))}
                    {!loading && filteredRecords.length === 0 && (
                      <tr><td colSpan="8" className="empty-table">No records found.</td></tr>
                    )}
                  </tbody>
                </table>
                {filteredRecords.length > 200 && <p className="table-note">Showing 200 of {filteredRecords.length} records.</p>}
              </div>
            </section>
          </>
        )}

        {/* ═══════ MONTHLY TRENDS ═══════ */}
        {page === 'trends' && (
          <>
            {!loading && summary.length > 0 && (
              <section className="summary-strip">
                {summary.map(s => (
                  <article key={s.city} className="summary-city-card" style={{ '--city-color': CITY_COLORS[s.city] ?? '#40d49b' }}>
                    <div className="summary-city-header">
                      <span className="summary-city-dot" />
                      <strong>{s.city}</strong>
                    </div>
                    <div className="summary-stat-row">
                      <div><span>Mean</span><strong>{s.avg_temp_c}°C</strong></div>
                      <div><span>Min</span><strong className="col-min">{s.min_temp_c}°C</strong></div>
                      <div><span>Max</span><strong className="col-max">{s.max_temp_c}°C</strong></div>
                      <div><span>Rain</span><strong>{s.total_rainfall_mm}mm</strong></div>
                    </div>
                    <div className="summary-footer">
                      <span>{s.rainy_days} rainy days (≥0.1mm)</span>
                      <span>{s.record_count} days</span>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <section className="chart-grid">
              <article className="panel chart-panel">
                <div className="panel-heading">
                  <div><h3>Monthly precipitation (2024)</h3><p>Total rainfall in mm per month</p></div>
                  <CloudRain size={17} color="#60c5f7" />
                </div>
                {rainfallChartData.length > 0 ? (
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={rainfallChartData}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                        <XAxis dataKey="month" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis unit="mm" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        {location === 'All' ? (
                          CITY_LIST.map(city => <Bar key={city} dataKey={city} fill={CITY_COLORS[city]} radius={[3, 3, 0, 0]} />)
                        ) : (
                          <Bar dataKey={location} fill={CITY_COLORS[location] ?? '#60c5f7'} radius={[3, 3, 0, 0]} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="empty-chart">{loading ? 'Loading…' : 'No data.'}</div>
                )}
              </article>

              <article className="panel chart-panel">
                <div className="panel-heading">
                  <div><h3>Monthly mean temperature</h3><p>Seasonal curve across 2024</p></div>
                  <TrendingUp size={17} color="#40d49b" />
                </div>
                {monthly.length > 0 ? (
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={
                        (() => {
                          const byM = {}
                          monthly.forEach(m => {
                            byM[m.month] = { ...(byM[m.month] ?? {}), month: m.month.slice(5), [m.city]: m.avg_temp_c }
                          })
                          return Object.values(byM).sort((a, b) => a.month.localeCompare(b.month))
                        })()
                      }>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                        <XAxis dataKey="month" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis unit="°C" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        {CITY_LIST.map(city => (
                          <Line key={city} type="monotone" dataKey={city} stroke={CITY_COLORS[city]} strokeWidth={2} dot={{ r: 3 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="empty-chart">{loading ? 'Loading…' : 'No data.'}</div>
                )}
              </article>
            </section>
          </>
        )}

        {/* ═══════ 3-SIGMA ANOMALIES ═══════ */}
        {page === 'anomalies' && (
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h3>Statistical climate anomalies</h3>
                <p>Identified using the 3-sigma (3σ) rule per city: |value − mean| &gt; 3 × stddev</p>
              </div>
              <span className="anomaly-badge-count">{anomalies.length} total anomalies flagged</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Date</th><th>City</th><th>Field</th><th>Value</th><th>City mean</th><th>City stddev</th><th>Deviation</th><th>Z-score</th></tr>
                </thead>
                <tbody>
                  {anomalies.map((a, i) => (
                    <tr key={i} className="anomaly-row">
                      <td>{a.date}</td>
                      <td><span className="city-cell"><MapPin size={11} /> {a.city}</span></td>
                      <td><span className="field-badge">{a.field.replace('_c', ' °C').replace('_mm', ' mm').replace('_pct', ' %')}</span></td>
                      <td><strong className="anomaly-val">{a.value}</strong></td>
                      <td>{a.city_mean}</td>
                      <td>{a.city_std}</td>
                      <td className={a.deviation > 0 ? 'col-max' : 'col-min'}>{a.deviation > 0 ? `+${a.deviation}` : a.deviation}</td>
                      <td><span className="z-badge">|z| = {a.z_score}</span></td>
                    </tr>
                  ))}
                  {!loading && anomalies.length === 0 && (
                    <tr><td colSpan="8" className="empty-table">No anomalies detected in the dataset.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ═══════ CORRELATIONS ═══════ */}
        {page === 'correlations' && (
          <>
            <div className="banner info-banner">
              <GitMerge size={16} />
              <span><strong>Pearson r:</strong> Values near +1.0 indicate strong positive correlation, near −1.0 strong negative, near 0 no linear relationship.</span>
            </div>
            <section className="corr-grid">
              {correlations.map(c => (
                <article key={c.city} className="panel corr-card" style={{ '--city-color': CITY_COLORS[c.city] ?? '#40d49b' }}>
                  <div className="panel-heading">
                    <div><h3>{c.city}</h3><p>{c.n_records} daily records analysed</p></div>
                    <span className="corr-city-dot" style={{ background: CITY_COLORS[c.city] ?? '#40d49b' }} />
                  </div>
                  <div className="corr-pairs">
                    {[
                      { pair: 'Temp ↔ Humidity', r: c.temp_vs_humidity, desc: 'Hotter air typically holds more moisture; relative humidity often drops as temperature peaks.' },
                      { pair: 'Temp ↔ Rainfall', r: c.temp_vs_rainfall, desc: 'Monsoon precipitation events often coincide with distinct temperature shifts.' },
                      { pair: 'Rainfall ↔ Humidity', r: c.rainfall_vs_humidity, desc: 'Precipitation days consistently show elevated atmospheric relative humidity.' },
                    ].map(p => (
                      <div key={p.pair} className="corr-row">
                        <div className="corr-label-group">
                          <strong>{p.pair}</strong>
                          <p>{p.desc}</p>
                        </div>
                        <div className="corr-val-group">
                          <CorrBadge r={p.r} />
                          <div className="corr-bar-track">
                            <div className={`corr-bar-fill ${p.r >= 0 ? 'pos' : 'neg'}`} style={{ width: `${Math.abs(p.r ?? 0) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          </>
        )}

        {/* ═══════ PHASE 3 — ML PREDICTIONS ═══════ */}
        {page === 'ml' && (
          <>
            {mlError && <div className="banner error-banner"><AlertCircle size={16} /><span>{mlError}</span></div>}

            {/* Model Summary Cards */}
            {mlModels.length > 0 && (
              <section className="ml-models-overview">
                {mlModels.map(m => (
                  <div key={m.city} className="ml-model-card" style={{ '--card-city': CITY_COLORS[m.city] }}>
                    <div className="ml-model-card-top">
                      <span className="ml-card-dot" style={{ background: CITY_COLORS[m.city] }} />
                      <strong>{m.city} Model</strong>
                      <span className="ml-badge-r2">R² = {m.metrics.r2_score}</span>
                    </div>
                    <div className="ml-model-stats">
                      <div><span>MAE</span><strong>{m.metrics.mae_c}°C</strong></div>
                      <div><span>RMSE</span><strong>{m.metrics.rmse_c}°C</strong></div>
                      <div><span>Next 30d Avg</span><strong>{m.next_30_avg_predicted}°C</strong></div>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Controls Bar */}
            <div className="ml-controls-bar">
              <div className="ml-control-unit">
                <span className="ml-control-label">City:</span>
                <div className="ml-btn-group">
                  {CITY_LIST.map(c => (
                    <button key={c} className={`ml-toggle-btn${mlCity === c ? ' active' : ''}`} style={mlCity === c ? { background: CITY_COLORS[c], borderColor: CITY_COLORS[c] } : {}} onClick={() => setMlCity(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ml-control-unit">
                <span className="ml-control-label">Forecast Horizon:</span>
                <div className="ml-btn-group">
                  {[7, 14, 30, 60, 90].map(d => (
                    <button key={d} className={`ml-toggle-btn${mlDays === d ? ' active' : ''}`} onClick={() => setMlDays(d)}>
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prediction Chart */}
            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Seasonal Temperature Forecast — {mlCity}</h3>
                  <p>Linear trend + cyclical Fourier harmonic regression · Shaded 95% prediction interval</p>
                </div>
                <div className="ml-heading-badges">
                  {mlData && <span className="ml-tag">Horizon: {mlDays} days ahead</span>}
                </div>
              </div>

              {mlChartData.length > 0 ? (
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={mlChartData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={Math.floor(mlChartData.length / 10)} />
                      <YAxis unit="°C" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Area type="monotone" dataKey="upper" fill="#bd91ff" fillOpacity={0.12} stroke="none" name="95% Upper Bound" />
                      <Area type="monotone" dataKey="lower" fill="#bd91ff" fillOpacity={0.08} stroke="none" name="95% Lower Bound" />
                      <Line type="monotone" dataKey="hist" stroke={CITY_COLORS[mlCity] ?? '#40d49b'} dot={false} strokeWidth={1.8} name="Observed (2024)" />
                      <Line type="monotone" dataKey="pred" stroke="#f59e0b" strokeDasharray="5 3" dot={false} strokeWidth={2.2} name="Forecast" />
                      {mlData?.historical?.length && (
                        <ReferenceLine x={mlData.historical[mlData.historical.length - 1]?.date?.slice(5)} stroke="#f87171" strokeDasharray="2 2" label={{ value: 'Forecast Start', fill: '#f87171', fontSize: 10, position: 'top' }} />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-chart">{mlLoading ? 'Fitting model and predicting…' : 'No data.'}</div>
              )}
            </article>

            {/* Model Evaluation Metrics */}
            {mlData?.metrics && (
              <section className="ml-metrics-grid">
                <MetricCard label="R² Score" value={mlData.metrics.r2_score} unit="" sub="Variance explained by seasonality + trend" color="#40d49b" icon={Activity} />
                <MetricCard label="Mean Absolute Error (MAE)" value={mlData.metrics.mae_c} unit="°C" sub="Average deviation from actual reading" color="#63a8ff" icon={Thermometer} />
                <MetricCard label="Root Mean Squared Error" value={mlData.metrics.rmse_c} unit="°C" sub="Penalises large prediction errors" color="#bd91ff" icon={TrendingUp} />
                <MetricCard label="95% Interval Width" value={`±${mlData.metrics.prediction_interval_95_c}`} unit="°C" sub="Statistical confidence band half-width" color="#f59e0b" icon={GitMerge} />
                <MetricCard label="Records Trained" value={mlData.metrics.train_records} unit="days" sub="NASA POWER 2024 daily dataset" color="#60c5f7" icon={CloudRain} />
                <MetricCard label="Forecast Duration" value={mlDays} unit="days" sub="Predicted future daily temperatures" color="#ec4899" icon={Leaf} />
              </section>
            )}

            {/* Isolation Forest Anomaly Detection Section */}
            <article className="panel table-panel">
              <div className="panel-heading">
                <div>
                  <h3>Isolation Forest — Multi-Feature Anomaly Detection</h3>
                  <p>Unsupervised machine learning across all 5 dimensions simultaneously</p>
                </div>
                {mlIfData && (
                  <span className="anomaly-badge-count">{mlIfData.flagged_count} records flagged ({(mlIfData.contamination_rate * 100).toFixed(0)}% contamination)</span>
                )}
              </div>

              {mlIfData && (
                <>
                  <div className="if-breakdown-chips">
                    {Object.entries(mlIfData.city_breakdown ?? {}).map(([city, count]) => (
                      <div key={city} className="if-city-chip" style={{ '--chip-color': CITY_COLORS[city] ?? '#40d49b' }}>
                        <span className="if-chip-dot" />
                        <strong>{city}</strong>
                        <span>{count} outliers</span>
                      </div>
                    ))}
                    <div className="if-features-chip">
                      Features: {(mlIfData.features_used ?? []).join(', ')}
                    </div>
                  </div>

                  <div className="table-scroll" style={{ marginTop: 16 }}>
                    <p className="table-note" style={{ marginBottom: 8 }}>
                      Showing {ifCityFilter.length} anomalies for <strong style={{ color: CITY_COLORS[mlCity] }}>{mlCity}</strong> — sorted by anomaly score (lowest = most anomalous)
                    </p>
                    <table>
                      <thead>
                        <tr><th>Date</th><th>Avg °C</th><th>Min °C</th><th>Max °C</th><th>Rain mm</th><th>Humidity %</th><th>Score</th></tr>
                      </thead>
                      <tbody>
                        {ifCityFilter.slice(0, 50).map((a, i) => (
                          <tr key={i}>
                            <td>{a.date}</td>
                            <td><strong>{a.avg_temp_c}</strong></td>
                            <td className="col-min">{a.min_temp_c ?? '—'}</td>
                            <td className="col-max">{a.max_temp_c ?? '—'}</td>
                            <td>{a.rainfall_mm ?? '—'}</td>
                            <td>{a.humidity_pct ?? '—'}</td>
                            <td><span className="if-score">{a.anomaly_score.toFixed(4)}</span></td>
                          </tr>
                        ))}
                        {ifCityFilter.length === 0 && (
                          <tr><td colSpan="7" className="empty-table">No anomalies flagged for {mlCity}.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="if-method-note">
                    <Cpu size={13} color="#bd91ff" />
                    <p>
                      <strong>Isolation Forest</strong> isolates anomalies by randomly partitioning the feature space —
                      anomalous records require fewer splits to isolate. Score &lt; −0.1 indicates a strong outlier.
                    </p>
                  </div>
                </>
              )}
              {mlLoading && <div className="empty-chart" style={{ minHeight: 120 }}><div className="ml-loading-ring" /></div>}
            </article>
          </>
        )}

        {/* ═══════ PHASE 4 — HADOOP & MAPREDUCE ═══════ */}
        {page === 'hadoop' && (
          <>
            <div className="banner hadoop-banner">
              <Server size={18} color="#40d49b" />
              <div>
                <strong>Hadoop Distributed Processing Framework (HDFS + MapReduce)</strong>
                <p>Distributed storage simulation with 3 DataNodes, partitioned namespaces, and MapReduce Streaming pipelines.</p>
              </div>
            </div>

            {/* RBAC Notification Banner */}
            {rbacBanner && (
              <div className="banner rbac-banner">
                <Lock size={16} color="#f87171" />
                <span>{rbacBanner}</span>
                {currentUser?.role !== 'admin' && (
                  <button className="banner-switch-btn" onClick={() => quickSwitchRole('admin')}>
                    <Unlock size={13} /> Switch to Admin
                  </button>
                )}
              </div>
            )}

            {/* Cluster Architecture & Node Telemetry */}
            {hadoopStatus && (
              <section className="hadoop-cluster-grid">
                {/* NameNode Card */}
                <article className="hadoop-node-card namenode-card">
                  <div className="node-head">
                    <div className="node-icon namenode"><Server size={18} /></div>
                    <div>
                      <h4>NameNode Master</h4>
                      <span>{hadoopStatus.namenode.host}</span>
                    </div>
                    <span className="node-status-pill online">ACTIVE</span>
                  </div>
                  <div className="node-specs">
                    <div><span>Filesystem</span><strong>{hadoopStatus.storage.health}</strong></div>
                    <div><span>Block Size</span><strong>{hadoopStatus.namenode.block_size_mb} MB</strong></div>
                    <div><span>Replication</span><strong>{hadoopStatus.namenode.replication_factor}x</strong></div>
                    <div><span>Engine</span><strong>{hadoopStatus.namenode.version}</strong></div>
                  </div>
                </article>

                {/* 3 DataNodes */}
                {hadoopStatus.datanodes.map(dn => (
                  <article key={dn.id} className="hadoop-node-card">
                    <div className="node-head">
                      <div className="node-icon datanode"><HardDrive size={18} /></div>
                      <div>
                        <h4>{dn.id}</h4>
                        <span>{dn.host} · {dn.rack}</span>
                      </div>
                      <span className="node-status-pill online">{dn.status}</span>
                    </div>
                    <div className="node-storage-meter">
                      <div className="storage-meter-label">
                        <span>DFS Used</span>
                        <span>{dn.used_gb} / {dn.capacity_gb} GB</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${(dn.used_gb / dn.capacity_gb) * 100}%`, background: '#40d49b' }} />
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}

            {/* HDFS Partitioned Storage Summary */}
            {hadoopStatus?.hdfs_tree && (
              <section className="panel hdfs-partition-panel">
                <div className="panel-heading">
                  <div>
                    <h3>HDFS Partitioned Storage Tree</h3>
                    <p>Dataset partitioned by city directory: <code>/user/hadoop/climate/partitioned/{'{city}'}/data.csv</code></p>
                  </div>
                  <Database size={16} color="#63a8ff" />
                </div>
                <div className="hdfs-partition-grid">
                  <div className="hdfs-partition-box raw-box">
                    <div className="part-title">
                      <Terminal size={14} />
                      <strong>Raw Ingestion Path</strong>
                    </div>
                    <p><code>{hadoopStatus.hdfs_tree.raw.path}</code></p>
                    <div className="part-meta">
                      <span>{hadoopStatus.hdfs_tree.raw.records} records</span>
                      <span>1 Block · 3 Replicas</span>
                    </div>
                  </div>
                  {Object.entries(hadoopStatus.hdfs_tree.partitions || {}).map(([city, p]) => (
                    <div key={city} className="hdfs-partition-box">
                      <div className="part-title">
                        <span className="part-dot" style={{ background: CITY_COLORS[city] ?? '#40d49b' }} />
                        <strong>{city} Partition</strong>
                      </div>
                      <p><code>{p.hdfs_path}</code></p>
                      <div className="part-meta">
                        <span>{p.records} records</span>
                        <span>{(p.size_bytes / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* MapReduce Job Runner & Execution Console */}
            <section className="panel hadoop-console-panel">
              <div className="panel-heading">
                <div>
                  <h3>MapReduce YARN Execution Console</h3>
                  <p>Execute parallel streaming pipelines (Mapper ➔ Shuffle/Sort ➔ Reducer ➔ HDFS Output)</p>
                </div>
                <div className="rbac-status-indicator">
                  {currentUser?.role === 'admin' ? (
                    <span className="rbac-admin-badge"><ShieldCheck size={12} /> Admin Mode (Execution Granted)</span>
                  ) : (
                    <span className="rbac-analyst-badge"><Lock size={12} /> Analyst Mode (Read-Only)</span>
                  )}
                </div>
              </div>

              <div className="mr-runner-controls">
                <div className="mr-type-selector">
                  <button
                    className={`mr-type-btn${hadoopActiveJob === 'monthly' ? ' active' : ''}`}
                    onClick={() => { setHadoopActiveJob('monthly'); loadHadoop('monthly'); }}
                  >
                    <BarChart2 size={15} />
                    Monthly Climate Aggregation
                  </button>
                  <button
                    className={`mr-type-btn${hadoopActiveJob === 'extremes' ? ' active' : ''}`}
                    onClick={() => { setHadoopActiveJob('extremes'); loadHadoop('extremes'); }}
                  >
                    <AlertTriangle size={15} />
                    Extreme Weather Events
                  </button>
                </div>

                <div className="mr-action-group">
                  <select
                    className="hadoop-city-filter"
                    value={hadoopCityFilter}
                    onChange={e => setHadoopCityFilter(e.target.value)}
                  >
                    <option value="ALL">All City Partitions</option>
                    <option value="Karachi">Karachi Partition</option>
                    <option value="Lahore">Lahore Partition</option>
                    <option value="Islamabad">Islamabad Partition</option>
                  </select>

                  <button
                    className={`mr-run-btn ${currentUser?.role !== 'admin' ? 'restricted' : ''}`}
                    onClick={runMapReduceJob}
                    disabled={hadoopRunning}
                    title={currentUser?.role !== 'admin' ? 'Restricted: Only Admins can execute MapReduce jobs' : 'Run MapReduce Pipeline'}
                  >
                    {currentUser?.role === 'admin' ? (
                      <Play size={15} className={hadoopRunning ? 'spinning' : ''} />
                    ) : (
                      <Lock size={15} />
                    )}
                    {hadoopRunning ? 'Running MapReduce…' : currentUser?.role === 'admin' ? 'Execute MapReduce Job' : 'Execute (Admin Only)'}
                  </button>
                </div>
              </div>

              {/* Live Telemetry Display */}
              {hadoopLastJob && (
                <div className="mr-telemetry-container">
                  <div className="mr-telemetry-head">
                    <div>
                      <span className="mr-job-id"><CheckCircle2 size={14} color="#40d49b" /> {hadoopLastJob.job_id}</span>
                      <strong className="mr-job-name">{hadoopLastJob.job_name}</strong>
                    </div>
                    <div className="mr-time-badge">
                      Total Duration: <strong>{hadoopLastJob.execution_phases.total_duration_ms} ms</strong>
                    </div>
                  </div>

                  {/* 3 Pipeline Stages */}
                  <div className="mr-stages-grid">
                    <div className="mr-stage-card">
                      <div className="stage-top">
                        <span className="stage-num">STAGE 1</span>
                        <span className="stage-tag map">MAP PHASE</span>
                      </div>
                      <h4>Hadoop Streaming Mapper</h4>
                      <p>Parses CSV lines, extracts composite key &amp; metrics</p>
                      <div className="stage-metrics">
                        <span>Records In: <strong>{hadoopLastJob.counters.MAP_INPUT_RECORDS}</strong></span>
                        <span>Records Out: <strong>{hadoopLastJob.counters.MAP_OUTPUT_RECORDS}</strong></span>
                        <span>Duration: <strong>{hadoopLastJob.execution_phases.map_phase_ms} ms</strong></span>
                      </div>
                    </div>

                    <div className="mr-stage-card">
                      <div className="stage-top">
                        <span className="stage-num">STAGE 2</span>
                        <span className="stage-tag shuffle">SHUFFLE &amp; SORT</span>
                      </div>
                      <h4>Partitioning &amp; Key Grouping</h4>
                      <p>Hashes &amp; groups intermediate key-value pairs</p>
                      <div className="stage-metrics">
                        <span>Input Keys: <strong>{hadoopLastJob.counters.MAP_OUTPUT_RECORDS}</strong></span>
                        <span>Partitions: <strong>3 DataNodes</strong></span>
                        <span>Duration: <strong>{hadoopLastJob.execution_phases.shuffle_sort_ms} ms</strong></span>
                      </div>
                    </div>

                    <div className="mr-stage-card">
                      <div className="stage-top">
                        <span className="stage-num">STAGE 3</span>
                        <span className="stage-tag reduce">REDUCE PHASE</span>
                      </div>
                      <h4>Hadoop Streaming Reducer</h4>
                      <p>Aggregates groups, computes averages &amp; extremes</p>
                      <div className="stage-metrics">
                        <span>Output Rows: <strong>{hadoopLastJob.counters.REDUCE_OUTPUT_RECORDS}</strong></span>
                        <span>HDFS File: <strong>part-00000</strong></span>
                        <span>Duration: <strong>{hadoopLastJob.execution_phases.reduce_phase_ms} ms</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Hadoop Counters Table */}
                  <div className="mr-counters-row">
                    <div className="mr-counter-item">
                      <span>FILE_BYTES_READ</span>
                      <strong>{hadoopLastJob.counters.FILE_BYTES_READ.toLocaleString()} B</strong>
                    </div>
                    <div className="mr-counter-item">
                      <span>FILE_BYTES_WRITTEN</span>
                      <strong>{hadoopLastJob.counters.FILE_BYTES_WRITTEN.toLocaleString()} B</strong>
                    </div>
                    <div className="mr-counter-item">
                      <span>MAP_INPUT_RECORDS</span>
                      <strong>{hadoopLastJob.counters.MAP_INPUT_RECORDS.toLocaleString()}</strong>
                    </div>
                    <div className="mr-counter-item">
                      <span>REDUCE_OUTPUT_RECORDS</span>
                      <strong>{hadoopLastJob.counters.REDUCE_OUTPUT_RECORDS}</strong>
                    </div>
                    <div className="mr-counter-item">
                      <span>HDFS_OUTPUT_PATH</span>
                      <code>{hadoopLastJob.output_path}</code>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* MapReduce Output Results */}
            <article className="panel table-panel">
              <div className="panel-heading">
                <div>
                  <h3>MapReduce Output Data (HDFS <code>part-00000</code>)</h3>
                  <p>
                    {hadoopActiveJob === 'monthly'
                      ? 'Aggregated monthly climate statistics reduced across distributed blocks'
                      : 'City climate extremes (heatwaves, cold snaps, heavy rain thresholds)'}
                  </p>
                </div>
                <span className="record-count">{hadoopResults.length} reduced records</span>
              </div>

              <div className="table-scroll">
                {hadoopActiveJob === 'monthly' ? (
                  <table>
                    <thead>
                      <tr><th>City</th><th>Month</th><th>Avg Temp (°C)</th><th>Total Rain (mm)</th><th>Rainy Days</th><th>Avg Humidity (%)</th><th>Days Counted</th></tr>
                    </thead>
                    <tbody>
                      {hadoopResults.map((r, i) => (
                        <tr key={i}>
                          <td><span className="city-cell" style={{ color: CITY_COLORS[r.city] }}><MapPin size={11} /> {r.city}</span></td>
                          <td><strong>{r.month}</strong></td>
                          <td>{r.avg_temp} °C</td>
                          <td style={{ color: '#60c5f7' }}>{r.total_rainfall} mm</td>
                          <td>{r.rainy_days}</td>
                          <td>{r.avg_humidity} %</td>
                          <td><span className="record-badge">{r.record_count}</span></td>
                        </tr>
                      ))}
                      {!hadoopLoading && hadoopResults.length === 0 && (
                        <tr><td colSpan="7" className="empty-table">No MapReduce results found.</td></tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table>
                    <thead>
                      <tr><th>City</th><th>Max Recorded Temp</th><th>Min Recorded Temp</th><th>Max 24h Rain</th><th>Heatwave Days (≥38°C)</th><th>Cold Snap Days (≤8°C)</th><th>Heavy Rain Days (≥25mm)</th><th>Total Days</th></tr>
                    </thead>
                    <tbody>
                      {hadoopResults.map((r, i) => (
                        <tr key={i}>
                          <td><span className="city-cell" style={{ color: CITY_COLORS[r.city] }}><MapPin size={11} /> {r.city}</span></td>
                          <td><strong className="col-max">{r.max_temp} °C</strong></td>
                          <td><strong className="col-min">{r.min_temp} °C</strong></td>
                          <td style={{ color: '#60c5f7' }}><strong>{r.max_rainfall} mm</strong></td>
                          <td><span className="col-max">{r.heatwave_days} days</span></td>
                          <td><span className="col-min">{r.cold_snap_days} days</span></td>
                          <td><span style={{ color: '#60c5f7' }}>{r.heavy_rain_days} days</span></td>
                          <td>{r.total_days}</td>
                        </tr>
                      ))}
                      {!hadoopLoading && hadoopResults.length === 0 && (
                        <tr><td colSpan="8" className="empty-table">No MapReduce results found.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </article>

            {/* Hadoop Streaming Code Inspector */}
            <article className="panel hadoop-code-panel">
              <div className="panel-heading">
                <div>
                  <h3>Hadoop Streaming Pipeline Inspector</h3>
                  <p>View the exact Python MapReduce mapper and reducer scripts executing on Hadoop</p>
                </div>
                <Code2 size={16} color="#40d49b" />
              </div>

              <div className="code-tabs">
                {[
                  { id: 'mapper_monthly',   label: 'mapper_monthly.py',   badge: 'Mapper' },
                  { id: 'reducer_monthly',  label: 'reducer_monthly.py',  badge: 'Reducer' },
                  { id: 'mapper_extremes',  label: 'mapper_extremes.py',  badge: 'Mapper' },
                  { id: 'reducer_extremes', label: 'reducer_extremes.py', badge: 'Reducer' },
                  { id: 'hdfs_simulator',   label: 'hdfs_simulator.py',   badge: 'HDFS' },
                ].map(s => (
                  <button
                    key={s.id}
                    className={`code-tab-btn${hadoopActiveScript === s.id ? ' active' : ''}`}
                    onClick={() => { setHadoopActiveScript(s.id); loadHadoopCode(s.id); }}
                  >
                    <Terminal size={13} />
                    {s.label}
                    <span className="tab-pill">{s.badge}</span>
                  </button>
                ))}
              </div>

              <div className="code-block-wrapper">
                <pre className="hadoop-code-pre">
                  <code>{hadoopCode || '# Loading script…'}</code>
                </pre>
              </div>

              <div className="hadoop-shell-command-note">
                <Terminal size={13} color="#40d49b" />
                <span>
                  <strong>Hadoop CLI Equivalence:</strong>
                  <code>
                    hadoop jar $HADOOP_HOME/hadoop-streaming.jar -input /user/hadoop/climate/raw/climate_historical.csv -output /user/hadoop/climate/output/{hadoopActiveJob} -mapper "python {hadoopActiveScript}.py" -reducer "python {hadoopActiveScript.replace('mapper', 'reducer')}.py"
                  </code>
                </span>
              </div>
            </article>
          </>
        )}

        {/* ═══════ PHASE 6 — LIVE STREAMING FEED ═══════ */}
        {page === 'stream' && (
          <>
            <div className="banner stream-banner">
              <Radio size={18} color="#40d49b" />
              <div>
                <strong>Continuous IoT Meteorological Telemetry Pipeline</strong>
                <p>Simulating live automated weather stations transmitting readings every {streamInterval}s directly into MongoDB.</p>
              </div>
              <div className="stream-badge-pulse">
                <span className={`pulse-circle ${isStreaming ? 'on' : 'off'}`} />
                <span>{isStreaming ? 'STREAM ONLINE' : 'STREAM STANDBY'}</span>
              </div>
            </div>

            {/* Stream Telemetry Metric Cards */}
            <section className="stats-grid">
              <StatCard
                title="Packets Ingested"
                value={streamStatus?.total_packets ?? 0}
                unit="readings"
                sub="Live ingested into MongoDB"
                icon={Zap}
                accent="#40d49b"
              />
              <StatCard
                title="Ingestion Throughput"
                value={streamStatus?.throughput_per_min ?? 0}
                unit="rpm"
                sub="Readings per minute stream rate"
                icon={TrendingUp}
                accent="#60c5f7"
              />
              <StatCard
                title="Telemetry Interval"
                value={streamInterval}
                unit="seconds"
                sub="Sensor transmission period"
                icon={Activity}
                accent="#bd91ff"
              />
              <StatCard
                title="Active Weather Stations"
                value={3}
                unit="stations"
                sub="Karachi, Lahore & Islamabad"
                icon={Wifi}
                accent="#f59e0b"
              />
            </section>

            {/* Stream Control Console */}
            <article className="panel stream-control-panel">
              <div className="panel-heading">
                <div>
                  <h3>Sensor Stream Generator Controls</h3>
                  <p>Configure telemetry cadence, start/pause continuous ingestion, or inject instant readings</p>
                </div>
                <div className="stream-ctrl-actions">
                  <button
                    className={`stream-action-btn primary ${isStreaming ? 'running' : ''}`}
                    onClick={toggleStreaming}
                    disabled={streamLoading}
                  >
                    {isStreaming ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                    {isStreaming ? 'Pause Sensor Feed' : 'Start Live Telemetry'}
                  </button>
                  <button
                    className="stream-action-btn secondary"
                    onClick={emitSinglePacket}
                    title="Emit 1 instant sensor reading"
                  >
                    <Zap size={14} /> Inject Single Packet
                  </button>
                </div>
              </div>

              <div className="stream-settings-bar">
                <div className="stream-cadence-group">
                  <span className="setting-label">Transmission Cadence:</span>
                  <div className="cadence-btn-group">
                    {[
                      { sec: 1.0, label: '1s (High Speed)' },
                      { sec: 3.0, label: '3s (Standard)' },
                      { sec: 5.0, label: '5s (Eco Polling)' },
                    ].map(c => (
                      <button
                        key={c.sec}
                        className={`cadence-btn ${streamInterval === c.sec ? 'active' : ''}`}
                        onClick={() => {
                          setStreamInterval(c.sec)
                          if (isStreaming) {
                            fetch('/api/stream/start', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ interval: c.sec })
                            }).then(fetchStreamData)
                          }
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="stream-db-indicator">
                  <Database size={13} color="#40d49b" />
                  <span>Target: <code>earthscape_climate.climate_readings</code> (Auto-Persisted)</span>
                </div>
              </div>
            </article>

            {/* 3 Active Weather Stations Cards */}
            <section className="stream-stations-grid">
              {(streamStatus?.active_stations || [
                { id: 'STA-KHI-01', name: 'Karachi Coastal Observatory', city: 'Karachi', base_temp: 28.5 },
                { id: 'STA-LHE-02', name: 'Lahore Urban Center Station', city: 'Lahore', base_temp: 25.0 },
                { id: 'STA-ISB-03', name: 'Islamabad Margalla Foothills Radar', city: 'Islamabad', base_temp: 20.5 },
              ]).map(st => (
                <div key={st.id} className="station-card" style={{ '--st-color': CITY_COLORS[st.city] }}>
                  <div className="station-head">
                    <span className="station-dot" style={{ background: CITY_COLORS[st.city] }} />
                    <strong>{st.name}</strong>
                    <span className="station-status-tag">ONLINE</span>
                  </div>
                  <div className="station-sub">{st.id} · {st.city}</div>
                  <div className="station-metrics">
                    <div><span>Baseline</span><strong>{st.base_temp}°C</strong></div>
                    <div><span>Transmission</span><strong>IoT HTTP/SSE</strong></div>
                    <div><span>Latency</span><strong>~15 ms</strong></div>
                  </div>
                </div>
              ))}
            </section>

            {/* Rolling Sensor Chart */}
            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Real-Time Rolling Temperature &amp; Humidity Wave</h3>
                  <p>Streaming data buffer (last {rollingStreamChart.length} transmitted sensor packets)</p>
                </div>
                <Activity size={16} color="#40d49b" />
              </div>

              {rollingStreamChart.length > 0 ? (
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={rollingStreamChart}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                      <YAxis yAxisId="temp" unit="°C" stroke="#40d49b" tick={{ fill: '#40d49b', fontSize: 11 }} />
                      <YAxis yAxisId="hum" unit="%" orientation="right" stroke="#63a8ff" tick={{ fill: '#63a8ff', fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#40d49b" strokeWidth={2.2} dot={{ r: 3 }} />
                      <Line yAxisId="hum" type="monotone" dataKey="humidity" name="Relative Humidity (%)" stroke="#63a8ff" strokeWidth={1.8} strokeDasharray="4 2" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-chart">
                  <span>No live packets in buffer. Click "Start Live Telemetry" or "Inject Single Packet" above.</span>
                </div>
              )}
            </article>

            {/* Live Packet Ticker Stream Table */}
            <article className="panel table-panel">
              <div className="panel-heading">
                <div>
                  <h3>Real-Time Ingestion Feed</h3>
                  <p>Continuously streaming packets inserted into MongoDB with full meteorological variables</p>
                </div>
                <span className="record-count">{streamFeed.length} buffered packets</span>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Packet ID</th><th>Time</th><th>Station</th><th>City</th><th>Temp (°C)</th><th>Rain (mm)</th><th>Humidity (%)</th><th>Pressure</th><th>Wind</th><th>AQI</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {[...streamFeed].reverse().map((p, idx) => (
                      <tr key={p.packet_id || idx} className="stream-row-fade">
                        <td><code>{p.packet_id}</code></td>
                        <td>{p.time_display}</td>
                        <td><span className="station-name-pill">{p.station_name}</span></td>
                        <td><span className="city-cell" style={{ color: CITY_COLORS[p.location] }}><MapPin size={11} /> {p.location}</span></td>
                        <td><strong>{p.avg_temp_c}°C</strong></td>
                        <td style={{ color: p.rainfall_mm > 0 ? '#60c5f7' : 'inherit' }}>{p.rainfall_mm} mm</td>
                        <td>{p.humidity_pct}%</td>
                        <td>{p.pressure_hpa} hPa</td>
                        <td>{p.wind_speed_kmh} km/h {p.wind_direction}</td>
                        <td>
                          <span className={`aqi-pill ${p.aqi > 100 ? 'moderate' : 'good'}`}>{p.aqi} AQI</span>
                        </td>
                        <td><span className="ingested-badge"><CheckCircle2 size={11} /> INGESTED</span></td>
                      </tr>
                    ))}
                    {streamFeed.length === 0 && (
                      <tr><td colSpan="11" className="empty-table">Stream buffer empty. Start the generator above to see incoming packets.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </>
        )}

        {/* ═══════ PHASE 7 — ALERTS & INCIDENT RESPONSE ═══════ */}
        {page === 'alerts' && (
          <>
            <div className="banner alerts-banner">
              <AlertOctagon size={18} color="#f87171" />
              <div>
                <strong>Climate Emergency &amp; Threshold Monitoring Center</strong>
                <p>Automated threshold violation monitors, severity escalation, and municipal response workflows.</p>
              </div>
              <div className="alerts-badge-status">
                <span className="alert-ping-red" />
                <span>MONITORING ACTIVE</span>
              </div>
            </div>

            {alertFeedback && (
              <div className="banner success-banner">
                <CheckCircle2 size={16} />
                <span>{alertFeedback}</span>
              </div>
            )}

            {/* Summary Stat Cards */}
            <section className="stats-grid">
              <StatCard
                title="Unread Incidents"
                value={alertSummary?.unread ?? 0}
                unit="alerts"
                sub="Awaiting acknowledgement"
                icon={BellRing}
                accent="#f87171"
              />
              <StatCard
                title="Critical Warnings"
                value={alertSummary?.critical ?? 0}
                unit="events"
                sub="Extreme heatwaves & floods"
                icon={AlertOctagon}
                accent="#ef4444"
              />
              <StatCard
                title="Total Flagged"
                value={alertSummary?.total ?? 0}
                unit="incidents"
                sub="Documented since inception"
                icon={AlertTriangle}
                accent="#f59e0b"
              />
              <StatCard
                title="Threshold Monitors"
                value={5}
                unit="active rules"
                sub="Continuous automated checks"
                icon={Sliders}
                accent="#40d49b"
              />
            </section>

            {/* Threshold Rules & Emergency Simulation */}
            <article className="panel alert-rules-panel">
              <div className="panel-heading">
                <div>
                  <h3>Automated Alert Thresholds &amp; Simulation</h3>
                  <p>Fine-tune boundary parameters or trigger live test incidents for civil emergency drills</p>
                </div>
                <div className="sim-action-group">
                  <button className="sim-btn heatwave" onClick={() => triggerTestEmergency('heatwave', location === 'All' ? 'Karachi' : location)}>
                    <Zap size={13} /> Simulate Heatwave
                  </button>
                  <button className="sim-btn flood" onClick={() => triggerTestEmergency('heavy_rain', location === 'All' ? 'Islamabad' : location)}>
                    <CloudRain size={13} /> Simulate Cloudburst
                  </button>
                  <button className="sim-btn frost" onClick={() => triggerTestEmergency('cold_snap', location === 'All' ? 'Lahore' : location)}>
                    <Thermometer size={13} /> Simulate Frost
                  </button>
                </div>
              </div>

              <div className="rules-grid">
                {Object.values(alertRules).map(r => (
                  <div key={r.id} className="rule-card">
                    <div className="rule-head">
                      <strong>{r.name}</strong>
                      <span className={`rule-sev-badge ${r.severity.toLowerCase()}`}>{r.severity}</span>
                    </div>
                    <div className="rule-body">
                      <span>Condition: <code>{r.metric} {r.operator} {r.threshold} {r.unit}</code></span>
                      <p>{r.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* Incidents Management Table */}
            <article className="panel table-panel">
              <div className="panel-heading">
                <div>
                  <h3>Active Incident Response Ledger</h3>
                  <p>Filter by status, severity, and location to triage municipal alerts</p>
                </div>
                <div className="alert-filter-controls">
                  <select
                    value={alertFilterSev}
                    onChange={e => setAlertFilterSev(e.target.value)}
                    className="alert-select-filter"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">Critical Only</option>
                    <option value="WARNING">Warning Only</option>
                    <option value="ADVISORY">Advisory Only</option>
                  </select>

                  <select
                    value={alertFilterStatus}
                    onChange={e => setAlertFilterStatus(e.target.value)}
                    className="alert-select-filter"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="UNREAD">Unread Only</option>
                    <option value="ACKNOWLEDGED">Acknowledged</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Alert ID</th><th>Severity</th><th>Title</th><th>City</th><th>Trigger Metric</th><th>Actual</th><th>Threshold</th><th>Date</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.map(a => (
                      <tr key={a.alert_id} className={`alert-row ${a.status.toLowerCase()}`}>
                        <td><code>{a.alert_id}</code></td>
                        <td>
                          <span className={`sev-tag ${a.severity.toLowerCase()}`}>
                            {a.severity === 'CRITICAL' && <AlertOctagon size={11} />}
                            {a.severity === 'WARNING' && <AlertTriangle size={11} />}
                            {a.severity === 'ADVISORY' && <Activity size={11} />}
                            {a.severity}
                          </span>
                        </td>
                        <td><strong>{a.title}</strong></td>
                        <td><span className="city-cell" style={{ color: CITY_COLORS[a.location] }}><MapPin size={11} /> {a.location}</span></td>
                        <td>{a.metric}</td>
                        <td><strong className="col-max">{a.actual_value} {a.unit}</strong></td>
                        <td>{a.threshold} {a.unit}</td>
                        <td>{a.date}</td>
                        <td>
                          <span className={`status-pill ${a.status.toLowerCase()}`}>
                            {a.status === 'RESOLVED' && <CheckCheck size={11} />}
                            {a.status === 'ACKNOWLEDGED' && <Check size={11} />}
                            {a.status === 'UNREAD' && <Volume2 size={11} />}
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <div className="incident-action-btns">
                            {a.status === 'UNREAD' && (
                              <button className="incident-btn ack" onClick={() => acknowledgeAlert(a.alert_id)} title="Acknowledge Receipt">
                                Ack
                              </button>
                            )}
                            {a.status !== 'RESOLVED' && (
                              <button className="incident-btn resolve" onClick={() => resolveAlert(a.alert_id)} title="Mark Incident Resolved">
                                Resolve
                              </button>
                            )}
                            {a.status === 'RESOLVED' && (
                              <span className="resolved-check"><CheckCheck size={14} color="#40d49b" /> Closed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAlerts.length === 0 && (
                      <tr><td colSpan="10" className="empty-table">No alerts match the selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </>
        )}

        {/* ── Phase 8: Data Export Center ── */}
        {page === 'export' && (
          <>
            <header className="page-header">
              <div>
                <h1 className="page-title"><Download size={22} style={{marginRight:8,verticalAlign:'middle'}}/>Data Export Center</h1>
                <p className="page-sub">Download climate datasets in CSV or JSON format for external analysis and reporting.</p>
              </div>
            </header>

            <div className="export-panel">
              {/* Controls */}
              <article className="card" style={{marginBottom:0}}>
                <h3 className="card-title"><Sliders size={15}/> Export Configuration</h3>
                <div className="export-controls">
                  <div className="export-field">
                    <label>Dataset</label>
                    <select value={exportDataset} onChange={e => setExportDataset(e.target.value)}>
                      <option value="climate">Climate Readings (all fields)</option>
                      <option value="monthly">Monthly Aggregates</option>
                      <option value="anomalies">Statistical Anomalies (3σ)</option>
                    </select>
                  </div>
                  <div className="export-field">
                    <label>City Filter</label>
                    <select value={exportCity} onChange={e => setExportCity(e.target.value)}>
                      <option value="All">All Cities</option>
                      <option value="Karachi">Karachi</option>
                      <option value="Lahore">Lahore</option>
                      <option value="Islamabad">Islamabad</option>
                    </select>
                  </div>
                  <div className="export-actions">
                    <button className="export-btn preview-btn" onClick={fetchExportPreview} disabled={exportLoading}>
                      {exportLoading ? <><RotateCw size={14} className="spin"/> Loading…</> : <><BarChart3 size={14}/> Preview JSON</>}
                    </button>
                    <button className="export-btn download-btn" onClick={triggerCsvDownload}>
                      <FileDown size={14}/> Download CSV
                    </button>
                  </div>
                </div>
                {exportError && <div className="banner error-banner" style={{marginTop:12}}><AlertCircle size={14}/><span>{exportError}</span></div>}
              </article>

              {/* Stats row */}
              {exportPreview && (
                <div className="export-stats-row">
                  <div className="export-stat-card">
                    <span className="export-stat-num" style={{color:'#40d49b'}}>{exportPreview.count.toLocaleString()}</span>
                    <span className="export-stat-label">Records</span>
                  </div>
                  <div className="export-stat-card">
                    <span className="export-stat-num" style={{color:'#63a8ff'}}>{exportPreview.dataset}</span>
                    <span className="export-stat-label">Dataset</span>
                  </div>
                  <div className="export-stat-card">
                    <span className="export-stat-num" style={{color:'#bd91ff'}}>{exportPreview.city}</span>
                    <span className="export-stat-label">City Filter</span>
                  </div>
                  <div className="export-stat-card">
                    <span className="export-stat-num" style={{color:'#f59e0b'}}>
                      {(JSON.stringify(exportPreview.data).length / 1024).toFixed(1)} KB
                    </span>
                    <span className="export-stat-label">JSON Size</span>
                  </div>
                </div>
              )}

              {/* JSON Preview */}
              {exportPreview && (
                <article className="card" style={{marginBottom:0}}>
                  <h3 className="card-title"><Code2 size={15}/> JSON Preview (first 5 records)</h3>
                  <div className="export-json-preview">
                    <pre>{JSON.stringify(exportPreview.data.slice(0, 5), null, 2)}</pre>
                  </div>
                  <p className="export-json-meta">
                    Showing 5 of {exportPreview.count} records · Full export available via CSV download
                  </p>
                </article>
              )}

              {/* Export format guide */}
              <article className="card" style={{marginBottom:0}}>
                <h3 className="card-title"><Info size={15}/> Available Datasets & Fields</h3>
                <div className="export-guide-grid">
                  <div className="export-guide-card">
                    <div className="export-guide-icon" style={{background:'rgba(64,212,155,0.12)',color:'#40d49b'}}><Database size={18}/></div>
                    <h4>Climate Readings</h4>
                    <p>Full historical records from NASA POWER API. Fields: date, location, avg_temp_c, rainfall_mm, humidity_pct, wind_speed_ms, solar_radiation, source.</p>
                    <span className="export-guide-count">~1,100 records · NASA POWER</span>
                  </div>
                  <div className="export-guide-card">
                    <div className="export-guide-icon" style={{background:'rgba(99,168,255,0.12)',color:'#63a8ff'}}><BarChart2 size={18}/></div>
                    <h4>Monthly Aggregates</h4>
                    <p>Pre-aggregated monthly statistics per city via MongoDB pipeline. Fields: city, month, avg_temp_c, total_rain_mm, avg_humidity, count.</p>
                    <span className="export-guide-count">~36 groups · MongoDB aggregation</span>
                  </div>
                  <div className="export-guide-card">
                    <div className="export-guide-icon" style={{background:'rgba(189,145,255,0.12)',color:'#bd91ff'}}><AlertTriangle size={18}/></div>
                    <h4>Statistical Anomalies</h4>
                    <p>Records beyond 3σ standard deviation from the mean. Detected via Z-score algorithm. Fields: date, city, field, value, z_score, severity.</p>
                    <span className="export-guide-count">Variable count · Z-score 3σ</span>
                  </div>
                </div>
              </article>
            </div>
          </>
        )}

        {/* ── Phase 8: System Health Monitor ── */}
        {page === 'health' && (
          <>
            <header className="page-header">
              <div>
                <h1 className="page-title"><HardDrive size={22} style={{marginRight:8,verticalAlign:'middle'}}/>System Health Monitor</h1>
                <p className="page-sub">Real-time platform diagnostics — database, component status, and environment metrics.</p>
              </div>
              <div className="page-actions">
                <button className="stream-ctrl-btn" onClick={loadHealth} disabled={healthLoading}>
                  {healthLoading ? <RotateCw size={14} className="spin"/> : <RefreshCw size={14}/>}
                  {healthLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </header>

            {healthError && <div className="banner error-banner"><AlertCircle size={14}/><span>{healthError}</span></div>}

            {!healthData && !healthLoading && (
              <div className="empty-state">
                <HardDrive size={40} color="var(--muted)"/>
                <p>Click Refresh to load system health data</p>
                <button className="stream-ctrl-btn" onClick={loadHealth}>Load Health Report</button>
              </div>
            )}

            {healthData && (
              <>
                {/* KPI row */}
                <div className="health-kpi-row">
                  <div className="health-kpi-card">
                    <div className="health-kpi-icon" style={{color:'#40d49b',background:'rgba(64,212,155,0.12)'}}><Clock size={20}/></div>
                    <div>
                      <div className="health-kpi-value">{healthData.uptime}</div>
                      <div className="health-kpi-label">Server Uptime</div>
                    </div>
                  </div>
                  <div className="health-kpi-card">
                    <div className="health-kpi-icon" style={{color:'#63a8ff',background:'rgba(99,168,255,0.12)'}}><Database size={20}/></div>
                    <div>
                      <div className="health-kpi-value">{healthData.db_stats?.dataSize_mb ?? '—'} MB</div>
                      <div className="health-kpi-label">DB Data Size</div>
                    </div>
                  </div>
                  <div className="health-kpi-card">
                    <div className="health-kpi-icon" style={{color:'#bd91ff',background:'rgba(189,145,255,0.12)'}}><Layers size={20}/></div>
                    <div>
                      <div className="health-kpi-value">{(healthData.collection_counts?.climate_readings || 0).toLocaleString()}</div>
                      <div className="health-kpi-label">Climate Records</div>
                    </div>
                  </div>
                  <div className="health-kpi-card">
                    <div className="health-kpi-icon" style={{color:'#f59e0b',background:'rgba(245,158,11,0.12)'}}><Zap size={20}/></div>
                    <div>
                      <div className="health-kpi-value">{healthData.api_version}</div>
                      <div className="health-kpi-label">API Version</div>
                    </div>
                  </div>
                </div>

                <div className="health-grid">
                  {/* Component Status */}
                  <article className="card">
                    <h3 className="card-title"><Server size={15}/> Component Status</h3>
                    <div className="health-components">
                      {Object.entries(healthData.components || {}).map(([key, comp]) => (
                        <div key={key} className="health-component-row">
                          <div className={`health-status-dot ${comp.status}`}/>
                          <div className="health-component-info">
                            <span className="health-component-name">{comp.label}</span>
                            <span className={`health-component-status ${comp.status}`}>
                              {comp.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  {/* MongoDB Stats */}
                  <article className="card">
                    <h3 className="card-title"><Database size={15}/> MongoDB Statistics</h3>
                    <div className="health-db-stats">
                      <div className="health-db-row">
                        <span>Data Size</span><strong>{healthData.db_stats?.dataSize_mb} MB</strong>
                      </div>
                      <div className="health-db-row">
                        <span>Storage Size</span><strong>{healthData.db_stats?.storageSize_mb} MB</strong>
                      </div>
                      <div className="health-db-row">
                        <span>Collections</span><strong>{healthData.db_stats?.collections}</strong>
                      </div>
                      <div className="health-db-row">
                        <span>Indexes</span><strong>{healthData.db_stats?.indexes}</strong>
                      </div>
                      <div className="health-db-divider"/>
                      <div className="health-db-row">
                        <span>climate_readings</span>
                        <strong style={{color:'#40d49b'}}>{(healthData.collection_counts?.climate_readings||0).toLocaleString()}</strong>
                      </div>
                      <div className="health-db-row">
                        <span>users</span>
                        <strong style={{color:'#63a8ff'}}>{healthData.collection_counts?.users ?? 0}</strong>
                      </div>
                      <div className="health-db-row">
                        <span>alerts</span>
                        <strong style={{color:'#f87171'}}>{healthData.collection_counts?.alerts ?? 0}</strong>
                      </div>
                    </div>
                  </article>

                  {/* System Environment */}
                  <article className="card">
                    <h3 className="card-title"><Terminal size={15}/> Environment</h3>
                    <div className="health-db-stats">
                      <div className="health-db-row">
                        <span>Platform</span><strong>{healthData.system?.platform}</strong>
                      </div>
                      <div className="health-db-row">
                        <span>Architecture</span><strong>{healthData.system?.machine}</strong>
                      </div>
                      <div className="health-db-row">
                        <span>Python Version</span><strong>{healthData.system?.python_version}</strong>
                      </div>
                      <div className="health-db-row">
                        <span>API Version</span><strong>{healthData.api_version}</strong>
                      </div>
                      <div className="health-db-divider"/>
                      <div className="health-db-row">
                        <span>Last Refresh</span><strong style={{color:'var(--accent)'}}>{healthLastRefresh}</strong>
                      </div>
                    </div>
                  </article>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Phase 8: About Platform ── */}
        {page === 'about' && (
          <>
            <header className="page-header">
              <div>
                <h1 className="page-title"><Globe size={22} style={{marginRight:8,verticalAlign:'middle'}}/>About EarthScape Platform</h1>
                <p className="page-sub">Academic capstone project — full-stack climate intelligence system with AI/ML, big data, and real-time analytics.</p>
              </div>
            </header>

            <div className="about-layout">
              {/* Hero card */}
              <article className="card about-hero-card">
                <div className="about-hero-brand">
                  <div className="brand-mark" style={{width:64,height:64,borderRadius:18,fontSize:28}}><Leaf size={32}/></div>
                  <div>
                    <h2 className="about-platform-title">EarthScape Climate Intelligence Platform</h2>
                    <p className="about-platform-sub">Advanced Climate Data Analytics & Monitoring System</p>
                    <div className="about-badges">
                      <span className="about-badge green">v8.0.0 Capstone Edition</span>
                      <span className="about-badge blue">Academic Project</span>
                      <span className="about-badge purple">Full-Stack</span>
                    </div>
                  </div>
                </div>
                <p className="about-description">
                  EarthScape is a full-stack climate intelligence platform built as an academic capstone project. It demonstrates
                  end-to-end integration of modern data engineering, machine learning, distributed computing, real-time streaming,
                  role-based security, and interactive analytics — all applied to real NASA POWER climate data from major Pakistani cities.
                </p>
              </article>

              <div className="about-two-col">
                {/* Technology Stack */}
                <article className="card">
                  <h3 className="card-title"><Layers size={15}/> Technology Stack</h3>
                  <div className="about-tech-list">
                    {[
                      { icon: Server,      color:'#40d49b', name:'Flask (Python)',         desc:'REST API backend with CORS, blueprints' },
                      { icon: Database,    color:'#63a8ff', name:'MongoDB',                desc:'NoSQL data store with PyMongo driver' },
                      { icon: Cpu,         color:'#bd91ff', name:'scikit-learn',           desc:'ML forecasting + Isolation Forest anomaly detection' },
                      { icon: HardDrive,   color:'#f59e0b', name:'Hadoop MapReduce Sim',  desc:'Distributed batch computing engine' },
                      { icon: Radio,       color:'#f87171', name:'Real-Time Streaming',   desc:'Background thread + MongoDB SSE polling' },
                      { icon: ShieldCheck, color:'#40d49b', name:'JWT Auth + RBAC',       desc:'PBKDF2 hashing, role-based permissions' },
                      { icon: Bell,        color:'#f59e0b', name:'Alerts Engine',         desc:'Threshold monitoring + incident lifecycle' },
                      { icon: Activity,    color:'#63a8ff', name:'React + Recharts',      desc:'Interactive SPA with live charts' },
                    ].map(t => (
                      <div key={t.name} className="about-tech-row">
                        <t.icon size={15} color={t.color}/>
                        <div>
                          <strong>{t.name}</strong>
                          <span>{t.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Phase Checklist */}
                <article className="card">
                  <h3 className="card-title"><CheckCheck size={15}/> Capstone Phases</h3>
                  <div className="about-phase-list">
                    {[
                      { phase:'Phase 1', title:'Data Quality & Ingestion',        detail:'NASA POWER CSV ingestion, MongoDB storage, audit script, 3σ anomaly detection' },
                      { phase:'Phase 2', title:'Analytics & Visualization',       detail:'Climate overview, monthly trends, correlations, Pearson correlation engine' },
                      { phase:'Phase 3', title:'Machine Learning (scikit-learn)', detail:'Linear regression forecast, Isolation Forest anomaly detection, model registry' },
                      { phase:'Phase 4', title:'Hadoop & MapReduce',              detail:'Simulated distributed MapReduce engine, monthly avg + extremes jobs, HDFS storage' },
                      { phase:'Phase 5', title:'Authentication & RBAC',           detail:'JWT tokens, PBKDF2 hashing, admin/analyst roles, permission guards' },
                      { phase:'Phase 6', title:'Real-Time Streaming',             detail:'Background SSE generator, live rolling wave chart, MongoDB feed persistence' },
                      { phase:'Phase 7', title:'Notifications & Alerts',          detail:'Threshold rules, alert lifecycle (open→ack→resolved), bell dropdown, emergency drill' },
                      { phase:'Phase 8', title:'Capstone Polish & Exports',       detail:'Data Export Center (CSV/JSON), System Health Monitor, About page, final UI polish' },
                    ].map((p, i) => (
                      <div key={i} className="about-phase-row">
                        <div className="about-phase-badge">{p.phase}</div>
                        <div className="about-phase-content">
                          <strong>{p.title}</strong>
                          <span>{p.detail}</span>
                        </div>
                        <CheckCircle2 size={16} color="#40d49b"/>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              {/* Data & Stats */}
              <article className="card about-data-card">
                <h3 className="card-title"><Globe size={15}/> Climate Data Coverage</h3>
                <div className="about-data-grid">
                  <div className="about-data-item">
                    <span className="about-data-num" style={{color:'#40d49b'}}>1,098</span>
                    <span>NASA POWER Records</span>
                  </div>
                  <div className="about-data-item">
                    <span className="about-data-num" style={{color:'#63a8ff'}}>3</span>
                    <span>Pakistani Cities</span>
                  </div>
                  <div className="about-data-item">
                    <span className="about-data-num" style={{color:'#bd91ff'}}>366</span>
                    <span>Days Per City (2023)</span>
                  </div>
                  <div className="about-data-item">
                    <span className="about-data-num" style={{color:'#f59e0b'}}>8</span>
                    <span>Climate Variables</span>
                  </div>
                  <div className="about-data-item">
                    <span className="about-data-num" style={{color:'#f87171'}}>8</span>
                    <span>Platform Phases</span>
                  </div>
                  <div className="about-data-item">
                    <span className="about-data-num" style={{color:'#40d49b'}}>11</span>
                    <span>Backend Modules</span>
                  </div>
                </div>
              </article>
            </div>
          </>
        )}

        {/* ── Phase 9: Feedback & Support Desk (Aptech Requirement Page 5) ── */}
        {page === 'feedback' && (
          <>
            <header className="page-header">
              <div>
                <div className="eyebrow">APTECH REQUIREMENT COMPLIANCE · STAKEHOLDER SUPPORT</div>
                <h1 className="page-title"><LifeBuoy size={22} style={{marginRight:8,verticalAlign:'middle'}}/>Feedback & Support Desk</h1>
                <p className="page-sub">Direct assistance channel for climate stakeholders — submit observations, report anomalies, or log technical tickets.</p>
              </div>
              <div className="page-actions">
                <span className="status-pill active-admin">
                  <ShieldCheck size={14} /> 24/7 Agency Operations SLA
                </span>
              </div>
            </header>

            {feedbackSuccess && (
              <div className="banner success-banner">
                <CheckCircle2 size={16} />
                <span>{feedbackSuccess}</span>
              </div>
            )}

            <div className="feedback-layout">
              {/* Left Column: Feedback / Ticket Form */}
              <div className="feedback-form-col">
                <article className="card feedback-card">
                  <div className="card-header">
                    <div>
                      <span className="card-kicker">INTERACTIVE SUBMISSION</span>
                      <h2 className="card-title"><MessageSquare size={16}/> Submit Climate Observation or Support Request</h2>
                    </div>
                  </div>

                  <form className="feedback-form" onSubmit={handleFeedbackSubmit}>
                    <div className="form-row two-col">
                      <div className="form-group">
                        <label>Category / Issue Type</label>
                        <select value={feedbackCategory} onChange={e => setFeedbackCategory(e.target.value)}>
                          <option value="ANOMALY_REPORT">Climate Anomaly / Outlier Report</option>
                          <option value="DATA_QUALITY">Data Quality & Ingestion Inquiry</option>
                          <option value="MAPREDUCE_ISSUE">Hadoop MapReduce Pipeline Inquiry</option>
                          <option value="ML_FEEDBACK">Machine Learning Model Feedback</option>
                          <option value="ALERT_FEEDBACK">Alert Threshold & Incident Suggestion</option>
                          <option value="GENERAL">General Agency Feedback</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Priority Level</label>
                        <select value={feedbackPriority} onChange={e => setFeedbackPriority(e.target.value)}>
                          <option value="NORMAL">Normal Advisory (24h response)</option>
                          <option value="HIGH">High Priority (4h response)</option>
                          <option value="CRITICAL">Critical Incident (Immediate drill)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row three-col">
                      <div className="form-group">
                        <label>Contact Name</label>
                        <input
                          type="text"
                          value={feedbackName}
                          onChange={e => setFeedbackName(e.target.value)}
                          placeholder="Your full name"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Official Email</label>
                        <input
                          type="email"
                          value={feedbackEmail}
                          onChange={e => setFeedbackEmail(e.target.value)}
                          placeholder="name@earthscape.org"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Affected Location</label>
                        <select value={feedbackCity} onChange={e => setFeedbackCity(e.target.value)}>
                          <option value="All">All Locations</option>
                          <option value="Islamabad">Islamabad</option>
                          <option value="Karachi">Karachi</option>
                          <option value="Lahore">Lahore</option>
                          <option value="Peshawar">Peshawar</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Subject / Summary</label>
                      <input
                        type="text"
                        value={feedbackSubject}
                        onChange={e => setFeedbackSubject(e.target.value)}
                        placeholder="e.g. Unusually low night temperature reading observed in Islamabad"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Detailed Message & Supporting Context</label>
                      <textarea
                        rows={4}
                        value={feedbackMessage}
                        onChange={e => setFeedbackMessage(e.target.value)}
                        placeholder="Describe the climate event, data anomaly, or technical inquiry with relevant dates or metrics..."
                        required
                      />
                    </div>

                    <div className="form-actions" style={{display:'flex',justifyContent:'flex-end',marginTop:14}}>
                      <button type="submit" className="export-btn download-btn">
                        <Send size={14} /> Submit Feedback Ticket
                      </button>
                    </div>
                  </form>
                </article>

                {/* Submitted Tickets Ledger */}
                <article className="card" style={{marginTop: 20}}>
                  <div className="card-header">
                    <div>
                      <span className="card-kicker">DISPATCH LEDGER</span>
                      <h2 className="card-title"><Clock size={16}/> Active Agency Support & Anomaly Log</h2>
                    </div>
                    <span className="table-count">{submittedTickets.length} tickets recorded</span>
                  </div>

                  <div className="tickets-list">
                    {submittedTickets.map(t => (
                      <div key={t.id} className="ticket-item">
                        <div className="ticket-top">
                          <span className="ticket-id">{t.id}</span>
                          <span className={`severity-badge ${t.priority.toLowerCase()}`}>{t.priority}</span>
                          <span className="ticket-status-pill">{t.status}</span>
                          <span className="ticket-date">{t.date}</span>
                        </div>
                        <h4 className="ticket-subject">{t.subject}</h4>
                        <div className="ticket-meta">
                          <span><strong>Category:</strong> {t.category}</span>
                          <span><strong>Location:</strong> {t.city}</span>
                          <span><strong>Reporter:</strong> {t.author}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              {/* Right Column: Support Contacts & FAQs */}
              <div className="feedback-side-col">
                {/* Agency Contacts */}
                <article className="card">
                  <h3 className="card-title"><Info size={16}/> Agency Support Contacts</h3>
                  <div className="agency-contact-list">
                    <div className="agency-contact-item">
                      <strong>National Operations Center</strong>
                      <span>EarthScape Climate Agency, Sector G-5, Islamabad</span>
                      <small style={{color:'var(--accent)'}}>Hotline: +92 (51) 800-CLIMATE</small>
                    </div>
                    <div className="agency-contact-item">
                      <strong>Climate Data Desk</strong>
                      <span>Email: support@earthscape.org</span>
                      <small>SLA: 24/7 Automated Threshold Telemetry</small>
                    </div>
                    <div className="agency-contact-item">
                      <strong>Academic Mentorship</strong>
                      <span>Aptech eProject Evaluation Committee</span>
                      <small>Reference: Big Data Climate Analytics (6th Sem)</small>
                    </div>
                  </div>
                </article>

                {/* FAQ Knowledge Base */}
                <article className="card" style={{marginTop: 20}}>
                  <h3 className="card-title"><Code2 size={16}/> Knowledge Base & FAQs</h3>
                  <div className="faq-list">
                    <div className="faq-item">
                      <strong>How are 3-sigma anomalies detected?</strong>
                      <p>Readings departing more than 3 standard deviations (&gt;3σ) from the city-wide historical average are flagged as extreme anomalies.</p>
                    </div>
                    <div className="faq-item">
                      <strong>How does the Hadoop simulator process data?</strong>
                      <p>It executes pure-Python MapReduce streaming jobs (Map → Shuffle/Sort → Reduce) stored directly in virtual HDFS storage blocks.</p>
                    </div>
                    <div className="faq-item">
                      <strong>How to adjust emergency threshold rules?</strong>
                      <p>Switch to the <em>Administrator</em> account using the user switcher, then navigate to <em>Alerts &amp; Incidents</em> to edit rules in real-time.</p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </>
        )}

        <footer className="footer">
          <span>© EarthScape Climate Agency · Academic Capstone Edition</span>
          <span><span className="status-dot" /> Connected to local climate API · Authenticated as {currentUser?.name || 'Guest'} ({currentUser?.role?.toUpperCase() || 'ANALYST'})</span>
        </footer>

      </main>

      {/* ── Auth / RBAC Modal ── */}
      {showAuthModal && (
        <div className="modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div className="auth-brand-badge">
                <Leaf size={18} color="#40d49b" />
                <h3>EarthScape Authentication</h3>
              </div>
              <button className="auth-close-btn" onClick={() => setShowAuthModal(false)}>✕</button>
            </div>

            <p className="auth-modal-sub">
              Role-Based Access Control (RBAC): Sign in to access elevated climate computation privileges or switch testing accounts.
            </p>

            {authError && <div className="banner error-banner" style={{ margin: '12px 0' }}><AlertCircle size={15} /><span>{authError}</span></div>}

            {/* Quick Demo Accounts Selection */}
            <div className="demo-accounts-box">
              <span className="demo-accounts-label">Instant 1-Click Role Switch (Testing):</span>
              <div className="demo-accounts-grid">
                {demoAccounts.map(acc => (
                  <button
                    key={acc.role}
                    className={`demo-acc-card ${acc.role} ${currentUser?.role === acc.role ? 'selected' : ''}`}
                    onClick={() => loginWithCredentials(acc.email, acc.password_hint)}
                    disabled={authLoading}
                  >
                    <div className="demo-acc-head">
                      {acc.role === 'admin' ? <ShieldCheck size={16} color="#40d49b" /> : <Shield size={16} color="#63a8ff" />}
                      <strong>{acc.name}</strong>
                      <span className={`role-badge ${acc.role}`}>{acc.role.toUpperCase()}</span>
                    </div>
                    <p className="demo-acc-title">{acc.title}</p>
                    <p className="demo-acc-perm">{acc.permissions_summary}</p>
                    <span className="demo-acc-btn">Switch to this Account ➔</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="auth-divider"><span>OR SIGN IN MANUALLY</span></div>

            <form onSubmit={e => { e.preventDefault(); loginWithCredentials(authEmail, authPassword); }}>
              <div className="auth-field">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. admin@earthscape.org"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  required
                />
              </div>

              <div className="auth-field">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  required
                />
              </div>

              <div className="auth-form-actions">
                <button type="submit" className="auth-submit-btn" disabled={authLoading}>
                  {authLoading ? 'Signing in…' : 'Sign In'}
                </button>
                {currentUser && (
                  <button type="button" className="auth-signout-btn" onClick={logout}>
                    <LogOut size={14} /> Sign Out
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
