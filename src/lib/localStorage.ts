"use client"

// Helper functions to manage wallet connection persistence
export const saveWalletConnection = (address: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("walletConnected", "true")
    localStorage.setItem("walletAddress", address)
  }
}

export const getWalletConnection = () => {
  if (typeof window !== "undefined") {
    const isConnected = localStorage.getItem("walletConnected") === "true"
    const address = localStorage.getItem("walletAddress")
    return { isConnected, address }
  }
  return { isConnected: false, address: null }
}

export const clearWalletConnection = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("walletConnected")
    localStorage.removeItem("walletAddress")
  }
}
