"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Clock, FileText, DollarSign, Calendar, User, School, Mail, Phone, MapPin, Ticket, Users, Filter } from "lucide-react"

type ScholarshipApplication = {
  id: string
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
}

export default function MyApplicationsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [applications, setApplications] = useState<ScholarshipApplication[]>([])
  const [schoolProfile, setSchoolProfile] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    let mounted = true
    let applicationsChannel: any = null

    const checkAuthAndLoad = async () => {
      try {
        setIsLoading(true)
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          router.push("/auth/login")
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError || profile?.role !== "school") {
          toast.error("Access Denied: You must be a school to view this page.")
          router.push("/auth/login")
          return
        }

        // Load school profile
        const { data: schoolData, error: schoolError } = await supabase
          .from("school_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()

        if (schoolError || !schoolData) {
          toast.error("School profile not found. Please contact support.")
          router.push("/auth/login")
          return
        }

        if (!mounted) return
        setSchoolProfile(schoolData)

        // Load applications for this school using school_user_id
        const { data: applicationsData, error: applicationsError } = await supabase
          .from("scholarship_applications")
          .select("*")
          .eq("school_user_id", user.id)
          .order("applied_date", { ascending: false })

        if (applicationsError) throw applicationsError

        if (!mounted) return

        const formattedApps = (applicationsData || []).map((app: any) => ({
          ...app,
          applied_date: app.applied_date 
            ? new Date(app.applied_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        }))

        setApplications(formattedApps as ScholarshipApplication[])

        // Set up subscription if not already set up
        if (!applicationsChannel && mounted) {
          applicationsChannel = supabase
            .channel('my_applications_changes')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'scholarship_applications',
                filter: `school_user_id=eq.${user.id}`,
              },
              (payload) => {
                console.log('Application change detected:', payload)
                checkAuthAndLoad()
              }
            )
            .subscribe()
        }
      } catch (error: any) {
        console.error("Error loading applications:", error)
        toast.error("Failed to load applications")
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkAuthAndLoad()

    return () => {
      mounted = false
      if (applicationsChannel) {
        applicationsChannel.unsubscribe()
      }
    }
  }, [router])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
    }
  }

  const pendingCount = applications.filter(a => a.status === "pending").length
  const approvedCount = applications.filter(a => a.status === "approved").length
  const rejectedCount = applications.filter(a => a.status === "rejected").length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64">
          <Header userName={schoolProfile?.contact_name || "School User"} role="school" />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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
        <Header userName={schoolProfile?.contact_name || "School User"} role="school" />
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Scholarship Applications</h1>
              <p className="text-gray-600">
                View and track all your scholarship applications and voucher statuses.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Rejected</p>
                      <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter */}
            <div className="mb-6 flex justify-end">
              <div className="relative w-full sm:w-48">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Applications List */}
            {applications.filter(app => {
              if (statusFilter !== "all" && app.status !== statusFilter) return false;
              return true;
            }).length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
                    <p className="text-gray-600 mb-4">
                      You haven't submitted any scholarship applications yet.
                    </p>
                    <button
                      onClick={() => router.push("/apply")}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      Submit Your First Application
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {applications.filter(app => {
                  if (statusFilter !== "all" && app.status !== statusFilter) return false;
                  return true;
                }).map((application) => (
                  <Card key={application.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-xl">{application.student_name}</CardTitle>
                            {getStatusBadge(application.status)}
                          </div>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1">
                              <School className="w-4 h-4" />
                              {application.school_name}
                            </span>
                            {application.district && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {application.district}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Program:</span>
                            <span>{application.program_type}</span>
                          </div>
                          {application.grade_level && (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">Grade:</span>
                              <span>{application.grade_level}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Applied:</span>
                            <span>{application.applied_date}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {application.voucher_amount && (
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">Amount:</span>
                              <span>${application.voucher_amount.toLocaleString()}</span>
                            </div>
                          )}
                          {application.voucher_code && (
                            <div className="flex items-center gap-2 text-sm">
                              <Ticket className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">Voucher Code:</span>
                              <span className="font-mono font-semibold text-indigo-600">
                                {application.voucher_code}
                              </span>
                            </div>
                          )}
                          {application.student_count > 1 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">Students:</span>
                              <span>{application.student_count}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {application.financial_need_description && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">Financial Need:</p>
                          <p className="text-sm text-gray-600">{application.financial_need_description}</p>
                        </div>
                      )}

                      {application.academic_goals && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">Academic Goals:</p>
                          <p className="text-sm text-gray-600">{application.academic_goals}</p>
                        </div>
                      )}

                      {application.notes && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 mb-1">Admin Notes:</p>
                          <p className="text-sm text-blue-800">{application.notes}</p>
                        </div>
                      )}

                      {application.status === "approved" && application.voucher_code && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <p className="font-semibold text-green-900">Voucher Approved!</p>
                          </div>
                          <p className="text-sm text-green-800">
                            Your voucher code <span className="font-mono font-semibold">{application.voucher_code}</span> has been approved and is ready to use.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}