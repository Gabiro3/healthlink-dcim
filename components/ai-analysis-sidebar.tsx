"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Loader2, AlertCircle, CheckCircle, BarChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { processImageWithAI, type AIAnalysisResult, defaultAIResult } from "@/lib/gradio-api"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface AIAnalysisSidebarProps {
  patientInfo: {
    id: string
    name: string
    study: string
    date: string
  }
  imageUrl: string
  imageBlob?: Blob | null
  onClose: () => void
}

export default function AIAnalysisSidebar({ patientInfo, imageUrl, imageBlob, onClose }: AIAnalysisSidebarProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AIAnalysisResult>(defaultAIResult)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  // Use refs to track the latest state without triggering re-renders
  const resultRef = useRef<AIAnalysisResult>(defaultAIResult)
  const hasAnalyzedRef = useRef(false)
  // Progress simulation interval
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup function for intervals
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])


  // Optimized state update function that batches updates
  const updateAnalysisState = useCallback((result: AIAnalysisResult) => {
    // Update refs immediately
    resultRef.current = result
    hasAnalyzedRef.current = true

    // Use requestAnimationFrame for smoother UI updates
    requestAnimationFrame(() => {
      // Batch state updates to prevent multiple re-renders
      setAiResult(result)
      setHasAnalyzed(true)
      setProgress(100)
    })
  }, [])

  // Simulate progress during analysis
  const startProgressSimulation = useCallback(() => {
    setProgress(0)

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        // Progress increases more slowly as it approaches 90%
        const increment = prev < 30 ? 5 : prev < 60 ? 3 : prev < 80 ? 1 : 0.5
        const newProgress = Math.min(prev + increment, 90)
        return newProgress
      })
    }, 200)
  }, [])

  const stopProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])

  const runAnalysis = async () => {
    if (!imageBlob) {
      toast({
        title: "Image Not Available",
        description: "Unable to analyze this image. Please try another image.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    startProgressSimulation()

    try {
      // Pre-process the image if needed (e.g., resize for faster upload)
      const processedBlob = imageBlob

      // Start the API request
      const result = await processImageWithAI(processedBlob, patientInfo.name, `Study: ${patientInfo.study}`)
      localStorage.setItem('aiAnalysisResult', JSON.stringify(result))
      const storedResult = localStorage.getItem('aiAnalysisResult')
      const aiAnalysisResult = storedResult ? JSON.parse(storedResult) : null
      setAiResult(aiAnalysisResult)
      setHasAnalyzed(true)


      // Ensure result has all required properties
      if (!result || typeof result !== "object") {
        throw new Error("Invalid result format received from API")
      }

      // Stop progress simulation and update UI
      stopProgressSimulation()
      updateAnalysisState(result)

      toast({
        title: "Analysis Complete",
        description: "AI analysis has been completed successfully.",
      })
    } catch (error) {
      console.error("Error during AI analysis:", error)
      stopProgressSimulation()
      setProgress(0)

      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing this image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Determine if the diagnosis is positive or negative
  const isNegative = hasAnalyzed && aiResult.diagnosis.toLowerCase().includes("negative")

  return (
    <div className="w-1/4 min-w-[300px] border-l border-gray-700 bg-gray-900 text-white flex flex-col overflow-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">AI Analysis</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        <h3 className="font-medium text-lg">Patient Information</h3>
        <div className="mt-2 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Patient ID:</span>
            <span>{patientInfo.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Patient Name:</span>
            <span>{patientInfo.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Study:</span>
            <span>{patientInfo.study}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Date:</span>
            <span>{patientInfo.date}</span>
          </div>
        </div>
      </div>

      <Separator className="my-4 bg-gray-700" />

      <div className="p-4 flex-1">
        <h3 className="font-medium text-lg">AI Findings</h3>
        <div className="mt-4 bg-gray-800 rounded-lg p-4">
          <div className="flex flex-col items-center justify-center">
            <img
              src={aiResult.imgUrl || imageUrl}
              alt="Selected DICOM image"
              className="max-w-full h-auto mb-4 border border-gray-600 rounded-md"
            />

            {isLoading && (
              <div className="w-full mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Analyzing image...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            )}

            <div className="w-full mt-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
                    <BarChart className="h-6 w-6 text-blue-400 animate-pulse" />
                  </div>
                  <p className="text-gray-300 text-sm">Processing image with AI...</p>
                </div>
              ) : (
                <>
                  {hasAnalyzed && (
                    <div className="flex items-center mb-3">
                      {isNegative ? (
                        <Badge className="bg-green-600 text-white px-3 py-1 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          <span>Pneumonia Negative</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-red-600 text-white px-3 py-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          <span>Pneumonia Positive</span>
                        </Badge>
                      )}
                    </div>
                  )}

                  <h4 className="font-medium text-blue-400">{hasAnalyzed ? "Diagnosis" : "Ready for Analysis"}</h4>

                  {hasAnalyzed && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-300 mb-4 font-medium">{aiResult.diagnosis}</p>

                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="p-2 bg-gray-700 rounded-md">
                      <div className="flex justify-between">
                        <span>Confidence Score:</span>
                        <span className={`font-bold ${hasAnalyzed ? "text-green-400" : "text-gray-400"}`}>
                          {hasAnalyzed ? `${aiResult.confidence_score}` : "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-gray-700 rounded-md">
                      <div className="flex justify-between">
                        <span>Processing Time:</span>
                        <span>{hasAnalyzed ? `${aiResult.processing_time}` : "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-4 bg-gray-700" />

      <div className="p-4 mt-auto">
        <Button
          className={`w-full ${hasAnalyzed ? (isNegative ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700") : "bg-blue-600 hover:bg-blue-700"}`}
          onClick={runAnalysis}
          disabled={isLoading || !imageBlob}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : hasAnalyzed ? (
            "Analyze Again"
          ) : (
            "Analyze with AI"
          )}
        </Button>
      </div>
    </div>
  )
}

