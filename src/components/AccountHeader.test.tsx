import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
// @ts-ignore
import { AccountHeader } from './AccountHeader'
import { useSessionStore } from '../store/useSessionStore'

describe('AccountHeader Component', () => {
  it('should display loading state when no data', () => {
    render(<AccountHeader />)
    expect(screen.getByText(/connecting/i)).toBeInTheDocument()
  })

  it('should display account information when authenticated', () => {
    // Mock the authenticated state and account info
    // This assumes useSessionStore might hold account info or another store will
    useSessionStore.setState({ 
      isAuthenticated: true,
      // @ts-ignore
      accountInfo: {
        accountId: '123',
        balance: 10000,
        currency: 'USD'
      }
    })
    
    render(<AccountHeader />)
    expect(screen.getByText(/10000/)).toBeInTheDocument()
    expect(screen.getByText(/USD/)).toBeInTheDocument()
  })
})
