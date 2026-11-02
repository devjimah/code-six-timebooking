// The public front page, for everyone who is not signed in. It explains the product by letting people try it:
// each demo in this folder runs only in the browser, on invented data, and saves nothing.
import type * as React from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { Clock } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { LanguageSwitcher } from "@/components/language-switcher.tsx"
import { BudgetLookahead } from "@/pages/landing/budget-lookahead.tsx"
import { FlowCarousel } from "@/pages/landing/flow-carousel.tsx"
import { HeroCarousel } from "@/pages/landing/hero-carousel.tsx"
import { RoleViews } from "@/pages/landing/role-views.tsx"
import { RuleCheck } from "@/pages/landing/rule-check.tsx"

const METRICS = ["instant", "checks", "leadTime", "roles"] as const
const COMPARISON = ["budget", "rules", "reorder", "approval"] as const

function Heading({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid gap-3">
      <h2 className="text-2xl font-medium tracking-tight text-balance md:text-3xl">{title}</h2>
      <p className="text-muted-foreground text-balance">{description}</p>
    </div>
  )
}

/** Explanation on the left, something to try on the right. */
function DemoSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
      <Heading title={title} description={description} />
      {children}
    </section>
  )
}

export function LandingPage() {
  const { t } = useTranslation()

  return (
    <div className="bg-muted min-h-svh">
      <header className="bg-background sticky top-0 z-10 border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-6">
          <div className="text-primary flex items-center gap-2 font-medium">
            <Clock className="size-5" aria-hidden />
            {t("app.title")}
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button size="sm" variant="outline" asChild>
              <Link to="/login">{t("login.submit")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <HeroCarousel />

      <main className="mx-auto grid max-w-5xl gap-16 px-6 py-12 md:gap-24 md:py-20">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t("landing.metrics.label")}>
          {METRICS.map((metric) => (
            <Card key={metric} className="gap-1 py-4">
              <CardHeader>
                <CardTitle className="text-xl font-medium tabular-nums sm:text-2xl">{t(`landing.metrics.${metric}.value`)}</CardTitle>
                <CardDescription>{t(`landing.metrics.${metric}.label`)}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <FlowCarousel heading={<Heading title={t("landing.how.title")} description={t("landing.how.description")} />} />

        <DemoSection title={t("landing.rules.title")} description={t("landing.rules.description")}>
          <RuleCheck />
        </DemoSection>

        <section className="grid gap-8">
          <Heading title={t("landing.roles.title")} description={t("landing.roles.description")} />
          <RoleViews />
        </section>

        <DemoSection title={t("landing.ahead.title")} description={t("landing.ahead.description")}>
          <BudgetLookahead />
        </DemoSection>

        <section className="grid gap-8">
          <Heading title={t("landing.why.title")} description={t("landing.why.description")} />
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{t("landing.why.question")}</TableHead>
                  <TableHead>{t("landing.why.before")}</TableHead>
                  <TableHead className="text-primary pr-4">{t("app.title")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARISON.map((row) => (
                  <TableRow key={row}>
                    <TableCell className="pl-4 align-top font-medium whitespace-normal">
                      {t(`landing.why.${row}.question`)}
                    </TableCell>
                    <TableCell className="text-muted-foreground align-top whitespace-normal">
                      {t(`landing.why.${row}.before`)}
                    </TableCell>
                    <TableCell className="pr-4 align-top whitespace-normal">{t(`landing.why.${row}.now`)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>

        <section className="grid justify-items-center gap-6 text-center">
          <h2 className="text-2xl font-medium tracking-tight text-balance md:text-3xl">{t("landing.closing")}</h2>
          <Button size="lg" asChild>
            <Link to="/login">{t("login.submit")}</Link>
          </Button>
          <p className="text-muted-foreground text-sm">{t("login.noAccount")}</p>
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto max-w-5xl px-6 pb-8 text-center text-xs">
        <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="hover:underline">
          {t("landing.photos")}
        </a>
      </footer>
    </div>
  )
}
