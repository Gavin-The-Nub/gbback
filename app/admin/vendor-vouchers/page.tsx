"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { Loader2, CheckCircle, XCircle, Ticket, Package, AlertCircle, CreditCard, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type VendorVoucherSubmission = {
  id: string
  vendor_id: string
  voucher_code: string
  voucher_application_id: string | null
  status: "pending" | "approved" | "rejected"
  verification_status: "valid" | "invalid" | "not_found"
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  vendor_name?: string
  vendor_email?: string
  student_name?: string
  school_name?: string
  voucher_amount?: number | null
  invoice_url?: string | null
}

export default function VendorVouchersPage() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<VendorVoucherSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    checkAuth()
    loadSubmissions()
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

  const loadSubmissions = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("vendor_voucher_submissions")
        .select("*")
        .order("submitted_at", { ascending: false })

      if (error) throw error

      // Fetch related data separately
      const transformed = await Promise.all(
        (data || []).map(async (item: any) => {
          let vendorName = "Unknown Vendor"
          let vendorEmail = "Unknown Email"
          let studentName = null
          let schoolName = null
          let voucherAmount = null

          if (item.vendor_id) {
            // Fetch vendor profile
            const { data: vendorData } = await supabase
              .from("vendor_profiles")
              .select("vendor_name")
              .eq("id", item.vendor_id)
              .maybeSingle()

            if (vendorData) {
              vendorName = vendorData.vendor_name
            } else {
              const { data: signupData } = await supabase
                .from("vendor_signups")
                .select("vendor_name")
                .eq("user_id", item.vendor_id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()
              
              if (signupData) {
                vendorName = signupData.vendor_name
              }
            }

            // Fetch vendor email
            const { data: userData } = await supabase
              .from("user_profiles")
              .select("email")
              .eq("id", item.vendor_id)
              .maybeSingle()
              
            if (userData?.email) {
              vendorEmail = userData.email
            }
          }

          // Get application details if voucher_application_id exists
          if (item.voucher_application_id) {
            const { data: appData } = await supabase
              .from("scholarship_applications")
              .select("student_name, school_name, voucher_amount")
              .eq("id", item.voucher_application_id)
              .single()
            if (appData) {
              studentName = appData.student_name
              schoolName = appData.school_name
              voucherAmount = appData.voucher_amount
            }
          }

          return {
            ...item,
            vendor_name: vendorName,
            vendor_email: vendorEmail,
            student_name: studentName,
            school_name: schoolName,
            voucher_amount: voucherAmount,
          }
        })
      )

      setSubmissions(transformed)
    } catch (error: any) {
      console.error("Error loading submissions:", error)
      toast.error("Failed to load vendor voucher submissions")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleStatusChange = async (
    submissionId: string,
    newStatus: "approved" | "rejected",
    notes?: string
  ) => {
    setIsUpdating(submissionId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error: updateError } = await supabase
        .from("vendor_voucher_submissions")
        .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq("id", submissionId)

      if (updateError) throw updateError

      toast.success(`Voucher submission ${newStatus} successfully!`)
      await loadSubmissions()
    } catch (error: any) {
      console.error("Error updating submission:", error)
      toast.error(error.message || "Failed to update submission")
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
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  const filteredSubmissions = submissions.filter(s => {
    if (selectedStatus !== "all" && s.status !== selectedStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.voucher_code?.toLowerCase().includes(q) ||
      s.vendor_name?.toLowerCase().includes(q) ||
      s.student_name?.toLowerCase().includes(q) ||
      s.school_name?.toLowerCase().includes(q)
    );
  })

  const pendingSubmissions = submissions.filter(s => s.status === "pending")
  const approvedSubmissions = submissions.filter(s => s.status === "approved")
  const rejectedSubmissions = submissions.filter(s => s.status === "rejected")

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header userName="Admin User" role="admin" />
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Vendor Voucher Submissions
            </h1>
            <p className="text-gray-600">Review and approve vendor voucher code redemptions</p>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-900">{submissions.length}</div>
                <div className="text-sm text-gray-600">Total Submissions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{pendingSubmissions.length}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{approvedSubmissions.length}</div>
                <div className="text-sm text-gray-600">Approved</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{rejectedSubmissions.length}</div>
                <div className="text-sm text-gray-600">Rejected</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter and Search */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by code, vendor, student, or school..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            >
              <option value="all">All Submissions</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Submissions List */}
          <div className="space-y-4">
            {filteredSubmissions.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No submissions found</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredSubmissions.map((submission) => (
                <Card key={submission.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Ticket className="h-5 w-5 text-indigo-600" />
                          <span className="font-mono font-semibold text-xl">{submission.voucher_code}</span>
                          {submission.verification_status === "valid" && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Valid Code
                            </span>
                          )}
                          {submission.verification_status === "invalid" && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Invalid Code
                            </span>
                          )}
                          {submission.verification_status === "not_found" && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                              Code Not Found
                            </span>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Vendor</p>
                            <p className="font-medium text-gray-900">{submission.vendor_name}</p>
                            <p className="text-sm text-indigo-600 break-all">{submission.vendor_email}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Submitted</p>
                            <p className="font-medium text-gray-900">
                              {new Date(submission.submitted_at).toLocaleString()}
                            </p>
                          </div>
                          {submission.student_name && (
                            <div>
                              <p className="text-gray-600">Student</p>
                              <p className="font-medium text-gray-900">{submission.student_name}</p>
                            </div>
                          )}
                          {submission.school_name && (
                            <div>
                              <p className="text-gray-600">School</p>
                              <p className="font-medium text-gray-900">{submission.school_name}</p>
                            </div>
                          )}
                          {submission.voucher_amount && (
                            <div>
                              <p className="text-gray-600">Voucher Amount</p>
                              <p className="font-medium text-green-600">
                                ${submission.voucher_amount.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Invoice Link */}
                        {submission.invoice_url && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <a
                              href={`https://ommmrstanzxkgnlzqwwx.supabase.co/storage/v1/object/public/vendor-invoices/${submission.invoice_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-2"
                            >
                              <Package className="h-4 w-4" />
                              View Invoice
                            </a>
                          </div>
                        )}

                        {submission.review_notes && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Review Notes:</span> {submission.review_notes}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {submission.status === "pending" && (
                          <>
                            <button
                              onClick={() => {
                                const notes = prompt("Enter approval notes (optional):")
                                if (notes !== null) {
                                  handleStatusChange(submission.id, "approved", notes)
                                }
                              }}
                              disabled={isUpdating === submission.id}
                              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isUpdating === submission.id ? (
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
                                  handleStatusChange(submission.id, "rejected", notes)
                                }
                              }}
                              disabled={isUpdating === submission.id}
                              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isUpdating === submission.id ? (
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
                        {submission.status === "approved" && (
                          <span className="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Approved
                          </span>
                        )}
                        {submission.status === "rejected" && (
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
