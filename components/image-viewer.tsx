"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { ViewMode, AnnotationType, Annotation } from "./dicom-viewer"
import { X, Upload, Trash2, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import AnnotationList from "./annotation-list"

interface ImageViewerProps {
  images: string[]
  activeImageIndex: number
  sliceInverted: boolean[]
  sliceZoomLevels: number[]
  viewMode: ViewMode
  annotationMode: AnnotationType
  annotations: Annotation[]
  selectedAnnotation: string | null
  setSelectedAnnotation: (id: string | null) => void
  addAnnotation: (imageIndex: number, annotation: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  setActiveImageIndex: (index: number) => void
  visibleImages: boolean[]
  removeImage: (index: number) => void
  imageErrors: boolean[]
  onImageError: (index: number) => void
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, sliceIndex: number) => void
  annotationListVisible: number | null
  toggleAnnotationList: (index: number) => void
}

export default function ImageViewer({
  images,
  activeImageIndex,
  sliceInverted,
  sliceZoomLevels,
  viewMode,
  annotationMode,
  annotations,
  selectedAnnotation,
  setSelectedAnnotation,
  addAnnotation,
  deleteAnnotation,
  setActiveImageIndex,
  visibleImages,
  removeImage,
  imageErrors,
  onImageError,
  handleFileUpload,
  annotationListVisible,
  toggleAnnotationList,
}: ImageViewerProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null, null])
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null])
  const containerRef = useRef<HTMLDivElement>(null)

  const [panPosition, setPanPosition] = useState<{ x: number; y: number }[]>([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ])
  const [isPanning, setIsPanning] = useState(false)
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 })

  // For line annotation
  const [isDrawing, setIsDrawing] = useState(false)
  const [lineStart, setLineStart] = useState({ x: 0, y: 0 })

  // For text annotation
  const [textAnnotationPosition, setTextAnnotationPosition] = useState<{ x: number; y: number } | null>(null)

  // Track original image dimensions to maintain aspect ratio
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }[]>(
    Array(4).fill({ width: 0, height: 0 }),
  )

  // Labels for image orientation
  const labels = [
    { position: "top-left", text: "A" },
    { position: "top-right", text: "A" },
    { position: "bottom-left", text: "P" },
    { position: "bottom-right", text: "P" },
    { position: "left-top", text: "R" },
    { position: "left-bottom", text: "R" },
    { position: "right-top", text: "L" },
    { position: "right-bottom", text: "L" },
  ]

  // Trigger file upload for a specific slice
  const triggerFileUpload = (index: number) => {
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]?.click()
    }
  }

  // Get annotation count for a specific slice
  const getAnnotationCount = (sliceIndex: number) => {
    return annotations.filter((a) => a.imageIndex === sliceIndex).length
  }

  // Draw images on canvas
  useEffect(() => {
    const drawImage = async (canvasIndex: number) => {
      const canvas = canvasRefs.current[canvasIndex]
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const imgUrl = images[canvasIndex % images.length]
      if (!imgUrl) return

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // If there's an error for this image, show error state
      if (imageErrors[canvasIndex]) {
        ctx.fillStyle = "#333"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.font = "16px Arial"
        ctx.fillStyle = "red"
        ctx.textAlign = "center"
        ctx.fillText("Error loading image", canvas.width / 2, canvas.height / 2 - 20)
        ctx.fillText("Please try uploading again", canvas.width / 2, canvas.height / 2 + 20)
        return
      }

      try {
        // Create a new image
        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
          // Store original dimensions for aspect ratio calculation
          const newDimensions = [...imageDimensions]
          newDimensions[canvasIndex] = { width: img.width, height: img.height }
          setImageDimensions(newDimensions)

          // Calculate aspect ratio
          const imgRatio = img.width / img.height
          const canvasRatio = canvas.width / canvas.height

          // Calculate dimensions that preserve aspect ratio
          let drawWidth, drawHeight, x, y

          if (imgRatio > canvasRatio) {
            // Image is wider than canvas
            drawWidth = canvas.width * sliceZoomLevels[canvasIndex]
            drawHeight = drawWidth / imgRatio
          } else {
            // Image is taller than canvas
            drawHeight = canvas.height * sliceZoomLevels[canvasIndex]
            drawWidth = drawHeight * imgRatio
          }

          // Calculate position with pan offset
          x = (canvas.width - drawWidth) / 2 + panPosition[canvasIndex].x
          y = (canvas.height - drawHeight) / 2 + panPosition[canvasIndex].y

          // Save the current transform
          ctx.save()

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          // Draw image
          ctx.drawImage(img, x, y, drawWidth, drawHeight)

          // Apply inversion filter if needed
          if (sliceInverted[canvasIndex]) {
            ctx.globalCompositeOperation = "difference"
            ctx.fillStyle = "white"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.globalCompositeOperation = "source-over"
          }

          // Draw annotations for this image
          const imageAnnotations = annotations.filter((a) => a.imageIndex === canvasIndex)
          imageAnnotations.forEach((annotation) => {
            const isSelected = annotation.id === selectedAnnotation

            if (annotation.type === "line" && annotation.start && annotation.end) {
              ctx.beginPath()
              ctx.strokeStyle = isSelected ? "lime" : "yellow"
              ctx.lineWidth = isSelected ? 3 : 2
              ctx.moveTo(annotation.start.x, annotation.start.y)
              ctx.lineTo(annotation.end.x, annotation.end.y)
              ctx.stroke()

              // Draw selection handles if selected
              if (isSelected) {
                ctx.fillStyle = "lime"
                ctx.beginPath()
                ctx.arc(annotation.start.x, annotation.start.y, 5, 0, Math.PI * 2)
                ctx.fill()
                ctx.beginPath()
                ctx.arc(annotation.end.x, annotation.end.y, 5, 0, Math.PI * 2)
                ctx.fill()
              }
            } else if (annotation.type === "text" && annotation.text && annotation.position) {
              ctx.font = isSelected ? "bold 14px Arial" : "14px Arial"
              ctx.fillStyle = isSelected ? "lime" : "yellow"
              ctx.fillText(annotation.text, annotation.position.x, annotation.position.y)

              // Draw selection box if selected
              if (isSelected) {
                const metrics = ctx.measureText(annotation.text)
                const textHeight = 14 // Approximate height based on font size
                ctx.strokeStyle = "lime"
                ctx.lineWidth = 1
                ctx.strokeRect(
                  annotation.position.x - 2,
                  annotation.position.y - textHeight,
                  metrics.width + 4,
                  textHeight + 4,
                )
              }
            }
          })

          // Restore the transform
          ctx.restore()
        }

        img.onerror = () => {
          onImageError(canvasIndex)
        }

        img.src = imgUrl
      } catch (error) {
        console.error("Error loading image:", error)
        onImageError(canvasIndex)
      }
    }

    // Determine which images to draw based on view mode and visibility
    let indicesToDraw: number[] = []

    if (viewMode === "single") {
      indicesToDraw = [activeImageIndex]
    } else if (viewMode === "quad") {
      indicesToDraw = [0, 1, 2, 3]
    } else if (viewMode === "custom") {
      // In custom mode, only draw visible images
      indicesToDraw = visibleImages.map((visible, index) => (visible ? index : -1)).filter((index) => index !== -1)
    }

    // Draw all visible images
    indicesToDraw.forEach(drawImage)
  }, [
    images,
    activeImageIndex,
    sliceInverted,
    sliceZoomLevels,
    viewMode,
    panPosition,
    annotations,
    visibleImages,
    imageErrors,
    selectedAnnotation,
  ])

  // Check if a point is inside an annotation (for selection)
  const isPointInAnnotation = (x: number, y: number, annotation: Annotation): boolean => {
    if (annotation.type === "line" && annotation.start && annotation.end) {
      // For lines, check if point is close to the line
      const lineLength = Math.sqrt(
        Math.pow(annotation.end.x - annotation.start.x, 2) + Math.pow(annotation.end.y - annotation.start.y, 2),
      )

      // Calculate distance from point to line
      const d =
        Math.abs(
          (annotation.end.y - annotation.start.y) * x -
            (annotation.end.x - annotation.start.x) * y +
            annotation.end.x * annotation.start.y -
            annotation.end.y * annotation.start.x,
        ) / lineLength

      return d < 10 // 10px threshold for selection
    } else if (annotation.type === "text" && annotation.position && annotation.text) {
      // For text, check if point is inside text bounds
      const canvas = canvasRefs.current[annotation.imageIndex]
      if (!canvas) return false

      const ctx = canvas.getContext("2d")
      if (!ctx) return false

      ctx.font = "14px Arial"
      const metrics = ctx.measureText(annotation.text)
      const textHeight = 14 // Approximate height based on font size

      return (
        x >= annotation.position.x - 2 &&
        x <= annotation.position.x + metrics.width + 2 &&
        y >= annotation.position.y - textHeight &&
        y <= annotation.position.y + 4
      )
    }

    return false
  }

  // Handle mouse events for panning, drawing, and annotation selection
  const handleMouseDown = (e: React.MouseEvent, canvasIndex: number) => {
    const canvas = canvasRefs.current[canvasIndex]
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if we clicked on an annotation
    const clickedAnnotations = annotations
      .filter((a) => a.imageIndex === canvasIndex)
      .filter((a) => isPointInAnnotation(x, y, a))

    if (clickedAnnotations.length > 0) {
      // Select the annotation
      setSelectedAnnotation(clickedAnnotations[0].id)
      return
    }

    // If we didn't click on an annotation, proceed with normal behavior
    if (annotationMode === "line") {
      setIsDrawing(true)
      setLineStart({ x, y })
    } else if (annotationMode === "text") {
      setTextAnnotationPosition({ x, y })
      // In a real app, you'd open a dialog or input field here
      const text = prompt("Enter annotation text:")
      if (text) {
        addAnnotation(canvasIndex, {
          type: "text",
          text,
          position: { x, y },
        })
      }
    } else {
      // Pan mode
      setIsPanning(true)
      setLastMousePosition({ x: e.clientX, y: e.clientY })
      // Deselect annotation when clicking elsewhere
      setSelectedAnnotation(null)
    }

    setActiveImageIndex(canvasIndex)
  }

  const handleMouseMove = (e: React.MouseEvent, canvasIndex: number) => {
    if (isPanning) {
      const deltaX = e.clientX - lastMousePosition.x
      const deltaY = e.clientY - lastMousePosition.y

      setPanPosition((prev) => {
        const newPanPosition = [...prev]
        newPanPosition[canvasIndex] = {
          x: newPanPosition[canvasIndex].x + deltaX,
          y: newPanPosition[canvasIndex].y + deltaY,
        }
        return newPanPosition
      })

      setLastMousePosition({ x: e.clientX, y: e.clientY })
    } else if (isDrawing && annotationMode === "line") {
      // For real-time drawing feedback, you'd redraw the canvas here
    }
  }

  const handleMouseUp = (e: React.MouseEvent, canvasIndex: number) => {
    if (isPanning) {
      setIsPanning(false)
    } else if (isDrawing && annotationMode === "line") {
      setIsDrawing(false)

      const canvas = canvasRefs.current[canvasIndex]
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      addAnnotation(canvasIndex, {
        type: "line",
        start: lineStart,
        end: { x, y },
      })
    }
  }

  // Get visible image indices
  const getVisibleIndices = () => {
    if (viewMode === "single") return [activeImageIndex]
    return visibleImages.map((visible, index) => (visible ? index : -1)).filter((index) => index !== -1)
  }

  // Calculate grid layout based on number of visible images
  const getGridLayout = () => {
    const visibleCount = visibleImages.filter((v) => v).length

    if (viewMode === "single") {
      return {
        gridTemplateColumns: "1fr",
        gridTemplateRows: "1fr",
      }
    }

    if (viewMode === "quad" || visibleCount === 4) {
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
      }
    }

    // Custom layouts based on number of visible images
    if (visibleCount === 3) {
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
      }
    }

    if (visibleCount === 2) {
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr",
      }
    }

    if (visibleCount === 1) {
      return {
        gridTemplateColumns: "1fr",
        gridTemplateRows: "1fr",
      }
    }

    // Default
    return {
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
    }
  }

  // Render panels based on view mode and visibility
  return (
    <div ref={containerRef} className="w-full h-full grid gap-1" style={getGridLayout()}>
      {/* Hidden file inputs for each slice */}
      {[0, 1, 2, 3].map((index) => (
        <input
          key={`file-input-${index}`}
          type="file"
          ref={(el) => {
            fileInputRefs.current[index] = el;
          }}
          onChange={(e) => handleFileUpload(e, index)}
          className="hidden"
          accept=".jpeg,.jpg,.png,.dicom"
        />
      ))}

      {viewMode === "single" ? (
        // Single view mode - show only the active image
        <div
          className={`relative bg-black border overflow-hidden ${activeImageIndex === activeImageIndex ? "border-green-500 border-2" : "border-gray-700"}`}
        >
          <div className="absolute top-0 left-0 p-1 text-xs text-white font-semibold z-10">
            {activeImageIndex === 0 && "Axial View"}
            {activeImageIndex === 1 && "Coronal View"}
            {activeImageIndex === 2 && "Sagittal View"}
            {activeImageIndex === 3 && "3D Rendering"}
          </div>

          <TooltipProvider>
            <div className="absolute top-1 right-1 z-20 flex space-x-1">
              {/* Annotation List Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-blue-800 hover:bg-blue-700 rounded-full p-1 relative"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleAnnotationList(activeImageIndex)
                    }}
                  >
                    <List className="h-4 w-4 text-white" />
                    {getAnnotationCount(activeImageIndex) > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-blue-500 text-[10px]">
                        {getAnnotationCount(activeImageIndex)}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Annotations</p>
                </TooltipContent>
              </Tooltip>

              {/* Upload Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-gray-800 hover:bg-gray-700 rounded-full p-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerFileUpload(activeImageIndex)
                    }}
                  >
                    <Upload className="h-4 w-4 text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upload Image for This Slice</p>
                </TooltipContent>
              </Tooltip>

              {/* Remove Image Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-gray-800 hover:bg-gray-700 rounded-full p-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(activeImageIndex)
                    }}
                  >
                    <X className="h-4 w-4 text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove Image</p>
                </TooltipContent>
              </Tooltip>

              {/* Delete Annotation Button (only shown when annotation is selected) */}
              {selectedAnnotation && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-red-800 hover:bg-red-700 rounded-full p-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteAnnotation(selectedAnnotation)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete Selected Annotation</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>

          {/* Annotation List Panel */}
          {annotationListVisible === activeImageIndex && (
            <AnnotationList
              annotations={annotations.filter((a) => a.imageIndex === activeImageIndex)}
              onClose={() => toggleAnnotationList(activeImageIndex)}
              onSelectAnnotation={setSelectedAnnotation}
              selectedAnnotation={selectedAnnotation}
              onDeleteAnnotation={deleteAnnotation}
            />
          )}

          {/* Orientation Labels */}
          {labels.map((label, labelIndex) => (
            <div
              key={labelIndex}
              className={`absolute text-white font-bold text-sm z-10
                ${label.position === "top-left" ? "top-8 left-2" : ""}
                ${label.position === "top-right" ? "top-8 right-2" : ""}
                ${label.position === "bottom-left" ? "bottom-2 left-2" : ""}
                ${label.position === "bottom-right" ? "bottom-2 right-2" : ""}
                ${label.position === "left-top" ? "top-1/3 left-2" : ""}
                ${label.position === "left-bottom" ? "bottom-1/3 left-2" : ""}
                ${label.position === "right-top" ? "top-1/3 right-2" : ""}
                ${label.position === "right-bottom" ? "bottom-1/3 right-2" : ""}
              `}
            >
              {label.text}
            </div>
          ))}

          <canvas
            ref={(el) => {
              canvasRefs.current[0] = el;
            }}
            width={800}
            height={800}
            className={`w-full h-full cursor-${annotationMode === "line" ? "crosshair" : "move"}`}
            onMouseDown={(e) => handleMouseDown(e, activeImageIndex)}
            onMouseMove={(e) => handleMouseMove(e, activeImageIndex)}
            onMouseUp={(e) => handleMouseUp(e, activeImageIndex)}
            data-index={activeImageIndex}
          />
        </div>
      ) : (
        // Multi-view mode - show all visible images
        getVisibleIndices().map((index) => (
          <div
            key={index}
            className={`relative bg-black border overflow-hidden ${index === activeImageIndex ? "border-green-500 border-2" : "border-gray-700"}`}
          >
            <div className="absolute top-0 left-0 p-1 text-xs text-white font-semibold z-10">
              {index === 0 && "Axial View"}
              {index === 1 && "Coronal View"}
              {index === 2 && "Sagittal View"}
              {index === 3 && "3D Rendering"}
            </div>

            <TooltipProvider>
              <div className="absolute top-1 right-1 z-20 flex space-x-1">
                {/* Annotation List Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-blue-800 hover:bg-blue-700 rounded-full p-1 relative"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleAnnotationList(index)
                      }}
                    >
                      <List className="h-4 w-4 text-white" />
                      {getAnnotationCount(index) > 0 && (
                        <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-blue-500 text-[10px]">
                          {getAnnotationCount(index)}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View Annotations</p>
                  </TooltipContent>
                </Tooltip>

                {/* Upload Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-gray-800 hover:bg-gray-700 rounded-full p-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        triggerFileUpload(index)
                      }}
                    >
                      <Upload className="h-4 w-4 text-white" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upload Image for This Slice</p>
                  </TooltipContent>
                </Tooltip>

                {/* Remove Image Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-gray-800 hover:bg-gray-700 rounded-full p-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeImage(index)
                      }}
                    >
                      <X className="h-4 w-4 text-white" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove Image</p>
                  </TooltipContent>
                </Tooltip>

                {/* Delete Annotation Button (only shown when annotation is selected) */}
                {selectedAnnotation && annotations.find((a) => a.id === selectedAnnotation)?.imageIndex === index && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-red-800 hover:bg-red-700 rounded-full p-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteAnnotation(selectedAnnotation)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete Selected Annotation</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>

            {/* Annotation List Panel */}
            {annotationListVisible === index && (
              <AnnotationList
                annotations={annotations.filter((a) => a.imageIndex === index)}
                onClose={() => toggleAnnotationList(index)}
                onSelectAnnotation={setSelectedAnnotation}
                selectedAnnotation={selectedAnnotation}
                onDeleteAnnotation={deleteAnnotation}
              />
            )}

            {/* Orientation Labels */}
            {labels.map((label, labelIndex) => (
              <div
                key={labelIndex}
                className={`absolute text-white font-bold text-sm z-10
                  ${label.position === "top-left" ? "top-8 left-2" : ""}
                  ${label.position === "top-right" ? "top-8 right-2" : ""}
                  ${label.position === "bottom-left" ? "bottom-2 left-2" : ""}
                  ${label.position === "bottom-right" ? "bottom-2 right-2" : ""}
                  ${label.position === "left-top" ? "top-1/3 left-2" : ""}
                  ${label.position === "left-bottom" ? "bottom-1/3 left-2" : ""}
                  ${label.position === "right-top" ? "top-1/3 right-2" : ""}
                  ${label.position === "right-bottom" ? "bottom-1/3 right-2" : ""}
                `}
              >
                {label.text}
              </div>
            ))}

            <canvas
              ref={(el) => {
                canvasRefs.current[index] = el;
              }}
              width={500}
              height={500}
              className={`w-full h-full cursor-${annotationMode === "line" ? "crosshair" : "move"}`}
              onMouseDown={(e) => handleMouseDown(e, index)}
              onMouseMove={(e) => handleMouseMove(e, index)}
              onMouseUp={(e) => handleMouseUp(e, index)}
              data-index={index}
            />
          </div>
        ))
      )}
    </div>
  )
}