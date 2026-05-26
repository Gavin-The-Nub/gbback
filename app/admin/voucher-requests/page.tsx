"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { Loader2, CheckCircle, XCircle, FileText, User as UserIcon, DollarSign, School } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateVoucherCode } from "@/lib/utils"

type ScholarshipApplication = {
  id: string
  beneficiary_type?: "STUDENT" | "TEACHER" | "SCHOOL"
  student_name: string
  email: string
  phone: string | null
  school_name: string
  district: string | null
  grade_level: string | null
  program_type: string
  financial_need_description: string | null
  academic_goals: string | null
  student_count: number
  voucher_amount: number | null
  voucher_code: string | null
  country: string
  status: "pending" | "approved" | "rejected"
  applied_date: string
  reviewed_at: string | null
  notes: string | null
  school_user_id: string
  agreements?: {
    eligibility_accepted: boolean
    impact_report_accepted: boolean
    awareness_consent_accepted: boolean
    community_awareness_choices: {
      share_flyer: boolean
      provide_testimonial: boolean
      allow_reporting: boolean
      social_post: boolean
      decline_participation: boolean
    }
  } | null
}

export default function ScholarshipRequestsPage() {
  const router = useRouter()
  const [scholarshipApplications, setScholarshipApplications] = useState<ScholarshipApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>("all")

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
      .maybeSingle()

    if (!profile || profile.role !== "admin") {
      router.push("/auth/login")
      return
    }
  }

  const loadScholarshipApplications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("scholarship_applications")
        .select("*, school_user_id")
        .order("applied_date", { ascending: false })

      if (error) throw error

      const formattedApps = (data || []).map((app: any) => ({
        ...app,
        applied_date: app.applied_date 
          ? new Date(app.applied_date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      }))

      setScholarshipApplications(formattedApps as ScholarshipApplication[])
    } catch (error: any) {
      console.error("Error loading support applications:", error)
      toast.error("Failed to load support applications")
    }
  }, [])

  const handleScholarshipStatusChange = async (
    applicationId: string,
    newStatus: "approved" | "rejected",
    notes?: string
  ) => {
    setIsUpdating(applicationId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const application = scholarshipApplications.find(a => a.id === applicationId)
      if (!application) throw new Error("Application not found")

      // Generate unique voucher code if approving (even if voucher_amount is null/0)
      let voucherCode: string | null = null
      if (newStatus === "approved") {
        let attempts = 0
        const maxAttempts = 10

        while (attempts < maxAttempts) {
          voucherCode = generateVoucherCode()
          const { data: existing } = await supabase
            .from("scholarship_applications")
            .select("id")
            .eq("voucher_code", voucherCode)
            .maybeSingle()

          if (!existing) break
          attempts++
        }

        if (attempts >= maxAttempts || !voucherCode) {
          throw new Error("Failed to generate unique voucher code. Please try again.")
        }
      }

      // Update in Supabase
      const updateData: any = {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
      }

      if (voucherCode) {
        updateData.voucher_code = voucherCode.toUpperCase() // Ensure uppercase consistency

        // Create voucher record in vouchers table
        // Use school_user_id from the application
        const schoolId = (application as any).school_user_id
        if (!schoolId) {
          console.error("No school_user_id found in application")
          throw new Error("Cannot create voucher: school user ID not found")
        }
        
        const { error: voucherError } = await supabase
          .from("vouchers")
          .insert([
            {
              voucher_code: voucherCode.toUpperCase(), // Ensure uppercase
              school_id: schoolId,
              amount: application.voucher_amount,
              purpose: application.program_type,
              status: "active",
              created_by: user.id,
            },
          ])

        if (voucherError) {
          console.error("Error creating voucher record:", voucherError)
          toast.error(`Warning: Voucher code created but failed to save to vouchers table: ${voucherError.message}`)
          // Don't fail the whole operation if voucher creation fails - voucher_code is still saved in scholarship_applications
        } else {
          console.log("Voucher record created successfully:", voucherCode)
        }
      }

      if (notes) {
        updateData.notes = notes
      }

      const { error: updateError } = await supabase
        .from("scholarship_applications")
        .update(updateData)
        .eq("id", applicationId)

      if (updateError) throw updateError

      // Send email notification
      if (newStatus === "approved") {
        try {
          const response = await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: application.email, // This is now the school's email from their account
              type: "voucher_approved",
              studentName: application.student_name,
              status: "approved",
              schoolName: application.school_name,
              programType: application.program_type,
              voucherCode: voucherCode,
              amount: application.voucher_amount,
            }),
          })

          if (!response.ok) {
            console.error("Failed to send email notification")
          }
        } catch (emailError) {
          console.error("Email error:", emailError)
        }
      }

      toast.success(`Support application ${newStatus} successfully!`)
      await loadScholarshipApplications()
    } catch (error: any) {
      console.error("Error updating support application:", error)
      toast.error(error.message || "Failed to update application")
    } finally {
      setIsUpdating(null)
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true)
        await checkAuth()
        await loadScholarshipApplications()
      } catch (error) {
        console.error("Error initializing data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeData()

    // Set up real-time subscription
    const applicationsChannel = supabase
      .channel('scholarship_applications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scholarship_applications'
        },
        (payload) => {
          console.log('Support application change detected:', payload)
          loadScholarshipApplications()
        }
      )
      .subscribe()

    return () => {
      applicationsChannel.unsubscribe()
    }
  }, [loadScholarshipApplications])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64">
          <Header userName="Admin User" role="admin" />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  const pendingScholarships = scholarshipApplications.filter(a => a.status === "pending")
  const approvedScholarships = scholarshipApplications.filter(a => a.status === "approved")
  const rejectedScholarships = scholarshipApplications.filter(a => a.status === "rejected")
  const filteredScholarships = selectedStatus === "all"
    ? scholarshipApplications
    : scholarshipApplications.filter(a => a.status === selectedStatus)

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header userName="Admin User" role="admin" />
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Support Requests
            </h1>
            <p className="text-gray-600">Review and approve support applications from schools</p>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-900">{scholarshipApplications.length}</div>
                <div className="text-sm text-gray-600">Total Applications</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{pendingScholarships.length}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{approvedScholarships.length}</div>
                <div className="text-sm text-gray-600">Approved</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{rejectedScholarships.length}</div>
                <div className="text-sm text-gray-600">Rejected</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="mb-6">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            >
              <option value="all">All Applications</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Support Applications List */}
          <div className="space-y-4">
            {filteredScholarships.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No support applications found</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredScholarships.map((application) => (
                <Card key={application.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <UserIcon className="h-5 w-5 text-indigo-600" />
                          <span className="font-semibold text-lg">{application.student_name}</span>
                          {application.beneficiary_type && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold">
                              {application.beneficiary_type}
                            </span>
                          )}
                          <span className="text-sm text-gray-600">from {application.school_name}</span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-gray-600">Email</p>
                            <p className="font-medium text-gray-900">{application.email}</p>
                          </div>
                          {application.phone && (
                            <div>
                              <p className="text-gray-600">Phone</p>
                              <p className="font-medium text-gray-900">{application.phone}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-600">Program Type</p>
                            <p className="font-medium text-gray-900">{application.program_type}</p>
                          </div>
                          {application.grade_level && (
                            <div>
                              <p className="text-gray-600">Grade Level</p>
                              <p className="font-medium text-gray-900">{application.grade_level}</p>
                            </div>
                          )}
                          {application.voucher_amount && (
                            <div>
                              <p className="text-gray-600">Requested Amount</p>
                              <p className="font-medium text-indigo-600">${application.voucher_amount}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-600">Applied Date</p>
                            <p className="font-medium text-gray-900">
                              {new Date(application.applied_date).toLocaleDateString()}
                            </p>
                          </div>
                          {application.voucher_code && (
                            <div>
                              <p className="text-gray-600">Voucher Code</p>
                              <p className="font-mono font-medium text-indigo-600">{application.voucher_code}</p>
                            </div>
                          )}
                        </div>
                        {application.financial_need_description && (
                          <div className="mt-2 mb-2">
                            <p className="text-sm font-medium text-gray-900">Description of Need & Benefit:</p>
                            <p className="text-sm text-gray-600">{application.financial_need_description}</p>
                          </div>
                        )}
                        {application.academic_goals && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-900">Academic Goals:</p>
                            <p className="text-sm text-gray-600">{application.academic_goals}</p>
                          </div>
                        )}
                        {application.agreements && (
                          <div className="mt-4 pt-4 border-t border-gray-200 text-sm">
                            <p className="font-semibold text-gray-900 mb-2">Acknowledgments & Agreements:</p>
                            <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                              <li>Funding & Program Eligibility: <span className="font-semibold text-green-700">Accepted</span></li>
                              <li>Impact Report Requirement: <span className="font-semibold text-green-700">Accepted</span></li>
                              <li>Awareness Consent Statement: <span className="font-semibold text-green-700">Accepted</span></li>
                              {application.agreements.community_awareness_choices && (
                                <li>
                                  <span className="font-medium">Community Awareness Selections:</span>
                                  <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-500">
                                    {application.agreements.community_awareness_choices.share_flyer && <li>Share flyer or announcement</li>}
                                    {application.agreements.community_awareness_choices.provide_testimonial && <li>Provide program feedback/testimonial</li>}
                                    {application.agreements.community_awareness_choices.allow_reporting && <li>Allow use of general program impact</li>}
                                    {application.agreements.community_awareness_choices.social_post && <li>Share optional social media post</li>}
                                    {application.agreements.community_awareness_choices.decline_participation && <li>Preferred not to participate in awareness</li>}
                                    {!application.agreements.community_awareness_choices.share_flyer &&
                                     !application.agreements.community_awareness_choices.provide_testimonial &&
                                     !application.agreements.community_awareness_choices.allow_reporting &&
                                     !application.agreements.community_awareness_choices.social_post &&
                                     !application.agreements.community_awareness_choices.decline_participation && <li>None selected</li>}
                                  </ul>
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {application.status === "pending" && (
                          <>
                            <button
                              onClick={() => {
                                const notes = prompt("Enter approval notes (optional):")
                                if (notes !== null) {
                                  handleScholarshipStatusChange(application.id, "approved", notes)
                                }
                              }}
                              disabled={isUpdating === application.id}
                              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isUpdating === application.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4" />
                                  Approve
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                const notes = prompt("Enter rejection reason (optional):")
                                if (notes !== null) {
                                  handleScholarshipStatusChange(application.id, "rejected", notes)
                                }
                              }}
                              disabled={isUpdating === application.id}
                              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isUpdating === application.id ? (
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
                        {application.status === "approved" && (
                          <span className="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Approved
                          </span>
                        )}
                        {application.status === "rejected" && (
                          <span className="px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
