"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

export default function ApplyPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [schoolProfile, setSchoolProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    studentName: "",
    email: "",
    phone: "",
    schoolName: "",
    district: "",
    gradeLevel: "",
    programType: "",
    financialNeedDescription: "",
    academicGoals: "",
    studentCount: "1",
    voucherAmount: "",
    country: "USA",
  })

  useEffect(() => {
    checkAuthAndLoadProfile()
  }, [])

  const checkAuthAndLoadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      // Check if user is a school
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError || !profile) {
        toast.error("User profile not found. Please contact support.")
        router.push("/auth/login")
        return
      }

      if (!profile || profile.role !== "school") {
        toast.error("Only approved schools can submit applications")
        router.push("/auth/login")
        return
      }

      // Check if school is approved
      const { data: schoolData, error: schoolError } = await supabase
        .from("school_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      // If profile doesn't exist or error (not found), user is pending approval
      if (schoolError || !schoolData) {
        // Check signup status
        const { data: signupData } = await supabase
          .from("school_signups")
          .select("school_name, status")
          .eq("user_id", user.id)
          .maybeSingle()

        if (signupData) {
          setSchoolProfile({
            school_name: signupData.school_name,
            status: signupData.status,
            isPending: true,
          })
        } else {
          setSchoolProfile({
            school_name: "School",
            status: "pending",
            isPending: true,
          })
        }
        setIsLoading(false)
        return
      }

      setSchoolProfile(schoolData)
      // Pre-fill school name, district, and email from profile
      setFormData(prev => ({
        ...prev,
        schoolName: schoolData.school_name || "",
        district: schoolData.school_district || "",
        email: user.email || "", // Use the school account's email
      }))
    } catch (error: any) {
      console.error("Error checking auth:", error)
      router.push("/auth/login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === "phone") {
      const sanitizedPhone = value.replace(/[^\d\s\-\+\(\)]/g, "")
      setFormData((prev) => ({ ...prev, [name]: sanitizedPhone }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!formData.studentName.trim() || !formData.schoolName.trim() || !formData.programType) {
      toast.error("Please fill in all required fields.")
      setIsSubmitting(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(formData.email)) {
      toast.error("Please provide a valid email address.")
      setIsSubmitting(false)
      return
    }

    if (formData.phone) {
      // react-phone-number-input handles validation internally, but we can do a simple length check
      if (formData.phone.length < 10) {
        toast.error("Please enter a valid phone number")
        setIsSubmitting(false)
        return
      }
    }

    if (formData.voucherAmount) {
      const amount = parseFloat(formData.voucherAmount)
      if (isNaN(amount) || amount <= 0) {
        toast.error("Voucher amount must be a positive number.")
        setIsSubmitting(false)
        return
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Always use the logged-in user's email to ensure it's linked to the school account
      const schoolEmail = user.email || formData.email

      const { data, error } = await supabase
        .from("scholarship_applications")
        .insert([
          {
            student_name: formData.studentName,
            email: schoolEmail, // Use school account email
            phone: formData.phone || null,
            school_name: formData.schoolName,
            district: formData.district || null,
            grade_level: formData.gradeLevel || null,
            program_type: formData.programType,
            financial_need_description: formData.financialNeedDescription || null,
            academic_goals: formData.academicGoals || null,
            student_count: parseInt(formData.studentCount) || 1,
            voucher_amount: formData.voucherAmount ? parseFloat(formData.voucherAmount) : null,
            country: formData.country,
            status: "pending",
            submitted_by: user.id,
            school_user_id: user.id, // Link to school account
          },
        ])
        .select()

      if (error) throw error

      toast.success("Application submitted successfully!")
      setIsSuccess(true)

      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          studentName: "",
          email: "",
          phone: "",
          schoolName: schoolProfile?.school_name || "",
          district: schoolProfile?.school_district || "",
          gradeLevel: "",
          programType: "",
          financialNeedDescription: "",
          academicGoals: "",
          studentCount: "1",
          voucherAmount: "",
          country: "USA",
        })
        setIsSuccess(false)
      }, 3000)
    } catch (error: any) {
      console.error("Error submitting application:", error)
      toast.error(error.message || "Failed to submit application. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64">
          <Header userName="School User" role="school" />
          <main className="p-6">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="animate-pulse space-y-6">
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded w-64"></div>
                    <div className="h-4 bg-gray-200 rounded w-96"></div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-10 bg-gray-200 rounded w-full"></div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-24 bg-gray-200 rounded w-full"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                    <div className="h-24 bg-gray-200 rounded w-full"></div>
                  </div>
                  <div className="h-12 bg-gray-200 rounded w-full mt-6"></div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Show pending approval message if not approved
  if (schoolProfile?.isPending) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64">
          <Header userName={schoolProfile?.school_name || "School"} role="school" />
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
                      Your school account is currently pending admin approval. You will be able to submit support applications once your account has been reviewed and approved.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                      <p className="text-sm text-blue-800">
                        <strong>What happens next?</strong>
                      </p>
                      <ul className="text-sm text-blue-700 mt-2 space-y-1 text-left max-w-md mx-auto">
                        <li>• Our admin team will review your registration</li>
                        <li>• You'll receive access to submit applications once approved</li>
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

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:pl-64">
          <Header userName={schoolProfile?.contact_name || "School User"} role="school" />
          <main className="p-6">
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-green-500/10 rounded-full w-16 h-16 flex items-center justify-center">
                      <CheckCircle className="text-green-600" size={32} />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Application Submitted!</h2>
                  <p className="text-gray-600">
                    Thank you for your application. We'll review it and get back to you via email within 5-7 business days.
                  </p>
                  <Button onClick={() => setIsSuccess(false)} className="mt-4">
                    Submit Another Application
                  </Button>
                </div>
              </CardContent>
            </Card>
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
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Support Application Form</CardTitle>
                <CardDescription>
                  Complete the form below to apply for educational support through our support program.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="studentName">
                        Student Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="studentName"
                        name="studentName"
                        value={formData.studentName}
                        onChange={handleChange}
                        required
                        placeholder="Enter full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        School Email Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="school@email.com"
                        readOnly
                        className="bg-gray-100"
                      />
                      <p className="text-xs text-gray-500">
                        This email is linked to your school account and will be used for all communications.
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2 phone-input-wrapper">
                      <Label htmlFor="phone">Phone Number</Label>
                      <PhoneInput
                        international
                        defaultCountry="US"
                        value={formData.phone}
                        onChange={(value) => setFormData((prev) => ({ ...prev, phone: value || "" }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gradeLevel">Grade Level</Label>
                      <Select
                        value={formData.gradeLevel}
                        onValueChange={(value) => handleSelectChange("gradeLevel", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="elementary">Elementary School</SelectItem>
                          <SelectItem value="middle">Middle School</SelectItem>
                          <SelectItem value="high">High School</SelectItem>
                          <SelectItem value="college">College</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">
                        School Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="schoolName"
                        name="schoolName"
                        value={formData.schoolName}
                        onChange={handleChange}
                        required
                        placeholder="Enter school name"
                        readOnly
                        className="bg-gray-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="district">School District</Label>
                      <Input
                        id="district"
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        placeholder="Enter district name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="programType">
                      Program Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.programType}
                      onValueChange={(value) => handleSelectChange("programType", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a program type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tutoring Scholarships">Tutoring Scholarships</SelectItem>
                        <SelectItem value="College Teaching Fellowship">College Teaching Fellowship</SelectItem>
                        <SelectItem value="Community Mentorship">Community Mentorship</SelectItem>
                        <SelectItem value="Outreach Initiatives">Outreach Initiatives</SelectItem>
                        <SelectItem value="Educational Materials & School Supplies">
                          Educational Materials & School Supplies
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="studentCount">Number of Students</Label>
                      <Input
                        id="studentCount"
                        name="studentCount"
                        type="number"
                        min="1"
                        value={formData.studentCount}
                        onChange={handleChange}
                        placeholder="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voucherAmount">Requested Voucher Amount ($)</Label>
                      <Input
                        id="voucherAmount"
                        name="voucherAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.voucherAmount}
                        onChange={handleChange}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="financialNeedDescription">Financial Need Description</Label>
                    <Textarea
                      id="financialNeedDescription"
                      name="financialNeedDescription"
                      value={formData.financialNeedDescription}
                      onChange={handleChange}
                      placeholder="Please describe the financial need and how this support would help..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="academicGoals">Academic Goals</Label>
                    <Textarea
                      id="academicGoals"
                      name="academicGoals"
                      value={formData.academicGoals}
                      onChange={handleChange}
                      placeholder="Please describe the academic goals and how this program would support them..."
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-[#e01414] via-[#760da3] to-[#008cff] hover:opacity-90 text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Application"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
