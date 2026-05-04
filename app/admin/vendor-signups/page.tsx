"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { Loader2, CheckCircle, XCircle, Building2, Mail, Phone, MapPin, CreditCard, Clock, Search } from "lucide-react"

type VendorSignup = {
  id: string
  user_id: string | null
  email: string
  vendor_name: string
  vendor_type: string
  country: string
  contact_name: string
  contact_phone: string | null
  status: "submitted" | "under_review" | "approved" | "active" | "suspended" | "cancelled" | "waitlisted" | "rejected"
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  bank_name: string | null
  account_name: string | null
  account_number: string | null
  bank_code: string | null
  payment_notes: string | null
  created_at: string
}

export default function VendorSignupsPage() {
  const router = useRouter()
  const [signups, setSignups] = useState<VendorSignup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalData, setModalData] = useState<{
    id: string;
    status: VendorSignup["status"];
    title: string;
    placeholder: string;
    required?: boolean;
  } | null>(null)
  const [modalNotes, setModalNotes] = useState("")

  useEffect(() => {
    checkAuth()
    loadSignups()
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

  const loadSignups = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("vendor_signups")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setSignups(data || [])
    } catch (error: any) {
      console.error("Error loading signups:", error)
      toast.error("Failed to load vendor signups")
    } finally {
      setIsLoading(false)
    }
  }

  const openModal = (id: string, status: VendorSignup["status"], title: string, placeholder: string = "Enter notes (optional)...", required: boolean = false) => {
    setModalData({ id, status, title, placeholder, required })
    setModalNotes("")
    setIsModalOpen(true)
  }

  const handleModalSubmit = async () => {
    if (modalData) {
      if (modalData.required && !modalNotes.trim()) {
        toast.error("A reason is required for this action")
        return
      }
      setIsModalOpen(false) // Close early but wait for the update
      await handleStatusChange(modalData.id, modalData.status, modalNotes)
      setModalData(null)
    }
  }

  const handleStatusChange = async (
    signupId: string,
    newStatus: VendorSignup["status"],
    notes?: string
  ) => {
    setIsUpdating(signupId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const signup = signups.find(s => s.id === signupId)
      if (!signup) throw new Error("Signup not found")

      // Update signup status
      const updateData: any = {
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      }



      const { error: updateError } = await supabase
        .from("vendor_signups")
        .update(updateData)
        .eq("id", signupId)

      if (updateError) throw updateError

      if (newStatus === "approved" || newStatus === "active" || newStatus === "suspended") {
        // Use the stored user_id from the signup
        if (!signup.user_id) {
          // If we're just suspending a signup that hasn't been approved yet (no user_id), 
          // we don't need to update a profile
          if (newStatus === "suspended") {
            // Just finish if no user_id and we're just suspending the signup request
          } else {
            throw new Error("User ID not found in signup record")
          }
        } else {
          // Check if profile already exists
          const { data: existing } = await supabase
            .from("vendor_profiles")
            .select("id")
            .eq("id", signup.user_id)
            .single()

          if (!existing) {
            // Only create profile for approved/active
            if (newStatus === "approved" || newStatus === "active") {
              const { error: profileError } = await supabase
                .from("vendor_profiles")
                .insert([
                  {
                    id: signup.user_id,
                    vendor_name: signup.vendor_name,
                    vendor_type: signup.vendor_type,
                    country: signup.country,
                    contact_name: signup.contact_name,
                    contact_phone: signup.contact_phone,
                    status: newStatus === "approved" ? "active" : newStatus,
                    notes: notes || signup.notes,
                    bank_name: signup.bank_name,
                    account_name: signup.account_name,
                    account_number: signup.account_number,
                    bank_code: signup.bank_code,
                    payment_notes: signup.payment_notes,
                  },
                ])

              if (profileError) throw profileError
            }
          } else {
            // Update existing profile
            const { error: profileError } = await supabase
              .from("vendor_profiles")
              .update({
                vendor_name: signup.vendor_name,
                vendor_type: signup.vendor_type,
                country: signup.country,
                contact_name: signup.contact_name,
                contact_phone: signup.contact_phone,
                status: newStatus === "approved" ? "active" : newStatus,
                notes: notes || signup.notes,
                bank_name: signup.bank_name,
                account_name: signup.account_name,
                account_number: signup.account_number,
                bank_code: signup.bank_code,
                payment_notes: signup.payment_notes,
              })
              .eq("id", signup.user_id)

            if (profileError) throw profileError
          }
        }
      }

      toast.success(`Vendor signup ${newStatus} successfully!`)
      await loadSignups()
    } catch (error: any) {
      console.error("Error updating signup:", error)
      toast.error(error.message || "Failed to update signup")
    } finally {
      setIsUpdating(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64">
          <Header userName="Admin User" role="admin" />
          <main className="p-6">
            <div className="mb-8">
              <div className="h-9 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
            </div>

            {/* Stats Overview Skeleton */}
            <div className="grid gap-4 md:grid-cols-6 mb-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-12"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Content Skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="h-6 bg-gray-200 rounded w-48"></div>
                            <div className="h-4 bg-gray-200 rounded w-64"></div>
                          </div>
                          <div className="h-6 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          {[1, 2, 3, 4, 5, 6].map((j) => (
                            <div key={j} className="space-y-1">
                              <div className="h-3 bg-gray-200 rounded w-24"></div>
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-gray-200 flex-wrap">
                          <div className="h-10 bg-gray-200 rounded w-32"></div>
                          <div className="h-10 bg-gray-200 rounded w-32"></div>
                          <div className="h-10 bg-gray-200 rounded w-32"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const statusCounts = {
    all: signups.length,
    pending: signups.filter(s => s.status === "submitted" || s.status === "under_review").length,
    approved: signups.filter(s => s.status === "approved" || s.status === "active").length,
    waitlisted: signups.filter(s => s.status === "waitlisted").length,
    suspended: signups.filter(s => s.status === "suspended").length,
    rejected: signups.filter(s => s.status === "rejected" || s.status === "cancelled").length,
  }

  const filteredSignups = (selectedStatus === "all"
    ? signups
    : selectedStatus === "pending"
      ? signups.filter(s => s.status === "submitted" || s.status === "under_review")
      : selectedStatus === "approved"
        ? signups.filter(s => s.status === "approved" || s.status === "active")
        : selectedStatus === "rejected"
          ? signups.filter(s => s.status === "rejected" || s.status === "cancelled")
          : signups.filter(s => s.status === selectedStatus)
  ).filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.vendor_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.contact_name?.toLowerCase().includes(q) ||
      s.vendor_type?.toLowerCase().includes(q)
    );
  });

  const approvedCount = statusCounts.approved + statusCounts.active
  const rejectedCount = statusCounts.cancelled + statusCounts.rejected
  const waitlistedCount = statusCounts.waitlisted
  const underReviewCount = statusCounts.under_review

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-gray-100 text-gray-800"
      case "under_review":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
      case "active":
        return "bg-green-100 text-green-800"
      case "suspended":
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-800"
      case "waitlisted":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header userName="Admin User" role="admin" />
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Vendor Signup Approvals
            </h1>
            <p className="text-gray-600">Review and approve vendor registration requests</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
            <div 
              onClick={() => setSelectedStatus('all')}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition ${selectedStatus === 'all' ? 'border-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="text-2xl font-bold text-indigo-600">{statusCounts.all}</div>
              <div className="text-sm text-gray-600">Total Signups</div>
            </div>
            <div 
              onClick={() => setSelectedStatus('pending')}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition ${selectedStatus === 'pending' ? 'border-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="text-2xl font-bold text-gray-900">{statusCounts.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div 
              onClick={() => setSelectedStatus('approved')}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition ${selectedStatus === 'approved' ? 'border-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="text-2xl font-bold text-green-600">{statusCounts.approved}</div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
            <div 
              onClick={() => setSelectedStatus('waitlisted')}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition ${selectedStatus === 'waitlisted' ? 'border-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="text-2xl font-bold text-orange-600">{statusCounts.waitlisted}</div>
              <div className="text-sm text-gray-600">Waitlisted</div>
            </div>
            <div 
              onClick={() => setSelectedStatus('suspended')}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition ${selectedStatus === 'suspended' ? 'border-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="text-2xl font-bold text-red-600">{statusCounts.suspended}</div>
              <div className="text-sm text-gray-600">Suspended</div>
            </div>
            <div 
              onClick={() => setSelectedStatus('rejected')}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition ${selectedStatus === 'rejected' ? 'border-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="text-2xl font-bold text-red-600">{statusCounts.rejected}</div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </div>

          <div className="mb-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by vendor name, email, contact, or type..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {selectedStatus === "all" ? "All Signups" : `${selectedStatus.replace("_", " ").toUpperCase()} Signups`}
            </h2>
            {filteredSignups.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No vendor signups found</p>
            ) : (
              <div className="space-y-6">
                {filteredSignups.map((signup) => (
                  <div key={signup.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-indigo-600" />
                          {signup.vendor_name}

                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{signup.email}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(signup.status)}`}>
                        {signup.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-600">Vendor Type</p>
                        <p className="font-medium text-gray-900">{signup.vendor_type}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Country</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {signup.country}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Contact Name</p>
                        <p className="font-medium text-gray-900">{signup.contact_name}</p>
                      </div>
                      {signup.contact_phone && (
                        <div>
                          <p className="text-gray-600">Contact Phone</p>
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {signup.contact_phone}
                          </p>
                        </div>
                      )}
                      {signup.notes && (
                        <div className="md:col-span-3">
                          <p className="text-gray-600">Notes</p>
                          <p className="font-medium text-gray-900">{signup.notes}</p>
                        </div>
                      )}

                      {/* Payment Details Section */}
                      {(signup.bank_name || signup.account_number || signup.payment_notes) && (
                        <div className="md:col-span-3 mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            Registered Payment Details
                          </h4>
                          <div className="grid md:grid-cols-2 gap-3 text-sm">
                            {signup.bank_name && (
                              <div>
                                <p className="text-gray-500 text-xs">Bank Name</p>
                                <p className="font-medium text-gray-900">{signup.bank_name}</p>
                              </div>
                            )}
                            {signup.account_name && (
                              <div>
                                <p className="text-gray-500 text-xs">Account Name</p>
                                <p className="font-medium text-gray-900">{signup.account_name}</p>
                              </div>
                            )}
                            {signup.account_number && (
                              <div>
                                <p className="text-gray-500 text-xs">Account Number</p>
                                <p className="font-mono font-medium text-gray-900">{signup.account_number}</p>
                              </div>
                            )}
                            {signup.bank_code && (
                              <div>
                                <p className="text-gray-500 text-xs">Bank/Sort Code</p>
                                <p className="font-medium text-gray-900">{signup.bank_code}</p>
                              </div>
                            )}
                            {signup.payment_notes && (
                              <div className="md:col-span-2">
                                <p className="text-gray-500 text-xs">Payment Notes</p>
                                <p className="text-gray-700 italic">{signup.payment_notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {signup.review_notes && (
                        <div className="md:col-span-3">
                          <p className="text-gray-600">Review Notes</p>
                          <p className="font-medium text-gray-900">{signup.review_notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex gap-3 flex-wrap">
                      {signup.status === "submitted" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(signup.id, "under_review")}
                            disabled={isUpdating === signup.id}
                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isUpdating === signup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Mark Under Review"
                            )}
                          </button>
                          <button
                            onClick={() => openModal(signup.id, "approved", "Approve Vendor", "Enter approval notes (optional)...")}
                            disabled={isUpdating === signup.id}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isUpdating === signup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => openModal(signup.id, "waitlisted", "Waitlist Vendor", "Enter waitlist notes (optional)...")}
                            disabled={isUpdating === signup.id}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isUpdating === signup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Clock className="h-4 w-4" />
                                Waitlist
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => openModal(signup.id, "rejected", "Reject Vendor", "Enter rejection reason (required)...", true)}
                            disabled={isUpdating === signup.id}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isUpdating === signup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4" />
                                Reject
                              </>
                            )}
                          </button>
                        </>
                      )}
                      {signup.status === "under_review" && (
                        <>
                          <button
                            onClick={() => openModal(signup.id, "approved", "Approve Vendor", "Enter approval notes (optional)...")}
                            disabled={isUpdating === signup.id}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isUpdating === signup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => openModal(signup.id, "waitlisted", "Waitlist Vendor", "Enter waitlist notes (optional)...")}
                            disabled={isUpdating === signup.id}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isUpdating === signup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Clock className="h-4 w-4" />
                                Waitlist
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => openModal(signup.id, "rejected", "Reject Vendor", "Enter rejection reason (required)...", true)}
                            disabled={isUpdating === signup.id}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isUpdating === signup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4" />
                                Reject
                              </>
                            )}
                          </button>
                        </>
                      )}
                      {(signup.status === "approved" || signup.status === "active") && (
                        <button
                          onClick={() => openModal(signup.id, "suspended", "Suspend Vendor", "Enter suspension reason (optional)...")}
                          disabled={isUpdating === signup.id}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isUpdating === signup.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="h-4 w-4" />
                              Suspend
                            </>
                          )}
                        </button>
                      )}
                      {signup.status === "suspended" && (
                        <button
                          onClick={() => handleStatusChange(signup.id, "active")}
                          disabled={isUpdating === signup.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isUpdating === signup.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Unsuspend Vendor
                            </>
                          )}
                        </button>
                      )}
                      {(signup.status === "waitlisted" || signup.status === "rejected" || signup.status === "cancelled") && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusChange(signup.id, "under_review")}
                            disabled={isUpdating === signup.id}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isUpdating === signup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Clock className="h-4 w-4" />
                                Move to Review
                              </>
                            )}
                          </button>
                          {signup.status === "waitlisted" && (
                            <button
                              onClick={() => openModal(signup.id, "rejected", "Reject Vendor", "Enter rejection reason (required)...", true)}
                              disabled={isUpdating === signup.id}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Notes Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{modalData?.title}</h3>
            </div>
            <div className="p-6">
              <textarea
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder={modalData?.placeholder}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-900"
                autoFocus
              />
              {modalData?.required && !modalNotes.trim() && (
                <p className="text-xs text-red-500 mt-1">* A reason is required for this action</p>
              )}
            </div>
            <div className="p-6 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={modalData?.required && !modalNotes.trim()}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
