"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { Loader2, CheckCircle, XCircle, School, Mail, Phone, MapPin, Clock, Search } from "lucide-react"

type SchoolSignup = {
  id: string
  user_id: string | null
  email: string
  school_name: string
  contact_name: string
  contact_phone: string | null
  school_address: string | null
  school_district: string | null
  school_type: string | null
  student_count: number | null
  website: string | null
  additional_info: string | null
  status: "pending" | "approved" | "rejected" | "waitlisted"
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
}

export default function SchoolSignupsPage() {
  const router = useRouter()
  const [signups, setSignups] = useState<SchoolSignup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

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
        .from("school_signups")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setSignups(data || [])
    } catch (error: any) {
      console.error("Error loading signups:", error)
      toast.error("Failed to load school signups")
    } finally {
      setIsLoading(false)
    }
  }

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalData, setModalData] = useState<{
    id: string;
    status: SchoolSignup["status"];
    title: string;
    placeholder: string;
    required: boolean;
  } | null>(null)
  const [modalNotes, setModalNotes] = useState("")

  const openModal = (id: string, status: SchoolSignup["status"], title: string, placeholder: string = "Enter notes (optional)...", required: boolean = false) => {
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
      await handleApproval(modalData.id, modalData.status, modalNotes)
      setModalData(null)
    }
  }

  const handleApproval = async (signupId: string, status: SchoolSignup["status"], notes?: string) => {
    setIsUpdating(signupId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const signup = signups.find(s => s.id === signupId)
      if (!signup) throw new Error("Signup not found")

      // Update signup status
      const { error: updateError } = await supabase
        .from("school_signups")
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq("id", signupId)

      if (updateError) throw updateError

      if (status === "approved") {
        // Use the stored user_id from the signup
        if (!signup.user_id) {
          throw new Error("User ID not found in signup record")
        }

        // Check if profile already exists
        const { data: existing } = await supabase
          .from("school_profiles")
          .select("id")
          .eq("id", signup.user_id)
          .single()

        if (!existing) {
          // Create school profile
          const { error: profileError } = await supabase
            .from("school_profiles")
            .insert([
              {
                id: signup.user_id,
                school_name: signup.school_name,
                contact_name: signup.contact_name,
                contact_phone: signup.contact_phone,
                school_address: signup.school_address,
                school_district: signup.school_district,
                school_type: signup.school_type,
                student_count: signup.student_count,
                website: signup.website,
                country: signup.country || "USA", 
              },
            ])

          if (profileError) throw profileError
        }
      }

      toast.success(`Status updated to ${status}`)
      await loadSignups()
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast.error(error.message || "Failed to update status")
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
            <div className="grid gap-4 md:grid-cols-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
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
                          <div className="h-6 bg-gray-200 rounded w-20"></div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          {[1, 2, 3, 4, 5, 6].map((j) => (
                            <div key={j} className="space-y-1">
                              <div className="h-3 bg-gray-200 rounded w-24"></div>
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                          <div className="h-10 bg-gray-200 rounded flex-1"></div>
                          <div className="h-10 bg-gray-200 rounded flex-1"></div>
                          <div className="h-10 bg-gray-200 rounded flex-1"></div>
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

  const filteredSignups = signups.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.school_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.contact_name?.toLowerCase().includes(q) ||
      s.school_district?.toLowerCase().includes(q)
    );
  });

  const pendingSignups = filteredSignups.filter(s => s.status === "pending")
  const approvedSignups = filteredSignups.filter(s => s.status === "approved")
  const rejectedSignups = filteredSignups.filter(s => s.status === "rejected")
  const waitlistedSignups = filteredSignups.filter(s => s.status === "waitlisted")

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header userName="Admin User" role="admin" />
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              School Signup Approvals
            </h1>
            <p className="text-gray-600">Review and approve school registration requests</p>
          </div>

          <div className="grid gap-4 md:grid-cols-5 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-2xl font-bold text-indigo-600">{signups.length}</div>
              <div className="text-sm text-gray-600">Total Signups</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-2xl font-bold text-gray-900">{pendingSignups.length}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-2xl font-bold text-green-600">{approvedSignups.length}</div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-2xl font-bold text-orange-600">{waitlistedSignups.length}</div>
              <div className="text-sm text-gray-600">Waitlisted</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-2xl font-bold text-red-600">{rejectedSignups.length}</div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </div>

          <div className="mb-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by school name, email, contact, or district..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Pending Approvals</h2>
            {pendingSignups.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No pending signups</p>
            ) : (
              <div className="space-y-6">
                {pendingSignups.map((signup) => (
                  <div key={signup.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <School className="h-5 w-5 text-indigo-600" />
                          {signup.school_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{signup.email}</p>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        Pending
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Contact Name</p>
                        <p className="font-medium text-gray-900">{signup.contact_name}</p>
                      </div>
                      {signup.contact_phone && (
                        <div>
                          <p className="text-gray-600">Contact Phone</p>
                          <p className="font-medium text-gray-900">{signup.contact_phone}</p>
                        </div>
                      )}
                      {signup.school_address && (
                        <div>
                          <p className="text-gray-600">Address</p>
                          <p className="font-medium text-gray-900">{signup.school_address}</p>
                        </div>
                      )}
                      {signup.school_district && (
                        <div>
                          <p className="text-gray-600">District</p>
                          <p className="font-medium text-gray-900">{signup.school_district}</p>
                        </div>
                      )}
                      {signup.school_type && (
                        <div>
                          <p className="text-gray-600">School Type</p>
                          <p className="font-medium text-gray-900">{signup.school_type}</p>
                        </div>
                      )}
                      {signup.student_count && (
                        <div>
                          <p className="text-gray-600">Student Count</p>
                          <p className="font-medium text-gray-900">{signup.student_count}</p>
                        </div>
                      )}
                      {signup.website && (
                        <div>
                          <p className="text-gray-600">Website</p>
                          <a href={signup.website} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline">
                            {signup.website}
                          </a>
                        </div>
                      )}
                    </div>

                    {signup.additional_info && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-semibold text-gray-900 mb-2">Additional Information</p>
                        <p className="text-sm text-gray-600">{signup.additional_info}</p>
                      </div>
                    )}

                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => openModal(signup.id, "approved", "Approve School", "Enter approval notes (optional)...")}
                        disabled={isUpdating === signup.id}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                        onClick={() => openModal(signup.id, "waitlisted", "Waitlist School", "Enter waitlist notes (optional)...")}
                        disabled={isUpdating === signup.id}
                        className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                        onClick={() => openModal(signup.id, "rejected", "Reject School", "Enter rejection reason (required)...", true)}
                        disabled={isUpdating === signup.id}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approved Signups Section */}
          {approvedSignups.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Approved Signups</h2>
              <div className="space-y-6">
                {approvedSignups.map((signup) => (
                  <div key={signup.id} className="border border-gray-200 rounded-lg p-6 bg-green-50/30">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <School className="h-5 w-5 text-green-600" />
                          {signup.school_name}
                        </h3>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Approved
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(signup.id, "rejected", "Reject School", "Enter rejection reason (required)...", true)}
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waitlisted Signups Section */}
          {waitlistedSignups.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Waitlisted Signups</h2>
              <div className="space-y-6">
                {waitlistedSignups.map((signup) => (
                  <div key={signup.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <School className="h-5 w-5 text-indigo-600" />
                          {signup.school_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{signup.email}</p>
                      </div>
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                        Waitlisted
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Contact Name</p>
                        <p className="font-medium text-gray-900">{signup.contact_name}</p>
                      </div>
                      {signup.contact_phone && (
                        <div>
                          <p className="text-gray-600">Contact Phone</p>
                          <p className="font-medium text-gray-900">{signup.contact_phone}</p>
                        </div>
                      )}
                      {signup.school_district && (
                        <div>
                          <p className="text-gray-600">District</p>
                          <p className="font-medium text-gray-900">{signup.school_district}</p>
                        </div>
                      )}
                      {signup.review_notes && (
                        <div className="md:col-span-2">
                          <p className="text-gray-600">Waitlist Notes</p>
                          <p className="font-medium text-gray-900">{signup.review_notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={() => handleApproval(signup.id, "approved")}
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
                        onClick={() => openModal(signup.id, "rejected", "Reject School", "Enter rejection reason (required)...", true)}
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Signups Section */}
          {rejectedSignups.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Rejected Signups</h2>
              <div className="space-y-6">
                {rejectedSignups.map((signup) => (
                  <div key={signup.id} className="border border-gray-200 rounded-lg p-6 bg-red-50/30">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <School className="h-5 w-5 text-red-600" />
                          {signup.school_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{signup.email}</p>
                      </div>
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        Rejected
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Contact Name</p>
                        <p className="font-medium text-gray-900">{signup.contact_name}</p>
                      </div>
                      {signup.review_notes && (
                        <div className="md:col-span-2">
                          <p className="text-gray-600">Rejection Reason</p>
                          <p className="font-medium text-red-900">{signup.review_notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => openModal(signup.id, "pending", "Move to Review", "Enter notes (optional)...")}
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
