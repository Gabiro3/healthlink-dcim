"use client"

import type React from "react"

import { useState, useEffect } from "react"
import ImageViewer from "./image-viewer"
import Toolbar from "./toolbar"
import AIAnalysisSidebar from "./ai-analysis-sidebar"
import { useToast } from "@/hooks/use-toast"

// Sample DICOM image URLs - in a real application, these would be loaded from a DICOM server
const sampleImages = [
  "/chestx.jpg?height=512&width=512",
  "/chestx2.jpg?height=512&width=512",
  "/handx.jpg?height=512&width=512",
  "/neckx.jpg?height=512&width=512",
]

export type ViewMode = "single" | "quad" | "custom"
export type AnnotationType = "line" | "text" | "none"

// Define annotation interface for better type safety
export interface Annotation {
  id: string
  type: "line" | "text"
  imageIndex: number
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  text?: string
  position?: { x: number; y: number }
  timestamp?: number // Add timestamp for when annotation was created
}

export default function DicomViewer() {
  const [images, setImages] = useState<string[]>(sampleImages)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [inverted, setInverted] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>("quad")
  const [annotationMode, setAnnotationMode] = useState<AnnotationType>("none")
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [showAISidebar, setShowAISidebar] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState({
    id: "112233",
    name: "Sample Patient",
    study: "Cranial CT Scan",
    date: "2025-03-12",
  })
  // Track which images are visible (all by default)
  const [visibleImages, setVisibleImages] = useState<boolean[]>([true, true, true, true])
  // Track loading errors for each image
  const [imageErrors, setImageErrors] = useState<boolean[]>([false, false, false, false])
  // Track slice-specific zoom levels
  const [sliceZoomLevels, setSliceZoomLevels] = useState<number[]>([1, 1, 1, 1])
  // Track slice-specific inversion states
  const [sliceInverted, setSliceInverted] = useState<boolean[]>([false, false, false, false])
  // Track which slice's annotation list is visible
  const [annotationListVisible, setAnnotationListVisible] = useState<number | null>(null)
  // Add a new state for the captured image blob
  const [capturedImageBlob, setCapturedImageBlob] = useState<Blob | null>(null)

  const { toast } = useToast()

  // Load annotations from localStorage on component mount
  useEffect(() => {
    try {
      const savedAnnotations = localStorage.getItem("dicom-annotations")
      if (savedAnnotations) {
        setAnnotations(JSON.parse(savedAnnotations))
      }
    } catch (error) {
      console.error("Error loading annotations from localStorage:", error)
      toast({
        title: "Error Loading Annotations",
        description: "There was a problem loading your saved annotations.",
        variant: "destructive",
      })
    }
  }, [])

  // Save annotations to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("dicom-annotations", JSON.stringify(annotations))
    } catch (error) {
      console.error("Error saving annotations to localStorage:", error)
    }
  }, [annotations])

  // Function to handle file uploads for a specific slice
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, sliceIndex: number) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = [...images]
      const newErrors = [...imageErrors]

      // In a real application, you would parse DICOM files here
      // For this demo, we'll just create object URLs from the uploaded files
      const file = e.target.files[0]
      const imageUrl = URL.createObjectURL(file)

      // Update only the specific slice
      newImages[sliceIndex] = imageUrl
      newErrors[sliceIndex] = false // Reset error state for new image

      setImages(newImages)
      setImageErrors(newErrors)
      toast({
        title: "Image Loaded",
        description: `DICOM image has been loaded successfully for slice ${sliceIndex + 1}.`,
      })
    }
  }

  // Add a new annotation
  const addAnnotation = (imageIndex: number, annotation: Partial<Annotation>) => {
    const newAnnotation: Annotation = {
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: annotation.type as "line" | "text",
      imageIndex,
      timestamp: Date.now(), // Add timestamp when creating annotation
      ...annotation,
    }

    setAnnotations((prev) => [...prev, newAnnotation])
  }

  // Delete an annotation
  const deleteAnnotation = (annotationId: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== annotationId))
    setSelectedAnnotation(null)

    toast({
      title: "Annotation Deleted",
      description: "The selected annotation has been removed.",
    })
  }

  // Add a function to capture the canvas image as a blob
  const captureCanvasImage = async (index: number) => {
    try {
      // Get a reference to the canvas through a ref or other means
      const canvasRef = document.querySelector(`canvas[data-index="${index}"]`) as HTMLCanvasElement

      if (canvasRef) {
        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvasRef.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Failed to convert canvas to blob"))
            }
          }, "image/png")
        })

        setCapturedImageBlob(blob)
      } else {
        console.error("Canvas not found for index:", index)
        setCapturedImageBlob(null)
      }
    } catch (error) {
      console.error("Error capturing canvas image:", error)
      setCapturedImageBlob(null)
    }
  }

  // Toggle the AI sidebar
  const toggleAISidebar = () => {
    if (!showAISidebar) {
      // When opening the sidebar, capture the current canvas image
      captureCanvasImage(activeImageIndex)
    }
    setShowAISidebar(!showAISidebar)
  }

  // Toggle annotation list for a specific slice
  const toggleAnnotationList = (index: number) => {
    if (annotationListVisible === index) {
      setAnnotationListVisible(null)
    } else {
      setAnnotationListVisible(index)
    }
  }

  // Handle image removal
  const removeImage = (index: number) => {
    const newVisibleImages = [...visibleImages]
    newVisibleImages[index] = false
    setVisibleImages(newVisibleImages)

    // If we're removing the active image, select another visible one
    if (index === activeImageIndex) {
      const nextVisibleIndex = newVisibleImages.findIndex((visible) => visible)
      if (nextVisibleIndex !== -1) {
        setActiveImageIndex(nextVisibleIndex)
      }
    }

    // If we're in single view and removing the active image, switch to the next available
    if (viewMode === "single" && index === activeImageIndex) {
      const nextVisibleIndex = newVisibleImages.findIndex((visible) => visible)
      if (nextVisibleIndex !== -1) {
        setActiveImageIndex(nextVisibleIndex)
      }
    }

    // If all images are hidden, show a message
    if (newVisibleImages.every((visible) => !visible)) {
      toast({
        title: "No Images Visible",
        description: "All images have been removed from view. Upload new images or refresh the page.",
        variant: "destructive",
      })
    }

    // If we have a custom number of visible images, switch to custom view mode
    const visibleCount = newVisibleImages.filter((v) => v).length
    if (visibleCount > 0 && visibleCount < 4) {
      setViewMode("custom")
    } else if (visibleCount === 4) {
      setViewMode("quad")
    }

    // Close annotation list if it was open for this slice
    if (annotationListVisible === index) {
      setAnnotationListVisible(null)
    }
  }

  // Handle image loading errors
  const handleImageError = (index: number) => {
    const newErrors = [...imageErrors]
    newErrors[index] = true
    setImageErrors(newErrors)

    toast({
      title: "Image Loading Error",
      description: `Failed to load image ${index + 1}. The file may be corrupted or in an unsupported format.`,
      variant: "destructive",
    })
  }

  // Slice-specific zoom control
  const updateSliceZoom = (index: number, action: "increase" | "decrease" | "reset") => {
    setSliceZoomLevels((prev) => {
      const newZoomLevels = [...prev]
      if (action === "increase") {
        newZoomLevels[index] = Math.min(newZoomLevels[index] + 0.1, 3)
      } else if (action === "decrease") {
        newZoomLevels[index] = Math.max(newZoomLevels[index] - 0.1, 0.5)
      } else if (action === "reset") {
        newZoomLevels[index] = 1
      }
      return newZoomLevels
    })
  }

  // Slice-specific invert control
  const toggleSliceInvert = (index: number) => {
    setSliceInverted((prev) => {
      const newInverted = [...prev]
      newInverted[index] = !newInverted[index]
      return newInverted
    })
  }

  return (
    <div className="flex flex-col w-full h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white border-b border-gray-700">
        <div className="font-bold text-lg">HEALTHLINK DICOM VIEWER V1.0</div>
        <div className="text-sm">{selectedPatient.id}</div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content area */}
        <div className={`flex flex-col flex-1 ${showAISidebar ? "w-3/4" : "w-full"} transition-all duration-300`}>
          {/* Viewer container */}
          <div className="flex-1 relative overflow-hidden bg-black">
            <ImageViewer
              images={images}
              activeImageIndex={activeImageIndex}
              sliceInverted={sliceInverted}
              sliceZoomLevels={sliceZoomLevels}
              viewMode={viewMode}
              annotationMode={annotationMode}
              annotations={annotations}
              selectedAnnotation={selectedAnnotation}
              setSelectedAnnotation={setSelectedAnnotation}
              addAnnotation={addAnnotation}
              deleteAnnotation={deleteAnnotation}
              setActiveImageIndex={setActiveImageIndex}
              visibleImages={visibleImages}
              removeImage={removeImage}
              imageErrors={imageErrors}
              onImageError={handleImageError}
              handleFileUpload={handleFileUpload}
              annotationListVisible={annotationListVisible}
              toggleAnnotationList={toggleAnnotationList}
            />
          </div>

          {/* Toolbar */}
          <Toolbar
            setViewMode={setViewMode}
            viewMode={viewMode}
            toggleInvert={() => setInverted(!inverted)}
            isInverted={inverted}
            increaseZoom={() => setZoomLevel((prev) => Math.min(prev + 0.1, 3))}
            decreaseZoom={() => setZoomLevel((prev) => Math.max(prev - 0.1, 0.5))}
            resetZoom={() => setZoomLevel(1)}
            annotationMode={annotationMode}
            setAnnotationMode={setAnnotationMode}
            toggleAISidebar={toggleAISidebar}
            handleFileUpload={handleFileUpload}
            activeImageIndex={activeImageIndex}
            selectedAnnotation={selectedAnnotation}
            deleteAnnotation={deleteAnnotation}
            updateSliceZoom={updateSliceZoom}
            toggleSliceInvert={toggleSliceInvert}
          />
        </div>

        {/* AI Analysis Sidebar */}
        {showAISidebar && (
          <AIAnalysisSidebar
            patientInfo={selectedPatient}
            imageUrl={images[activeImageIndex]}
            imageBlob={capturedImageBlob}
            onClose={toggleAISidebar}
          />
        )}
      </div>
    </div>
  )
}