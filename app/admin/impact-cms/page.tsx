"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { 
  Loader2, 
  Upload, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Edit2, 
  Save, 
  X, 
  Image as ImageIcon, 
  FileImage, 
  HelpCircle,
  Sparkles,
  RefreshCw
} from "lucide-react"

type ImpactImage = {
  id: string
  url: string
  alt_text: string | null
  sort_order: number
  created_at: string
}

export default function ImpactCMSPage() {
  const router = useRouter()
  const [images, setImages] = useState<ImpactImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [altText, setAltText] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")

  useEffect(() => {
    checkAuth()
    loadImages()
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

  const loadImages = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("impact_images")
        .select("*")
        .order("sort_order", { ascending: true })

      if (error) throw error
      setImages(data || [])
    } catch (error: any) {
      console.error("Error loading images:", error)
      toast.error("Failed to load impact images")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file (PNG, JPG, WebP)")
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file")
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `impact_${fileName}`

      // Upload to public storage bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('impact-images')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // Retrieve public URL
      const { data: { publicUrl } } = supabase.storage
        .from('impact-images')
        .getPublicUrl(filePath)

      // Find max sort order
      const maxSortOrder = images.reduce((max, img) => img.sort_order > max ? img.sort_order : max, 0)

      // Insert database entry
      const { error: dbError } = await supabase
        .from('impact_images')
        .insert([
          {
            url: publicUrl,
            alt_text: altText.trim() || null,
            sort_order: maxSortOrder + 10,
          }
        ])

      if (dbError) throw dbError

      toast.success("Image added to impact carousel!")
      setSelectedFile(null)
      setPreviewUrl(null)
      setAltText("")
      loadImages()
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(error.message || "Failed to upload image.")
    } finally {
      setUploading(false)
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= images.length) return

    const newImages = [...images]
    const temp = newImages[index]
    newImages[index] = newImages[targetIndex]
    newImages[targetIndex] = temp

    // Optimistically update positions & sort_orders
    const recalculated = newImages.map((img, idx) => ({
      ...img,
      sort_order: (idx + 1) * 10
    }))
    setImages(recalculated)

    try {
      const updates = recalculated.map(img => ({
        id: img.id,
        sort_order: img.sort_order
      }))

      // Sequential database updates
      for (const update of updates) {
        const { error } = await supabase
          .from('impact_images')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
        if (error) throw error
      }
      
      toast.success("Carousel order updated!")
    } catch (error: any) {
      console.error("Reorder error:", error)
      toast.error("Failed to save sort order. Reverting changes...")
      loadImages()
    }
  }

  const handleEditStart = (id: string, currentText: string | null) => {
    setEditingId(id)
    setEditingText(currentText || "")
  }

  const handleEditSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('impact_images')
        .update({ alt_text: editingText.trim() || null })
        .eq('id', id)

      if (error) throw error

      toast.success("Alt text saved!")
      setEditingId(null)
      loadImages()
    } catch (error: any) {
      console.error("Alt text update error:", error)
      toast.error("Failed to update alt text")
    }
  }

  const handleDelete = async (id: string, url: string) => {
    if (!confirm("Are you sure you want to remove this image? It will be removed from the live website carousel immediately.")) {
      return
    }

    try {
      const parts = url.split('/impact-images/')
      const filePath = parts[1]

      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('impact-images')
          .remove([filePath])
        
        if (storageError) {
          console.warn("Storage deletion warning:", storageError)
        }
      }

      const { error: dbError } = await supabase
        .from('impact_images')
        .delete()
        .eq('id', id)

      if (dbError) throw dbError

      toast.success("Image removed from carousel!")
      loadImages()
    } catch (error: any) {
      console.error("Deletion error:", error)
      toast.error(error.message || "Failed to remove image")
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setAltText("")
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="lg:pl-64 flex-1 flex flex-col">
        <Header userName="Admin User" role="admin" />
        <main className="p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto space-y-8">
          
          {/* Header Block */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ImageIcon size={24} />
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Program Reach & Field Impact CMS
                </h1>
              </div>
              <p className="text-slate-500 mt-2 text-sm md:text-base">
                Manage the dynamic carousel of field impact and program reach images rendered on the gbfront homepage.
              </p>
            </div>
            <button
              onClick={loadImages}
              className="flex items-center justify-center gap-2 self-start md:self-auto px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all font-semibold rounded-lg text-sm border border-slate-200 cursor-pointer"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Upload form block */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <Sparkles size={20} className="text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-800">Upload Image Asset</h2>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                
                {/* Drag and Drop Zone */}
                {!previewUrl ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                      isDragOver
                        ? "border-indigo-500 bg-indigo-50/50 shadow-inner scale-98"
                        : "border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="p-4 bg-white rounded-full shadow-sm text-slate-400 border border-slate-100">
                      <Upload size={24} className="text-slate-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-700 text-sm">
                        Drag & Drop or <span className="text-indigo-600">Browse</span>
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        PNG, JPG, WebP up to 5MB
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Preview block */
                  <div className="border border-slate-200 rounded-xl overflow-hidden relative group bg-slate-900">
                    <img 
                      src={previewUrl} 
                      alt="Selected preview" 
                      className="w-full aspect-video object-contain max-h-48 opacity-90 transition-opacity" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent flex items-end p-3">
                      <p className="text-white text-xs font-semibold truncate flex-1">
                        {selectedFile?.name}
                      </p>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition shadow-md cursor-pointer ml-2"
                        title="Remove selection"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Alt Text Input */}
                <div className="space-y-1">
                  <label htmlFor="alt-text" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Alt Text (Accessibility)
                  </label>
                  <input
                    id="alt-text"
                    type="text"
                    placeholder="Describe this image for screen readers..."
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className={`w-full py-3 px-4 font-bold text-white rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                    !selectedFile || uploading
                      ? "bg-slate-300 cursor-not-allowed shadow-none"
                      : "bg-indigo-600 hover:bg-indigo-700 active:scale-98"
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Uploading Asset...
                    </>
                  ) : (
                    <>
                      <FileImage size={18} />
                      Publish to Carousel
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* List and reordering section */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-2">
                  <ImageIcon size={20} className="text-indigo-600" />
                  <h2 className="text-xl font-bold text-slate-800">
                    Live Carousel Slides ({images.length})
                  </h2>
                </div>
                <div className="flex items-center gap-1 text-slate-400" title="Images render from left-to-right (lower sort order first)">
                  <HelpCircle size={14} />
                  <span className="text-xs font-medium">Ordering Info</span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <Loader2 size={40} className="animate-spin text-indigo-500" />
                  <p className="font-semibold text-sm">Fetching active slides...</p>
                </div>
              ) : images.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-full">
                    <ImageIcon size={48} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">No active CMS slides</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm">
                      Upload an image using the upload pane. The gbfront site is currently falling back to standard static images.
                    </p>
                  </div>
                </div>
              ) : (
                /* Images Grid */
                <div className="space-y-4 flex-1">
                  {images.map((img, index) => (
                    <div
                      key={img.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-slate-100 rounded-xl hover:border-slate-200 bg-slate-50/30 hover:bg-slate-50/80 transition-all group"
                    >
                      {/* Image Thumbnail Preview */}
                      <div className="relative aspect-video w-full sm:w-36 bg-slate-200 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                        <img
                          src={img.url}
                          alt={img.alt_text || "Impact thumbnail"}
                          className="object-cover w-full h-full"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white font-mono text-xxs rounded">
                          #{index + 1}
                        </div>
                      </div>

                      {/* Info & Alt Text Editing */}
                      <div className="flex-1 min-w-0 space-y-1 w-full">
                        {editingId === img.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              placeholder="Describe this image..."
                              className="flex-1 px-3 py-1.5 text-sm border border-indigo-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-slate-900"
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditSave(img.id)}
                              className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition shadow-sm cursor-pointer"
                              title="Save description"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg transition cursor-pointer"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-400">Alt Text:</span>
                              <button
                                onClick={() => handleEditStart(img.id, img.alt_text)}
                                className="p-1 text-slate-400 hover:text-indigo-600 transition hover:bg-indigo-50 rounded"
                                title="Edit alt text"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                            <p className="text-slate-700 text-sm font-medium line-clamp-2 italic">
                              {img.alt_text ? `"${img.alt_text}"` : <span className="text-slate-400 text-xs italic">No alt text specified (click edit icon)</span>}
                            </p>
                          </div>
                        )}
                        <p className="text-slate-400 text-xxs mt-2">
                          Added: {new Date(img.created_at).toLocaleDateString()} at {new Date(img.created_at).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Action buttons (Reordering / Delete) */}
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto justify-end sm:justify-start">
                        {/* Move Up */}
                        <button
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          className={`p-2 rounded-lg border border-slate-200 transition ${
                            index === 0
                              ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                              : "bg-white text-slate-600 hover:bg-slate-100 hover:text-indigo-600 cursor-pointer shadow-sm"
                          }`}
                          title="Move Left/Up in Carousel"
                        >
                          <ArrowUp size={16} />
                        </button>
                        
                        {/* Move Down */}
                        <button
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === images.length - 1}
                          className={`p-2 rounded-lg border border-slate-200 transition ${
                            index === images.length - 1
                              ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                              : "bg-white text-slate-600 hover:bg-slate-100 hover:text-indigo-600 cursor-pointer shadow-sm"
                          }`}
                          title="Move Right/Down in Carousel"
                        >
                          <ArrowDown size={16} />
                        </button>

                        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(img.id, img.url)}
                          className="p-2 bg-white text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-lg hover:bg-rose-50 transition cursor-pointer shadow-sm"
                          title="Delete image slide"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </main>
      </div>
    </div>
  )
}
