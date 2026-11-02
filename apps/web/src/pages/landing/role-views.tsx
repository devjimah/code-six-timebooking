// Demo: the same booking through the eyes of each role, as a carousel that plays by itself until someone takes over.
// Follows the role matrix in docs/roles-and-privacy.md; the API enforces it, this only shows it.
import * as React from "react"
import { useTranslation } from "react-i18next"
import Fade from "embla-carousel-fade"
import { EyeOff, Pause, Play } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@workspace/ui/components/carousel"
import { Progress } from "@workspace/ui/components/progress"
import { Table, TableBody, TableCell, TableRow } from "@workspace/ui/components/table"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"
import adminPhoto from "@/assets/landing/role-admin.webp"
import consultantPhoto from "@/assets/landing/role-consultant.webp"
import projectManagerPhoto from "@/assets/landing/role-project-manager.webp"
import purchasingPhoto from "@/assets/landing/role-purchasing.webp"
import { formatEuroCents, formatHours } from "@/i18n/format.ts"
import type { Role } from "@/lib/api-types.ts"
import { useAutoplay } from "@/pages/landing/use-autoplay.ts"

// The four roles on the client's and the consultant's side; the supplier manager is not part of the tour.
const SLIDES: { role: Exclude<Role, "supplier_manager">; photo: string }[] = [
  { role: "project_manager", photo: projectManagerPhoto },
  { role: "consultant", photo: consultantPhoto },
  { role: "purchasing", photo: purchasingPhoto },
  { role: "admin", photo: adminPhoto },
]
const SLIDE_MS = 6000

export function RoleViews() {
  const { t } = useTranslation()
  const [api, setApi] = React.useState<CarouselApi>()
  const [plugins] = React.useState(() => [Fade()])
  const [index, setIndex] = React.useState(0)
  const advance = React.useCallback(() => api?.scrollNext(), [api])
  const { paused, setPaused, progress, restart, containerRef, pauseProps } = useAutoplay(advance, SLIDE_MS)
  const role = SLIDES[index]!.role

  React.useEffect(() => {
    if (!api) return
    const onSelect = () => {
      setIndex(api.selectedScrollSnap())
      restart()
    }
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api, restart])

  const budgetLeft = `${formatHours(10 * 60)} · ${formatEuroCents(95000)}`
  const description = t("landing.roles.sampleDescription")

  // A row without a value for the chosen role is hidden from that role.
  const rows: { label: string; values: Partial<Record<Role, string>> }[] = [
    { label: t("landing.roles.startEnd"), values: { consultant: "08:00–14:00" } },
    {
      label: t("landing.roles.hours"),
      values: {
        consultant: formatHours(6 * 60),
        project_manager: formatHours(6 * 60),
        purchasing: t("landing.roles.orderTotal", { hours: formatHours(30 * 60) }),
      },
    },
    { label: t("landing.roles.work"), values: { consultant: description, project_manager: description } },
    { label: t("landing.roles.budget"), values: { project_manager: budgetLeft, purchasing: budgetLeft } },
    { label: t("landing.roles.audit"), values: { admin: t("landing.roles.auditValue") } },
  ]

  return (
    <Card ref={containerRef} className="grid gap-0 py-0 lg:grid-cols-2" {...pauseProps}>
      <Carousel setApi={setApi} plugins={plugins} opts={{ loop: true, duration: 30 }} aria-label={t("landing.roles.label")}>
        <CarouselContent className="ml-0">
          {SLIDES.map((slide) => (
            <CarouselItem key={slide.role} className="relative pl-0">
              <img src={slide.photo} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <Badge variant="secondary" className="absolute top-4 left-4">
                {t(`roles.${slide.role}`)}
              </Badge>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="grid content-center gap-4 p-4 md:p-6">
        <div className="flex items-start justify-between gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={1}
            className="flex-wrap"
            aria-label={t("landing.roles.label")}
            value={role}
            onValueChange={(next) => {
              const target = SLIDES.findIndex((slide) => slide.role === next)
              if (target < 0) return
              setPaused(true) // someone chose a role: let them read it
              api?.scrollTo(target)
            }}
          >
            {SLIDES.map((slide) => (
              <ToggleGroupItem key={slide.role} value={slide.role}>
                {t(`roles.${slide.role}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={paused ? t("landing.roles.play") : t("landing.roles.pause")}
            title={paused ? t("landing.roles.play") : t("landing.roles.pause")}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
          </Button>
        </div>
        <div aria-hidden>
          <Progress value={progress} />
        </div>
        {/* Only announced once it stops moving; otherwise a screen reader would be interrupted every few seconds. */}
        <p className="text-muted-foreground min-h-10 text-sm" aria-live={paused ? "polite" : "off"}>
          {t(`landing.roles.wants.${role}`)}
        </p>
        <Table>
          <TableBody>
            {rows.map(({ label, values }) => {
              const value = values[role]
              return (
                <TableRow key={label}>
                  <TableCell className="text-muted-foreground pl-0 align-top whitespace-normal">{label}</TableCell>
                  <TableCell className="pr-0 text-right whitespace-normal tabular-nums">
                    {value ?? (
                      <span className="text-muted-foreground inline-flex items-center gap-1.5">
                        <EyeOff className="size-3.5" aria-hidden />
                        {t("landing.roles.hidden")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
