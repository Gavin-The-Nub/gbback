"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, Loader2, School } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // Handle email not confirmed error
        if (signInError.message.includes("Email not confirmed") || signInError.message.includes("email_not_confirmed")) {
          throw new Error("Please check your email and confirm your account before logging in.")
        }
        throw signInError
      }

      // Check user role
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role, id")
        .eq("id", data.user.id)
        .single()

      if (profileError) {
        console.error("Profile error:", profileError)
        throw profileError
      }

      if (!profile) {
        console.error("No profile found for user:", data.user.id)
        throw new Error("User profile not found. Please contact support.")
      }

      let finalRole = profile.role
      
      // If role is NULL or if we need to verify the assigned role
      // This part now also checks if the assigned role has any data, if not, checks the other role
      const checkAndFixRole = async () => {
        // 1. If role is school, verify it. If no school data, check if vendor data exists.
        if (finalRole === "school" || !finalRole) {
          const { data: schoolSignup } = await supabase
            .from("school_signups")
            .select("id")
            .or(`user_id.eq.${data.user.id}${data.user.email ? `,email.eq.${data.user.email}` : ''}`)
            .maybeSingle()
          
          if (schoolSignup) {
            if (finalRole !== "school") {
              await supabase.from("user_profiles").update({ role: "school" }).eq("id", data.user.id)
              finalRole = "school"
            }
            return
          }
          
          // No school data, check if they are a vendor
          const { data: vendorSignup } = await supabase
            .from("vendor_signups")
            .select("id")
            .or(`user_id.eq.${data.user.id}${data.user.email ? `,email.eq.${data.user.email}` : ''}`)
            .maybeSingle()
            
          if (vendorSignup) {
            await supabase.from("user_profiles").update({ role: "vendor" }).eq("id", data.user.id)
            finalRole = "vendor"
            return
          }
        }
        
        // 2. If role is vendor, verify it. If no vendor data, check if school data exists.
        if (finalRole === "vendor") {
          const { data: vendorSignup } = await supabase
            .from("vendor_signups")
            .select("id")
            .or(`user_id.eq.${data.user.id}${data.user.email ? `,email.eq.${data.user.email}` : ''}`)
            .maybeSingle()
            
          if (!vendorSignup) {
            // Check if they are actually a school
            const { data: schoolSignup } = await supabase
              .from("school_signups")
              .select("id")
              .or(`user_id.eq.${data.user.id}${data.user.email ? `,email.eq.${data.user.email}` : ''}`)
              .maybeSingle()
              
            if (schoolSignup) {
              await supabase.from("user_profiles").update({ role: "school" }).eq("id", data.user.id)
              finalRole = "school"
            }
          }
        }
      }

      await checkAndFixRole()

      if (!finalRole) {
        throw new Error("Unable to determine user role. Please contact support.")
      }

      console.log("User profile loaded:", { userId: data.user.id, role: finalRole, profileId: profile.id })

      // Use finalRole instead of profile.role for checks
      // Check if vendor is suspended (still allow login but will be blocked in dashboard)
      if (finalRole === "vendor") {
        const { data: vendorProfile, error: vendorProfileError } = await supabase
          .from("vendor_profiles")
          .select("id, status")
          .eq("id", data.user.id)
          .maybeSingle()

        // If there's an error other than "not found", log it but continue
        // (vendor profile may not exist if pending approval)
        if (vendorProfileError && vendorProfileError.code !== "PGRST116") {
          console.warn("Error checking vendor profile:", vendorProfileError)
          // Continue with login - vendor profile check will happen in dashboard
        }

        // Only check suspension if profile exists
        if (vendorProfile && vendorProfile.status === "suspended") {
          await supabase.auth.signOut()
          throw new Error("Your vendor account has been suspended. Please contact support.")
        }
        // If vendorProfile is null, vendor is pending approval - allow login
      }

      // Verify session is established before redirecting
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error("Session error after login:", sessionError)
        throw new Error("Failed to establish session. Please try again.")
      }
      if (!session) {
        console.error("No session after login")
        throw new Error("Session not established. Please try again.")
      }

      // Determine redirect path with explicit logging - use finalRole
      let redirectPath = "/"
      if (finalRole === "admin") {
        redirectPath = "/"
      } else if (finalRole === "school") {
        redirectPath = "/school-dashboard"
      } else if (finalRole === "vendor") {
        redirectPath = "/vendor"
      } else {
        console.warn("Unknown role:", finalRole, "- defaulting to /")
        redirectPath = "/"
      }
      
      console.log("Login successful - Redirect info:", {
        role: finalRole,
        redirectPath: redirectPath,
        userId: data.user.id,
        originalRole: profile.role
      })
      
      // Wait for session to be fully persisted
      // Retry multiple times to ensure session is established
      let sessionPersisted = false
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100))
        const { data: { session: checkSession }, error: sessionCheckError } = await supabase.auth.getSession()
        if (checkSession && checkSession.access_token && !sessionCheckError) {
          // Verify user can be retrieved
          const { data: { user: verifyUser } } = await supabase.auth.getUser()
          if (verifyUser && verifyUser.id === data.user.id) {
            sessionPersisted = true
            console.log("Session verified and persisted")
            break
          }
        }
      }
      
      if (!sessionPersisted) {
        console.error("Session not persisted after login!")
        throw new Error("Session not established. Please try again.")
      }
      
      // CRITICAL: Double-check role before redirecting to ensure we're going to the right place
      const { data: { user: finalUserCheck } } = await supabase.auth.getUser()
      if (finalUserCheck) {
        const { data: finalProfile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", finalUserCheck.id)
          .maybeSingle()
        
        if (finalProfile && finalProfile.role && finalProfile.role !== finalRole) {
          console.warn("Role mismatch detected! Original:", finalRole, "Final:", finalProfile.role)
          // Recalculate redirect path based on final profile
          if (finalProfile.role === "admin") {
            redirectPath = "/"
          } else if (finalProfile.role === "school") {
            redirectPath = "/school-dashboard"
          } else if (finalProfile.role === "vendor") {
            redirectPath = "/vendor"
          }
          finalRole = finalProfile.role
          console.log("Updated redirect path to:", redirectPath, "Role:", finalRole)
        }
      }

      toast.success("Login successful!")
      
      console.log("FINAL redirect - Role:", profile.role, "Path:", redirectPath)
      
      // Use window.location.assign instead of href for better control
      // This ensures a full page reload and session availability
      await new Promise(resolve => setTimeout(resolve, 500))
      window.location.assign(redirectPath)
    } catch (error: any) {
      console.error("Login error:", error)
      setError(error.message || "Invalid email or password")
      toast.error(error.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <School className="h-12 w-12 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Enter your password"
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
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Sign up as a school
            </Link>
            {" or "}
            <Link href="/auth/vendor-signup" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Sign up as a vendor
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
