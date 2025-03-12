import DicomViewer from "@/components/dicom-viewer"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <DicomViewer />
    </main>
  )
}

