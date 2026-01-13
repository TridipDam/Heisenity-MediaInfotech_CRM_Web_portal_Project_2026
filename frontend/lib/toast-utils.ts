// Simple toast utility for showing success/error messages
// You can replace this with your preferred toast library (react-hot-toast, sonner, etc.)

export const showToast = {
  success: (message: string) => {
    // For now, using browser alert - replace with your toast library
    console.log('SUCCESS:', message)
    alert(`✅ ${message}`)
  },
  
  error: (message: string) => {
    // For now, using browser alert - replace with your toast library
    console.error('ERROR:', message)
    alert(`❌ ${message}`)
  },
  
  info: (message: string) => {
    console.log('INFO:', message)
    alert(`ℹ️ ${message}`)
  }
}