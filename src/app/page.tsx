import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Target,
  BookOpen,
  Stethoscope,
  Brain,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'

export default function LandingPage() {
  const features = [
    {
      icon: Target,
      title: 'Track Everything',
      description:
        'Log patients, procedures, and UWorld sessions in one unified dashboard.',
    },
    {
      icon: Brain,
      title: 'AI Study Coach',
      description:
        'Get personalized study recommendations based on your weak areas and schedule.',
    },
    {
      icon: BookOpen,
      title: 'Smart Analytics',
      description:
        'Visualize your progress with detailed charts and predictive shelf score estimates.',
    },
    {
      icon: Stethoscope,
      title: 'Procedure Reference',
      description:
        'Quick access to procedure guides when you need them most on the wards.',
    },
  ]

  const benefits = [
    'Track UWorld performance by system and subject',
    'Log patient encounters for ERAS applications',
    'AI-powered daily study recommendations',
    'Shelf score tracking and predictions',
    'Procedure reference library',
    'Mobile-friendly for hospital use',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SB</span>
              </div>
              <span className="text-xl font-bold text-slate-100">ScrubBuddy</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-slate-400 hover:text-slate-200 text-sm font-medium"
              >
                Sign In
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-100 leading-tight">
            Your AI-Powered
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Clinical Year Command Center
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Built for third-year medical students who refuse to burn out. Maximize
            shelf scores, track clinical growth, and let AI tell you exactly what to
            study next.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free <ChevronRight size={18} className="ml-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-100 text-center mb-12">
            Everything you need to crush clinical year
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl"
              >
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="text-blue-400" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-slate-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits List */}
      <section className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-100 text-center mb-12">
            Built by med students, for med students
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-lg"
              >
                <CheckCircle2 className="text-green-400 flex-shrink-0" size={20} />
                <span className="text-slate-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-100 mb-4">
            Ready to take control of your clinical year?
          </h2>
          <p className="text-slate-400 mb-8">
            Join thousands of medical students using ScrubBuddy to optimize their
            studying.
          </p>
          <Link href="/register">
            <Button size="lg">Create Your Free Account</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">SB</span>
            </div>
            <span className="text-sm text-slate-400">
              ScrubBuddy - Your AI study partner
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Made with caffeine and determination
          </p>
        </div>
      </footer>
    </div>
  )
}
