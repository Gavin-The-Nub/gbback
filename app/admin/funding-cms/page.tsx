"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import {
  Loader2,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Sparkles,
  HelpCircle,
  CreditCard,
  CircleDollarSign,
  Handshake,
  School,
  Users,
  BarChart3,
  Globe,
  Settings,
  AlignLeft,
  AlignRight,
  Info
} from "lucide-react"

type SectionDetails = {
  left_col_title?: string
  left_col_text?: string
  left_col_bullets?: string[]
  left_col_style?: string
  left_col_extra_box_title?: string
  left_col_extra_box_bullets?: string[]
  left_col_extra_box_style?: string
  left_col_custom_cards?: { title: string; icon: string }[]
  right_col_title?: string
  right_col_text?: string
  right_col_bullets?: string[]
  right_col_bullets_numbered?: boolean
  right_col_style?: string
  right_col_extra_title?: string
  right_col_extra_bullets?: string[]
  right_col_extra_box_title?: string
  right_col_extra_box_text?: string
  right_col_extra_box_style?: string
  description_extra?: string
}

type Section = {
  id: string
  key: string
  title: string
  tag: string
  icon: string
  description: string
  details: SectionDetails
  sort_order: number
  created_at: string
}

const RECOMMENDED_ICONS = [
  "CircleDollarSign",
  "Handshake",
  "School",
  "CreditCard",
  "Users",
  "BarChart3",
  "Globe",
  "BookOpen",
  "GraduationCap",
  "Briefcase"
]

export default function FundingCMSPage() {
  const router = useRouter()
  const [sections, setSections] = useState<Section[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form tab state
  const [formTab, setFormTab] = useState<'general' | 'left' | 'right'>('general')

  // Form states
  const [editId, setEditId] = useState<string | null>(null)
  const [key, setKey] = useState("")
  const [title, setTitle] = useState("")
  const [tag, setTag] = useState("")
  const [icon, setIcon] = useState("")
  const [description, setDescription] = useState("")
  const [sortOrder, setSortOrder] = useState("")

  // Form Details states
  const [leftColTitle, setLeftColTitle] = useState("")
  const [leftColText, setLeftColText] = useState("")
  const [leftColBullets, setLeftColBullets] = useState("")
  const [leftColStyle, setLeftColStyle] = useState("default")
  const [leftColExtraBoxTitle, setLeftColExtraBoxTitle] = useState("")
  const [leftColExtraBoxBullets, setLeftColExtraBoxBullets] = useState("")
  const [leftColExtraBoxStyle, setLeftColExtraBoxStyle] = useState("")
  const [leftColCustomCardsJson, setLeftColCustomCardsJson] = useState("")

  const [rightColTitle, setRightColTitle] = useState("")
  const [rightColText, setRightColText] = useState("")
  const [rightColBullets, setRightColBullets] = useState("")
  const [rightColBulletsNumbered, setRightColBulletsNumbered] = useState(false)
  const [rightColStyle, setRightColStyle] = useState("default")
  const [rightColExtraTitle, setRightColExtraTitle] = useState("")
  const [rightColExtraBullets, setRightColExtraBullets] = useState("")
  const [rightColExtraBoxTitle, setRightColExtraBoxTitle] = useState("")
  const [rightColExtraBoxText, setRightColExtraBoxText] = useState("")
  const [rightColExtraBoxStyle, setRightColExtraBoxStyle] = useState("")
  
  const [descriptionExtra, setDescriptionExtra] = useState("")

  useEffect(() => {
    checkAuth()
    loadSections()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/auth/login")
      return
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      router.push("/auth/login")
      return
    }
  }

  const loadSections = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("funding_access_sections")
        .select("*")
        .order("sort_order", { ascending: true })

      if (error) throw error
      setSections(data || [])
    } catch (error: any) {
      console.error("Error loading sections:", error)
      toast.error("Failed to load funding overview sections")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditStart = (sec: Section) => {
    setEditId(sec.id)
    setKey(sec.key)
    setTitle(sec.title)
    setTag(sec.tag)
    setIcon(sec.icon)
    setDescription(sec.description)
    setSortOrder(sec.sort_order.toString())

    // Populate details fields
    const details = sec.details || {}
    setLeftColTitle(details.left_col_title || "")
    setLeftColText(details.left_col_text || "")
    setLeftColBullets(details.left_col_bullets?.join("\n") || "")
    setLeftColStyle(details.left_col_style || "default")
    setLeftColExtraBoxTitle(details.left_col_extra_box_title || "")
    setLeftColExtraBoxBullets(details.left_col_extra_box_bullets?.join("\n") || "")
    setLeftColExtraBoxStyle(details.left_col_extra_box_style || "")
    setLeftColCustomCardsJson(details.left_col_custom_cards ? JSON.stringify(details.left_col_custom_cards, null, 2) : "")

    setRightColTitle(details.right_col_title || "")
    setRightColText(details.right_col_text || "")
    setRightColBullets(details.right_col_bullets?.join("\n") || "")
    setRightColBulletsNumbered(!!details.right_col_bullets_numbered)
    setRightColStyle(details.right_col_style || "default")
    setRightColExtraTitle(details.right_col_extra_title || "")
    setRightColExtraBullets(details.right_col_extra_bullets?.join("\n") || "")
    setRightColExtraBoxTitle(details.right_col_extra_box_title || "")
    setRightColExtraBoxText(details.right_col_extra_box_text || "")
    setRightColExtraBoxStyle(details.right_col_extra_box_style || "")
    
    setDescriptionExtra(details.description_extra || "")
  }

  const resetForm = () => {
    setEditId(null)
    setKey("")
    setTitle("")
    setTag("")
    setIcon("")
    setDescription("")
    setSortOrder("")

    // Reset details fields
    setLeftColTitle("")
    setLeftColText("")
    setLeftColBullets("")
    setLeftColStyle("default")
    setLeftColExtraBoxTitle("")
    setLeftColExtraBoxBullets("")
    setLeftColExtraBoxStyle("")
    setLeftColCustomCardsJson("")

    setRightColTitle("")
    setRightColText("")
    setRightColBullets("")
    setRightColBulletsNumbered(false)
    setRightColStyle("default")
    setRightColExtraTitle("")
    setRightColExtraBullets("")
    setRightColExtraBoxTitle("")
    setRightColExtraBoxText("")
    setRightColExtraBoxStyle("")
    
    setDescriptionExtra("")
    
    setFormTab("general")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!key.trim()) {
      toast.error("Unique key cannot be empty.")
      return
    }

    if (!title.trim()) {
      toast.error("Title cannot be empty.")
      return
    }

    // Validate left custom cards JSON if present
    let leftColCustomCards = undefined
    if (leftColCustomCardsJson.trim()) {
      try {
        leftColCustomCards = JSON.parse(leftColCustomCardsJson)
        if (!Array.isArray(leftColCustomCards)) throw new Error("Must be an array")
      } catch (err: any) {
        toast.error("Invalid custom cards JSON format: " + err.message)
        return
      }
    }

    setSubmitting(true)
    try {
      const detailsObj: SectionDetails = {}

      if (leftColTitle.trim()) detailsObj.left_col_title = leftColTitle.trim()
      if (leftColText.trim()) detailsObj.left_col_text = leftColText.trim()
      if (leftColBullets.trim()) {
        detailsObj.left_col_bullets = leftColBullets.split("\n").map(b => b.trim()).filter(Boolean)
      }
      if (leftColStyle !== "default") detailsObj.left_col_style = leftColStyle
      if (leftColExtraBoxTitle.trim()) detailsObj.left_col_extra_box_title = leftColExtraBoxTitle.trim()
      if (leftColExtraBoxBullets.trim()) {
        detailsObj.left_col_extra_box_bullets = leftColExtraBoxBullets.split("\n").map(b => b.trim()).filter(Boolean)
      }
      if (leftColExtraBoxStyle) detailsObj.left_col_extra_box_style = leftColExtraBoxStyle
      if (leftColCustomCards) detailsObj.left_col_custom_cards = leftColCustomCards

      if (rightColTitle.trim()) detailsObj.right_col_title = rightColTitle.trim()
      if (rightColText.trim()) detailsObj.right_col_text = rightColText.trim()
      if (rightColBullets.trim()) {
        detailsObj.right_col_bullets = rightColBullets.split("\n").map(b => b.trim()).filter(Boolean)
      }
      if (rightColBulletsNumbered) detailsObj.right_col_bullets_numbered = true
      if (rightColStyle !== "default") detailsObj.right_col_style = rightColStyle
      if (rightColExtraTitle.trim()) detailsObj.right_col_extra_title = rightColExtraTitle.trim()
      if (rightColExtraBullets.trim()) {
        detailsObj.right_col_extra_bullets = rightColExtraBullets.split("\n").map(b => b.trim()).filter(Boolean)
      }
      if (rightColExtraBoxTitle.trim()) detailsObj.right_col_extra_box_title = rightColExtraBoxTitle.trim()
      if (rightColExtraBoxText.trim()) detailsObj.right_col_extra_box_text = rightColExtraBoxText.trim()
      if (rightColExtraBoxStyle) detailsObj.right_col_extra_box_style = rightColExtraBoxStyle
      
      if (descriptionExtra.trim()) detailsObj.description_extra = descriptionExtra.trim()

      const parsedSortOrder = parseInt(sortOrder) || 0

      if (editId) {
        // Update
        const { error } = await supabase
          .from("funding_access_sections")
          .update({
            title: title.trim(),
            tag: tag.trim(),
            icon: icon.trim() || "CircleDollarSign",
            description: description.trim(),
            details: detailsObj,
            sort_order: parsedSortOrder
          })
          .eq("id", editId)

        if (error) throw error
        toast.success("Funding section updated successfully!")
      } else {
        // Create
        const { error } = await supabase
          .from("funding_access_sections")
          .insert([
            {
              key: key.trim().toLowerCase(),
              title: title.trim(),
              tag: tag.trim(),
              icon: icon.trim() || "CircleDollarSign",
              description: description.trim(),
              details: detailsObj,
              sort_order: parsedSortOrder || (sections.length + 1) * 10
            }
          ])

        if (error) throw error
        toast.success("Funding section added successfully!")
      }

      resetForm()
      loadSections()
    } catch (error: any) {
      console.error("Save error:", error)
      toast.error(error.message || "Failed to save funding section.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sections.length) return

    const newSections = [...sections]
    const temp = newSections[index]
    newSections[index] = newSections[targetIndex]
    newSections[targetIndex] = temp

    const recalculated = newSections.map((sec, idx) => ({
      ...sec,
      sort_order: (idx + 1) * 10
    }))

    setSections(recalculated)

    try {
      const updates = recalculated.map(sec => ({
        id: sec.id,
        sort_order: sec.sort_order
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from("funding_access_sections")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id)
        if (error) throw error
      }

      toast.success("Display order updated!")
      loadSections()
    } catch (error: any) {
      console.error("Reorder error:", error)
      toast.error("Failed to save sorting changes. Reverting...")
      loadSections()
    }
  }

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete "${label}"? This item will be removed immediately from the live public website.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from("funding_access_sections")
        .delete()
        .eq("id", id)

      if (error) throw error

      toast.success("Funding section deleted!")
      loadSections()
    } catch (error: any) {
      console.error("Deletion error:", error)
      toast.error(error.message || "Failed to delete section")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="lg:pl-64 flex-1 flex flex-col">
        <Header userName="Admin User" role="admin" />
        <main className="p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto space-y-8">

          {/* Header Block */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <CreditCard size={24} />
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                  Funding & Access CMS
                </h1>
              </div>
              <p className="text-slate-500 mt-2 text-sm md:text-base">
                Manage the "Funding & Access Overview" accordion cards on the front-end Programs page dynamically.
              </p>
            </div>
            <button
              onClick={loadSections}
              className="flex items-center justify-center gap-2 self-start md:self-auto px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all font-semibold rounded-lg text-sm border border-slate-200 cursor-pointer"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Editor Form Column */}
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 h-fit overflow-hidden flex flex-col">
              
              {/* Form Header */}
              <div className="flex items-center gap-2 p-5 border-b border-slate-100 bg-slate-50/50">
                <Sparkles size={20} className="text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">
                  {editId ? "Edit Accordion Item" : "Create Accordion Item"}
                </h2>
              </div>

              {/* Tab Navigation in Editor */}
              <div className="flex border-b border-slate-100 text-xs font-bold text-slate-500 bg-slate-50/20">
                <button
                  type="button"
                  onClick={() => setFormTab('general')}
                  className={`flex-1 py-3 border-b-2 text-center flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    formTab === 'general'
                      ? "border-indigo-600 text-indigo-600 bg-white"
                      : "border-transparent hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Settings size={14} />
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('left')}
                  className={`flex-1 py-3 border-b-2 text-center flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    formTab === 'left'
                      ? "border-indigo-600 text-indigo-600 bg-white"
                      : "border-transparent hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <AlignLeft size={14} />
                  Left Col
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('right')}
                  className={`flex-1 py-3 border-b-2 text-center flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    formTab === 'right'
                      ? "border-indigo-600 text-indigo-600 bg-white"
                      : "border-transparent hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <AlignRight size={14} />
                  Right Col
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                
                {formTab === 'general' && (
                  <div className="space-y-4">
                    {/* Key Input */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Unique Section Key
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. subsidized, sponsored, my-custom-key"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        disabled={!!editId}
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                      />
                      <p className="text-[10px] text-slate-400">Used as the Accordion item value key in frontend.</p>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Card Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Subsidized Programs (Cost-Shared Support)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    {/* Subtitle / Tag */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Tag Line / Subtitle
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Shared Funding Model"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    {/* Icon Name selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Lucide Icon Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CircleDollarSign, Handshake"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <div className="flex flex-wrap gap-1">
                        {RECOMMENDED_ICONS.map(rec => (
                          <button
                            key={rec}
                            type="button"
                            onClick={() => setIcon(rec)}
                            className={`px-2 py-0.5 text-[10px] font-medium rounded border cursor-pointer ${
                              icon === rec
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {rec}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Main Description */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Main Description Paragraph
                      </label>
                      <textarea
                        rows={4}
                        placeholder="The introductory paragraph rendered inside the Accordion body..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                      />
                    </div>

                    {/* Sort Order */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 10, 20"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                {formTab === 'left' && (
                  <div className="space-y-4">
                    {/* Left Column Title */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Left Column Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Provider Participation Model"
                        value={leftColTitle}
                        onChange={(e) => setLeftColTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    {/* Left Column Text */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Left Column Description Text
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Introductory text before bullets..."
                        value={leftColText}
                        onChange={(e) => setLeftColText(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                      />
                    </div>

                    {/* Left Column Bullets */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Left Column Bullets (One per line)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Bullet item 1&#10;Bullet item 2&#10;Bullet item 3"
                        value={leftColBullets}
                        onChange={(e) => setLeftColBullets(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                      />
                    </div>

                    {/* Left Column Style */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Left Column Style / Style Box
                      </label>
                      <select
                        value={leftColStyle}
                        onChange={(e) => setLeftColStyle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="default">Default (List Style)</option>
                        <option value="indigo-box">Indigo Accent Background Box</option>
                      </select>
                    </div>

                    {/* Left Column Extra Box Title (Safeguards) */}
                    <div className="space-y-1 border-t border-slate-100 pt-3">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Extra Box Title (e.g. Safeguards)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Safeguards"
                        value={leftColExtraBoxTitle}
                        onChange={(e) => setLeftColExtraBoxTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    {/* Left Column Extra Box Bullets */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Extra Box Bullets (One per line)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Not cash or financial instruments&#10;Not transferable"
                        value={leftColExtraBoxBullets}
                        onChange={(e) => setLeftColExtraBoxBullets(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                      />
                    </div>

                    {/* Left Column Extra Box Style */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Extra Box Styling Color
                      </label>
                      <select
                        value={leftColExtraBoxStyle}
                        onChange={(e) => setLeftColExtraBoxStyle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">None (Disabled)</option>
                        <option value="red-box">Red Alert Box</option>
                        <option value="blue-box">Blue Alert Box</option>
                      </select>
                    </div>

                    {/* Custom cards json (For priority cards) */}
                    <div className="space-y-1 border-t border-slate-100 pt-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Custom Cards JSON (Optional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder='[{"title": "Card Title", "icon": "Users"}]'
                        value={leftColCustomCardsJson}
                        onChange={(e) => setLeftColCustomCardsJson(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                      />
                      <p className="text-[10px] text-slate-400">Must be an array of objects containing title and icon keys.</p>
                    </div>

                    {/* Description Extra (e.g. vetted network italic warning) */}
                    <div className="space-y-1 border-t border-slate-100 pt-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Extra Page/Accordion Warning (Italic)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="All providers—whether GBFF-approved or school-aligned—operate under structured standards."
                        value={descriptionExtra}
                        onChange={(e) => setDescriptionExtra(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                      />
                    </div>
                  </div>
                )}

                {formTab === 'right' && (
                  <div className="space-y-4">
                    {/* Right Column Title */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Right Column Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Benefits"
                        value={rightColTitle}
                        onChange={(e) => setRightColTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    {/* Right Column Text */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Right Column Description Text
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Introductory text before right-side bullets..."
                        value={rightColText}
                        onChange={(e) => setRightColText(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                      />
                    </div>

                    {/* Right Column Bullets */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Right Column Bullets (One per line)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Lower per-student cost&#10;Flexible budget usage"
                        value={rightColBullets}
                        onChange={(e) => setRightColBullets(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                      />
                    </div>

                    {/* Right Column Bullets Numbered */}
                    <div className="flex items-center gap-2">
                      <input
                        id="numbered"
                        type="checkbox"
                        checked={rightColBulletsNumbered}
                        onChange={(e) => setRightColBulletsNumbered(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <label htmlFor="numbered" className="text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
                        Use Numbered Lists instead of checks
                      </label>
                    </div>

                    {/* Right Column Style */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Right Column Bullet Box Style
                      </label>
                      <select
                        value={rightColStyle}
                        onChange={(e) => setRightColStyle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="default">Default Checks List</option>
                        <option value="emerald-pills">Emerald Highlight Pills (Success checks)</option>
                        <option value="indigo-box">Indigo Colored Box List</option>
                      </select>
                    </div>

                    {/* Right Column Extra Box Title (Key Clarifications, What this solves) */}
                    <div className="space-y-1 border-t border-slate-100 pt-3">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Extra Box/List Title (e.g. What This Solves)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. What This Solves / Key Clarification"
                        value={rightColExtraTitle}
                        onChange={(e) => setRightColExtraTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    {/* Right Column Extra Bullets */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Extra Box Bullets (One per line)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Prevents pricing disputes&#10;Ensures accountability"
                        value={rightColExtraBullets}
                        onChange={(e) => setRightColExtraBullets(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                      />
                    </div>

                    {/* Right Column Extra Highlight Box Title */}
                    <div className="space-y-1 border-t border-slate-100 pt-3">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Extra Accent Box Title (e.g. Key Clarification)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Key Clarification"
                        value={rightColExtraBoxTitle}
                        onChange={(e) => setRightColExtraBoxTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    {/* Right Column Extra Highlight Box Text */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Extra Accent Box Text (Paragraph)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Key clarification text..."
                        value={rightColExtraBoxText}
                        onChange={(e) => setRightColExtraBoxText(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                      />
                    </div>

                    {/* Right Column Extra Highlight Box Style */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Extra Accent Box Styling Design
                      </label>
                      <select
                        value={rightColExtraBoxStyle}
                        onChange={(e) => setRightColExtraBoxStyle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">None (Disabled)</option>
                        <option value="dashed-box">Dashed Primary Box (Rounded 2rem)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Submit / Cancel Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  {editId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 py-2 px-3 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer border border-slate-200 text-xs text-center"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 px-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl transition shadow-md flex items-center justify-center gap-1 cursor-pointer text-xs"
                  >
                    {submitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Plus size={14} />
                        {editId ? "Save Changes" : "Create Item"}
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>

            {/* List and Tabs Column */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px] flex flex-col">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 shrink-0">
                <h3 className="font-bold text-slate-800 text-lg">
                  Active Accordion Cards ({sections.length})
                </h3>
                <div className="flex items-center gap-1.5 text-slate-400" title="Accordion cards render from top-to-bottom based on sort order">
                  <Info size={14} />
                  <span className="text-xs font-medium">Re-order dynamically</span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <Loader2 size={40} className="animate-spin text-indigo-500" />
                  <p className="font-semibold text-sm">Loading dynamic CMS data...</p>
                </div>
              ) : sections.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-full">
                    <CreditCard size={48} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">No active CMS sections</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm">
                      Use the creation form on the left to add items to the Funding & Access Overview section.
                    </p>
                  </div>
                </div>
              ) : (
                /* Accordion Sections List */
                <div className="space-y-4 flex-1">
                  {sections.map((sec, index) => (
                    <div
                      key={sec.id}
                      className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border border-slate-100 rounded-xl hover:border-slate-200 bg-slate-50/30 hover:bg-slate-50/80 transition-all group"
                    >
                      {/* Sort Badge & Icon */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          #{index + 1}
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-indigo-600 flex items-center justify-center">
                          <span className="font-bold text-xxs truncate max-w-[36px]">{sec.icon}</span>
                        </div>
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0 space-y-0.5 w-full">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-800 text-sm truncate">
                            {sec.title}
                          </h4>
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold rounded">
                            {sec.tag}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs line-clamp-1 italic">
                          {sec.description}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Key: {sec.key} | Sort Order: {sec.sort_order}
                        </p>
                      </div>

                      {/* Action buttons (Move Up, Down, Edit, Delete) */}
                      <div className="flex items-center gap-1 shrink-0 self-end md:self-auto border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end">
                        
                        {/* Move Up */}
                        <button
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          className={`p-2 rounded-lg border border-slate-200 transition ${
                            index === 0
                              ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                              : "bg-white text-slate-600 hover:bg-slate-100 hover:text-indigo-600 cursor-pointer shadow-sm"
                          }`}
                          title="Move Up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        
                        {/* Move Down */}
                        <button
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === sections.length - 1}
                          className={`p-2 rounded-lg border border-slate-200 transition ${
                            index === sections.length - 1
                              ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                              : "bg-white text-slate-600 hover:bg-slate-100 hover:text-indigo-600 cursor-pointer shadow-sm"
                          }`}
                          title="Move Down"
                        >
                          <ArrowDown size={14} />
                        </button>

                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        {/* Edit */}
                        <button
                          onClick={() => handleEditStart(sec)}
                          className="p-2 bg-white text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-100 rounded-lg hover:bg-indigo-50 transition cursor-pointer shadow-sm"
                          title="Edit Section Content"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(sec.id, sec.title)}
                          className="p-2 bg-white text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-lg hover:bg-rose-50 transition cursor-pointer shadow-sm"
                          title="Delete Section Option"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </main>
      </div>
    </div>
  )
}
