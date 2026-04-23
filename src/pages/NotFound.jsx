import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center gap-4">
      <p className="text-5xl font-bold text-slate-700">404</p>
      <p className="text-slate-400 text-sm">Página não encontrada</p>
      <Link to="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
        Voltar ao Dashboard →
      </Link>
    </div>
  )
}
