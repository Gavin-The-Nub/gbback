"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, School, Phone, MapPin, Globe, Users, FileText, Loader2 } from "lucide-react"
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
    schoolAddress: "",
    schoolDistrict: "",
    schoolType: "",
    studentCount: "",
    website: "",
    additionalInfo: "",
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
        },
      })

      if (signUpError) throw signUpError

      if (!authData.user) {
        throw new Error("Failed to create user account")
      }

      // Create school signup record for admin approval
      const { error: signupError } = await supabase
        .from("school_signups")
        .insert([
          {
            user_id: authData.user.id,
            email: formData.email,
            school_name: formData.schoolName,
            contact_name: formData.contactName,
            contact_phone: formData.contactPhone || null,
            school_address: formData.schoolAddress || null,
            school_district: formData.schoolDistrict || null,
            school_type: formData.schoolType || null,
            student_count: formData.studentCount ? parseInt(formData.studentCount) : null,
            website: formData.website || null,
            additional_info: formData.additionalInfo || null,
            status: "pending",
          },
        ])

      if (signupError) {
        if (signupError.code === "23505") {
          throw new Error("This email is already registered. If you've already signed up, please wait for admin approval or try logging in.")
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
            <School className="h-12 w-12 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            School Registration
          </h1>
          <p className="text-gray-600">Register your school to apply for scholarships</p>
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
                  placeholder="school@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-2">
                School Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="schoolName"
                  name="schoolName"
                  type="text"
                  value={formData.schoolName}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="Your School Name"
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

          <div>
            <label htmlFor="schoolAddress" className="block text-sm font-medium text-gray-700 mb-2">
              School Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                id="schoolAddress"
                name="schoolAddress"
                type="text"
                value={formData.schoolAddress}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Street address"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="schoolDistrict" className="block text-sm font-medium text-gray-700 mb-2">
                School District
              </label>
              <input
                id="schoolDistrict"
                name="schoolDistrict"
                type="text"
                value={formData.schoolDistrict}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                placeholder="District name"
              />
            </div>

            <div>
              <label htmlFor="schoolType" className="block text-sm font-medium text-gray-700 mb-2">
                School Type
              </label>
              <select
                id="schoolType"
                name="schoolType"
                value={formData.schoolType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Select type</option>
                <option value="Elementary">Elementary School</option>
                <option value="Middle">Middle School</option>
                <option value="High School">High School</option>
                <option value="College">College</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="studentCount" className="block text-sm font-medium text-gray-700 mb-2">
                Student Count
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="studentCount"
                  name="studentCount"
                  type="number"
                  value={formData.studentCount}
                  onChange={handleChange}
                  min="1"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="Number of students"
                />
              </div>
            </div>

            <div>
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
                  placeholder="https://school.com"
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
                placeholder="Any additional information about your school..."
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
              "Register School"
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
