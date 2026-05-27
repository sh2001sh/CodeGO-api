import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Copy,
  Compass,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicLayout } from '@/components/layout'

const highlights = [
  {
    title: 'Read-only usage companion',
    desc: 'Check quota, subscriptions, logs, daily trend, and gene-map snapshots after binding.',
  },
  {
    title: 'Website-first account flow',
    desc: 'Registration, purchases, and account security actions stay on the main website.',
  },
  {
    title: 'One-time bind code',
    desc: 'Generate a short-lived code on the website, then paste it into the mini program to finish binding.',
  },
]

const steps = [
  'Sign in on the website and open Profile > Mini Program Binding.',
  'Generate a one-time bind code and keep it ready for the next 10 minutes.',
  'Open the Code Go mini program in WeChat, tap Bind Account, and paste the code.',
  'After binding, use the mini program for data lookup, trend checks, and quick status review.',
]

const guardrails = [
  'The mini program does not handle purchases, top-ups, or paid account actions.',
  'Website credentials are never entered inside the mini program.',
  'A single website account maps to one active WeChat mini program binding in MVP.',
]

export function MiniAppLanding() {
  return (
    <PublicLayout showMainContainer={false}>
      <main className='bg-background'>
        <section className='relative overflow-hidden border-b border-border/50 px-6 pb-14 pt-28 md:px-10 md:pb-18 md:pt-32'>
          <div
            aria-hidden
            className='pointer-events-none absolute inset-0 opacity-70'
            style={{
              background: [
                'radial-gradient(circle at 18% 18%, rgba(16, 185, 129, 0.18), transparent 34%)',
                'radial-gradient(circle at 82% 16%, rgba(34, 197, 94, 0.16), transparent 28%)',
                'radial-gradient(circle at 50% 100%, rgba(14, 165, 233, 0.14), transparent 34%)',
              ].join(', '),
            }}
          />

          <div className='relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-end'>
            <div className='space-y-6'>
              <div className='inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>
                <Smartphone className='h-3.5 w-3.5' />
                WeChat Mini Program
              </div>

              <div className='space-y-4'>
                <h1 className='max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl'>
                  Code Go mini program: quick data access, website-first account flow
                </h1>
                <p className='max-w-2xl text-base leading-8 text-muted-foreground md:text-lg'>
                  Use the mini program as a lightweight companion for quota,
                  logs, trend snapshots, and usage review. Website sign-in,
                  purchases, and account management stay on the main site.
                </p>
              </div>

              <div className='flex flex-wrap gap-3'>
                <Button render={<Link to='/profile' />}>
                  Open Profile
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Button>
                <Button variant='outline' render={<Link to='/guide' />}>
                  Read Website Guide
                </Button>
              </div>
            </div>

            <div className='grid gap-3'>
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className='rounded-2xl border border-slate-200/80 bg-background/85 p-4 shadow-sm backdrop-blur'
                >
                  <div className='text-sm font-semibold text-slate-950'>
                    {item.title}
                  </div>
                  <div className='mt-2 text-sm leading-6 text-muted-foreground'>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className='px-6 py-10 md:px-10 md:py-14'>
          <div className='mx-auto grid max-w-7xl gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]'>
            <div className='rounded-3xl border bg-muted/20 p-6 md:p-8'>
              <div className='flex items-center gap-2 text-sm font-semibold'>
                <Copy className='h-4 w-4 text-emerald-600' />
                Binding workflow
              </div>
              <ol className='mt-5 space-y-4'>
                {steps.map((step, index) => (
                  <li key={step} className='flex gap-4'>
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white'>
                      {index + 1}
                    </div>
                    <div className='pt-1 text-sm leading-7 text-slate-700'>
                      {step}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className='space-y-4'>
              <div className='rounded-3xl border p-6'>
                <div className='flex items-center gap-2 text-sm font-semibold'>
                  <ShieldCheck className='h-4 w-4 text-emerald-600' />
                  MVP guardrails
                </div>
                <ul className='mt-4 space-y-3 text-sm leading-6 text-muted-foreground'>
                  {guardrails.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className='rounded-3xl border p-6'>
                <div className='flex items-center gap-2 text-sm font-semibold'>
                  <Compass className='h-4 w-4 text-sky-600' />
                  Useful entries
                </div>
                <div className='mt-4 flex flex-col gap-3'>
                  <Button variant='outline' render={<Link to='/pricing' />}>
                    Pricing and models
                  </Button>
                  <Button variant='outline' render={<Link to='/privacy-policy' />}>
                    Privacy policy
                  </Button>
                  <Button variant='outline' render={<Link to='/user-agreement' />}>
                    User agreement
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
