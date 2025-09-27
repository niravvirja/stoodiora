export const EVENTS_FILTER_GROUPS = [
  {
    key: 'event_type',
    label: 'Event Type',
    icon: '🎉',
    options: [
      { key: 'wedding', label: 'Wedding' },
      { key: 'pre_wedding', label: 'Pre-Wedding' },
      { key: 'ring_ceremony', label: 'Ring Ceremony' },
      { key: 'maternity', label: 'Maternity Photography' },
      { key: 'others', label: 'Others' }
    ]
  },
  {
    key: 'payment_status',
    label: 'Payment Status', 
    icon: '💰',
    options: [
      { key: 'fully_paid', label: 'Fully Paid' },
      { key: 'has_balance', label: 'Has Pending Balance' }
    ]
  },
  {
    key: 'event_status',
    label: 'Event Status',
    icon: '📅',
    options: [
      { key: 'upcoming', label: 'Upcoming Events' },
      { key: 'completed', label: 'Completed Events' },
      { key: 'this_month', label: 'This Month' }
    ]
  },
  {
    key: 'editing_status',
    label: 'Editing Status',
    icon: '✂️',
    options: [
      { key: 'photo_editing_done', label: 'Photo Editing Done' },
      { key: 'video_editing_done', label: 'Video Editing Done' }
    ]
  },
  {
    key: 'staff_status',
    label: 'Staff Status',
    icon: '👥',
    options: [
      { key: 'staff_incomplete', label: 'Staff Incomplete (Red Icon)', color: 'destructive' },
      { key: 'staff_complete', label: 'Staff Complete (Green Icon)', color: 'success' }, 
      { key: 'no_staff', label: 'No Staff Assigned', color: 'secondary' }
    ]
  },
  {
    key: 'staff_roles',
    label: 'Staff Roles',
    icon: '🎬', 
    options: [
      { key: 'photographer', label: 'Has Photographer' },
      { key: 'cinematographer', label: 'Has Cinematographer' },
      { key: 'editor', label: 'Has Editor' },
      { key: 'drone', label: 'Has Drone Operator' }
    ]
  }
];