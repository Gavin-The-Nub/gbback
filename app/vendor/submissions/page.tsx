"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { Ticket, CheckCircle, XCircle, Loader2, Package, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { User, CreditCard, Save } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type VendorVoucherSubmission = {
  id: string
  vendor_id: string
  voucher_code: string
  voucher_application_id: string | null
  status: "pending" | "approved" | "rejected"
  verification_status: "valid" | "invalid" | "not_found"
  submitted_at: string
  reviewed_at: string | null
  review_notes: string | null
}

export default function VendorDashboard() {
  const router = useRouter()
  const [voucherCode, setVoucherCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [submissions, setSubmissions] = useState<VendorVoucherSubmission[]>([])
  const [vendorProfile, setVendorProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isSaving, setIsSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({
    vendor_name: "",
    contact_name: "",
    contact_phone: "",
    bank_name: "",
    account_name: "",
    account_number: "",
    bank_code: "",
    payment_notes: ""
  })

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    try {
      setIsLoading(true)

      // Add retry logic for session check (handles race conditions after login)
      let session = null
      let user = null
      let retries = 0
      const maxRetries = 5

      while (retries < maxRetries) {
        const { data: { session: checkSession }, error: sessionError } = await supabase.auth.getSession()
        if (checkSession && !sessionError) {
          session = checkSession
          break
        }
        if (retries < maxRetries - 1) {
          console.log(`Session not ready, retrying... (${retries + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        retries++
      }

      if (!session) {
        console.error("No session in vendor dashboard after retries")
        router.replace("/auth/login")
        return
      }

      // Get user from session
      const { data: { user: fetchedUser }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.error("Error getting user in vendor dashboard:", userError)
        router.replace("/auth/login")
        return
      }

      if (!fetchedUser) {
        console.log("No user found, redirecting to login")
        router.replace("/auth/login")
        return
      }

      user = fetchedUser

      console.log("User authenticated in vendor dashboard:", user.id)

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        console.error("Error loading user profile:", profileError)
        // If it's an RLS error, don't redirect - might be temporary
        if (profileError.code === "42501" || profileError.message?.includes("permission denied")) {
          console.warn("RLS error loading profile, retrying...")
          // Wait and retry once
          await new Promise(resolve => setTimeout(resolve, 500))
          const { data: retryProfile } = await supabase
            .from("user_profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle()
          if (!retryProfile || retryProfile.role !== "vendor") {
            toast.error("Access Denied: You must be a vendor to view this page.")
            router.replace("/auth/login")
            return
          }
        } else {
          toast.error("Access Denied: You must be a vendor to view this page.")
          router.replace("/auth/login")
          return
        }
      }

      if (!profile || profile?.role !== "vendor") {
        console.error("Wrong role for vendor dashboard:", profile?.role, "- redirecting")
        // If user is a school, redirect to school dashboard instead
        if (profile?.role === "school") {
          console.log("User is school, redirecting to /school-dashboard")
          router.replace("/school-dashboard")
          return
        }
        // If user is admin, redirect to admin dashboard
        if (profile?.role === "admin") {
          console.log("User is admin, redirecting to /")
          router.replace("/")
          return
        }
        toast.error("Access Denied: You must be a vendor to view this page.")
        router.replace("/auth/login")
        return
      }

      // Load vendor profile (may not exist if not approved yet)
      const { data: vendorData, error: vendorError } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      // If profile doesn't exist, user is pending approval (this is normal)
      // Only treat it as an error if there's an actual database error (not "not found")
      if (vendorError) {
        // PGRST116 is "no rows returned" - this is expected for pending vendors
        if (vendorError.code !== "PGRST116") {
          console.error("Error loading vendor profile:", vendorError)
          // Continue anyway - might be RLS issue, but user should still see pending status
        }
      }

      // If profile doesn't exist, user is pending approval
      if (!vendorData) {
        // Check signup status
        const { data: signupData } = await supabase
          .from("vendor_signups")
          .select("vendor_name, status")
          .eq("user_id", user.id)
          .maybeSingle()

        if (signupData) {
          setVendorProfile({
            vendor_name: signupData.vendor_name,
            status: signupData.status,
            isPending: true,
          })
        } else {
          setVendorProfile({
            vendor_name: "Vendor",
            status: "pending",
            isPending: true,
          })
        }
        setIsLoading(false)
        return
      }

      setVendorProfile(vendorData)
      setProfileForm({
        vendor_name: vendorData.vendor_name || "",
        contact_name: vendorData.contact_name || "",
        contact_phone: vendorData.contact_phone || "",
        bank_name: vendorData.bank_name || "",
        account_name: vendorData.account_name || "",
        account_number: vendorData.account_number || "",
        bank_code: vendorData.bank_code || "",
        payment_notes: vendorData.payment_notes || ""
      })
      await loadSubmissions(user.id)
    } catch (error: any) {
      console.error("Error checking auth:", error)
      toast.error("Failed to load dashboard")
      router.replace("/auth/login")
    } finally {
      setIsLoading(false)
    }
  }

  const loadSubmissions = async (vendorId: string) => {
    try {
      const { data, error } = await supabase
        .from("vendor_voucher_submissions")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("submitted_at", { ascending: false })

      if (error) throw error
      setSubmissions(data || [])
    } catch (error: any) {
      console.error("Error loading submissions:", error)
      toast.error("Failed to load voucher submissions")
    }
  }

  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voucherCode.trim()) {
      toast.error("Please enter a voucher code")
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Normalize voucher code (uppercase, trim whitespace)
      const normalizedCode = voucherCode.trim().toUpperCase()
      console.log("Verifying voucher code:", normalizedCode)

      // Use API endpoint to verify voucher (bypasses RLS restrictions)
      let verificationStatus: "valid" | "invalid" | "not_found" = "not_found"
      let voucherApplicationId: string | null = null

      try {
        const response = await fetch("/api/verify-voucher", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ voucherCode: normalizedCode }),
        })

        console.log("API response status:", response.status, response.statusText)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          console.error("API error response:", errorData)
          throw new Error(errorData.error || `API error: ${response.status}`)
        }

        const result = await response.json()
        console.log("Voucher verification API response:", result)
        console.log("API diagnostics:", result.diagnostics)

        if (result.valid === true) {
          verificationStatus = "valid"
          voucherApplicationId = result.applicationId
          console.log("Voucher verified successfully:", result)
        } else {
          verificationStatus = result.status === "pending" ? "invalid" : "not_found"
          console.log("Voucher verification failed:", result.reason, "Status:", result.status)

          // Show diagnostic info if available
          if (result.diagnostics) {
            console.error("Diagnostics:", {
              usingServiceRole: result.diagnostics.usingServiceRole,
              sampleCodes: result.diagnostics.sampleVoucherCodes,
              partialMatches: result.diagnostics.partialMatchVouchers || result.diagnostics.partialMatchApps
            })

            if (!result.diagnostics.usingServiceRole) {
              toast.error("Service role key not configured. Voucher verification may be blocked by RLS.")
            } else if (result.diagnostics.sampleVoucherCodes && result.diagnostics.sampleVoucherCodes.length > 0) {
              console.error("Sample codes in DB:", result.diagnostics.sampleVoucherCodes)
              toast.error(`${result.reason}. Check console for diagnostic info.`)
            } else {
              toast.error(result.reason || "Voucher code verification failed")
            }
          } else {
            toast.error(result.reason || "Voucher code verification failed")
          }
        }
      } catch (apiError: any) {
        console.error("Error calling verify-voucher API:", apiError)
        console.error("Error details:", {
          message: apiError.message,
          stack: apiError.stack
        })
        toast.error(apiError.message || "Error verifying voucher code. Please try again.")
        verificationStatus = "not_found"
      }

      console.log("Final verification result:", { verificationStatus, voucherApplicationId })

      // Create submission (even if invalid, so admin can see attempts)
      const { error: insertError } = await supabase
        .from("vendor_voucher_submissions")
        .insert([
          {
            vendor_id: user.id,
            voucher_code: normalizedCode,
            voucher_application_id: voucherApplicationId,
            status: verificationStatus === "valid" ? "pending" : "rejected",
            verification_status: verificationStatus,
          },
        ])

      if (insertError) throw insertError

      if (verificationStatus === "valid") {
        toast.success("Voucher code verified! Submission sent to admin for approval.")
      } else {
        toast.error("Voucher code verification failed. Submission rejected.")
      }

      setVoucherCode("")
      await loadSubmissions(user.id)
    } catch (error: any) {
      console.error("Error submitting voucher:", error)
      toast.error(error.message || "Failed to submit voucher code")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("vendor_profiles")
        .update({
          vendor_name: profileForm.vendor_name,
          contact_name: profileForm.contact_name,
          contact_phone: profileForm.contact_phone,
          bank_name: profileForm.bank_name,
          account_name: profileForm.account_name,
          account_number: profileForm.account_number,
          bank_code: profileForm.bank_code,
          payment_notes: profileForm.payment_notes,
        })
        .eq("id", user.id)

      if (error) throw error

      setVendorProfile({ ...vendorProfile, ...profileForm })
      toast.success("Profile updated successfully")
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast.error(error.message || "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64">
          <Header userName="Vendor" role="vendor" />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Show pending approval message if not approved
  if (vendorProfile?.isPending) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64">
          <Header userName={vendorProfile?.vendor_name || "Vendor"} role="vendor" />
          <main className="p-6">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-yellow-600" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Account Under Evaluation
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Your vendor account is currently pending admin approval. You will be able to access all features once your account has been reviewed and approved.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                      <p className="text-sm text-blue-800">
                        <strong>What happens next?</strong>
                      </p>
                      <ul className="text-sm text-blue-700 mt-2 space-y-1 text-left max-w-md mx-auto">
                        <li>• Our admin team will review your registration</li>
                        <li>• You'll receive access once approved</li>
                        <li>• Check back later or contact support if you have questions</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const pendingSubmissions = submissions.filter(s => s.status === "pending")
  const approvedSubmissions = submissions.filter(s => s.status === "approved")
  const rejectedSubmissions = submissions.filter(s => s.status === "rejected")

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header userName={vendorProfile?.vendor_name || "Vendor"} role="vendor" />
        <main className="p-6">
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Vendor Dashboard
              </h1>
              <p className="text-gray-600">Submit and track voucher code redemptions</p>
            </div>

            <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
              >
                Vouchers
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "profile"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
              >
                Profile & Payment
              </button>
            </div>
          </div>

          {activeTab === "dashboard" ? (
            <>

              {/* Stats Overview */}
              <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">{pendingSubmissions.length}</div>
                    <div className="text-sm text-gray-600">Pending Approval</div>
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

              {/* Voucher Code Submission Form */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-indigo-600" />
                    Submit Voucher Code
                  </CardTitle>
                  <CardDescription>
                    Enter a voucher code to verify and submit for admin approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitVoucher} className="space-y-4">
                    <div>
                      <Label htmlFor="voucherCode">Voucher Code</Label>
                      <Input
                        id="voucherCode"
                        type="text"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        placeholder="GBF-XXXX-XXXX"
                        className="mt-1"
                        disabled={isSubmitting}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !voucherCode.trim()}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submit Voucher Code
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Submissions List */}
              <Card>
                <CardHeader>
                  <CardTitle>Voucher Code Submissions</CardTitle>
                  <CardDescription>View all your voucher code submission history</CardDescription>
                </CardHeader>
                <CardContent>
                  {submissions.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No voucher submissions yet</p>
                      <p className="text-sm text-gray-400 mt-2">Submit a voucher code above to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {submissions.map((submission) => (
                        <div
                          key={submission.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Ticket className="h-5 w-5 text-indigo-600" />
                                <span className="font-mono font-semibold text-lg">{submission.voucher_code}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>
                                  Submitted: {new Date(submission.submitted_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {submission.verification_status === "valid" && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                  Valid
                                </span>
                              )}
                              {submission.verification_status === "invalid" && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                  Invalid
                                </span>
                              )}
                              {submission.verification_status === "not_found" && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                                  Not Found
                                </span>
                              )}
                              {submission.status === "pending" && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                  Pending
                                </span>
                              )}
                              {submission.status === "approved" && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Approved
                                </span>
                              )}
                              {submission.status === "rejected" && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Rejected
                                </span>
                              )}
                            </div>
                          </div>
                          {submission.review_notes && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Admin Notes:</span> {submission.review_notes}
                              </p>
                            </div>
                          )}
                          {submission.reviewed_at && (
                            <div className="mt-2 text-xs text-gray-500">
                              Reviewed: {new Date(submission.reviewed_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="max-w-4xl">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-indigo-600" />
                      Business Information
                    </CardTitle>
                    <CardDescription>Update your business contact details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vendor_name">Business Name</Label>
                        <Input
                          id="vendor_name"
                          value={profileForm.vendor_name}
                          onChange={(e) => setProfileForm({ ...profileForm, vendor_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_name">Contact Person</Label>
                        <Input
                          id="contact_name"
                          value={profileForm.contact_name}
                          onChange={(e) => setProfileForm({ ...profileForm, contact_name: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Phone Number</Label>
                      <Input
                        id="contact_phone"
                        value={profileForm.contact_phone}
                        onChange={(e) => setProfileForm({ ...profileForm, contact_phone: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-indigo-600" />
                      Payment & Bank Details
                    </CardTitle>
                    <CardDescription>Information used for voucher payouts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bank_name">Bank Name</Label>
                        <Input
                          id="bank_name"
                          value={profileForm.bank_name}
                          onChange={(e) => setProfileForm({ ...profileForm, bank_name: e.target.value })}
                          placeholder="e.g., Standard Chartered"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="account_name">Account Name</Label>
                        <Input
                          id="account_name"
                          value={profileForm.account_name}
                          onChange={(e) => setProfileForm({ ...profileForm, account_name: e.target.value })}
                          placeholder="Name on account"
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="account_number">Account Number</Label>
                        <Input
                          id="account_number"
                          value={profileForm.account_number}
                          onChange={(e) => setProfileForm({ ...profileForm, account_number: e.target.value })}
                          placeholder="Account number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank_code">Bank/Sort Code</Label>
                        <Input
                          id="bank_code"
                          value={profileForm.bank_code}
                          onChange={(e) => setProfileForm({ ...profileForm, bank_code: e.target.value })}
                          placeholder="IFSC/Swift/Sort Code"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_notes">Additional Payment Info (e.g., Mobile Money)</Label>
                      <Input
                        id="payment_notes"
                        value={profileForm.payment_notes}
                        onChange={(e) => setProfileForm({ ...profileForm, payment_notes: e.target.value })}
                        placeholder="Any special payment instructions"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving} className="px-8">
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
