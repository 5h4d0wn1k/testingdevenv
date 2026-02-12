'use client'

import {
  Wrench,
  ShieldCheck,
  Clock3,
  Star,
  Smartphone,
  CreditCard,
  UserCog,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

const services = [
  {
    title: 'Home Cleaning',
    description: 'Deep cleaning, kitchen sanitization, and bathroom care by trained professionals.',
    icon: ShieldCheck,
  },
  {
    title: 'AC & Appliance Repair',
    description: 'Quick repair visits for ACs, refrigerators, washing machines, and more.',
    icon: Wrench,
  },
  {
    title: 'Salon at Home',
    description: 'Certified beauticians for salon services at your home with hygienic kits.',
    icon: Star,
  },
  {
    title: 'Plumbing & Electrical',
    description: 'On-demand trusted electricians and plumbers with same-day slot options.',
    icon: Clock3,
  },
]

const highlights = [
  'Verified professionals and background checks',
  'Transparent pricing before booking',
  'Live booking tracking in one dashboard',
  '24/7 support for customers and partners',
]

export default function Home() {
  return (
    <main className="bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-6 pb-12 pt-10 lg:pb-20">
        <div className="grid gap-8 rounded-3xl bg-gradient-to-br from-indigo-600 to-sky-500 p-8 text-white lg:grid-cols-2 lg:p-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium">
              <Smartphone size={16} /> HomeSolution Marketplace
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight lg:text-5xl">
              Book trusted home services in minutes.
            </h1>
            <p className="mt-5 max-w-xl text-base text-indigo-100 lg:text-lg">
              HomeSolution helps customers discover reliable professionals for cleaning, repairs, and beauty services.
              Built with a modern admin panel and secure payment support.
            </p>
            <div className="mt-7 flex flex-wrap gap-4">
              <Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-indigo-700 transition hover:scale-[1.02]">
                Explore Services <ArrowRight size={18} />
              </Link>
              <Link href="/admin" className="rounded-full border border-white/50 px-6 py-3 font-semibold text-white transition hover:bg-white/15">
                Open Admin Panel
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 text-slate-800 shadow-xl">
            <h2 className="text-xl font-semibold">Why HomeSolution?</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {highlights.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 text-emerald-600" size={18} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-600">Payments</p>
              <p className="mt-2 flex items-center gap-2 text-base font-semibold">
                <CreditCard size={18} className="text-indigo-600" /> Easy gateway-ready payment flow
              </p>
              <p className="mt-1 text-sm text-slate-600">UPI, card, and wallet support can be managed from platform settings.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Popular Service Categories</h2>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">New Interface</span>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <article key={service.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <service.icon className="text-indigo-600" size={24} />
              <h3 className="mt-3 text-lg font-semibold">{service.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 lg:grid-cols-3 lg:p-8">
          <div className="rounded-2xl bg-slate-50 p-5">
            <UserCog className="text-indigo-600" size={24} />
            <h3 className="mt-3 text-lg font-semibold">Admin-ready controls</h3>
            <p className="mt-2 text-sm text-slate-600">Manage users, orders, commissions, and payouts using the built-in admin module.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <CreditCard className="text-indigo-600" size={24} />
            <h3 className="mt-3 text-lg font-semibold">Flexible payment configuration</h3>
            <p className="mt-2 text-sm text-slate-600">Connect your preferred provider from settings and monitor transactions in one place.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <Clock3 className="text-indigo-600" size={24} />
            <h3 className="mt-3 text-lg font-semibold">Fast onboarding</h3>
            <p className="mt-2 text-sm text-slate-600">Start with prebuilt pages and workflows so non-technical teams can launch quickly.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
