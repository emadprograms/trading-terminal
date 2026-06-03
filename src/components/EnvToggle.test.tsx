import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
// @ts-ignore
import { EnvToggle } from './EnvToggle'
import { useSessionStore } from '../store/useSessionStore'

describe('EnvToggle Component', () => {
  it('should render initial DEMO state', () => {
    useSessionStore.setState({ environment: 'DEMO' })
    render(<EnvToggle />)
    expect(screen.getByText(/DEMO/i)).toBeInTheDocument()
  })

  it('should switch to LIVE when clicked', () => {
    useSessionStore.setState({ environment: 'DEMO' })
    render(<EnvToggle />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(useSessionStore.getState().environment).toBe('LIVE')
  })
})
