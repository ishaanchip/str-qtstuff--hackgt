import { Route, Routes } from 'react-router-dom'
import Header from './components/Header/Header'
import Home from './components/Home/Home'
import ClotheMe from './components/ClotheMe/ClotheMe'
import TokenMarket from './components/TokenMarket/TokenMarket'

import './App.css'

function App() {
  return (
    <div className='app'>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/clothe-me" element={<ClotheMe />} />
        <Route path="/token-market" element={<TokenMarket />} />
      </Routes>
    </div>
  )
}

export default App
