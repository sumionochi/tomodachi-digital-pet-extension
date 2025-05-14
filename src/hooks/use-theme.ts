"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

export function useThemeMode() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return { theme: "light", setTheme, mounted }
  }

  return { theme, setTheme, mounted }
}
