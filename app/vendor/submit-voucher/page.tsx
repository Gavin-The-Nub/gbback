"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { Ticket, CheckCircle, XCircle, Loader2, Package, AlertCircle, Clock, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

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

function VendorDashboardContent() {
  const router = useRouter()
  const [voucherCode, setVoucherCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [submissions, setSubmissions] = useState<VendorVoucherSubmission[]>([])
  const [vendorProfile, setVendorProfile] = useState<any>(null)
  const searchParams = useSearchParams()
  
  // Verification states
  const [verifiedVoucher, setVerifiedVoucher] = useState<{
    code: string;
    amount: number | null;
    applicationId: string | null;
  } | null>(null)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)



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
          .select("vendor_name, status, review_notes")
          .eq("user_id", user.id)
          .maybeSingle()

        if (signupData) {
          setVendorProfile({
            vendor_name: signupData.vendor_name,
            status: signupData.status,
            review_notes: signupData.review_notes,
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

      if (vendorData.status === "suspended") {
        setVendorProfile({
          ...vendorData,
          isSuspended: true,
        })
        setIsLoading(false)
        return
      }

      setVendorProfile(vendorData)

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

  const handleVerifyVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voucherCode.trim()) {
      toast.error("Please enter a voucher code")
      return
    }

    setIsSubmitting(true)
    try {
      // Normalize voucher code (uppercase, trim whitespace)
      const normalizedCode = voucherCode.trim().toUpperCase()
      console.log("Verifying voucher code:", normalizedCode)

      // Use API endpoint to verify voucher (bypasses RLS restrictions)
      let verificationStatus: "valid" | "invalid" | "not_found" = "not_found"
      let voucherApplicationId: string | null = null
      let result: any = null

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

        result = await response.json()
        console.log("Voucher verification API response:", result)
        console.log("API diagnostics:", result.diagnostics)

        if (result.valid === true) {
          verificationStatus = "valid"
          voucherApplicationId = result.applicationId
          console.log("Voucher verified successfully:", result)
        } else if (result.status === "already_submitted") {
          verificationStatus = "invalid" // Treat as invalid for a NEW submission
          console.log("Voucher already submitted:", result.reason)
          toast.error(result.reason || "This voucher has already been submitted.")
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

      if (verificationStatus === "valid") {
        setVerifiedVoucher({
          code: normalizedCode,
          amount: result.voucherAmount || null,
          applicationId: voucherApplicationId,
        })
        toast.success("Voucher code verified! Please upload your invoice to submit.")
      } else {
        // The error toast is already shown inside the try block above with more specific info
        // Only show a generic one if no specific error was shown
        if (!result?.reason) {
          toast.error("Voucher code verification failed.")
        }
        
        // Also log the failed attempt to database
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from("vendor_voucher_submissions").insert([{
            vendor_id: user.id,
            voucher_code: normalizedCode,
            status: "rejected",
            verification_status: verificationStatus,
          }])
          await loadSubmissions(user.id)
        }
      }
    } catch (error: any) {
      console.error("Error verifying voucher:", error)
      toast.error(error.message || "Failed to verify voucher code")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifiedVoucher) return
    if (!invoiceFile) {
      toast.error("Please attach an invoice file")
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // 1. Upload Invoice File
      const fileExt = invoiceFile.name.split('.').pop()
      const fileName = `${user.id}/${verifiedVoucher.code}-${Date.now()}.${fileExt}`
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('vendor-invoices')
        .upload(fileName, invoiceFile)
        
      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw new Error("Failed to upload invoice file. Make sure vendor-invoices bucket exists.")
      }

      const invoiceUrl = uploadData?.path

      // 2. Create submission
      const { error: insertError } = await supabase
        .from("vendor_voucher_submissions")
        .insert([
          {
            vendor_id: user.id,
            voucher_code: verifiedVoucher.code,
            voucher_application_id: verifiedVoucher.applicationId,
            status: "pending",
            verification_status: "valid",
            invoice_url: invoiceUrl,
          },
        ])

      if (insertError) throw insertError

      toast.success("Voucher submitted successfully for admin approval.")

      setVoucherCode("")
      setVerifiedVoucher(null)
      setInvoiceFile(null)
      await loadSubmissions(user.id)
    } catch (error: any) {
      console.error("Error submitting voucher:", error)
      toast.error(error.message || "Failed to submit voucher code")
    } finally {
      setIsSubmitting(false)
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

  // Show pending approval, waitlisted, or rejected message if not approved
  if (vendorProfile?.isPending) {
    const isCancelled = vendorProfile.status === "cancelled" || vendorProfile.status === "rejected"
    const isWaitlisted = vendorProfile.status === "waitlisted"
    
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
                      <div className={`rounded-full w-16 h-16 flex items-center justify-center ${
                        isCancelled ? "bg-red-100" : isWaitlisted ? "bg-orange-100" : "bg-yellow-100"
                      }`}>
                        {isCancelled ? (
                          <XCircle className="h-8 w-8 text-red-600" />
                        ) : isWaitlisted ? (
                          <Clock className="h-8 w-8 text-orange-600" />
                        ) : (
                          <AlertCircle className="h-8 w-8 text-yellow-600" />
                        )}
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {isCancelled ? "Application Rejected" : isWaitlisted ? "Application Waitlisted" : "Account Under Evaluation"}
                    </h2>
                    <p className="text-gray-600 mb-4">
                      {isCancelled 
                        ? "Your vendor registration application has been reviewed and rejected by the administrator."
                        : isWaitlisted
                        ? "Your vendor registration has been placed on our waitlist. We will notify you when a spot becomes available."
                        : "Your vendor account is currently pending admin approval. You will be able to access all features once your account has been reviewed and approved."}
                    </p>

                    {vendorProfile.review_notes && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6 text-left">
                        <p className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                          <Info className="h-4 w-4 text-indigo-600" />
                          Administrator Notes:
                        </p>
                        <p className="text-sm text-gray-700 italic">
                          "{vendorProfile.review_notes}"
                        </p>
                      </div>
                    )}

                    {!isCancelled && !isWaitlisted && (
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
                    )}
                    
                    {(isCancelled || isWaitlisted) && (
                      <div className="mt-8">
                        <Button 
                          variant="outline" 
                          onClick={() => supabase.auth.signOut().then(() => router.push("/auth/login"))}
                        >
                          Sign Out
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Show suspension message
  if (vendorProfile?.isSuspended) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64">
          <Header userName={vendorProfile?.vendor_name || "Vendor"} role="vendor" />
          <main className="p-6">
            <div className="max-w-2xl mx-auto">
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center">
                        <XCircle className="h-8 w-8 text-red-600" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Account Suspended
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Your vendor account has been suspended. You currently do not have access to submit or track vouchers.
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
                      <p className="text-sm text-red-800">
                        <strong>Reason for suspension:</strong>
                      </p>
                      <p className="text-sm text-red-700 mt-1 italic">
                        {vendorProfile.notes || "No reason provided. Please contact the administrator for more information."}
                      </p>
                    </div>
                    <div className="mt-8">
                      <Button 
                        variant="outline" 
                        onClick={() => supabase.auth.signOut().then(() => router.push("/auth/login"))}
                      >
                        Sign Out
                      </Button>
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
              <p className="text-gray-600">
                Submit and track voucher code redemptions
              </p>
            </div>


          </div>

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

          </>
        </main>
      </div>
    </div>
  )
}

export default function VendorDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    }>
      <VendorDashboardContent />
    </Suspense>
  )
}
