import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { AlertTriangle, FileText, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Task } from '@/types/studio'
import { useAuth } from '@/components/auth/AuthProvider'

interface TaskReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task
  onSuccess: () => void
}

const REPORT_REASONS = [
  'Poor editing quality - needs rework',
  'Color grading not matching requirements',
  'Incomplete deliverables or missing files',
  'Client requested revisions',
  'Technical errors (audio sync, resolution, etc.)',
  'Missed deadline without notification',
  'Incorrect creative direction',
  'Other issue',
]

const TaskReportDialog = ({ open, onOpenChange, task, onSuccess }: TaskReportDialogProps) => {
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { currentFirmId } = useAuth()

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast({
        title: 'Please select a reason',
        description: 'You must select a reason for reporting this task.',
        variant: 'destructive',
      })
      return
    }

    if (selectedReason === 'Other issue' && !customReason.trim()) {
      toast({
        title: 'Please specify the issue',
        description: 'Please provide details about the issue.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      const reportData = {
        reason: selectedReason === 'Other issue' ? customReason : selectedReason,
        additional_notes: additionalNotes,
        reported_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'Reported' as any,
          report_data: reportData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)

      if (error) throw error

      if (task.assigned_to || task.freelancer_id) {
        try {
          let staffName = 'Staff Member'
          let staffPhone = null

          if (task.assigned_to) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, mobile_number')
              .eq('id', task.assigned_to)
              .single()
            if (profileData) {
              staffName = profileData.full_name || 'Staff Member'
              staffPhone = profileData.mobile_number
            }
          } else if (task.freelancer_id) {
            const { data: freelancerData } = await supabase
              .from('freelancers')
              .select('full_name, phone')
              .eq('id', task.freelancer_id)
              .single()
            if (freelancerData) {
              staffName = freelancerData.full_name || 'Freelancer'
              staffPhone = freelancerData.phone
            }
          }

          const firmId = currentFirmId
          supabase.functions
            .invoke('send-staff-notification', {
              body: {
                staffName,
                staffPhone,
                taskTitle: task.title,
                eventName: task.event?.title,
                firmId,
                notificationType: 'task_reported',
              },
            })
            .catch((err) => console.error('Notification failed:', err))
        } catch (err) {
          console.error('Notification preparation failed:', err)
        }
      }

      toast({
        title: 'Task reported successfully',
        description: 'The task has been marked as reported and the staff member will be notified.',
      })

      onSuccess()
      onOpenChange(false)
      setSelectedReason('')
      setCustomReason('')
      setAdditionalNotes('')
    } catch (error: any) {
      console.error('Error reporting task:', error)
      toast({
        title: 'Error reporting task',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report Task Issue
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Reason Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">
              Issue Type <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={selectedReason}
              onValueChange={setSelectedReason}
              className="flex flex-col gap-2"
            >
              {REPORT_REASONS.map((reason) => (
                <Label
                  key={reason}
                  htmlFor={reason}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-full cursor-pointer text-sm transition-all
                    ${
                      selectedReason === reason
                        ? 'border-destructive text-destructive bg-destructive/10'
                        : 'border-muted-foreground/20 hover:border-destructive/40 hover:text-destructive'
                    }`}
                >
                  <RadioGroupItem
                    value={reason}
                    id={reason}
                    className="text-destructive border-destructive focus:ring-destructive h-4 w-4"
                  />
                  <span className="flex-1">{reason}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Custom Reason Input */}
          {selectedReason === 'Other issue' && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="custom-reason" className="text-sm font-semibold">
                Describe the Issue <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Please provide details about the issue..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additional-notes" className="text-sm font-semibold">
              Additional Details{' '}
              <span className="text-xs text-muted-foreground font-normal ml-1">(Optional)</span>
            </Label>
            <Textarea
              id="additional-notes"
              placeholder="Any extra feedback or instructions..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              variant="destructive"
              className="flex-1"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {loading ? 'Reporting...' : 'Report Issue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TaskReportDialog
