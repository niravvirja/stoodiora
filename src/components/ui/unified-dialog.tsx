import * as React from "react"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Trash2, AlertCircle, Info, CheckCircle2, X, Calendar, Users, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type DialogVariant = "destructive" | "warning" | "info" | "success" | "conflict" | "default" | "error"

interface UnifiedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel?: () => void
  title: string
  description: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: DialogVariant
  icon?: LucideIcon | React.ReactNode
  requireTextConfirmation?: boolean
  confirmationKeyword?: string
  loading?: boolean
  details?: React.ReactNode
}

const variantConfig: Record<DialogVariant, {
  icon: LucideIcon
  iconBg: string
  iconColor: string
  buttonClass: string
}> = {
  destructive: {
    icon: Trash2,
    iconBg: "bg-destructive/10 border-destructive/20",
    iconColor: "text-destructive",
    buttonClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
  },
  error: {
    icon: AlertCircle,
    iconBg: "bg-destructive/10 border-destructive/20",
    iconColor: "text-destructive",
    buttonClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-orange-500/10 border-orange-500/20",
    iconColor: "text-orange-500",
    buttonClass: "bg-orange-500 hover:bg-orange-600 text-white",
  },
  info: {
    icon: Info,
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-500",
    buttonClass: "bg-blue-500 hover:bg-blue-600 text-white",
  },
  success: {
    icon: CheckCircle2,
    iconBg: "bg-green-500/10 border-green-500/20",
    iconColor: "text-green-500",
    buttonClass: "bg-green-500 hover:bg-green-600 text-white",
  },
  conflict: {
    icon: Calendar,
    iconBg: "bg-amber-500/10 border-amber-500/20",
    iconColor: "text-amber-500",
    buttonClass: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  default: {
    icon: Info,
    iconBg: "bg-primary/10 border-primary/20",
    iconColor: "text-primary",
    buttonClass: "bg-primary hover:bg-primary/90 text-primary-foreground",
  },
}

export function UnifiedDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
  icon,
  requireTextConfirmation = false,
  confirmationKeyword = "DELETE",
  loading = false,
  details,
}: UnifiedDialogProps) {
  const [textInput, setTextInput] = useState("")
  
  const config = variantConfig[variant]
  
  // Check if icon is a component or a rendered element
  const isIconComponent = typeof icon === 'function'
  const IconComponent = isIconComponent ? icon as LucideIcon : config.icon
  const iconElement = isIconComponent ? <IconComponent className={cn("h-6 w-6", config.iconColor)} /> : icon

  const handleConfirm = () => {
    if (requireTextConfirmation && textInput.toLowerCase() !== confirmationKeyword.toLowerCase()) {
      return
    }
    onConfirm()
    setTextInput("")
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTextInput("")
      if (onCancel) onCancel()
    }
    onOpenChange(newOpen)
  }

  const isConfirmDisabled = loading || (requireTextConfirmation && textInput.toLowerCase() !== confirmationKeyword.toLowerCase())

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-[90vw] w-full sm:max-w-lg mx-auto gap-6">
        <button
          onClick={() => handleOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          disabled={loading}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <AlertDialogHeader className="text-center space-y-4">
          <div className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all",
            config.iconBg
          )}>
            {iconElement || <IconComponent className={cn("h-6 w-6", config.iconColor)} />}
          </div>
          
          <div className="space-y-2">
            <AlertDialogTitle className="text-xl font-semibold leading-tight">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        {details && (
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm space-y-2">
            {details}
          </div>
        )}
        
        {requireTextConfirmation && (
          <div className="space-y-3 px-2">
            <Label htmlFor="confirmation-input" className="text-sm font-medium">
              Type <span className="font-mono font-bold text-destructive">{confirmationKeyword}</span> to confirm:
            </Label>
            <Input
              id="confirmation-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Type "${confirmationKeyword}" here...`}
              className="text-center font-mono"
              autoComplete="off"
              disabled={loading}
            />
          </div>
        )}
        
        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-3">
          <AlertDialogCancel 
            className="w-full sm:w-auto" 
            disabled={loading}
            onClick={() => handleOpenChange(false)}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={cn("w-full sm:w-auto", config.buttonClass)}
          >
            {loading ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
