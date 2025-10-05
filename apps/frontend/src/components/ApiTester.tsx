import { useState } from 'react'
import { motion } from 'framer-motion'
import { resolveApiUrl } from '../config/env'

export function ApiTester() {
  const [results, setResults] = useState<any[]>([])
  const [testing, setTesting] = useState(false)

  const testEndpoints = [
    '/health',
    '/api/dashboard/overview',
    '/api/dashboard/health',
    '/api/integration-registry',
    '/api/farmhand/health',
    '/api/performance-dashboard/real-time',
    '/api/notion/health',
    '/api/stories',
    '/api/organizations'
  ]

  const testAllAPIs = async () => {
    setTesting(true)
    setResults([])
    const newResults: any[] = []

    for (const endpoint of testEndpoints) {
      try {
        const url = resolveApiUrl(endpoint)
        console.log(`Testing: ${url}`)

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors'
        })

        const result = {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          data: null as string | null,
          error: null as string | null
        }

        if (response.ok) {
          try {
            const data = await response.json()
            result.data = JSON.stringify(data).substring(0, 200) + '...'
          } catch (e) {
            result.data = await response.text()
          }
        } else {
          result.error = await response.text()
        }

        newResults.push(result)
        setResults([...newResults])

      } catch (error) {
        newResults.push({
          endpoint,
          status: 0,
          statusText: 'Network Error',
          success: false,
          data: null as string | null,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        setResults([...newResults])
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    setTesting(false)
  }

  return (
    <motion.div
      className="neural-card p-6 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-bold text-intelligence-400 mb-6">🔧 API Connection Tester</h2>

      <button
        onClick={testAllAPIs}
        disabled={testing}
        className={`intelligence-button mb-6 ${testing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {testing ? '🔍 Testing APIs...' : '🚀 Test All Backend APIs'}
      </button>

      <div className="space-y-3">
        {results.map((result, index) => (
          <motion.div
            key={result.endpoint}
            className={`p-4 rounded-lg border ${
              result.success
                ? 'bg-green-900/20 border-green-500/50'
                : 'bg-red-900/20 border-red-500/50'
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <code className="text-intelligence-300">{result.endpoint}</code>
              <span className={`px-2 py-1 rounded text-xs ${
                result.success
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {result.status} {result.statusText}
              </span>
            </div>

            {result.success && result.data && (
              <div className="text-sm text-neural-300 mt-2">
                <strong>Data preview:</strong>
                <pre className="text-xs bg-neural-800/50 p-2 rounded mt-1 overflow-hidden">
                  {result.data}
                </pre>
              </div>
            )}

            {!result.success && result.error && (
              <div className="text-sm text-red-400 mt-2">
                <strong>Error:</strong> {result.error}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {results.length === 0 && !testing && (
        <div className="text-center text-neural-400 py-8">
          Click the button to test all backend API endpoints and see what's working!
        </div>
      )}
    </motion.div>
  )
}
