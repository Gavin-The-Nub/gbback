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
  Edit, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  HelpCircle, 
  Info, 
  Sparkles, 
  RefreshCw, 
  X, 
  Coins,
  Eye,
  FileText
} from "lucide-react"

type Denomination = {
  id: string
  amount: number
  label: string
  description: string | null
  show_on_landing: boolean
  show_in_dropdown: boolean
  sort_order: number
  created_at: string
}

export default function DenominationCMSPage() {
  const router = useRouter()
  const [denominations, setDenominations] = useState<Denomination[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<'landing' | 'dropdown'>('landing')

  // Form states
  const [editId, setEditId] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [label, setLabel] = useState("")
  const [description, setDescription] = useState("")
  const [displayType, setDisplayType] = useState<'landing' | 'dropdown'>('landing')

  useEffect(() => {
    checkAuth()
    loadDenominations()
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

  const loadDenominations = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("voucher_denominations")
        .select("*")
        .order("sort_order", { ascending: true })

      if (error) throw error
      setDenominations(data || [])
    } catch (error: any) {
      console.error("Error loading denominations:", error)
      toast.error("Failed to load voucher denominations")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditStart = (den: Denomination) => {
    setEditId(den.id)
    setAmount(den.amount.toString())
    setLabel(den.label)
    setDescription(den.description || "")
    setDisplayType(den.show_on_landing ? 'landing' : 'dropdown')
  }

  const resetForm = () => {
    setEditId(null)
    setAmount("")
    setLabel("")
    setDescription("")
    // Sync display type with current active list tab for convenience
    setDisplayType(activeTab)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      toast.error("Amount must be a positive number or zero.")
      return
    }

    if (!label.trim()) {
      toast.error("Label cannot be empty.")
      return
    }

    setSubmitting(true)
    try {
      const showOnLanding = displayType === 'landing'
      const showInDropdown = displayType === 'dropdown'

      if (editId) {
        // Update
        const { error } = await supabase
          .from("voucher_denominations")
          .update({
            amount: parsedAmount,
            label: label.trim(),
            description: showInDropdown ? (description.trim() || null) : null, // clear description if marketing tag
            show_on_landing: showOnLanding,
            show_in_dropdown: showInDropdown,
          })
          .eq("id", editId)

        if (error) throw error
        toast.success("Denomination updated successfully!")
      } else {
        // Create
        const groupItems = denominations.filter(d => showOnLanding ? d.show_on_landing : d.show_in_dropdown)
        const maxSortOrder = groupItems.reduce((max, d) => d.sort_order > max ? d.sort_order : max, 0)
        
        const { error } = await supabase
          .from("voucher_denominations")
          .insert([
            {
              amount: parsedAmount,
              label: label.trim(),
              description: showInDropdown ? (description.trim() || null) : null,
              show_on_landing: showOnLanding,
              show_in_dropdown: showInDropdown,
              sort_order: maxSortOrder + 10,
            }
          ])

        if (error) throw error
        toast.success("Denomination added successfully!")
      }

      resetForm()
      loadDenominations()
    } catch (error: any) {
      console.error("Save error:", error)
      toast.error(error.message || "Failed to save denomination.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleMove = async (filteredIndex: number, direction: 'up' | 'down') => {
    const targetFilteredIndex = direction === 'up' ? filteredIndex - 1 : filteredIndex + 1
    
    const groupItems = denominations.filter(d => 
      activeTab === 'landing' ? d.show_on_landing : d.show_in_dropdown
    )
    
    if (targetFilteredIndex < 0 || targetFilteredIndex >= groupItems.length) return

    const newGroup = [...groupItems]
    const temp = newGroup[filteredIndex]
    newGroup[filteredIndex] = newGroup[targetFilteredIndex]
    newGroup[targetFilteredIndex] = temp

    const recalculatedGroup = newGroup.map((den, idx) => ({
      ...den,
      sort_order: (idx + 1) * 10
    }))

    // Optimistic UI Swap
    setDenominations(prev => prev.map(den => {
      const updated = recalculatedGroup.find(r => r.id === den.id)
      return updated ? updated : den
    }).sort((a, b) => a.sort_order - b.sort_order))

    try {
      const updates = recalculatedGroup.map(den => ({
        id: den.id,
        sort_order: den.sort_order
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from("voucher_denominations")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id)
        if (error) throw error
      }
      
      toast.success("Display order updated!")
      loadDenominations()
    } catch (error: any) {
      console.error("Reorder error:", error)
      toast.error("Failed to save sorting changes. Reverting...")
      loadDenominations()
    }
  }

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete "${label}"? This option will disappear instantly from your live frontend/forms.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from("voucher_denominations")
        .delete()
        .eq("id", id)

      if (error) throw error

      toast.success("Denomination deleted!")
      loadDenominations()
    } catch (error: any) {
      console.error("Deletion error:", error)
      toast.error(error.message || "Failed to delete denomination")
    }
  }

  // Filter list items based on active list tab
  const filteredDenominations = denominations.filter(d => 
    activeTab === 'landing' ? d.show_on_landing : d.show_in_dropdown
  )

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
                  <Coins size={24} />
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                  Voucher Denominations CMS
                </h1>
              </div>
              <p className="text-slate-500 mt-2 text-sm md:text-base">
                Configure voucher denominations easily. We've separated public landing page amount tags from actual support application dropdowns for a clean administrative experience.
              </p>
            </div>
            <button
              onClick={loadDenominations}
              className="flex items-center justify-center gap-2 self-start md:self-auto px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all font-semibold rounded-lg text-sm border border-slate-200 cursor-pointer"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Form Column */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <Sparkles size={20} className="text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-800">
                  {editId ? "Edit Denomination" : "Create Option"}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Display Type Selector (Radio Blocks) */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Voucher Option Type
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDisplayType('landing')}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        displayType === 'landing'
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <Eye size={16} />
                      Marketing Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayType('dropdown')}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        displayType === 'dropdown'
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <FileText size={16} />
                      Dropdown Option
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-1">
                  <label htmlFor="amount" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Amount Value ($)
                  </label>
                  <input
                    id="amount"
                    type="number"
                    placeholder={displayType === 'landing' ? "e.g. 500 (0 for Custom)" : "e.g. 300, 1000"}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                {/* Label Input */}
                <div className="space-y-1">
                  <label htmlFor="label" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Display Label
                  </label>
                  <input
                    id="label"
                    type="text"
                    placeholder={displayType === 'landing' ? "e.g. $500 or Custom" : "e.g. $300 (Amazon Supplies)"}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                {/* Description Input (Conditional) */}
                {displayType === 'dropdown' && (
                  <div className="space-y-1">
                    <label htmlFor="description" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Policy Description Alert
                    </label>
                    <textarea
                      id="description"
                      rows={4}
                      placeholder="Alert guidelines paragraph rendered when a school selects this amount in their form..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                    />
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex gap-2 pt-2">
                  {editId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 py-2.5 px-4 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer border border-slate-200 text-sm text-center"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 px-4 font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {submitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Plus size={16} />
                        {editId ? "Save Changes" : "Create Option"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* List and Tabs Column */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px] flex flex-col">
              
              {/* Tab Selector Buttons */}
              <div className="flex border-b border-slate-200 mb-6 bg-slate-50 p-1.5 rounded-xl gap-1 shrink-0">
                <button
                  onClick={() => { setActiveTab('landing'); resetForm(); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'landing'
                      ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Eye size={16} />
                  Public Landing Page ({denominations.filter(d => d.show_on_landing).length})
                </button>
                <button
                  onClick={() => { setActiveTab('dropdown'); resetForm(); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'dropdown'
                      ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <FileText size={16} />
                  Application Dropdowns ({denominations.filter(d => d.show_in_dropdown).length})
                </button>
              </div>

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <Loader2 size={40} className="animate-spin text-indigo-500" />
                  <p className="font-semibold text-sm">Fetching dynamic items...</p>
                </div>
              ) : filteredDenominations.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-full">
                    <Coins size={48} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">No active items in this category</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm">
                      Use the creation form on the left to add items to this display group.
                    </p>
                  </div>
                </div>
              ) : (
                /* Filtered Options Grid */
                <div className="space-y-4 flex-1">
                  {filteredDenominations.map((den, index) => (
                    <div
                      key={den.id}
                      className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border border-slate-100 rounded-xl hover:border-slate-200 bg-slate-50/30 hover:bg-slate-50/80 transition-all group"
                    >
                      {/* Numeric Index Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          #{index + 1}
                        </div>
                        <div className="px-3 py-1 bg-white text-slate-700 rounded-lg text-sm font-extrabold border border-slate-200">
                          ${den.amount.toLocaleString()}
                        </div>
                      </div>

                      {/* Details & Policy description preview */}
                      <div className="flex-1 min-w-0 space-y-1 w-full">
                        <h4 className="font-bold text-slate-800 text-sm">
                          {den.label}
                        </h4>
                        
                        {den.description && (
                          <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 text-xxs line-clamp-2 italic leading-relaxed">
                            <span className="font-semibold text-slate-600 block mb-0.5 not-italic">Selected Policy Guidelines:</span>
                            "{den.description}"
                          </div>
                        )}
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
                          disabled={index === filteredDenominations.length - 1}
                          className={`p-2 rounded-lg border border-slate-200 transition ${
                            index === filteredDenominations.length - 1
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
                          onClick={() => handleEditStart(den)}
                          className="p-2 bg-white text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-100 rounded-lg hover:bg-indigo-50 transition cursor-pointer shadow-sm"
                          title="Edit denomination"
                        >
                          <Edit size={14} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(den.id, den.label)}
                          className="p-2 bg-white text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-lg hover:bg-rose-50 transition cursor-pointer shadow-sm"
                          title="Delete option"
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
