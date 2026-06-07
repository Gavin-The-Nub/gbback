"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { Loader2, CreditCard, Save, AlertCircle, Clock, XCircle, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

function VendorBankInfoContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [vendorProfile, setVendorProfile] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    account_number: "",
    bank_code: "",
    account_name: "",
  })

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    try {
      setIsLoading(true)

      // Add retry logic for session check
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
        console.error("No session in vendor bank info page after retries")
        router.replace("/auth/login")
        return
      }

      // Get user from session
      const { data: { user: fetchedUser }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.error("Error getting user in vendor bank info:", userError)
        router.replace("/auth/login")
        return
      }

      if (!fetchedUser) {
        console.log("No user found, redirecting to login")
        router.replace("/auth/login")
        return
      }

      user = fetchedUser

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        console.error("Error loading user profile:", profileError)
        if (profileError.code === "42501" || profileError.message?.includes("permission denied")) {
          console.warn("RLS error loading profile, retrying...")
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
        if (profile?.role === "school") {
          router.replace("/school-dashboard")
          return
        }
        if (profile?.role === "admin") {
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

      if (vendorError) {
        if (vendorError.code !== "PGRST116") {
          console.error("Error loading vendor profile:", vendorError)
        }
      }

      // If profile doesn't exist, user is pending approval
      if (!vendorData) {
        // Check signup status
        let { data: signupData } = await supabase
          .from("vendor_signups")
          .select("id, user_id, vendor_name, status, review_notes, email")
          .eq("user_id", user.id)
          .maybeSingle()

        if (!signupData && user.email) {
          const { data: emailData } = await supabase
            .from("vendor_signups")
            .select("id, user_id, vendor_name, status, review_notes, email")
            .eq("email", user.email)
            .maybeSingle()
          
          if (emailData) {
            signupData = emailData
            if (!emailData.user_id) {
              await supabase
                .from("vendor_signups")
                .update({ user_id: user.id })
                .eq("id", emailData.id)
            }
          }
        }

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
      setBankForm({
        bank_name: vendorData.bank_name || "",
        account_number: vendorData.account_number || "",
        bank_code: vendorData.bank_code || "",
        account_name: vendorData.account_name || "",
      })
    } catch (error: any) {
      console.error("Error checking auth:", error)
      toast.error("Failed to load page")
      router.replace("/auth/login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateBankInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("vendor_profiles")
        .update({
          bank_name: bankForm.bank_name,
          account_number: bankForm.account_number,
          bank_code: bankForm.bank_code,
          account_name: bankForm.account_name,
        })
        .eq("id", user.id)

      if (error) throw error

      setVendorProfile({ ...vendorProfile, ...bankForm })
      toast.success("Bank details updated successfully")
    } catch (error: any) {
      console.error("Error updating bank details:", error)
      toast.error(error.message || "Failed to update bank details")
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
                      <div className="mt-8 flex flex-col gap-3 max-w-xs mx-auto">
                        <Button 
                          variant="outline" 
                          className="w-full"
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header userName={vendorProfile?.vendor_name || "Vendor"} role="vendor" />
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bank Details
            </h1>
            <p className="text-gray-600">
              Manage your payment details for voucher payouts
            </p>
          </div>

          <div className="max-w-4xl">
            <form onSubmit={handleUpdateBankInfo} className="space-y-6">
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
                        value={bankForm.bank_name}
                        onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                        placeholder="e.g., Standard Chartered"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account_name">Account Name</Label>
                      <Input
                        id="account_name"
                        value={bankForm.account_name}
                        onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })}
                        placeholder="Name on account"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="account_number">Account Number</Label>
                      <Input
                        id="account_number"
                        value={bankForm.account_number}
                        onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                        placeholder="Account number"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_code">Routing Number</Label>
                      <Input
                        id="bank_code"
                        value={bankForm.bank_code}
                        onChange={(e) => setBankForm({ ...bankForm, bank_code: e.target.value })}
                        placeholder="Routing number"
                        required
                      />
                    </div>
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
        </main>
      </div>
    </div>
  )
}

export default function VendorBankInfo() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    }>
      <VendorBankInfoContent />
    </Suspense>
  )
}
