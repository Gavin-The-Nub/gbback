"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, Building2, Phone, MapPin, FileText, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

export default function VendorSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    vendorName: "",
    vendorType: "",
    country: "",
    contactName: "",
    contactPhone: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    bankCode: "",
    paymentNotes: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    if (formData.contactPhone) {
      const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/
      if (!phoneRegex.test(formData.contactPhone)) {
        setError("Please enter a valid phone number (at least 10 digits)")
        setLoading(false)
        return
      }
    }

    try {
      // First, create the auth user
      // Note: Email confirmation is required by default in Supabase
      // Users will need to confirm their email before they can log in
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`,
        },
      })

      if (signUpError) throw signUpError

      if (!authData.user) {
        throw new Error("Failed to create user account")
      }

      // Update user profile role to vendor (profile may already exist from trigger)
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          role: "vendor",
          email: formData.email,
        })
        .eq("id", authData.user.id)

      // If update fails (profile doesn't exist), try insert
      if (profileError) {
        const { error: insertError } = await supabase
          .from("user_profiles")
          .insert({
            id: authData.user.id,
            email: formData.email,
            role: "vendor",
          })

        if (insertError) {
          console.error("Profile error:", insertError)
          throw insertError
        }
      }

      // Create vendor signup record for admin approval
      const { error: signupError } = await supabase
        .from("vendor_signups")
        .insert([
          {
            user_id: authData.user.id,
            email: formData.email,
            vendor_name: formData.vendorName,
            vendor_type: formData.vendorType,
            country: formData.country,
            contact_name: formData.contactName,
            contact_phone: formData.contactPhone || null,
            bank_name: formData.bankName || null,
            account_name: formData.accountName || null,
            account_number: formData.accountNumber || null,
            bank_code: formData.bankCode || null,
            payment_notes: formData.paymentNotes || null,
            status: "submitted",
          },
        ])

      if (signupError) {
        if (signupError.code === "23505") {
          throw new Error("This email is already registered. If you've already signed up, please wait for admin approval or try logging in.")
        }
        console.error("Signup record error:", signupError)
        throw signupError
      }

      toast.success("Registration submitted! Your vendor account is pending admin approval.")
      router.push("/auth/login?pending=vendor")
    } catch (error: any) {
      console.error("Signup error:", error)
      setError(error.message || "Failed to create account. Please try again.")
      toast.error(error.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Vendor Registration
          </h1>
          <p className="text-gray-600">Register as a vendor partner</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="vendor@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="vendorName" className="block text-sm font-medium text-gray-700 mb-2">
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="vendorName"
                  name="vendorName"
                  type="text"
                  value={formData.vendorName}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="Your Company Name"
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="vendorType" className="block text-sm font-medium text-gray-700 mb-2">
                Vendor Type <span className="text-red-500">*</span>
              </label>
              <select
                id="vendorType"
                name="vendorType"
                value={formData.vendorType}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Select vendor type</option>
                <option value="Educational Services">Educational Services</option>
                <option value="Technology Provider">Technology Provider</option>
                <option value="Training & Development">Training & Development</option>
                <option value="Consulting">Consulting</option>
                <option value="Supply Chain">Supply Chain</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="country"
                  name="country"
                  type="text"
                  value={formData.country}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                id="contactName"
                name="contactName"
                type="text"
                value={formData.contactName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Contact person name"
              />
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="Phone number"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details (Optional)</h2>
            <p className="text-sm text-gray-500 mb-4">Providing these now helps us process your payments faster, but you can also add them later.</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  id="bankName"
                  name="bankName"
                  type="text"
                  value={formData.bankName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="e.g., Standard Chartered"
                />
              </div>

              <div>
                <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-2">
                  Account Name
                </label>
                <input
                  id="accountName"
                  name="accountName"
                  type="text"
                  value={formData.accountName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="Name on account"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  id="accountNumber"
                  name="accountNumber"
                  type="text"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="Account number"
                />
              </div>

              <div>
                <label htmlFor="bankCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Bank/Sort Code
                </label>
                <input
                  id="bankCode"
                  name="bankCode"
                  type="text"
                  value={formData.bankCode}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="IFSC/Swift/Sort Code"
                />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="paymentNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Payment Info (e.g., Mobile Money)
              </label>
              <input
                id="paymentNotes"
                name="paymentNotes"
                type="text"
                value={formData.paymentNotes}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Any special payment instructions"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#e01414] via-[#760da3] to-[#008cff] hover:opacity-90 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating account...
              </>
            ) : (
              "Register as Vendor"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Are you a school?{" "}
            <Link href="/auth/signup" className="text-indigo-600 hover:text-indigo-500">
              Sign up as a school instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
