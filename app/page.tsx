"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { School, DollarSign, Globe, CheckCircle, XCircle, Loader2, Info } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { generateVoucherCode } from "@/lib/utils"

type Application = {
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

type Donation = {
  id: string
  donor_name: string
  donor_email: string
  amount: number
  donation_type: string
  payment_status: string
  created_at: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [stats, setStats] = useState({
    totalApplications: 0,
    pending: 0,
    approved: 0,
    totalVouchersIssued: 0,
    totalDonations: 0,
    totalDonationAmount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending")

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Log connection info
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      console.log("🔗 Connecting to Supabase URL:", supabaseUrl)
      console.log("📊 Loading applications from Supabase...")
      
      // Load applications
      const { data: appsData, error: appsError } = await supabase
        .from("scholarship_applications")
        .select("*")
        .order("applied_date", { ascending: false })

      console.log("📋 Applications query result:", { 
        count: appsData?.length || 0,
        appsData,
        appsError 
      })

      if (appsError) {
        console.error("Applications query error:", appsError)
        throw new Error(`Failed to load applications: ${appsError.message}`)
      }

      // Load donations
      const { data: donationsData, error: donationsError } = await supabase
        .from("donations")
        .select("*")
        .order("created_at", { ascending: false })

      if (donationsError) {
        console.error("Donations query error:", donationsError)
        // Don't throw for donations, just log it
        console.warn("Failed to load donations, continuing with applications only")
      }

      const formattedApps = (appsData || []).map((app) => ({
        ...app,
        applied_date: app.applied_date 
          ? new Date(app.applied_date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      }))

      console.log("Formatted applications:", formattedApps)
      console.log("Setting applications:", formattedApps.length)

      setApplications(formattedApps as Application[])
      setDonations((donationsData || []) as Donation[])
      calculateStats(formattedApps as Application[], donationsData || [])
      
      console.log("Data loaded successfully. Applications count:", formattedApps.length)
    } catch (error: any) {
      console.error("Error loading data:", error)
      toast.error(error.message || "Failed to load data. Please check console for details.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let subscription: any;

    const initialize = async () => {
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

      // Load data on mount
      loadData()
      
      // Set up real-time subscription to listen for new applications
      subscription = supabase
        .channel('scholarship_applications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'scholarship_applications'
          },
          (payload) => {
            console.log('Database change detected:', payload)
            // Reload data when changes are detected
            loadData()
          }
        )
        .subscribe()
    }

    initialize()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [router, loadData])

  const calculateStats = (apps: Application[], donations: Donation[]) => {
    setStats({
      totalApplications: apps.length,
      pending: apps.filter((a) => a.status === "pending").length,
      approved: apps.filter((a) => a.status === "approved").length,
      totalVouchersIssued: apps
        .filter((a) => a.status === "approved")
        .reduce((sum, a) => sum + (a.voucher_amount || 0), 0),
      totalDonations: donations.length,
      totalDonationAmount: donations.reduce((sum, d) => sum + d.amount, 0),
    })
  }

  const handleStatusChange = async (id: string, newStatus: "approved" | "rejected") => {
    setIsUpdating(id)
    try {
      const application = applications.find((app) => app.id === id)
      if (!application) return

      // Generate unique voucher code if approving and has voucher amount
      let voucherCode: string | null = null
      if (newStatus === "approved" && application.voucher_amount) {
        // Generate unique voucher code, retry if duplicate
        let attempts = 0
        const maxAttempts = 10
        while (attempts < maxAttempts) {
          voucherCode = generateVoucherCode()
          // Check if code already exists
          const { data: existing } = await supabase
            .from("scholarship_applications")
            .select("id")
            .eq("voucher_code", voucherCode)
            .single()
          
          if (!existing) break // Code is unique
          attempts++
        }
        
        if (attempts >= maxAttempts) {
          throw new Error("Failed to generate unique voucher code. Please try again.")
        }
      }

      // Update in Supabase
      const updateData: any = {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
      }
      
      if (voucherCode) {
        updateData.voucher_code = voucherCode
      }

      const { error: updateError } = await supabase
        .from("scholarship_applications")
        .update(updateData)
        .eq("id", id)

      if (updateError) throw updateError

      // Send email notification
      try {
        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: application.email,
            studentName: application.student_name,
            status: newStatus,
            schoolName: application.school_name,
            programType: application.program_type,
          }),
        })

        if (!response.ok) {
          console.error("Failed to send email notification")
        }
      } catch (emailError) {
        console.error("Email error:", emailError)
        // Don't fail the whole operation if email fails
      }

      // Reload data
      await loadData()
      toast.success(`Application ${newStatus} successfully!`)
    } catch (error: any) {
      console.error("Error updating application:", error)
      toast.error(error.message || "Failed to update application. Please try again.")
    } finally {
      setIsUpdating(null)
    }
  }


  const pendingApplications = applications.filter((a) => a.status === "pending")
  const approvedApplications = applications.filter((a) => a.status === "approved")
  const rejectedApplications = applications.filter((a) => a.status === "rejected")

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64">
          <Header userName="Admin User" role="admin" />
          <main className="p-6">
            <div className="mb-8">
              <div className="h-9 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
            </div>

            {/* Stats Overview Skeleton */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Donations Stats Skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-40"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Applications Tabs Skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="animate-pulse space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                    <div className="h-4 bg-gray-200 rounded w-64"></div>
                  </div>
                  <div className="h-10 bg-gray-200 rounded w-24"></div>
                </div>

                {/* Tabs Skeleton */}
                <div className="flex border-b border-gray-200">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded-t w-32 mr-4"></div>
                  ))}
                </div>

                {/* Application Cards Skeleton */}
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="h-6 bg-gray-200 rounded w-48"></div>
                          <div className="h-4 bg-gray-200 rounded w-64"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {[1, 2, 3, 4, 5, 6].map((j) => (
                            <div key={j} className="space-y-1">
                              <div className="h-3 bg-gray-200 rounded w-20"></div>
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-4 border-t border-gray-200">
                          <div className="h-10 bg-gray-200 rounded w-full"></div>
                          <div className="h-10 bg-gray-200 rounded w-full"></div>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header userName="Admin User" role="admin" />
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Overview of support applications and donations
            </p>
          </div>
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Total Applications</h3>
                <School className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalApplications}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Pending Review</h3>
                <Globe className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Approved</h3>
                <CheckCircle className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.approved}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Total Vouchers Issued</h3>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">${stats.totalVouchersIssued.toLocaleString()}</div>
            </div>
          </div>


          
        </main>
      </div>
    </div>
  )
}

function ApplicationCard({
  application,
}: {
  application: Application
}) {
  const getStatusBadgeColor = () => {
    if (application.status === "approved") {
      return "bg-green-100 text-green-800"
    } else if (application.status === "rejected") {
      return "bg-red-100 text-red-800"
    }
    return "bg-yellow-100 text-yellow-800"
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-gray-900">{application.student_name}</h3>
              {application.beneficiary_type && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold">
                  {application.beneficiary_type}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{application.school_name}</p>
            {application.district && <p className="text-xs text-gray-500">{application.district}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
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
              <p className="text-gray-600">Applied Date</p>
              <p className="font-medium text-gray-900">{new Date(application.applied_date).toLocaleDateString()}</p>
            </div>
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
            <div>
              <p className="text-gray-600">Students</p>
              <p className="font-medium text-gray-900">{application.student_count} student(s)</p>
            </div>
            {application.voucher_amount && (
              <div>
                <p className="text-gray-600">Voucher Amount</p>
                <p className="font-medium text-indigo-600">${application.voucher_amount}</p>
              </div>
            )}
            <div>
              <p className="text-gray-600">Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor()}`}>
                {application.status}
              </span>
            </div>
          </div>

          {application.financial_need_description && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">Description of Need & Benefit:</p>
              <p className="text-sm text-gray-600">{application.financial_need_description}</p>
            </div>
          )}

          {application.academic_goals && (
            <div className="mt-2">
              <p className="text-sm font-semibold text-gray-900 mb-2">Academic Goals:</p>
              <p className="text-sm text-gray-600">{application.academic_goals}</p>
            </div>
          )}

          {application.agreements && (
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm">
              <p className="font-semibold text-gray-950 mb-2">Acknowledgments & Agreements:</p>
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
      </div>

      {application.status === "pending" && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="h-4 w-4" />
            <span>This application is pending review. Please visit the <a href="/admin/voucher-requests" className="text-indigo-600 hover:underline font-medium">Voucher Requests</a> page to approve or reject.</span>
          </div>
        </div>
      )}
    </div>
  )
}
