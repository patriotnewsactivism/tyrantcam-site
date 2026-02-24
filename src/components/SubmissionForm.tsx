import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { TablesInsert } from '../lib/database.types'
import { Upload, AlertTriangle, CheckCircle, Eye, EyeOff, FileText, X } from 'lucide-react'

type Category = 'Federal' | 'State' | 'Local' | 'Law Enforcement'

interface FormData {
  tyrant_name: string
  title_position: string
  category: Category | ''
  description: string
  evidence_url: string | null
  reporter_email: string
  is_anonymous: boolean
}

interface FormErrors {
  tyrant_name?: string
  title_position?: string
  category?: string
  description?: string
  evidence_url?: string
  reporter_email?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export default function SubmissionForm() {
  const [formData, setFormData] = useState<FormData>({
    tyrant_name: '',
    title_position: '',
    category: '',
    description: '',
    evidence_url: null,
    reporter_email: '',
    is_anonymous: true,
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateField = useCallback((name: string, value: string | boolean | null): string | undefined => {
    switch (name) {
      case 'tyrant_name':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Tyrant name is required'
        }
        if (typeof value === 'string' && value.length > 100) {
          return 'Name must be less than 100 characters'
        }
        break
      case 'title_position':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Title/Position is required'
        }
        if (typeof value === 'string' && value.length > 150) {
          return 'Title must be less than 150 characters'
        }
        break
      case 'category':
        if (!value) {
          return 'Please select a category'
        }
        break
      case 'description':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Description is required'
        }
        if (typeof value === 'string' && value.length < 20) {
          return 'Description must be at least 20 characters'
        }
        if (typeof value === 'string' && value.length > 5000) {
          return 'Description must be less than 5000 characters'
        }
        break
      case 'reporter_email':
        if (value && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address'
        }
        break
    }
    return undefined
  }, [])

  const validateFile = useCallback((file: File): string | undefined => {
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return 'File must be JPEG, PNG, WebP, or PDF'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB'
    }
    return undefined
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    const newValue = type === 'checkbox' ? checked : value
    
    setFormData(prev => ({ ...prev, [name]: newValue }))
    
    if (type !== 'checkbox') {
      const error = validateField(name, newValue)
      setErrors(prev => ({ ...prev, [name]: error }))
    }
    
    if (submitStatus !== 'idle') {
      setSubmitStatus('idle')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    if (!file) {
      return
    }

    const error = validateFile(file)
    if (error) {
      setErrors(prev => ({ ...prev, evidence_url: error }))
      return
    }

    setErrors(prev => ({ ...prev, evidence_url: undefined }))
    setSelectedFile(file)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl(null)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setFormData(prev => ({ ...prev, evidence_url: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    newErrors.tyrant_name = validateField('tyrant_name', formData.tyrant_name)
    newErrors.title_position = validateField('title_position', formData.title_position)
    newErrors.category = validateField('category', formData.category)
    newErrors.description = validateField('description', formData.description)
    
    if (formData.reporter_email) {
      newErrors.reporter_email = validateField('reporter_email', formData.reporter_email)
    }

    setErrors(newErrors)
    
    return !Object.values(newErrors).some(error => error !== undefined)
  }

  const isFormValid = (): boolean => {
    return (
      formData.tyrant_name.trim().length > 0 &&
      formData.title_position.trim().length > 0 &&
      formData.category !== '' &&
      formData.description.trim().length >= 20 &&
      !errors.tyrant_name &&
      !errors.title_position &&
      !errors.category &&
      !errors.description &&
      !errors.reporter_email &&
      !errors.evidence_url
    )
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `evidence/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(filePath, file)

    if (uploadError) {
      throw new Error('Failed to upload file')
    }

    const { data: { publicUrl } } = supabase.storage
      .from('submissions')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      let evidenceUrl: string | null = null
      
      if (selectedFile) {
        evidenceUrl = await uploadFile(selectedFile)
      }

      const submission: TablesInsert<'submissions'> = {
        tyrant_name: formData.tyrant_name.trim(),
        title_position: formData.title_position.trim(),
        category: formData.category as Category,
        description: formData.description.trim(),
        evidence_url: evidenceUrl,
        reporter_email: formData.is_anonymous ? null : formData.reporter_email.trim() || null,
        is_anonymous: formData.is_anonymous,
        status: 'pending',
      }

      const { error: insertError } = await supabase
        .from('submissions')
        .insert([submission])

      if (insertError) {
        throw new Error(insertError.message)
      }

      setSubmitStatus('success')
      setFormData({
        tyrant_name: '',
        title_position: '',
        category: '',
        description: '',
        evidence_url: null,
        reporter_email: '',
        is_anonymous: true,
      })
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setSubmitStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-tyrant-gray border-2 border-tyrant-red p-6 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-tyrant-red flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-2">Privacy Notice</h3>
            <p className="text-gray-300 text-sm mb-3">
              Your identity is protected. When submitting anonymously, no personal information is collected or stored.
            </p>
            <ul className="text-gray-400 text-xs space-y-1">
              <li>• We do not log IP addresses</li>
              <li>• Anonymous submissions cannot be traced back to you</li>
              <li>• Contact email is optional and only used for follow-up updates</li>
              <li>• All submissions are reviewed before publication</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {submitStatus === 'success' && (
          <div className="bg-green-900/30 border border-green-600 p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-400">Submission received! Our team will review your report shortly.</p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="bg-red-900/30 border border-red-600 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-red-400">{errorMessage || 'Submission failed. Please try again.'}</p>
          </div>
        )}

        <div>
          <label htmlFor="tyrant_name" className="block text-sm font-bold uppercase tracking-wide text-gray-300 mb-2">
            Tyrant Name <span className="text-tyrant-red">*</span>
          </label>
          <input
            type="text"
            id="tyrant_name"
            name="tyrant_name"
            value={formData.tyrant_name}
            onChange={handleChange}
            placeholder="Enter the name of the government official"
            className={`w-full bg-tyrant-black border-2 ${errors.tyrant_name ? 'border-red-500' : 'border-gray-700 focus:border-tyrant-red'} text-white px-4 py-3 outline-none transition-colors placeholder-gray-600`}
          />
          {errors.tyrant_name && (
            <p className="text-red-500 text-sm mt-1">{errors.tyrant_name}</p>
          )}
        </div>

        <div>
          <label htmlFor="title_position" className="block text-sm font-bold uppercase tracking-wide text-gray-300 mb-2">
            Title/Position <span className="text-tyrant-red">*</span>
          </label>
          <input
            type="text"
            id="title_position"
            name="title_position"
            value={formData.title_position}
            onChange={handleChange}
            placeholder="e.g., Mayor, Police Chief, Senator"
            className={`w-full bg-tyrant-black border-2 ${errors.title_position ? 'border-red-500' : 'border-gray-700 focus:border-tyrant-red'} text-white px-4 py-3 outline-none transition-colors placeholder-gray-600`}
          />
          {errors.title_position && (
            <p className="text-red-500 text-sm mt-1">{errors.title_position}</p>
          )}
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-bold uppercase tracking-wide text-gray-300 mb-2">
            Category <span className="text-tyrant-red">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`w-full bg-tyrant-black border-2 ${errors.category ? 'border-red-500' : 'border-gray-700 focus:border-tyrant-red'} text-white px-4 py-3 outline-none transition-colors cursor-pointer`}
          >
            <option value="" disabled>Select a category</option>
            <option value="Federal">Federal</option>
            <option value="State">State</option>
            <option value="Local">Local</option>
            <option value="Law Enforcement">Law Enforcement</option>
          </select>
          {errors.category && (
            <p className="text-red-500 text-sm mt-1">{errors.category}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-bold uppercase tracking-wide text-gray-300 mb-2">
            Description of Abuse <span className="text-tyrant-red">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={6}
            placeholder="Describe the abuse of power in detail (minimum 20 characters)..."
            className={`w-full bg-tyrant-black border-2 ${errors.description ? 'border-red-500' : 'border-gray-700 focus:border-tyrant-red'} text-white px-4 py-3 outline-none transition-colors placeholder-gray-600 resize-y`}
          />
          <div className="flex justify-between mt-1">
            {errors.description && (
              <p className="text-red-500 text-sm">{errors.description}</p>
            )}
            <p className={`text-sm ml-auto ${formData.description.length < 20 ? 'text-gray-500' : 'text-green-500'}`}>
              {formData.description.length}/5000
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="evidence" className="block text-sm font-bold uppercase tracking-wide text-gray-300 mb-2">
            Evidence Upload <span className="text-gray-500">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type="file"
              id="evidence"
              name="evidence"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed ${errors.evidence_url ? 'border-red-500' : 'border-gray-700 hover:border-tyrant-red'} bg-tyrant-black p-8 text-center cursor-pointer transition-colors`}
            >
              <Upload className="w-10 h-10 mx-auto text-gray-500 mb-3" />
              <p className="text-gray-400 text-sm">Click to upload or drag and drop</p>
              <p className="text-gray-600 text-xs mt-1">JPEG, PNG, WebP, or PDF (max 5MB)</p>
            </div>
          </div>
          {errors.evidence_url && (
            <p className="text-red-500 text-sm mt-1">{errors.evidence_url}</p>
          )}
          
          {previewUrl && (
            <div className="mt-4 relative">
              <p className="text-sm text-gray-400 mb-2">Preview:</p>
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  alt="Evidence preview"
                  className="max-h-48 border border-gray-700"
                />
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute -top-2 -right-2 bg-tyrant-red text-white p-1 hover:bg-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {selectedFile && !previewUrl && (
            <div className="mt-4 flex items-center gap-3 bg-tyrant-black p-3 border border-gray-700">
              <FileText className="w-5 h-5 text-gray-400" />
              <span className="text-gray-300 text-sm flex-1">{selectedFile.name}</span>
              <button
                type="button"
                onClick={removeFile}
                className="text-red-500 hover:text-red-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="reporter_email" className="block text-sm font-bold uppercase tracking-wide text-gray-300 mb-2">
            Reporter Contact <span className="text-gray-500">(Optional)</span>
          </label>
          <input
            type="email"
            id="reporter_email"
            name="reporter_email"
            value={formData.reporter_email}
            onChange={handleChange}
            placeholder="your@email.com"
            disabled={formData.is_anonymous}
            className={`w-full bg-tyrant-black border-2 ${errors.reporter_email ? 'border-red-500' : 'border-gray-700 focus:border-tyrant-red'} text-white px-4 py-3 outline-none transition-colors placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {errors.reporter_email && (
            <p className="text-red-500 text-sm mt-1">{errors.reporter_email}</p>
          )}
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="is_anonymous"
            name="is_anonymous"
            checked={formData.is_anonymous}
            onChange={handleChange}
            className="mt-1 w-5 h-5 bg-tyrant-black border-2 border-gray-700 text-tyrant-red focus:ring-tyrant-red focus:ring-offset-0 cursor-pointer"
          />
          <label htmlFor="is_anonymous" className="text-gray-300 text-sm cursor-pointer select-none">
            <span className="font-bold">Submit Anonymously</span>
            <span className="block text-gray-500 text-xs mt-1">
              Your identity will be completely hidden. We will not be able to contact you about this submission.
            </span>
          </label>
        </div>

        {!formData.is_anonymous && (
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <Eye className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Your email will only be used for follow-up updates and will never be shared publicly.</p>
          </div>
        )}

        {formData.is_anonymous && (
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <EyeOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>You are submitting anonymously. We cannot contact you about this submission.</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!isFormValid() || isSubmitting}
          className={`w-full py-4 px-6 font-bold uppercase tracking-widest text-sm transition-all ${
            isFormValid() && !isSubmitting
              ? 'bg-tyrant-red hover:bg-red-700 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit Report'
          )}
        </button>

        <p className="text-center text-gray-600 text-xs">
          By submitting, you confirm this report is truthful to the best of your knowledge.
        </p>
      </form>
    </div>
  )
}
