import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-white text-[#213547] flex flex-col items-center justify-center gap-4 p-8">
      <div className="flex gap-4">
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="h-24 p-6 hover:drop-shadow-[0_0_2em_#646cffaa] transition-all" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="h-24 p-6 hover:drop-shadow-[0_0_2em_#61dafbaa] transition-all animate-spin [animation-duration:20s]" alt="React logo" />
        </a>
      </div>

      <h1 className="text-5xl font-bold">Vite + React</h1>

      <div className="p-8 flex flex-col items-center gap-4">
        <button
          onClick={() => setCount((count) => count + 1)}
          className="rounded-lg border border-transparent px-5 py-3 text-base font-medium bg-[#f9f9f9] cursor-pointer hover:border-[#646cff] transition-all"
        >
          count is {count}
        </button>
        <p>Edit <code className="font-mono">src/App.jsx</code> and save to test HMR</p>
      </div>

      <p className="text-[#888]">Click on the Vite and React logos to learn more</p>
    </div>
  )
}

export default App