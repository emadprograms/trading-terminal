import '@testing-library/jest-dom'
import { vi, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
};

const mockLocalStorage = createStorageMock();
const mockSessionStorage = createStorageMock();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock Canvas/Context if needed
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  clip: vi.fn(),
  rect: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 0 }),
  fillText: vi.fn(),
})

// MSW Setup
export const handlers = [
  http.post('*/session', () => {
    return new HttpResponse(
      JSON.stringify({
        accountType: 'CFD',
        clientId: 'mock-client-id',
      }),
      {
        status: 200,
        headers: {
          'CST': 'mock-cst-token',
          'X-SECURITY-TOKEN': 'mock-security-token',
        },
      }
    )
  }),

  http.get('*/accounts', () => {
    return HttpResponse.json({
      accounts: [
        {
          accountId: 'mock-account-id',
          accountName: 'Demo Account',
          status: 'ENABLED',
          balance: {
            balance: 10000,
            deposit: 10000,
            profit: 0,
          },
          currency: 'USD',
        },
      ],
    })
  }),

  http.get('*/ping', () => {
    return HttpResponse.json({ status: 'OK' })
  }),
]

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
