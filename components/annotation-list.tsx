"use client"

import { X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Annotation } from "./dicom-viewer"

interface AnnotationListProps {
  annotations: Annotation[]
  onClose: () => void
  onSelectAnnotation: (id: string) => void
  selectedAnnotation: string | null
  onDeleteAnnotation: (id: string) => void
}

export default function AnnotationList({
  annotations,
  onClose,
  onSelectAnnotation,
  selectedAnnotation,
  onDeleteAnnotation
}: AnnotationListProps) {
  // Sort annotations by date (newest first)
  const sortedAnnotations = [...annotations].sort((a, b) => {
    return (b.timestamp || 0) - (a.timestamp || 0)
  })

  return (
    <div className="absolute top-0 right-0 w-64 h-full bg-gray-900 border-l border-gray-700 z-30 flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <h3 className="text-sm font-medium text-white">Annotations</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {sortedAnnotations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4 text-gray-400 text-sm">
          No annotations for this slice
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {sortedAnnotations.map((annotation) => {
              const date = annotation.timestamp 
                ? new Date(annotation.timestamp).toLocaleString() 
                : 'Unknown date';
              
              const displayText = annotation.type === 'text' 
                ? annotation.text 
                : `Line annotation (${Math.round(
                    Math.sqrt(
                      Math.pow((annotation.end?.x || 0) - (annotation.start?.x || 0), 2) + 
                      Math.pow((annotation.end?.y || 0) - (annotation.start?.y || 0), 2)
                    )
                  )}px)`;
              
              return (
                <div 
                  key={annotation.id}
                  className={`p-2 rounded-md cursor-pointer transition-colors ${
                    selectedAnnotation === annotation.id 
                      ? 'bg-blue-800 text-white' 
                      : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                  }`}
                  onClick={() => onSelectAnnotation(annotation.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{displayText}</p>
                      <p className="text-xs text-gray-400 mt-1">{date}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 -mt-1 -mr-1 text-gray-400 hover:text-white hover:bg-red-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAnnotation(annotation.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
