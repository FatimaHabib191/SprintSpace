import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { SignIn } from './AuthPages'

const { me, login } = vi.hoisted(() => ({ me: vi.fn(), login: vi.fn() }))
vi.mock('@/api/endpoints', () => ({
  authApi: { me, login, register: vi.fn(), logout: vi.fn() },
}))

function setup() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AuthProvider>
          <SignIn />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SignIn', () => {
  beforeEach(() => {
    me.mockReset().mockRejectedValue(new ApiError('Authentication required', 401, 'UNAUTHORIZED'))
    login.mockReset()
  })

  it('validates fields before calling the API', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('shows the server message on bad credentials and prevents duplicate submits while pending', async () => {
    let reject!: (e: unknown) => void
    login.mockReturnValue(new Promise((_, r) => (reject = r)))
    setup()
    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpass1')
    const button = screen.getByRole('button', { name: 'Sign in' })
    await userEvent.click(button)
    await waitFor(() => expect(button).toBeDisabled())
    await userEvent.click(button)
    expect(login).toHaveBeenCalledTimes(1)

    reject(new ApiError('Incorrect email or password', 401, 'INVALID_CREDENTIALS'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })
})
