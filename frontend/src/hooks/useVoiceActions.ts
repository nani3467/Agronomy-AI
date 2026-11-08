'use client'

import { useEffect, useRef } from 'react'
import { useVoiceOS } from '@/context/VoiceOSContext'
import { PageAction } from '@/lib/voiceOS'

/**
 * Custom hook to register page-specific actions into the Universal Voice OS Registry.
 * Automatically cleans up actions when the page unmounts.
 * Uses a stable action identifier key so re-renders with inline array literals
 * do not trigger repeated unregister/register cycles.
 */
export function useVoiceActions(actions: PageAction[]) {
  const { registerAction, unregisterAction } = useVoiceOS()
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  const actionsKey = actions.map((a) => a.id).join(';')

  useEffect(() => {
    const currentActions = actionsRef.current
    currentActions.forEach((action) => {
      registerAction(action)
    })

    return () => {
      currentActions.forEach((action) => {
        unregisterAction(action.id)
      })
    }
  }, [actionsKey, registerAction, unregisterAction])
}
