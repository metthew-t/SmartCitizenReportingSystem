import { useAuthStore } from '../store/authStore'

const API = 'https://smartcitizenreportingsystem.onrender.com/api/v1'

export interface AuditEventPayload {
  action: string
  entity_type: string
  entity_id: string | number
  changes?: Record<string, any>
}

/**
 * Dispatches an audit log event to the backend securely.
 * Non-blocking: failures won't disrupt the user's workflow.
 */
export async function logAuditEvent({
  action,
  entity_type,
  entity_id,
  changes = {},
}: AuditEventPayload): Promise<void> {
  try {
    const { token, user, role } = useAuthStore.getState()
    if (!token) return

    const enhancedChanges = {
      ...changes,
      actor_name: user?.name || user?.email || user?.phone || 'Unknown User',
      actor_role: role || 'citizen',
      actor_email: user?.email || '',
      actor_phone: user?.phone || '',
      client_timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
    }

    await fetch(`${API}/analytics/audit-logs/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action,
        entity_type,
        entity_id: String(entity_id),
        changes: enhancedChanges,
      }),
    })
  } catch (err) {
    // Fail silently in client to prevent UI interruptions
    console.debug('Audit log dispatch skipped:', err)
  }
}

