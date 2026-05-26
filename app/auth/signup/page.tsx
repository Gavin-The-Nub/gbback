"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, UserPlus, Building, Phone, MapPin, Globe, Users, FileText, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    schoolName: "",
    contactName: "",
    contactPhone: "",
    streetAddress: "",
    city: "",
    stateProvince: "",
    zipPostalCode: "",
    schoolDistrict: "",
    schoolType: "",
    website: "",
    additionalInfo: "",
    registrationType: "School", // Default to School
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

    if (formData.website) {
      try {
        new URL(formData.website.startsWith('http') ? formData.website : `https://${formData.website}`)
      } catch (e) {
        setError("Please enter a valid website URL")
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
          data: {
            role: "school",
          },
        },
      })

      if (signUpError) throw signUpError

      if (!authData.user) {
        throw new Error("Failed to create user account")
      }

      // Combine split address fields
      const fullAddress = [
        formData.streetAddress,
        formData.city,
        formData.stateProvince,
        formData.zipPostalCode
      ].filter(Boolean).join(", ")

      const isIndividual = formData.registrationType === "Individual"
      const finalSchoolName = isIndividual ? `Individual - ${formData.contactName}` : formData.schoolName
      const finalSchoolType = isIndividual ? "Individual" : formData.schoolType

      // Create school signup record for admin approval
      const { error: signupError } = await supabase
        .from("school_signups")
        .insert([
          {
            user_id: authData.user.id,
            email: formData.email,
            school_name: finalSchoolName,
            contact_name: formData.contactName,
            contact_phone: formData.contactPhone || null,
            school_address: fullAddress || null,
            school_district: isIndividual ? null : (formData.schoolDistrict || null),
            school_type: finalSchoolType || null,
            student_count: null, // Removed as requested
            website: formData.website || null,
            additional_info: formData.additionalInfo || null,
            status: "pending",
          },
        ])

      if (signupError) {
        console.error("Full signup error object:", signupError)
        if (signupError.code === "23505") {
          throw new Error("This email is already registered. If you've already signed up, please wait for admin approval or try logging in.")
        }
        if (signupError.code === "23503") {
          console.error("Foreign key violation details:", {
            userId: authData.user?.id,
            email: formData.email,
            code: signupError.code,
            message: signupError.message
          })
          throw new Error("There was an issue linking your registration to your account. Please try again or contact support.")
        }
        console.error("Signup record error:", signupError)
        throw signupError
      }

      toast.success("Registration submitted! Your account is pending admin approval.")
      router.push("/auth/login?pending=true")
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
            <UserPlus className="h-12 w-12 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Registration
          </h1>
          <p className="text-gray-600">Register to apply for support</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="registrationType" className="block text-sm font-medium text-gray-700 mb-2">
              Registration Type <span className="text-red-500">*</span>
            </label>
            <select
              id="registrationType"
              name="registrationType"
              value={formData.registrationType}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900 font-semibold"
            >
              <option value="School">School / Organization</option>
              <option value="Individual">Individual</option>
            </select>
          </div>

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
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {formData.registrationType === "School" && (
              <div>
                <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-2">
                  School / Organization Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="schoolName"
                    name="schoolName"
                    type="text"
                    value={formData.schoolName}
                    onChange={handleChange}
                    required={formData.registrationType === "School"}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                    placeholder="Your School or Organization Name"
                  />
                </div>
              </div>
            )}
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
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
                {formData.registrationType === "Individual" ? "Full Name" : "Name / Person in Charge"} <span className="text-red-500">*</span>
              </label>
              <input
                id="contactName"
                name="contactName"
                type="text"
                value={formData.contactName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                placeholder={formData.registrationType === "Individual" ? "Your full name" : "Name of person in charge"}
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

          <div className="space-y-4">
            <div>
              <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                id="streetAddress"
                name="streetAddress"
                type="text"
                value={formData.streetAddress}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Enter your street address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="City"
                />
              </div>
              <div>
                <label htmlFor="stateProvince" className="block text-sm font-medium text-gray-700 mb-2">
                  State / Province
                </label>
                <input
                  id="stateProvince"
                  name="stateProvince"
                  type="text"
                  value={formData.stateProvince}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="State / Province"
                />
              </div>
              <div>
                <label htmlFor="zipPostalCode" className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP / Postal Code
                </label>
                <input
                  id="zipPostalCode"
                  name="zipPostalCode"
                  type="text"
                  value={formData.zipPostalCode}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="ZIP / Postal Code"
                />
              </div>
            </div>
          </div>

          {formData.registrationType === "School" && (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="schoolDistrict" className="block text-sm font-medium text-gray-700 mb-2">
                  School District / Area
                </label>
                <input
                  id="schoolDistrict"
                  name="schoolDistrict"
                  type="text"
                  value={formData.schoolDistrict}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="District or Area name"
                />
              </div>

              <div>
                <label htmlFor="schoolType" className="block text-sm font-medium text-gray-700 mb-2">
                  Type of School
                </label>
                <select
                  id="schoolType"
                  name="schoolType"
                  value={formData.schoolType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                >
                  <option value="">Select school type</option>
                  <option value="Private- Parochial School">Private- Parochial School</option>
                  <option value="Private-Independent School">Private-Independent School</option>
                  <option value="Charter School">Charter School</option>
                  <option value="Public School">Public School</option>
                  <option value="Title 1 School">Title 1 School</option>
                  <option value="Non Title 1 School">Non Title 1 School</option>
                  <option value="Virtual School">Virtual School</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Information
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                value={formData.additionalInfo}
                onChange={handleChange}
                rows={4}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Any additional information..."
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
              "Register"
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-gray-500">
            Are you a vendor?{" "}
            <Link href="/auth/vendor-signup" className="text-indigo-600 hover:text-indigo-500">
              Sign up as a vendor instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
