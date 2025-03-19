"use client"

import { useRef } from "react"

import type React from "react"

import type { ViewMode, AnnotationType } from "./dicom-viewer"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layout,
  LayoutGrid,
  FlipHorizontal,
  Pencil,
  Text,
  Brain,
  Upload,
  Move,
  Trash2,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface ToolbarProps {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  toggleInvert: () => void
  isInverted: boolean
  increaseZoom: () => void
  decreaseZoom: () => void
  resetZoom: () => void
  annotationMode: AnnotationType
  setAnnotationMode: (mode: AnnotationType) => void
  toggleAISidebar: () => void
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, sliceIndex: number) => void
  activeImageIndex: number
  selectedAnnotation: string | null
  deleteAnnotation: (id: string) => void
  updateSliceZoom: (index: number, action: "increase" | "decrease" | "reset") => void
  toggleSliceInvert: (index: number) => void
}

export default function Toolbar({
  viewMode,
  setViewMode,
  toggleInvert,
  isInverted,
  increaseZoom,
  decreaseZoom,
  resetZoom,
  annotationMode,
  setAnnotationMode,
  toggleAISidebar,
  handleFileUpload,
  activeImageIndex,
  selectedAnnotation,
  deleteAnnotation,
  updateSliceZoom,
  toggleSliceInvert,
}: ToolbarProps) {
  const [textAnnotation, setTextAnnotation] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="flex items-center justify-between p-2 bg-gray-900 border-t border-gray-700">
      <TooltipProvider>
        <div className="flex items-center space-x-2">
          {/* View Controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${viewMode === "quad" ? "bg-gray-700" : ""}`}
                onClick={() => setViewMode("quad")}
              >
                <LayoutGrid className="h-5 w-5 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Quad View</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${viewMode === "single" ? "bg-gray-700" : ""}`}
                onClick={() => setViewMode("single")}
              >
                <Layout className="h-5 w-5 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Single View</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-8 bg-gray-700" />

          {/* Image Controls - Now slice-specific */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => toggleSliceInvert(activeImageIndex)}>
                <FlipHorizontal className="h-5 w-5 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Invert Current Slice</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => updateSliceZoom(activeImageIndex, "decrease")}>
                <ZoomOut className="h-5 w-5 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom Out Current Slice</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => updateSliceZoom(activeImageIndex, "increase")}>
                <ZoomIn className="h-5 w-5 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom In Current Slice</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => updateSliceZoom(activeImageIndex, "reset")}>
                <RotateCcw className="h-5 w-5 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset Current Slice View</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-8 bg-gray-700" />

          {/* Navigation Mode */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${annotationMode === "none" ? "bg-gray-700" : ""}`}
                onClick={() => setAnnotationMode("none")}
              >
                <Move className="h-5 w-5 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pan Mode</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-8 bg-gray-700" />

          {/* Annotation Controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${annotationMode === "line" ? "bg-gray-700" : ""}`}
                onClick={() => setAnnotationMode("line")}
              >
                <Pencil className="h-5 w-5 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Line Tool</p>
            </TooltipContent>
          </Tooltip>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className={`${annotationMode === "text" ? "bg-gray-700" : ""}`}>
                <Text className="h-5 w-5 text-white" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Text Annotation</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="annotation" className="text-right">
                    Text
                  </Label>
                  <Textarea
                    id="annotation"
                    className="col-span-3"
                    placeholder="Enter annotation text..."
                    value={textAnnotation}
                    onChange={(e) => setTextAnnotation(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  onClick={() => {
                    setAnnotationMode("text")
                    // In a real app, you'd set the text and position here
                  }}
                >
                  Add Annotation
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Annotation Button */}
          {selectedAnnotation && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-red-900 hover:bg-red-800"
                  onClick={() => deleteAnnotation(selectedAnnotation)}
                >
                  <Trash2 className="h-5 w-5 text-white" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Selected Annotation</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* File Upload (hidden) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e, activeImageIndex)}
            className="hidden"
            accept=".jpeg,.jpg,.png,.dicom"
          />

          {/* File Upload Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={triggerFileUpload}>
                <Upload className="h-5 w-5 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Load DICOM File for Current Slice</p>
            </TooltipContent>
          </Tooltip>

          {/* AI Analysis Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                onClick={() => window.open("https://huggingface.co/spaces/pb01/healthlink-beta", "_blank")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Brain className="h-5 w-5 mr-2" />
                Analyze with AI
              </Button>
            </TooltipTrigger>

            <TooltipContent>
              <p>Analyze Image with AI</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  )
}